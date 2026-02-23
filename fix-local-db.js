#!/usr/bin/env node
/**
 * Fix local SQLite DB — reset admin password
 */
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

async function main() {
    const initSQL = require('sql.js');
    const SQL = await initSQL();

    const dbPath = path.join(__dirname, 'data', 'trustchecker.db');
    if (!fs.existsSync(dbPath)) {
        console.error('DB not found at', dbPath);
        process.exit(1);
    }

    const buf = fs.readFileSync(dbPath);
    const db = new SQL.Database(buf);

    // Hash new password 
    const pw = 'TrustAdmin2026!@#';
    const hash = bcrypt.hashSync(pw, 12);

    // Update admin
    db.run(
        'UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE email = ?',
        [hash, 'admin@trustchecker.io']
    );

    // Verify
    const rows = db.exec("SELECT email, role, failed_attempts FROM users WHERE email = 'admin@trustchecker.io'");
    console.log('User:', JSON.stringify(rows));

    // Save
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
    console.log('Done — password reset to:', pw);
}

main().catch(e => { console.error(e); process.exit(1); });
