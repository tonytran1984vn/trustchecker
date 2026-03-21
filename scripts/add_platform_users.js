/**
 * Add 2 missing platform accounts: security@tonyisking.com and datagov@tonyisking.com
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('./server/db');

(async () => {
    const hash = await bcrypt.hash('123qaz12', 10);

    // Find Tony is King org_id
    const orgs = await db.all("SELECT id, name FROM organizations WHERE name ILIKE '%tony%king%' OR slug ILIKE '%tony%king%'");
    if (orgs.length === 0) {
        // fallback: get org_id from existing tonyisking user
        const existing = await db.all("SELECT org_id FROM users WHERE email = 'ceo@tonyisking.com'");
        var orgId = existing[0]?.org_id;
    } else {
        var orgId = orgs[0].id;
    }
    console.log('org_id:', orgId);

    const users = [
        { email: 'security@tonyisking.com', username: 'tik_security', role: 'platform_security', type: 'platform' },
        { email: 'datagov@tonyisking.com', username: 'tik_datagov', role: 'data_gov_officer', type: 'platform' }
    ];

    for (const u of users) {
        const existing = await db.all(`SELECT id, role FROM users WHERE email = '${u.email}'`);
        if (existing.length > 0) {
            console.log(`  ↻ ${u.email} already exists (role: ${existing[0].role})`);
            // Update role if needed
            await db.run(`UPDATE users SET role = $1, password_hash = $2 WHERE email = $3`, [u.role, hash, u.email]);
            console.log(`    → Updated role to ${u.role}`);
        } else {
            const id = uuidv4();
            await db.run(
                `INSERT INTO users (id, username, email, password_hash, role, user_type, company, org_id, must_change_password) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [id, u.username, u.email, hash, u.role, u.type, 'Tony is King', orgId, false]
            );
            console.log(`  ✓ ${u.email} → ${u.role} (NEW)`);
        }
    }

    // Verify final state
    const all = await db.all("SELECT email, role, org_id FROM users WHERE email IN ('security@tonyisking.com', 'datagov@tonyisking.com')");
    console.log('\n=== Verification ===');
    all.forEach(r => console.log(`  ${r.email} | ${r.role} | org:${r.org_id}`));
    console.log('DONE');
    process.exit(0);
})();
