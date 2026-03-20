/**
 * Reset ALL user passwords to 123qaz12
 * Run: node reset-all-passwords.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');

const TARGET_PASSWORD = '123qaz12';

const USERS = [
    // 15 org users (@tonyisking.com)
    'owner@tonyisking.com',
    'ceo@tonyisking.com',
    'admin@tonyisking.com',
    'companyadmin@tonyisking.com',
    'ops@tonyisking.com',
    'risk@tonyisking.com',
    'compliance@tonyisking.com',
    'carbon@tonyisking.com',
    'scm@tonyisking.com',
    'auditor@tonyisking.com',
    'operator@tonyisking.com',
    'blockchain@tonyisking.com',
    'ivu@tonyisking.com',
    'security@tonyisking.com',
    'viewer@tonyisking.com',
    // Platform admin
    'admin@trustchecker.io',
];

(async () => {
    const db = require('./server/db');
    await db._readyPromise;
    console.log('✅ DB connected\n');

    const hash = await bcrypt.hash(TARGET_PASSWORD, 12);
    console.log(`🔑 Target password: ${TARGET_PASSWORD}`);
    console.log(`🔒 Bcrypt hash: ${hash.substring(0, 30)}...\n`);

    let success = 0;
    let notFound = 0;

    for (const email of USERS) {
        // Check if user exists
        const user = await db.get('SELECT id, email, username, role FROM users WHERE email = $1', [email]);

        if (!user) {
            console.log(`  ⚠ ${email} — NOT FOUND`);
            notFound++;
            continue;
        }

        // Update password + reset lockout
        await db.run(
            `UPDATE users SET password_hash = $1, failed_attempts = 0, locked_until = NULL, must_change_password = false WHERE email = $2`,
            [hash, email]
        );

        console.log(`  ✓ ${email} (${user.username || user.role})`);
        success++;
    }

    // Verify one
    console.log('\n── Verification ──');
    const check = await db.get('SELECT password_hash FROM users WHERE email = $1', ['owner@tonyisking.com']);
    if (check) {
        const ok = await bcrypt.compare(TARGET_PASSWORD, check.password_hash);
        console.log(`  owner@tonyisking.com login test: ${ok ? '✅ PASS' : '❌ FAIL'}`);
    }

    const check2 = await db.get('SELECT password_hash FROM users WHERE email = $1', ['admin@trustchecker.io']);
    if (check2) {
        const ok2 = await bcrypt.compare(TARGET_PASSWORD, check2.password_hash);
        console.log(`  admin@trustchecker.io login test: ${ok2 ? '✅ PASS' : '❌ FAIL'}`);
    }

    console.log(`\n═══════════════════════════════`);
    console.log(`  ✅ Reset: ${success} users`);
    console.log(`  ⚠  Not found: ${notFound} users`);
    console.log(`  Password: ${TARGET_PASSWORD}`);
    console.log(`═══════════════════════════════\n`);

    process.exit(0);
})().catch(e => { console.error('❌ ERROR:', e.message); process.exit(1); });
