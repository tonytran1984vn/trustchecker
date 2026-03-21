/**
 * Seed org/organization data for the All Orgs page
 * Run: DATABASE_URL="..." node server/seed-orgs.js
 */
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

async function seed() {
    const db = require('./db');
    if (db.init) await db.init();
    await new Promise(r => setTimeout(r, 2500));
    console.log('🏢 Seeding org organizations...\n');

    const adminUser = await db.prepare("SELECT id FROM users WHERE email = ?").get('admin@trustchecker.io');
    const adminId = adminUser?.id || 'system';

    const orgs = [
        { name: 'CryptoMall Ltd', slug: 'cryptomall', plan: 'enterprise', flags: { blockchain: true, nft: true, ai_analytics: true, trustgraph: true } },
        { name: 'QuickBuy Asia', slug: 'quickbuy-asia', plan: 'pro', flags: { blockchain: true, ai_analytics: true } },
        { name: 'FreshMart EU', slug: 'freshmart-eu', plan: 'enterprise', flags: { blockchain: true, consortium: true, digital_twin: true, ai_analytics: true } },
        { name: 'TechGadget Co', slug: 'techgadget', plan: 'pro', flags: { ai_analytics: true, trustgraph: true } },
        { name: 'PharmaGuard GmbH', slug: 'pharmaguard', plan: 'enterprise', flags: { blockchain: true, nft: true, consortium: true, digital_twin: true, ai_analytics: true, trustgraph: true } },
        { name: 'Saigon Coffee Export', slug: 'saigon-coffee', plan: 'core', flags: { blockchain: true } },
        { name: 'LuxWatch Singapore', slug: 'luxwatch-sg', plan: 'enterprise', flags: { blockchain: true, nft: true, ai_analytics: true } },
        { name: 'MekongAgri Corp', slug: 'mekong-agri', plan: 'pro', flags: { ai_analytics: true, digital_twin: true } },
        { name: 'Seoul Electronics Hub', slug: 'seoul-electronics', plan: 'pro', flags: { blockchain: true, ai_analytics: true } },
        { name: 'Dubai Luxury Imports', slug: 'dubai-luxury', plan: 'enterprise', flags: { blockchain: true, nft: true, trustgraph: true, ai_analytics: true } },
    ];

    const hash = await bcrypt.hash('Company@2026!', 12);
    let created = 0;

    for (const t of orgs) {
        const orgId = uuidv4();
        try {
            await db.prepare(`INSERT INTO organizations (id, name, slug, plan, feature_flags, status, created_by) VALUES (?,?,?,?,?,?,?)`)
                .run(orgId, t.name, t.slug, t.plan, JSON.stringify(t.flags), 'active', adminId);

            // Create a company admin user for this org
            const userId = uuidv4();
            const username = t.slug.replace(/-/g, '_') + '_admin';
            const email = `admin@${t.slug.replace(/-/g, '')}.com`;
            try {
                await db.prepare(`INSERT INTO users (id, username, email, password_hash, role, user_type, company, org_id) VALUES (?,?,?,?,?,?,?,?)`)
                    .run(userId, username, email, hash, 'admin', 'org', t.name, orgId);
            } catch (e) { /* user might already exist */ }

            created++;
            console.log(`  ✅ ${t.name} (${t.plan}) → admin: ${email}`);
        } catch (e) {
            if (e.message?.includes('unique') || e.message?.includes('duplicate')) {
                console.log(`  ♻️  ${t.name} already exists`);
            } else {
                console.log(`  ⚠️  ${t.name}: ${e.message?.substring(0, 80)}`);
            }
        }
    }

    console.log(`\n🎯 Done: ${created} orgs created`);
    console.log('🔐 Company admin password: Company@2026!');
    process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
