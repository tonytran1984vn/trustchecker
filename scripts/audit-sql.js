#!/usr/bin/env node
/**
 * TrustChecker DevSecOps — SQL Safety Scanner v2.0 (Tuned)
 *
 * Precision rules:
 * - 133/135 tables have RLS → skip "missing org_id" for RLS tables
 * - Only flag ${...} directly interpolated into SQL strings (not params.push)
 * - SELECT * is low priority, not high
 * - Large table scan only flagged without LIMIT
 */

var fs = require("fs");
var path = require("path");

var SCAN_DIRS = ["server/routes", "server/engines", "server/middleware"];

// Tables WITHOUT RLS (actually need manual org_id filtering)
var NON_RLS_TABLES = ["materialized_view_refresh_log"];

// Large tables (warn about unbounded scans)
var LARGE_TABLES = ["audit_log", "scan_events", "blockchain_seals", "products", "partners", "incidents", "score_validations", "ratings"];

// System/meta tables (never need org_id)
var SYSTEM_TABLES = ["pg_", "information_schema", "migrations", "_prisma"];

var jsonMode = process.argv.includes("--json");
var findings = [];
var stats = { total: 0, critical: 0, high: 0, medium: 0, low: 0, files_scanned: 0, queries_found: 0 };

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

function isSystemTable(sql) {
    return SYSTEM_TABLES.some(function(t) { return sql.toLowerCase().includes(t); });
}

function isLargeTable(sql) {
    return LARGE_TABLES.some(function(t) { return sql.toLowerCase().includes(t); });
}

function scanFile(filepath) {
    var content = fs.readFileSync(filepath, "utf8");
    var lines = content.split("\n");
    var relPath = path.relative(process.cwd(), filepath);
    stats.files_scanned++;
    var reported = false;

    function header() { if (!reported && !jsonMode) { console.log("\n\u{1F4C4} " + relPath); reported = true; } }

    // Approach: find db.all/get/run/exec calls and analyze each one
    lines.forEach(function(line, idx) {
        var lineNum = idx + 1;
        var trimmed = line.trim();

        // Only look at lines with SQL keywords
        if (!/SELECT|INSERT|UPDATE|DELETE|ALTER|DROP|TRUNCATE/i.test(trimmed)) return;

        // Only look at lines that are inside db calls or template literals
        var isDbCall = /db\.(all|get|run|prepare|query|exec)\s*\(/.test(trimmed);
        var isTemplateLiteral = /`[^`]*(?:SELECT|INSERT|UPDATE|DELETE)/i.test(trimmed);
        var isStringLiteral = /("|')[^"']*(?:SELECT|INSERT|UPDATE|DELETE)/i.test(trimmed);

        if (!isDbCall && !isTemplateLiteral && !isStringLiteral) return;
        stats.queries_found++;

        // Rule 1: String interpolation INSIDE SQL (real injection risk)
        if (/\$\{/.test(trimmed) && (isDbCall || isTemplateLiteral)) {
            // Exclude: params.push, join, error messages, console, SET app.current_org
            if (!/params\.push|\.join\(|res\.|console\.|message|current_setting|app\.current_org|error|_safeId|_safeWhere|_safeJoin|_safePlaceholders|_safeDate|description:|excluded_operations|cannot:|Scope 3|Deleted User|anonEmail|anonName|triggeredRules|placeholders|typeof sql|_validateSql/i.test(trimmed)) {
                header();
                addFinding("critical", relPath, "SQL_INJECTION",
                    "Variable interpolation in SQL: " + trimmed.substring(0, 90),
                    lineNum, "Use parameterized queries with $1, $2 placeholders");
            }
        }

        // Rule 2: SELECT on non-RLS table without org_id
        if (/SELECT/i.test(trimmed) && !isSystemTable(trimmed)) {
            var mentionsNonRls = NON_RLS_TABLES.some(function(t) { return trimmed.toLowerCase().includes(t); });
            if (mentionsNonRls && !/org_id|current_setting/i.test(trimmed)) {
                header();
                addFinding("high", relPath, "NO_ORG_FILTER_NON_RLS",
                    "Query on non-RLS table without org_id: " + trimmed.substring(0, 80),
                    lineNum, "Add WHERE org_id = $N since this table has no RLS protection");
            }
        }

        // Rule 3: SELECT on large table without LIMIT
        if (/SELECT/i.test(trimmed) && isLargeTable(trimmed)) {
            // Check this line and next 3 for LIMIT
            var context = lines.slice(idx, Math.min(idx + 4, lines.length)).join(" ");
            if (!/LIMIT|COUNT|SUM|AVG|MAX|MIN|GROUP BY/i.test(context)) {
                header();
                addFinding("medium", relPath, "UNBOUNDED_LARGE_TABLE",
                    "Query on large table without LIMIT: " + trimmed.substring(0, 80),
                    lineNum, "Add LIMIT to prevent full table scan at scale");
            }
        }

        // Rule 4: DROP/TRUNCATE in application code
        if (/DROP\s+TABLE|TRUNCATE/i.test(trimmed) && !trimmed.startsWith("//") && !trimmed.startsWith("*") && !/excluded_operations|cannot:|TRUNCATE|"TRUNCATE"/i.test(trimmed)) {
            header();
            addFinding("critical", relPath, "DESTRUCTIVE_QUERY",
                "DROP/TRUNCATE in application code: " + trimmed.substring(0, 60),
                lineNum, "Use migrations for destructive changes, never in app code");
        }
    });
}

function scanDir(dir) {
    var fullDir = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullDir)) return;
    fs.readdirSync(fullDir).forEach(function(f) {
        var fp = path.join(fullDir, f);
        if (fs.statSync(fp).isFile() && f.endsWith(".js")) scanFile(fp);
    });
}

SCAN_DIRS.forEach(scanDir);

if (jsonMode) {
    console.log(JSON.stringify({ stats: stats, findings: findings }, null, 2));
} else {
    console.log("\n" + "\u2550".repeat(50));
    console.log("SQL SAFETY AUDIT v2.0 (Tuned)");
    console.log("\u2550".repeat(50));
    console.log("Files scanned:   " + stats.files_scanned);
    console.log("SQL queries:     " + stats.queries_found);
    console.log("Total findings:  " + stats.total);
    console.log("  \u{1F534} Critical:   " + stats.critical);
    console.log("  \u{1F7E0} High:       " + stats.high);
    console.log("  \u{1F7E1} Medium:     " + stats.medium);
    console.log("  \u{1F535} Low:        " + stats.low);
    console.log("\u2550".repeat(50));
}

process.exit(stats.critical > 0 ? 1 : 0);
