/**
 * Quick fix: create admin@trustchecker.io account
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

(async () => {
    const db = require('./db');
    if (db.init) await db.init();
    await new Promise(r => setTimeout(r, 2000));

    const hash = await bcrypt.hash('Trust@2026!', 12);

    // Fix username conflict: rename admin@demo to demo_admin
    try {
        await db.prepare("UPDATE users SET username = ? WHERE email = ?")
            .run('demo_admin', 'admin@demo.trustchecker.io');
        console.log('✅ Renamed demo admin username to demo_admin');
    } catch (e) { console.log('Skip rename:', e.message); }

    // Create or update admin@trustchecker.io
    const existing = await db.prepare("SELECT id FROM users WHERE email = ?")
        .get('admin@trustchecker.io');

    if (existing) {
        await db.prepare("UPDATE users SET password_hash = ?, role = ?, user_type = ? WHERE email = ?")
            .run(hash, 'super_admin', 'platform', 'admin@trustchecker.io');
        console.log('✅ Updated admin@trustchecker.io password');
    } else {
        const id = uuidv4();
        await db.prepare("INSERT INTO users (id, username, email, password_hash, role, user_type, company) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .run(id, 'superadmin', 'admin@trustchecker.io', hash, 'super_admin', 'platform', 'TrustChecker');
        console.log('✅ Created admin@trustchecker.io');
    }

    // Verify
    const u = await db.prepare("SELECT email, username, role FROM users WHERE email = ?")
        .get('admin@trustchecker.io');
    console.log('Verified:', JSON.stringify(u));

    // Test bcrypt
    const check = await db.prepare("SELECT password_hash FROM users WHERE email = ?")
        .get('admin@trustchecker.io');
    const ok = await bcrypt.compare('Trust@2026!', check.password_hash);
    console.log('Password match:', ok);

    process.exit(0);
})().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
