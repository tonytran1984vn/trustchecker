#!/usr/bin/env node
/**
 * TrustChecker DevSecOps — Tenant Isolation Scanner v2.0 (Tuned)
 *
 * Precision rules:
 * - Only flags broadcast/emit without org scope in websocket contexts
 * - Cache check looks for actual cache library usage, not just the word "cache"
 * - File operations: only flag writeFile/readFile with dynamic paths
 * - Background jobs: only flag setTimeout with db access and no org context
 */

var fs = require("fs");
var path = require("path");

var SCAN_DIRS = ["server/routes", "server/engines", "server/middleware", "server/boot", "server/jobs", "server/websocket"];

var jsonMode = process.argv.includes("--json");
var findings = [];
var stats = { total: 0, critical: 0, high: 0, medium: 0, low: 0, files_scanned: 0 };

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

function scanFile(filepath) {
    var content = fs.readFileSync(filepath, "utf8");
    var relPath = path.relative(process.cwd(), filepath);
    var lines = content.split("\n");
    stats.files_scanned++;
    var reported = false;

    function header() { if (!reported && !jsonMode) { console.log("\n\u{1F4C4} " + relPath); reported = true; } }

    // Only scan files with relevant patterns
    var hasWS = /broadcast|\.emit\(|io\.(to|emit)|socket\./i.test(content);
    var hasCache = /redis|_dataCache\.(set|get)|memcache/i.test(content);
    var hasFile = /writeFileSync|writeFile|createWriteStream|appendFile/i.test(content);
    var hasTimer = /setTimeout|setInterval|cron\.|schedule/i.test(content);

    if (!hasWS && !hasCache && !hasFile && !hasTimer) return;

    lines.forEach(function(line, idx) {
        var lineNum = idx + 1;
        var trimmed = line.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) return;

        // Rule 1: WebSocket broadcast without org scope
        if (hasWS && /\.(emit|broadcast)\s*\(/.test(trimmed)) {
            if (!/org_id|org\.id|orgId|room|channel|\.to\(/.test(trimmed) && !/this\.emit|DEVSECOPS/.test(trimmed)) {
                header();
                addFinding("critical", relPath, "BROADCAST_NO_ORG",
                    "Event emitted without org scope: " + trimmed.substring(0, 80),
                    lineNum, "Scope to org: io.to(org_id).emit(event, data)");
            }
        }

        // Rule 2: Redis/cache without org prefix
        if (hasCache && /\.(set|get|del)\s*\(/.test(trimmed) && /redis|cache/i.test(trimmed)) {
            if (!/org_id|org\.id|orgId|\$\{.*org|DEVSECOPS|lock:scheduler/.test(trimmed)) {
                header();
                addFinding("high", relPath, "CACHE_NO_ORG_KEY",
                    "Cache key without org prefix: " + trimmed.substring(0, 80),
                    lineNum, "Prefix: cache.set(`${org_id}:key`, value)");
            }
        }

        // Rule 3: File write with user-controlled path
        if (hasFile && /(writeFile|createWriteStream|appendFile)\s*\(/.test(trimmed)) {
            if (/req\.|user\.|params\./.test(trimmed) && !/org_id/.test(trimmed)) {
                header();
                addFinding("high", relPath, "FILE_PATH_INJECTION",
                    "File write with user-controlled path: " + trimmed.substring(0, 80),
                    lineNum, "Validate path, use org-scoped directories");
            }
        }

        // Rule 4: Background timer with DB but no org context
        if (hasTimer && /\b(setTimeout|setInterval)\s*\(/.test(trimmed)) {
            var nextLines = lines.slice(idx, Math.min(idx + 8, lines.length)).join(" ");
            if (/db\.(all|get|run|query)/.test(nextLines) && !/org_id|org\.id|current_setting|_orgId/.test(nextLines)) {
                header();
                addFinding("high", relPath, "TIMER_NO_ORG_CONTEXT",
                    "Background task with DB access but no org context",
                    lineNum, "Pass org_id to ensure tenant isolation in async operations");
            }
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
    console.log("TENANT ISOLATION AUDIT v2.0 (Tuned)");
    console.log("\u2550".repeat(50));
    console.log("Files scanned:   " + stats.files_scanned);
    console.log("Total findings:  " + stats.total);
    console.log("  \u{1F534} Critical:   " + stats.critical);
    console.log("  \u{1F7E0} High:       " + stats.high);
    console.log("  \u{1F7E1} Medium:     " + stats.medium);
    console.log("  \u{1F535} Low:        " + stats.low);
    console.log("\u2550".repeat(50));
}

process.exit(stats.critical > 0 ? 1 : 0);
