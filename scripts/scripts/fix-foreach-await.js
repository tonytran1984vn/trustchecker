/**
 * Fix Script: Convert forEach callbacks containing 'await' to for...of loops
 *
 * Problem: .forEach(item => { await db.xyz(); }) is invalid because
 * the forEach callback is not async, and even if made async, forEach
 * doesn't await the callback's promise.
 *
 * Solution: Convert to for (const item of array) { await db.xyz(); }
 */

const fs = require('fs');
const path = require('path');

function fixFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    let fixes = 0;

    // Strategy: find ".forEach(varName => {" blocks that contain "await",
    // and replace them with "for (const varName of array) {"
    // 
    // Pattern: arrayExpr.forEach(param => {  ...body...  });
    // Replace: for (const param of arrayExpr) {  ...body...  }

    const lines = content.split('\n');
    let i = 0;
    const newLines = [];

    while (i < lines.length) {
        const line = lines[i];

        // Match: something.forEach(param => {  or  something.forEach((param) => {
        const forEachMatch = line.match(/^(\s*)(.+?)\.forEach\(\(?(\w+)\)?\s*=>\s*\{$/);

        if (forEachMatch) {
            // Check if there's await inside this forEach block
            let depth = 1; // we're past the opening {
            let hasAwait = false;
            let endLine = -1;

            for (let j = i + 1; j < lines.length; j++) {
                for (const ch of lines[j]) {
                    if (ch === '{') depth++;
                    if (ch === '}') depth--;
                }
                if (/\bawait\s/.test(lines[j]) && depth > 0) {
                    hasAwait = true;
                }
                if (depth === 0) {
                    endLine = j;
                    break;
                }
            }

            if (hasAwait && endLine > 0) {
                const indent = forEachMatch[1];
                const arrayExpr = forEachMatch[2];
                const paramName = forEachMatch[3];

                // Replace forEach opener
                newLines.push(`${indent}for (const ${paramName} of ${arrayExpr}) {`);

                // Copy body lines
                for (let j = i + 1; j < endLine; j++) {
                    newLines.push(lines[j]);
                }

                // Replace closing: "});" or "})" with "}"
                const closingLine = lines[endLine];
                newLines.push(closingLine.replace(/\}\);?\s*$/, '}'));

                fixes++;
                i = endLine + 1;
                continue;
            }
        }

        newLines.push(line);
        i++;
    }

    if (fixes > 0) {
        fs.writeFileSync(filePath, newLines.join('\n'));
        console.log(`  ✅ ${path.basename(filePath)}: ${fixes} forEach→for...of`);
    }
    return fixes;
}

function main() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   Convert forEach+await → for...of              ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    let totalFixes = 0;
    const dirs = ['server/routes', 'server'];
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
    console.log(`✅ Done: ${totalFixes} forEach→for...of conversions`);
    console.log(`═══════════════════════════════════════════════════\n`);
}

main();
