/**
 * Migration: Set admin user role to super_admin
 * Run from /var/www/html/trustchecker/server: node fix_role.js
 */
const fs = require('fs');
const path = require('path');
// DB is at /var/www/html/trustchecker/data/trustchecker.db
const DB_PATH = path.join(__dirname, '..', 'data', 'trustchecker.db');

// Try sql.js first (what the VPS uses), fallback to better-sqlite3
async function main() {
    let db;
    try {
        const initSqlJs = require('sql.js');
        const SQL = await initSqlJs();
        const buf = fs.readFileSync(DB_PATH);
        db = new SQL.Database(buf);

        console.log('BEFORE:');
        const before = db.exec("SELECT id, username, role FROM users");
        if (before.length) before[0].values.forEach(r => console.log(`  ${r[1]} => ${r[2]}`));

        db.run("UPDATE users SET role = 'super_admin' WHERE username = 'admin'");

        console.log('AFTER:');
        const after = db.exec("SELECT id, username, role FROM users");
        if (after.length) after[0].values.forEach(r => console.log(`  ${r[1]} => ${r[2]}`));

        // Save back
        const data = db.export();
        fs.writeFileSync(DB_PATH, Buffer.from(data));
        console.log('✅ Database saved. Restart the app (pm2 restart trustchecker).');
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}
main();
