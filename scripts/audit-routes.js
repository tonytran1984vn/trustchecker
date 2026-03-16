#!/usr/bin/env node
/**
 * TrustChecker DevSecOps — Route Security Scanner v2.0 (Tuned)
 *
 * Precision rules:
 * - Only flags ${...} inside db.all/db.get/db.run/db.query/db.prepare calls
 * - Ignores safe backtick SQL with $1/? parameterization
 * - Ignores string interpolation in params.push() or error messages
 * - Auth check is file-wide (if authMiddleware imported, file is protected)
 */

var fs = require("fs");
var path = require("path");

var ROUTES_DIR = path.join(__dirname, "..", "server", "routes");
var PUBLIC_ROUTES = ["health.js", "healthz.js", "api-docs.js", "swagger.js", "supplier-portal.js", "public.js"];
var AUTH_PATTERNS = /authMiddleware|requireAuth|authenticate|orgGuard|verifyToken|ensureAuth/;


function _isSafeLine(line) {
    var safePatterns = [
        "params.push", ".join(", "res.status", "res.json",
        "console.", "current_setting", "app.current_org",
        "_safeId", "_safeWhere", "_safeJoin", "_safePlaceholders",
        "_validateSql", "_safeDate", "typeof sql",
        "placeholders", "LIMIT ?"
    ];
    for (var i = 0; i < safePatterns.length; i++) {
        if (line.indexOf(safePatterns[i]) !== -1) return true;
    }
    return false;
}

var jsonMode = process.argv.includes("--json");
var findings = [];
var stats = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };

function addFinding(sev, file, rule, msg, line, suggestion) {
    stats.total++; stats[sev]++;
    findings.push({ severity: sev, file: file, rule: rule, message: msg, line: line || 0, suggestion: suggestion || "" });
    if (!jsonMode) {
        var icon = sev === "critical" ? "\u{1F534}" : sev === "high" ? "\u{1F7E0}" : sev === "medium" ? "\u{1F7E1}" : "\u{1F535}";
        console.log("  " + icon + " [" + sev.toUpperCase() + "] " + rule + " (L" + (line||"?") + ")");
        console.log("    " + msg);
        if (suggestion) console.log("    \u{1F4A1} " + suggestion);
    }
}

var files;
try {
    files = fs.readdirSync(ROUTES_DIR).filter(function(f) { return f.endsWith(".js"); });
} catch(e) {
    console.error("Cannot read routes dir: " + ROUTES_DIR);
    process.exit(1);
}

files.forEach(function(file) {
    if (PUBLIC_ROUTES.includes(file)) return;
    var content = fs.readFileSync(path.join(ROUTES_DIR, file), "utf8");
    var lines = content.split("\n");
    var fileHasAuth = AUTH_PATTERNS.test(content);
    var reported = false;

    function header() { if (!reported && !jsonMode) { console.log("\n\u{1F4C4} " + file); reported = true; } }

    // Rule 1: File has NO auth at all
    if (!fileHasAuth) {
        header();
        addFinding("high", file, "NO_AUTH_IMPORT",
            "No authentication middleware imported. Endpoints may be unprotected.",
            null, "Add: const { authMiddleware } = require(\"../auth\");");
    }

    // Rule 2: REAL SQL injection — ${variable} inside db calls
    lines.forEach(function(line, idx) {
        var lineNum = idx + 1;
        var trimmed = line.trim();

        // Direct: db.all(`...${foo}...`)
        if (/db\.(all|get|run|prepare|query|exec)\s*\(/.test(trimmed) && /\$\{/.test(trimmed)) {
            // Exclude: params.push, error messages, console.log, SET app.current_org
            if (!_isSafeLine(trimmed)) {
                header();
                addFinding("critical", file, "SQL_INJECTION",
                    "Variable interpolation in DB query: " + trimmed.substring(0, 90),
                    lineNum, "Use parameterized queries: db.all(sql, [$1, $2])");
            }
        }

        // db.exec with dynamic ALTER/CREATE/DROP
        if (/db\.exec\s*\(/.test(trimmed) && /\$\{/.test(trimmed) && /ALTER|CREATE|DROP/i.test(trimmed) && !/_safeId/.test(trimmed)) {
            header();
            addFinding("critical", file, "DYNAMIC_DDL",
                "Dynamic schema change with interpolation: " + trimmed.substring(0, 80),
                lineNum, "Never use user input in DDL statements");
        }
    });
});

if (jsonMode) {
    console.log(JSON.stringify({ stats: stats, findings: findings }, null, 2));
} else {
    console.log("\n" + "\u2550".repeat(50));
    console.log("ROUTE SECURITY AUDIT v2.0 (Tuned)");
    console.log("\u2550".repeat(50));
    console.log("Files scanned:  " + files.length);
    console.log("Total findings: " + stats.total);
    console.log("  \u{1F534} Critical:  " + stats.critical);
    console.log("  \u{1F7E0} High:      " + stats.high);
    console.log("  \u{1F7E1} Medium:    " + stats.medium);
    console.log("  \u{1F535} Low:       " + stats.low);
    console.log("\u2550".repeat(50));
}

process.exit(stats.critical > 0 ? 1 : 0);
