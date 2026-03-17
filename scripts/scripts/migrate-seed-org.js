/**
 * Migration + Seed Script v2
 * Uses db._pool (pg Pool) for DDL to bypass Prisma filter
 * Then uses db.prepare for DML (inserts)
 */
const db = require('../server/db');
const { v4: uuidv4 } = require('uuid');

const TIK_ORG = '54197b08-bd93-467d-a738-925ba22bdb6c';
const TIK_ADMIN = 'dbef2a06-d10a-4cec-8dad-ad3c3a67bcb4';

async function main() {
    await db._readyPromise;
    const pool = db._pool;

    // ═══ PHASE 1: ALTER TABLE (direct pg pool) ═══
    console.log('=== PHASE 1: ALTER TABLE ===');
    const alters = [
        'ALTER TABLE supply_routes ADD COLUMN IF NOT EXISTS org_id TEXT',
        'ALTER TABLE partners ADD COLUMN IF NOT EXISTS org_id TEXT',
        'ALTER TABLE shipments ADD COLUMN IF NOT EXISTS org_id TEXT',
        'ALTER TABLE scan_events ADD COLUMN IF NOT EXISTS org_id TEXT',
        'ALTER TABLE supply_chain_events ADD COLUMN IF NOT EXISTS org_id TEXT',
        'ALTER TABLE batches ADD COLUMN IF NOT EXISTS org_id TEXT',
        // Indexes
        'CREATE INDEX IF NOT EXISTS idx_supply_routes_org ON supply_routes(org_id)',
        'CREATE INDEX IF NOT EXISTS idx_partners_org ON partners(org_id)',
        'CREATE INDEX IF NOT EXISTS idx_shipments_org ON shipments(org_id)',
        'CREATE INDEX IF NOT EXISTS idx_scan_events_org ON scan_events(org_id)',
        'CREATE INDEX IF NOT EXISTS idx_sce_org ON supply_chain_events(org_id)',
        'CREATE INDEX IF NOT EXISTS idx_batches_org ON batches(org_id)',
    ];

    for (const sql of alters) {
        try {
            await pool.query(sql);
            console.log('  ✅', sql.substring(0, 65));
        } catch (e) {
            console.log('  ⚠️ ', sql.substring(0, 65), '→', e.message.substring(0, 60));
        }
    }

    // Update existing TIK batches to have org_id
    await pool.query(`UPDATE batches SET org_id = $1 WHERE org_id IS NULL`, [TIK_ORG]);

    // ═══ PHASE 2: SEED supply_routes ═══
    console.log('\n=== PHASE 2: SEED supply_routes ===');
    const existingRoutes = await pool.query(`SELECT COUNT(*) as c FROM supply_routes WHERE org_id = $1`, [TIK_ORG]);
    if (parseInt(existingRoutes.rows[0].c) > 0) {
        console.log(`  Already has ${existingRoutes.rows[0].c} routes for TIK, skipping`);
    } else {
        const routes = [
            {
                name: 'Dalat Coffee Farm → HCMC Roasting Factory', chain: [
                    { node_name: 'Dalat Coffee Farm', type: 'farm', location: 'Dalat, Lam Dong, Vietnam' },
                    { node_name: 'HCMC Processing Hub', type: 'warehouse', location: 'Thu Duc, HCMC, Vietnam' },
                    { node_name: 'HCMC Roasting Factory', type: 'factory', location: 'Binh Duong, Vietnam' }
                ]
            },
            {
                name: 'Mekong Delta → Singapore Distribution', chain: [
                    { node_name: 'Mekong Delta Organic Farm', type: 'farm', location: 'Can Tho, Vietnam' },
                    { node_name: 'Cat Lai Port Warehouse', type: 'warehouse', location: 'Cat Lai, HCMC, Vietnam' },
                    { node_name: 'Singapore Distribution Center', type: 'distributor', location: 'Jurong, Singapore' }
                ]
            },
            {
                name: 'Vietnam Electronics → Tokyo Retail', chain: [
                    { node_name: 'Hanoi Electronics Factory', type: 'factory', location: 'Bac Ninh, Vietnam' },
                    { node_name: 'Hai Phong Port', type: 'checkpoint', location: 'Hai Phong, Vietnam' },
                    { node_name: 'Tokyo Central Warehouse', type: 'warehouse', location: 'Chiba, Tokyo, Japan' },
                    { node_name: 'Akihabara Retail Store', type: 'retailer', location: 'Akihabara, Tokyo, Japan' }
                ]
            },
            {
                name: 'Phu Quoc Seafood → Dubai Premium', chain: [
                    { node_name: 'Phu Quoc Seafood Processing', type: 'factory', location: 'Phu Quoc, Vietnam' },
                    { node_name: 'Tan Son Nhat Cold Storage', type: 'warehouse', location: 'HCMC, Vietnam' },
                    { node_name: 'Dubai Free Zone Hub', type: 'distributor', location: 'Jebel Ali, Dubai, UAE' }
                ]
            },
            {
                name: 'Central Highlands Tea → EU Market', chain: [
                    { node_name: 'Gia Lai Tea Plantation', type: 'farm', location: 'Gia Lai, Vietnam' },
                    { node_name: 'Da Nang Packaging Center', type: 'factory', location: 'Da Nang, Vietnam' },
                    { node_name: 'Hamburg Import Terminal', type: 'checkpoint', location: 'Hamburg, Germany' },
                    { node_name: 'Munich Organic Store', type: 'retailer', location: 'Munich, Germany' }
                ]
            }
        ];

        for (const r of routes) {
            const id = uuidv4();
            try {
                await pool.query(
                    `INSERT INTO supply_routes (id, name, chain, products, geo_fence, status, integrity, created_by, org_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
                    [id, r.name, JSON.stringify(r.chain), '[]', '', 'active', 'clean', TIK_ADMIN, TIK_ORG]
                );
                console.log(`  ✅ Route: ${r.name} (${r.chain.length} nodes)`);
            } catch (e) { console.log(`  ⚠️  Route: ${e.message.substring(0, 60)}`); }
        }
    }

    // ═══ PHASE 3: SEED partners ═══
    console.log('\n=== PHASE 3: SEED partners ===');
    const existingPartners = await pool.query(`SELECT COUNT(*) as c FROM partners WHERE org_id = $1`, [TIK_ORG]);
    if (parseInt(existingPartners.rows[0].c) > 0) {
        console.log(`  Already has ${existingPartners.rows[0].c} partners, skipping`);
    } else {
        const partners = [
            { name: 'Vietnam Coffee Corp', type: 'supplier', country: 'Vietnam', region: 'Southeast Asia', trust: 92, risk: 'low', kyc: 'verified' },
            { name: 'Singapore Logistics Pte', type: 'logistics', country: 'Singapore', region: 'Southeast Asia', trust: 88, risk: 'low', kyc: 'verified' },
            { name: 'Tokyo Fresh Import Co', type: 'distributor', country: 'Japan', region: 'East Asia', trust: 85, risk: 'medium', kyc: 'verified' },
            { name: 'Dubai Premium Foods LLC', type: 'distributor', country: 'UAE', region: 'Middle East', trust: 78, risk: 'medium', kyc: 'pending' },
            { name: 'Munich Organic GmbH', type: 'retailer', country: 'Germany', region: 'Europe', trust: 95, risk: 'low', kyc: 'verified' },
            { name: 'Mekong Delta Cooperative', type: 'supplier', country: 'Vietnam', region: 'Southeast Asia', trust: 82, risk: 'low', kyc: 'verified' }
        ];
        for (const p of partners) {
            try {
                await pool.query(
                    `INSERT INTO partners (id, name, type, country, region, contact_email, kyc_status, trust_score, risk_level, status, org_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
                    [uuidv4(), p.name, p.type, p.country, p.region, `contact@${p.name.toLowerCase().replace(/\s+/g, '')}.com`,
                    p.kyc, p.trust, p.risk, 'active', TIK_ORG]
                );
                console.log(`  ✅ Partner: ${p.name}`);
            } catch (e) { console.log(`  ⚠️  Partner: ${e.message.substring(0, 60)}`); }
        }
    }

    // ═══ PHASE 4: SEED carbon_credits (uses tenant_id) ═══
    console.log('\n=== PHASE 4: SEED carbon_credits ===');
    // carbon_credits uses tenant_id, not org_id! And has specific columns
    const existingCC = await pool.query(`SELECT COUNT(*) as c FROM carbon_credits WHERE tenant_id = $1`, [TIK_ORG]);
    if (parseInt(existingCC.rows[0].c) > 0) {
        console.log(`  Already has ${existingCC.rows[0].c} credits, skipping`);
    } else {
        const credits = [
            { sn: 'VCS-2026-TIK-001', project: 'Dalat Reforestation Project', vintage: 2025, qty: 120, status: 'active', methodology: 'AR-ACM0003', jurisdiction: 'Vietnam', vb: 'VCS' },
            { sn: 'GS-2026-TIK-002', project: 'Mekong Delta Solar Farm', vintage: 2025, qty: 85, status: 'active', methodology: 'GS-TPDDTEC', jurisdiction: 'Vietnam', vb: 'Gold Standard' },
            { sn: 'VCS-2026-TIK-003', project: 'Cookstove Distribution VN', vintage: 2024, qty: 200, status: 'minted', methodology: 'VMR0006', jurisdiction: 'Vietnam', vb: 'VCS' },
            { sn: 'CDM-2026-TIK-004', project: 'Biomass Energy Binh Duong', vintage: 2025, qty: 150, status: 'active', methodology: 'AMS-I.D', jurisdiction: 'Vietnam', vb: 'CDM' },
            { sn: 'VCS-2026-TIK-005', project: 'Mangrove Conservation Ca Mau', vintage: 2024, qty: 95, status: 'retired', methodology: 'VM0007', jurisdiction: 'Vietnam', vb: 'VCS' }
        ];
        for (const c of credits) {
            try {
                await pool.query(
                    `INSERT INTO carbon_credits (id, serial_number, project_name, vintage_year, quantity_tco2e, status, methodology, jurisdiction, verification_body, tenant_id, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())`,
                    [uuidv4(), c.sn, c.project, c.vintage, c.qty, c.status, c.methodology, c.jurisdiction, c.vb, TIK_ORG]
                );
                console.log(`  ✅ Credit: ${c.sn} (${c.qty} tCO2e)`);
            } catch (e) { console.log(`  ⚠️  Credit: ${e.message.substring(0, 80)}`); }
        }
    }

    // ═══ PHASE 5: SEED supply_chain_events ═══
    console.log('\n=== PHASE 5: SEED supply_chain_events ===');
    const tikProducts = await pool.query(`SELECT id FROM products WHERE org_id = $1 LIMIT 5`, [TIK_ORG]);
    const prodIds = tikProducts.rows.map(r => r.id);

    const existingEvents = await pool.query(`SELECT COUNT(*) as c FROM supply_chain_events WHERE org_id = $1`, [TIK_ORG]);
    if (parseInt(existingEvents.rows[0].c) > 0) {
        console.log(`  Already has ${existingEvents.rows[0].c} events, skipping`);
    } else {
        const events = [
            { type: 'origin_verified', location: 'Dalat Coffee Farm, Vietnam', actor: 'Farm Inspector', days: 25 },
            { type: 'quality_check', location: 'HCMC Processing Hub', actor: 'QC Team', days: 22 },
            { type: 'shipment_dispatched', location: 'Cat Lai Port, HCMC', actor: 'Logistics', days: 20 },
            { type: 'customs_cleared', location: 'Singapore Customs', actor: 'Customs Agent', days: 18 },
            { type: 'delivered', location: 'Singapore DC, Jurong', actor: 'Warehouse Ops', days: 15 },
            { type: 'roasting_complete', location: 'Binh Duong Factory', actor: 'Production Lead', days: 12 },
            { type: 'packaging_done', location: 'Da Nang Packaging Center', actor: 'Packaging Team', days: 8 },
            { type: 'shipment_dispatched', location: 'Hai Phong Port', actor: 'Freight Handler', days: 5 },
            { type: 'warehouse_received', location: 'Tokyo Warehouse, Chiba', actor: 'Warehouse Mgr', days: 2 },
            { type: 'retail_stocked', location: 'Akihabara Store, Tokyo', actor: 'Store Manager', days: 1 }
        ];
        for (const e of events) {
            const prodId = prodIds[Math.floor(Math.random() * prodIds.length)] || null;
            try {
                await pool.query(
                    `INSERT INTO supply_chain_events (id, event_type, product_id, location, actor, org_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${e.days} days')`,
                    [uuidv4(), e.type, prodId, e.location, e.actor, TIK_ORG]
                );
                console.log(`  ✅ Event: ${e.type} @ ${e.location}`);
            } catch (e2) { console.log(`  ⚠️  Event: ${e2.message.substring(0, 60)}`); }
        }
    }

    console.log('\n=== ALL DONE ===');

    // Verify counts
    const verify = [
        ['supply_routes', 'org_id'], ['partners', 'org_id'], ['batches', 'org_id'],
        ['carbon_credits', 'tenant_id'], ['supply_chain_events', 'org_id']
    ];
    for (const [tbl, col] of verify) {
        const r = await pool.query(`SELECT COUNT(*) as c FROM ${tbl} WHERE ${col} = $1`, [TIK_ORG]);
        console.log(`  ${tbl}: ${r.rows[0].c} rows for TIK`);
    }

    process.exit(0);
}

main().catch(e => { console.error('FATAL:', e); process.exit(1); });
