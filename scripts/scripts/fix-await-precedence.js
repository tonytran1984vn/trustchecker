/**
 * Fix await + optional chaining precedence issue
 * 
 * Before: await db.get('...')?.c || 0
 *   → .c is evaluated on the Promise object, not the resolved value
 * 
 * After: (await db.get('...'))?.c || 0
 *   → .c is evaluated on the resolved value
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
    const original = fs.readFileSync(file, 'utf-8');
    const lines = original.split('\n');
    let fileFixCount = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Pattern: await db.get(...)?.c  where NOT already wrapped in (await ...)
        // We look for: await db.get( or await db.prepare( followed by )?.
        if (line.includes('await db.') && line.includes(')?.') && !line.includes('(await db.')) {
            // Replace: await db.get(...)?.X  →  (await db.get(...))?.X
            // Replace: await db.prepare(...)?.X  →  (await db.prepare(...))?.X
            const newLine = line.replace(
                /await\s+(db\.(?:get|all|prepare)\(.*?\))\?\./g,
                '(await $1)?.'
            );
            if (newLine !== line) {
                lines[i] = newLine;
                fileFixCount++;
            }
        }
    }

    if (fileFixCount > 0) {
        fs.writeFileSync(file, lines.join('\n'));
        console.log(`${path.basename(file)}: ${fileFixCount} fixes`);
        totalFixes += fileFixCount;
        filesFixed++;
    }
}

console.log(`\nTotal: ${totalFixes} fixes across ${filesFixed} files`);
