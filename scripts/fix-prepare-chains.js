/**
 * Fix db.prepare(sql).method(params) → Direct db.method(sql, params) calls
 * 
 * Background: After making db.prepare() async, chained calls like
 *   await db.prepare(sql).run(p1, p2)
 * break because .run() is called on the Promise, not on the prepared statement.
 * 
 * This script converts all patterns to use the direct API:
 *   await db.prepare(sql).run(p1, p2)   → await db.run(sql, [p1, p2])
 *   await db.prepare(sql).get(p1)       → await db.get(sql, [p1])
 *   await db.prepare(sql).all(p1)       → await db.all(sql, [p1])
 *   (await db.prepare(sql)).run(p1)     → await db.run(sql, [p1])
 */
const fs = require('fs');
const path = require('path');

const dirs = ['server/routes', 'server/engines'];
const files = [];
for (const dir of dirs) {
    if (fs.existsSync(dir)) {
        for (const f of fs.readdirSync(dir)) {
            if (f.endsWith('.js')) files.push(path.join(dir, f));
        }
    }
}
files.push('server/auth.js');

let totalFixes = 0;
let filesFixed = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf-8');
    let fixCount = 0;

    // Pattern 1: Single-line db.prepare('...').run/get/all(...)
    // Match: db.prepare(SQL_STRING).method(args)
    // Also handles: (await db.prepare(SQL_STRING)).method(args)

    // Strategy: Replace line by line for better control
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];

        // Skip if already using db.run/db.get/db.all directly (not db.prepare)
        if (!line.includes('db.prepare(')) continue;

        // Handle multi-line: if line has db.prepare( but no .run/.get/.all, 
        // join with next lines until we find the closing pattern
        let fullBlock = line;
        let endIdx = i;

        // Check if this line completes the pattern
        const hasMethod = /\)\s*\.\s*(run|get|all)\s*\(/.test(fullBlock);
        if (!hasMethod) {
            // Try merging next lines (up to 5)
            for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
                fullBlock += '\n' + lines[j];
                endIdx = j;
                if (/\)\s*\.\s*(run|get|all)\s*\(/.test(fullBlock)) break;
            }
        }

        // Now try to match and replace the full block
        // Pattern: [await ]db.prepare(SQL).method(ARGS)
        // Where SQL can span multiple lines

        const prepareRegex = /(?:\(await\s+)?(?:await\s+)?db\.prepare\(([\s\S]*?)\)\)?\s*\.\s*(run|get|all)\s*\(([\s\S]*?)\)/;
        const match = fullBlock.match(prepareRegex);

        if (match) {
            const [fullMatch, sqlPart, method, argsPart] = match;

            // Clean up the SQL part (remove leading/trailing whitespace from template literals)
            const cleanSql = sqlPart.trim();

            // Build the replacement
            // If args are empty: db.method(sql)
            // If args present: db.method(sql, [args])
            const trimmedArgs = argsPart.trim();
            let replacement;

            if (method === 'run') {
                // For .run(), args are positional: .run(a, b, c) → db.run(sql, [a, b, c])
                if (trimmedArgs) {
                    replacement = `db.run(${cleanSql}, [${trimmedArgs}])`;
                } else {
                    replacement = `db.run(${cleanSql})`;
                }
            } else if (method === 'get') {
                // For .get(), single arg or positional spread
                if (trimmedArgs) {
                    replacement = `db.get(${cleanSql}, [${trimmedArgs}])`;
                } else {
                    replacement = `db.get(${cleanSql})`;
                }
            } else if (method === 'all') {
                // For .all(), can be spread: .all(...params) or .all(a, b)
                if (trimmedArgs.startsWith('...')) {
                    // .all(...params) → db.all(sql, params)
                    replacement = `db.all(${cleanSql}, ${trimmedArgs.slice(3)})`;
                } else if (trimmedArgs) {
                    replacement = `db.all(${cleanSql}, [${trimmedArgs}])`;
                } else {
                    replacement = `db.all(${cleanSql})`;
                }
            }

            // Add await if not already present
            const lineBeforeMatch = fullBlock.substring(0, fullBlock.indexOf(fullMatch));
            const hasAwait = /await\s*$/.test(lineBeforeMatch) || fullMatch.startsWith('await ') || fullMatch.startsWith('(await ');

            if (hasAwait) {
                // Remove existing await and (await patterns, we'll add it cleanly
                let newBlock = fullBlock.replace(fullMatch, replacement);
                // Ensure 'await' is in front
                if (!newBlock.includes('await db.')) {
                    newBlock = newBlock.replace('db.', 'await db.');
                }
                // Replace lines
                for (let k = i; k <= endIdx; k++) {
                    lines[k] = '';
                }
                lines[i] = newBlock;
            } else {
                let newBlock = fullBlock.replace(fullMatch, `await ${replacement}`);
                for (let k = i; k <= endIdx; k++) {
                    lines[k] = '';
                }
                lines[i] = newBlock;
            }

            fixCount++;
            i = endIdx; // Skip merged lines
        }
    }

    if (fixCount > 0) {
        // Clean up empty lines from multi-line merges
        const newContent = lines.filter((l, idx) => {
            // Keep the line if it's not empty or if it's a blank line that was originally blank
            return l !== '' || content.split('\n')[idx] === '';
        }).join('\n');

        fs.writeFileSync(file, newContent);
        console.log(`${path.basename(file)}: ${fixCount} prepare→direct conversions`);
        totalFixes += fixCount;
        filesFixed++;
    }
}

console.log(`\nTotal: ${totalFixes} conversions across ${filesFixed} files`);
