#!/usr/bin/env node
/**
 * TrustChecker DevSecOps — Master Audit Runner v1.0
 *
 * Runs all security scanners and produces unified report.
 * Usage: node scripts/run-audit.js [--json] [--ci]
 */

var child = require("child_process");
var path = require("path");

var SCANNERS = [
    { name: "Route Security", script: "audit-routes.js", icon: "🛡️" },
    { name: "SQL Safety", script: "audit-sql.js", icon: "💾" },
    { name: "Migration Risk", script: "audit-migrations.js", icon: "🔄" },
    { name: "Tenant Isolation", script: "audit-tenant.js", icon: "🏢" }
];

var isCI = process.argv.includes("--ci");
var isJSON = process.argv.includes("--json");
var results = [];
var exitCode = 0;

console.log("");
console.log("╔══════════════════════════════════════════════════╗");
console.log("║   TrustChecker AI DevSecOps Audit Pipeline v1.0 ║");
console.log("║   " + new Date().toISOString().split("T")[0] + "                                    ║");
console.log("╚══════════════════════════════════════════════════╝");
console.log("");

SCANNERS.forEach(function(scanner) {
    console.log("─".repeat(50));
    console.log(scanner.icon + "  " + scanner.name + " Scanner");
    console.log("─".repeat(50));
    
    var scriptPath = path.join(__dirname, scanner.script);
    
    try {
        var output = child.execSync("node " + scriptPath, {
            cwd: path.join(__dirname, ".."),
            encoding: "utf8",
            timeout: 30000,
            stdio: ["pipe", "pipe", "pipe"]
        });
        console.log(output);
        results.push({ scanner: scanner.name, status: "pass", output: output });
    } catch(err) {
        // Exit code 1 = critical findings
        console.log(err.stdout || "");
        if (err.stderr) console.error(err.stderr);
        results.push({ scanner: scanner.name, status: "fail", output: err.stdout || "" });
        exitCode = 1;
    }
});

console.log("\n" + "═".repeat(50));
console.log("OVERALL AUDIT RESULT");
console.log("═".repeat(50));

results.forEach(function(r) {
    var icon = r.status === "pass" ? "✅" : "❌";
    console.log("  " + icon + " " + r.scanner + ": " + r.status.toUpperCase());
});

if (exitCode > 0) {
    console.log("\n⛔ AUDIT FAILED — Critical findings detected.");
    if (isCI) console.log("   Pipeline blocked. Fix critical issues before merge.");
} else {
    console.log("\n✅ AUDIT PASSED — No critical findings.");
}

console.log("═".repeat(50));
process.exit(isCI ? exitCode : 0);
