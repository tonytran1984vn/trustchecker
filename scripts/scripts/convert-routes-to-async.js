/**
 * TrustChecker v9.0 — Route Handler Async Converter
 * 
 * Converts all synchronous route handlers to async and adds await 
 * to all db.get(), db.all(), db.run(), db.prepare().run/get/all() calls.
 * 
 * Usage: node scripts/convert-routes-to-async.js
 * 
 * This is a one-time migration tool. Review changes after running.
 */

const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'server', 'routes');
const AUTH_FILE = path.join(__dirname, '..', 'server', 'auth.js');

function convertFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    const original = content;
    let changes = 0;

    // 1. Convert (req, res) => { → async (req, res) => {
    content = content.replace(
        /\(req,\s*res\)\s*=>\s*\{/g,
        (match) => { changes++; return 'async (req, res) => {'; }
    );

    // Also handle: (req, res, next) => {
    content = content.replace(
        /\(req,\s*res,\s*next\)\s*=>\s*\{/g,
        (match) => { changes++; return 'async (req, res, next) => {'; }
    );

    // 2. Add await to db.get(...)
    //    Match: db.get("...") or db.get('...') or db.get(`...`)
    //    But NOT already preceded by await
    content = content.replace(
        /(?<!await\s)(?<!await\s\s)(db\.get\()/g,
        (match) => { changes++; return 'await db.get('; }
    );

    // 3. Add await to db.all(...)
    content = content.replace(
        /(?<!await\s)(?<!await\s\s)(db\.all\()/g,
        (match) => { changes++; return 'await db.all('; }
    );

    // 4. Add await to db.run(...)
    content = content.replace(
        /(?<!await\s)(?<!await\s\s)(db\.run\()/g,
        (match) => { changes++; return 'await db.run('; }
    );

    // 5. Add await to db.prepare(...).run/get/all(...)
    content = content.replace(
        /(?<!await\s)(?<!await\s\s)(db\.prepare\()/g,
        (match) => { changes++; return 'await db.prepare('; }
    );

    // 6. Fix double-async (async async)
    content = content.replace(/async\s+async\s+/g, 'async ');

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log(`  ✅ ${path.basename(filePath)}: ${changes} changes`);
        return changes;
    } else {
        console.log(`  ⏭️  ${path.basename(filePath)}: no changes needed`);
        return 0;
    }
}

function main() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   Route Handler Async Converter                 ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    let totalChanges = 0;
    let filesChanged = 0;

    // Convert all route files
    const routeFiles = fs.readdirSync(ROUTES_DIR)
        .filter(f => f.endsWith('.js'))
        .map(f => path.join(ROUTES_DIR, f));

    // Add auth.js
    routeFiles.push(AUTH_FILE);

    for (const file of routeFiles) {
        const changes = convertFile(file);
        if (changes > 0) filesChanged++;
        totalChanges += changes;
    }

    console.log(`\n═══════════════════════════════════════════════════`);
    console.log(`✅ Done: ${totalChanges} changes across ${filesChanged} files`);
    console.log(`═══════════════════════════════════════════════════\n`);
    console.log('⚠️  Review the changes and test thoroughly!');
    console.log('   Some patterns may need manual adjustment.');
}

main();
