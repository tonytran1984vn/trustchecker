#!/usr/bin/env node
/**
 * TrustChecker DevSecOps — Migration Risk Detector v1.0
 *
 * Scans migration files and SQL scripts for:
 * 1. DROP COLUMN/TABLE (data loss)
 * 2. ALTER TYPE on large tables (table lock)
 * 3. NOT NULL without DEFAULT (breaks existing rows)
 * 4. Missing IF NOT EXISTS (non-idempotent)
 * 5. Index on large table without CONCURRENTLY
 */

var fs = require("fs");
var path = require("path");

var MIGRATION_DIRS = ["migrations", "server/migrations", "db/migrations", "prisma/migrations"];
var LARGE_TABLES = ["audit_log", "audit_logs", "scan_events", "blockchain_seals", "products", "partners", "incidents"];

var jsonMode = process.argv.includes("--json");
var findings = [];
var stats = { total: 0, critical: 0, high: 0, medium: 0, low: 0, files_scanned: 0 };

function addFinding(severity, file, rule, message, line, suggestion) {
    stats.total++;
    stats[severity]++;
    findings.push({ severity: severity, file: file, rule: rule, message: message, line: line || 0, suggestion: suggestion || "" });
    if (!jsonMode) {
        var icon = severity === "critical" ? "🔴" : severity === "high" ? "🟠" : severity === "medium" ? "🟡" : "🔵";
        console.log("  " + icon + " [" + severity.toUpperCase() + "] " + rule);
        console.log("    " + message);
        if (suggestion) console.log("    💡 " + suggestion);
    }
}

function scanMigration(filepath) {
    var content = fs.readFileSync(filepath, "utf8");
    var relPath = path.relative(process.cwd(), filepath);
    stats.files_scanned++;
    
    if (!jsonMode) console.log("\n📄 " + relPath);
    
    var lines = content.split("\n");
    lines.forEach(function(line, idx) {
        var lineNum = idx + 1;
        var upper = line.toUpperCase().trim();
        
        // DROP COLUMN
        if (/DROP\s+COLUMN/i.test(line)) {
            addFinding("critical", relPath, "DROP_COLUMN",
                "Dropping column permanently deletes data: " + line.trim().substring(0, 80),
                lineNum,
                "Consider renaming to _deprecated instead, or backup data first");
        }
        
        // DROP TABLE
        if (/DROP\s+TABLE(?!\s+IF)/i.test(line)) {
            addFinding("critical", relPath, "DROP_TABLE",
                "DROP TABLE without IF EXISTS: " + line.trim().substring(0, 60),
                lineNum,
                "Use DROP TABLE IF EXISTS and ensure data is backed up");
        }
        
        // ALTER TYPE on large table
        if (/ALTER\s+(?:TABLE|COLUMN).*TYPE/i.test(line)) {
            var isLarge = LARGE_TABLES.some(function(t) { return line.toLowerCase().includes(t); });
            if (isLarge) {
                addFinding("critical", relPath, "ALTER_TYPE_LARGE_TABLE",
                    "Changing column type on large table will LOCK table: " + line.trim().substring(0, 80),
                    lineNum,
                    "Create new column, copy data, swap — avoid ALTER TYPE on production");
            } else {
                addFinding("medium", relPath, "ALTER_TYPE",
                    "Column type change may lock table: " + line.trim().substring(0, 60),
                    lineNum);
            }
        }
        
        // NOT NULL without DEFAULT
        if (/NOT\s+NULL/i.test(line) && !/DEFAULT/i.test(line) && /ADD\s+COLUMN/i.test(line)) {
            addFinding("high", relPath, "NOT_NULL_NO_DEFAULT",
                "Adding NOT NULL column without DEFAULT breaks existing rows: " + line.trim().substring(0, 80),
                lineNum,
                "Add DEFAULT value or make nullable first, backfill, then set NOT NULL");
        }
        
        // CREATE TABLE without IF NOT EXISTS
        if (/CREATE\s+TABLE(?!\s+IF)/i.test(line)) {
            addFinding("low", relPath, "NON_IDEMPOTENT_CREATE",
                "CREATE TABLE without IF NOT EXISTS: " + line.trim().substring(0, 60),
                lineNum,
                "Use CREATE TABLE IF NOT EXISTS for idempotent migrations");
        }
        
        // CREATE INDEX without CONCURRENTLY on large table
        if (/CREATE\s+INDEX(?!\s+CONCURRENTLY)/i.test(line)) {
            var isLargeT = LARGE_TABLES.some(function(t) { return line.toLowerCase().includes(t); });
            if (isLargeT) {
                addFinding("high", relPath, "INDEX_WITHOUT_CONCURRENTLY",
                    "Creating index on large table without CONCURRENTLY will LOCK table: " + line.trim().substring(0, 80),
                    lineNum,
                    "Use CREATE INDEX CONCURRENTLY to avoid table lock");
            }
        }
        
        // TRUNCATE
        if (/TRUNCATE/i.test(line)) {
            addFinding("critical", relPath, "TRUNCATE",
                "TRUNCATE permanently deletes all rows: " + line.trim().substring(0, 60),
                lineNum,
                "This is irreversible. Ensure backups exist.");
        }
    });
}

function findMigrations(dir) {
    var fullDir = path.join(process.cwd(), dir);
    if (!fs.existsSync(fullDir)) return;
    
    function walk(d) {
        fs.readdirSync(d).forEach(function(f) {
            var fp = path.join(d, f);
            if (fs.statSync(fp).isDirectory()) { walk(fp); }
            else if (/\.(sql|js)$/i.test(f)) { scanMigration(fp); }
        });
    }
    walk(fullDir);
}

MIGRATION_DIRS.forEach(findMigrations);

if (jsonMode) {
    console.log(JSON.stringify({ stats: stats, findings: findings }, null, 2));
} else {
    console.log("\n" + "═".repeat(50));
    console.log("MIGRATION RISK AUDIT SUMMARY");
    console.log("═".repeat(50));
    console.log("Files scanned:   " + stats.files_scanned);
    console.log("Total findings:  " + stats.total);
    console.log("  🔴 Critical:   " + stats.critical);
    console.log("  🟠 High:       " + stats.high);
    console.log("  🟡 Medium:     " + stats.medium);
    console.log("  🔵 Low:        " + stats.low);
    if (stats.files_scanned === 0) console.log("  ℹ️  No migration files found");
    console.log("═".repeat(50));
}

process.exit(stats.critical > 0 ? 1 : 0);
