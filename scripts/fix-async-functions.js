/**
 * Fix Script: Add 'async' to all non-async functions that contain 'await'
 * 
 * The bulk conversion script (convert-routes-to-async.js) only targeted
 * arrow functions like (req, res) => {}, but missed:
 *   - function name() {} declarations
 *   - const name = function() {} expressions
 *   - module.exports = function() {}
 *
 * This script scans all .js files and adds 'async' where needed.
 */

const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    let fixes = 0;

    // Fix 1: "function name(" -> "async function name(" if body has await
    // We do simple line-based detection: find function declarations,
    // then scan ahead for 'await' within the same brace scope
    const lines = content.split('\n');
    const fixedLines = [...lines];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip lines that are already async
        if (/\basync\b/.test(line)) continue;

        // Match: function name(  or  function(
        const funcMatch = line.match(/^(\s*)(function\s+\w+\s*\(|function\s*\()/);
        if (!funcMatch) continue;

        // Scan forward to find if there's an 'await' in this function
        let depth = 0;
        let foundOpen = false;
        let hasAwait = false;

        for (let j = i; j < lines.length; j++) {
            for (const ch of lines[j]) {
                if (ch === '{') { depth++; foundOpen = true; }
                if (ch === '}') depth--;
            }

            // Only check for await inside the function body (after the opening brace, before the closing one)
            if (foundOpen && j > i && depth > 0 && /\bawait\s/.test(lines[j])) {
                hasAwait = true;
                break;
            }

            // End of function
            if (foundOpen && depth === 0) break;
        }

        if (hasAwait) {
            fixedLines[i] = line.replace(/(function\s)/, 'async function ').replace(/async function\s+function/, 'async function');
            fixes++;
        }
    }

    if (fixes > 0) {
        content = fixedLines.join('\n');

        // Fix 2: Also handle arrow functions not caught before:
        // const name = (...) => { ... await ... }
        // We need a regex approach for these since they span multiple lines
        // Skip this for now - the original script already handled arrow functions

        // Clean up any double-async
        content = content.replace(/async\s+async\s+/g, 'async ');

        fs.writeFileSync(filePath, content);
        console.log(`  ✅ ${path.basename(filePath)}: ${fixes} function declarations fixed`);
    }
    return fixes;
}

function main() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   Fix Non-Async Functions with Await            ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    let totalFixes = 0;
    const dirs = ['server', 'server/routes', 'server/middleware', 'server/engines'];
    const files = new Set();

    for (const dir of dirs) {
        const fullDir = path.join(__dirname, '..', dir);
        if (!fs.existsSync(fullDir)) continue;
        for (const f of fs.readdirSync(fullDir)) {
            if (f.endsWith('.js')) {
                files.add(path.join(fullDir, f));
            }
        }
    }

    for (const f of files) {
        totalFixes += fixFile(f);
    }

    console.log(`\n═══════════════════════════════════════════════════`);
    console.log(`✅ Done: ${totalFixes} function declarations fixed`);
    console.log(`═══════════════════════════════════════════════════\n`);
}

main();
