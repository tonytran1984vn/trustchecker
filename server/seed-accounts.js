/**
 * Seed Script — Create 16 sample accounts
 * Run: node server/seed-accounts.js
 */
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seed() {
    // Initialize DB
    const db = require('./db');
    if (db.init) await db.init();
    await new Promise(r => setTimeout(r, 2000)); // wait for DB init

    const DEFAULT_PWD = 'Trust@2026!';
    const hash = await bcrypt.hash(DEFAULT_PWD, 12);
    const orgId = uuidv4();

    const accounts = [
        // Platform accounts
        { email: 'admin@trustchecker.io', username: 'admin', role: 'super_admin', user_type: 'platform', company: 'TrustChecker' },
        { email: 'security@trustchecker.io', username: 'security', role: 'platform_security', user_type: 'platform', company: 'TrustChecker' },
        { email: 'datagov@trustchecker.io', username: 'datagov', role: 'data_gov_officer', user_type: 'platform', company: 'TrustChecker' },
        // Tenant accounts
        { email: 'admin@demo.trustchecker.io', username: 'demo_admin', role: 'company_admin', user_type: 'tenant', company: 'Demo Corp' },
        { email: 'ceo@demo.trustchecker.io', username: 'demo_ceo', role: 'executive', user_type: 'tenant', company: 'Demo Corp' },
        { email: 'ops@demo.trustchecker.io', username: 'demo_ops', role: 'ops_manager', user_type: 'tenant', company: 'Demo Corp' },
        { email: 'risk@demo.trustchecker.io', username: 'demo_risk', role: 'risk_officer', user_type: 'tenant', company: 'Demo Corp' },
        { email: 'compliance@demo.trustchecker.io', username: 'demo_compliance', role: 'compliance_officer', user_type: 'tenant', company: 'Demo Corp' },
        { email: 'dev@demo.trustchecker.io', username: 'demo_dev', role: 'developer', user_type: 'tenant', company: 'Demo Corp' },
        { email: 'ggc@demo.trustchecker.io', username: 'demo_ggc', role: 'ggc_member', user_type: 'tenant', company: 'Demo Corp' },
        { email: 'riskcom@demo.trustchecker.io', username: 'demo_riskcom', role: 'risk_committee', user_type: 'tenant', company: 'Demo Corp' },
        { email: 'ivu@demo.trustchecker.io', username: 'demo_ivu', role: 'ivu_validator', user_type: 'tenant', company: 'Demo Corp' },
        { email: 'scm@demo.trustchecker.io', username: 'demo_scm', role: 'scm_analyst', user_type: 'tenant', company: 'Demo Corp' },
        { email: 'blockchain@demo.trustchecker.io', username: 'demo_blockchain', role: 'blockchain_operator', user_type: 'tenant', company: 'Demo Corp' },
        { email: 'carbon@demo.trustchecker.io', username: 'demo_carbon', role: 'carbon_officer', user_type: 'tenant', company: 'Demo Corp' },
        { email: 'auditor@demo.trustchecker.io', username: 'demo_auditor', role: 'auditor', user_type: 'tenant', company: 'Demo Corp' },
    ];

    let created = 0, skipped = 0;

    for (const acc of accounts) {
        const id = uuidv4();
        const tenantOrgId = acc.user_type === 'tenant' ? orgId : null;
        try {
            // Check if exists
            const existing = await db.prepare('SELECT id FROM users WHERE email = ?').get(acc.email);
            if (existing) {
                // Update role + password
                await db.prepare('UPDATE users SET password_hash = ?, role = ?, user_type = ?, company = ? WHERE email = ?')
                    .run(hash, acc.role, acc.user_type, acc.company, acc.email);
                console.log(`  ♻️  Updated: ${acc.email} → ${acc.role}`);
                // Update RBAC
                await db.prepare("INSERT INTO rbac_user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?) ON CONFLICT(user_id, role_id) DO NOTHING")
                    .run(existing.id, acc.role, 'seed-script');
                skipped++;
                continue;
            }

            await db.prepare(
                `INSERT INTO users (id, username, email, password_hash, role, user_type, company, org_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(id, acc.username, acc.email, hash, acc.role, acc.user_type, acc.company, tenantOrgId);

            // Assign RBAC role
            await db.prepare(
                `INSERT INTO rbac_user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)`
            ).run(id, acc.role, 'seed-script');

            console.log(`  ✅ Created: ${acc.email} → ${acc.role} (${acc.user_type})`);
            created++;
        } catch (err) {
            console.error(`  ❌ Failed: ${acc.email} — ${err.message}`);
        }
    }

    console.log(`\n🎯 Done: ${created} created, ${skipped} updated`);
    console.log(`🔐 Default password: ${DEFAULT_PWD}`);
    process.exit(0);
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
