const Database = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'data', 'trustchecker.db');

async function fix() {
    const SQL = await Database();
    const buf = fs.readFileSync(DB_PATH);
    const db = new SQL.Database(buf);

    // Add missing columns
    const alters = [
        "ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0",
        "ALTER TABLE users ADD COLUMN password_changed_at TEXT",
        "ALTER TABLE rbac_roles ADD COLUMN mfa_policy TEXT DEFAULT 'optional'"
    ];
    for (const sql of alters) {
        try { db.run(sql); console.log('✅ ' + sql.split('ADD COLUMN ')[1]); }
        catch (e) { console.log('⏭️  Column already exists: ' + sql.split('ADD COLUMN ')[1].split(' ')[0]); }
    }

    // Unlock all accounts
    db.run('UPDATE users SET failed_attempts = 0, locked_until = NULL');
    console.log('🔓 All accounts unlocked');

    // Reset admin password to known value
    const newPassword = 'TrustAdmin2026!@#';
    const hash = await bcrypt.hash(newPassword, 12);
    db.run('UPDATE users SET password_hash = ? WHERE email = ?', [hash, 'admin@trustchecker.io']);
    console.log('🔑 Admin password reset to: ' + newPassword);

    // Show users
    const r = db.exec('SELECT username, email, role, failed_attempts, must_change_password FROM users');
    if (r.length > 0) {
        console.log('\n📋 Users:');
        r[0].values.forEach(v => console.log(`  ${v[1]} (${v[2]}) locked:${v[3]} must_change:${v[4]}`));
    }

    // Save
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
    console.log('\n💾 Database saved successfully');
}

fix().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
