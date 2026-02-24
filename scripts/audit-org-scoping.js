const db = require('../server/db');

(async () => {
    try {
        // Get all tables
        const tables = await db.prepare("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name").all();
        console.log('=== TABLE ORG_ID AUDIT ===');
        for (const t of tables) {
            const cols = await db.prepare(`SELECT column_name FROM information_schema.columns WHERE table_name='${t.table_name}' ORDER BY ordinal_position`).all();
            const hasOrgId = cols.some(c => c.column_name === 'org_id');
            const hasTenantId = cols.some(c => c.column_name === 'tenant_id');
            const hasCreatedBy = cols.some(c => c.column_name === 'created_by');
            if (!hasOrgId && !hasTenantId) {
                console.log('❌ NO org_id:', t.table_name, '|', cols.map(c => c.column_name).join(', '));
            } else {
                console.log('✅', t.table_name, hasOrgId ? '(org_id)' : '', hasTenantId ? '(tenant_id)' : '');
            }
        }

        // Check tenant-middleware
        console.log('\n=== TONY IS KING ORG ===');
        const org = await db.prepare("SELECT * FROM organizations WHERE name ILIKE '%tony%king%'").get();
        console.log('Org:', JSON.stringify(org));

        // Count data per table for Tony Is King
        if (org) {
            const tablesWithOrg = ['products', 'qr_codes', 'scan_events', 'shipments', 'partners'];
            for (const tbl of tablesWithOrg) {
                try {
                    const r = await db.prepare(`SELECT COUNT(*) as c FROM ${tbl} WHERE org_id = '${org.id}'`).get();
                    console.log(`  ${tbl}: ${r?.c || 0} rows for TIK`);
                } catch (e) {
                    console.log(`  ${tbl}: ERROR - ${e.message}`);
                }
            }
        }

        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
})();
