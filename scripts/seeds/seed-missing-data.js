// Seed all remaining empty tables for TrustChecker CA workspace
// Tables: ops_incidents_v2, risk_models, format_rules, pending_role_approvals
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const ORG_ID = '54197b08-bd93-467d-a738-925ba22bdb6c';

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();

    // Get org users for assignment
    const { rows: users } = await client.query(
        'SELECT id, email, role FROM users WHERE org_id = $1 LIMIT 10', [ORG_ID]
    );
    console.log(`Found ${users.length} users in org`);
    const adminUser = users.find(u => u.role === 'company_admin') || users[0];

    // ═══════════════════════════════════════════════════
    // 1. OPS INCIDENTS (ops_incidents_v2)
    // ═══════════════════════════════════════════════════
    console.log('\n📋 Seeding ops incidents...');
    const incidents = [
        { incident_id: 'INC-2026-001', title: 'Counterfeit QR detected on Robusta batch', severity: 'SEV1', status: 'open', module: 'verification', affected_entity: 'BATCH-2026-001', description: 'Multiple scan events from unauthorized locations detected. 12 counterfeit QR codes found in HCMC retail outlets.' },
        { incident_id: 'INC-2026-002', title: 'SLA breach on customs clearance', severity: 'SEV2', status: 'investigating', module: 'logistics', affected_entity: 'BATCH-2026-003', description: 'Customs clearance at Busan port exceeded 72h SLA window. Currently at 96h and counting.' },
        { incident_id: 'INC-2026-003', title: 'Temperature excursion during transit', severity: 'SEV2', status: 'open', module: 'quality', affected_entity: 'BATCH-2026-002', description: 'IoT sensor recorded 32°C for 4 hours during Tokyo transit. Threshold is 25°C for coffee products.' },
        { incident_id: 'INC-2026-004', title: 'Duplicate product registration attempt', severity: 'SEV3', status: 'resolved', module: 'identity', affected_entity: 'COFFEE-ARA-250', description: 'Attempted duplicate registration of Arabica 250g product with different SKU. Auto-blocked by system.', resolution: 'Duplicate blocked by identity verification. Source traced to data entry error.', root_cause: 'Manual data entry error by warehouse staff' },
        { incident_id: 'INC-2026-005', title: 'Supplier certificate expired', severity: 'SEV3', status: 'resolved', module: 'compliance', affected_entity: 'Binh Phuoc Farm', description: 'USDA Organic certification for Binh Phuoc Farm expired 15 days ago.', resolution: 'Certificate renewed and uploaded. Products cleared for continued export.', root_cause: 'Calendar reminder system failure' },
        { incident_id: 'INC-2026-006', title: 'API rate limit exceeded by partner', severity: 'SEV4', status: 'closed', module: 'security', affected_entity: 'partner-tokyo-dc', description: 'Tokyo DC partner exceeded 10k API calls/hour limit. Temporary throttling applied.', resolution: 'Rate limit increased to 20k/hour after review. Partner notified of proper caching practices.', root_cause: 'Partner implemented polling without backoff' },
        { incident_id: 'INC-2026-007', title: 'Anomalous scan pattern in Singapore', severity: 'SEV2', status: 'open', module: 'risk', affected_entity: 'Singapore DC, Jurong', description: '347 scans from single device in 15 minutes. Possible automated scanning or testing gone wrong.' },
        { incident_id: 'INC-2026-008', title: 'Data sync failure with Hamburg warehouse', severity: 'SEV3', status: 'investigating', module: 'integration', affected_entity: 'partner-hamburg-wh', description: 'Inventory sync has been failing for 48 hours. Last successful sync was Mar 5 at 14:00 UTC.', sla_breached: true },
    ];

    for (const inc of incidents) {
        await client.query(
            `INSERT INTO ops_incidents_v2 (id, incident_id, title, description, severity, status, module, affected_entity, assigned_to, triggered_by, resolution, root_cause, sla_breached, resolved_at, acknowledged_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
       ON CONFLICT (incident_id) DO NOTHING`,
            [
                uuidv4(), inc.incident_id, inc.title, inc.description || '', inc.severity, inc.status,
                inc.module || null, inc.affected_entity || null,
                adminUser?.id || null, 'system',
                inc.resolution || null, inc.root_cause || null,
                inc.sla_breached || false,
                inc.status === 'resolved' || inc.status === 'closed' ? new Date(Date.now() - Math.random() * 7 * 86400000) : null,
                inc.status !== 'open' ? new Date(Date.now() - Math.random() * 14 * 86400000) : null,
                new Date(Date.now() - Math.random() * 30 * 86400000),
            ]
        );
        console.log(`  🚨 ${inc.incident_id}: ${inc.title} (${inc.severity}/${inc.status})`);
    }
    console.log(`✅ Seeded ${incidents.length} incidents`);

    // ═══════════════════════════════════════════════════
    // 2. RISK MODELS (risk_models)
    // ═══════════════════════════════════════════════════
    console.log('\n🎯 Seeding risk models...');
    const models = [
        {
            version: 'v3.2.1', status: 'production',
            weights: { scan_velocity: 0.18, geo_anomaly: 0.15, duplicate_rate: 0.12, time_pattern: 0.10, device_fingerprint: 0.09, partner_trust: 0.08, batch_age: 0.07, location_mismatch: 0.06, scan_frequency: 0.05, product_category: 0.04, user_behavior: 0.03, historical_fraud: 0.03 },
            factors: 12, fp_rate: '2.3%', tp_rate: '94.7%', change_summary: 'Production model — tuned on 6 months of scan data. Low FP rate with strong TP.', test_dataset: '77,210 scans (Jan-Mar 2026)',
            deployed_at: new Date('2026-02-15'),
        },
        {
            version: 'v3.3.0-beta', status: 'sandbox',
            weights: { scan_velocity: 0.20, geo_anomaly: 0.16, duplicate_rate: 0.14, time_pattern: 0.11, device_fingerprint: 0.08, partner_trust: 0.07, batch_age: 0.06, location_mismatch: 0.05, scan_frequency: 0.04, product_category: 0.03, user_behavior: 0.03, historical_fraud: 0.03 },
            factors: 12, fp_rate: '1.8%', tp_rate: '95.2%', change_summary: 'Increased scan velocity weight. Testing with Feb-Mar data.', test_dataset: '42,000 scans (Feb-Mar 2026)',
        },
        {
            version: 'v4.0.0-draft', status: 'draft',
            weights: { scan_velocity: 0.15, geo_anomaly: 0.15, duplicate_rate: 0.10, time_pattern: 0.10, device_fingerprint: 0.10, partner_trust: 0.10, network_graph: 0.08, batch_age: 0.05, location_mismatch: 0.05, scan_frequency: 0.04, user_behavior: 0.04, historical_fraud: 0.04 },
            factors: 12, fp_rate: '', tp_rate: '', change_summary: 'Draft: Adding network_graph factor for supply chain risk propagation.', test_dataset: '',
        },
    ];

    for (const m of models) {
        await client.query(
            `INSERT INTO risk_models (id, version, status, weights, factors, fp_rate, tp_rate, deployed_at, approved_by, change_summary, test_dataset, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (version) DO NOTHING`,
            [
                uuidv4(), m.version, m.status, JSON.stringify(m.weights), m.factors, m.fp_rate, m.tp_rate,
                m.deployed_at || null, m.status === 'production' ? (adminUser?.id || null) : null,
                m.change_summary, m.test_dataset,
            ]
        );
        console.log(`  🧠 ${m.version} (${m.status})`);
    }
    console.log(`✅ Seeded ${models.length} risk models`);

    // ═══════════════════════════════════════════════════
    // 3. FORMAT RULES (code_format_rules if exists)
    // ═══════════════════════════════════════════════════
    console.log('\n📏 Seeding format rules...');
    try {
        const rules = [
            { name: 'Product SKU Format', pattern: '^[A-Z]{2,6}-[A-Z]{2,4}-\\d{2,4}[A-Z]?$', scope: 'sku', description: 'Enforces uppercase letters, category dash, size code pattern', severity: 'error', examples_pass: 'COFFEE-ROB-500, CASHEW-ORG-1KG', examples_fail: 'coffee500, 123-abc' },
            { name: 'Batch Number Standard', pattern: '^BATCH-\\d{4}-\\d{3,4}$', scope: 'batch_number', description: 'BATCH-YYYY-NNN format required for all batch identifiers', severity: 'error', examples_pass: 'BATCH-2026-001, BATCH-2026-1234', examples_fail: 'B-001, batch2026' },
            { name: 'Location Name Convention', pattern: '^[A-Z][a-zA-Z\\s,]+$', scope: 'location', description: 'Location names must start with capital letter, use proper casing', severity: 'warning', examples_pass: 'Dalat Coffee Farm, HCMC Processing Hub', examples_fail: 'dalat, 123location' },
            { name: 'Partner ID Format', pattern: '^partner-[a-z]+-[a-z]+$', scope: 'partner_id', description: 'Partner IDs use lowercase kebab-case: partner-city-type', severity: 'error', examples_pass: 'partner-tokyo-dc, partner-hamburg-wh', examples_fail: 'PARTNER_01, tokyo-warehouse' },
            { name: 'Event Type Whitelist', pattern: '^(harvested|processed|packaged|shipped|in_transit|customs_cleared|delivered|quality_check|recalled)$', scope: 'event_type', description: 'Only approved event types allowed in supply chain tracking', severity: 'error', examples_pass: 'harvested, shipped, delivered', examples_fail: 'picked, sent, done' },
        ];

        // Check if table exists
        const { rows: tableCheck } = await client.query(
            `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'code_format_rules')`
        );

        if (tableCheck[0].exists) {
            for (const r of rules) {
                await client.query(
                    `INSERT INTO code_format_rules (id, name, pattern, scope, description, severity, is_active, examples_pass, examples_fail, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, NOW())
           ON CONFLICT DO NOTHING`,
                    [uuidv4(), r.name, r.pattern, r.scope, r.description, r.severity, r.examples_pass, r.examples_fail]
                );
                console.log(`  📐 ${r.name}`);
            }
            console.log(`✅ Seeded ${rules.length} format rules`);
        } else {
            console.log('⚠️ code_format_rules table does not exist, skipping');
        }
    } catch (e) {
        console.log(`⚠️ Format rules skipped: ${e.message}`);
    }

    // ═══════════════════════════════════════════════════
    // 4. PENDING ROLE APPROVALS (if table exists)  
    // ═══════════════════════════════════════════════════
    console.log('\n👤 Seeding pending approvals...');
    try {
        const { rows: approvalCheck } = await client.query(
            `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pending_role_approvals')`
        );

        if (approvalCheck[0].exists) {
            const regularUsers = users.filter(u => u.role !== 'company_admin' && u.role !== 'org_owner');
            if (regularUsers.length >= 1) {
                const approvals = [
                    { user_id: regularUsers[0]?.id, requested_role: 'compliance_officer', reason: 'Need access to compliance reports for Q2 audit preparation' },
                    { user_id: regularUsers[1]?.id || regularUsers[0]?.id, requested_role: 'risk_officer', reason: 'Taking over risk management duties from departing team member' },
                ];
                for (const ap of approvals) {
                    if (!ap.user_id) continue;
                    await client.query(
                        `INSERT INTO pending_role_approvals (id, tenant_id, user_id, requested_role, reason, status, created_at)
             VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
             ON CONFLICT DO NOTHING`,
                        [uuidv4(), ORG_ID, ap.user_id, ap.requested_role, ap.reason]
                    );
                    console.log(`  ⏳ ${ap.requested_role} request`);
                }
                console.log(`✅ Seeded ${approvals.length} pending approvals`);
            } else {
                console.log('⚠️ No regular users found to create approvals for');
            }
        } else {
            console.log('⚠️ pending_role_approvals table does not exist, skipping');
        }
    } catch (e) {
        console.log(`⚠️ Approvals skipped: ${e.message}`);
    }

    console.log('\n🎉 All seed data complete!');
    client.release();
    await pool.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
