// Use raw pg Pool directly — db.js wrapper SKIPS ALTER TABLE statements
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

async function main() {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    const orgId = '54197b08-bd93-467d-a738-925ba22bdb6c';

    // 1. Add org_id column via raw pg
    try {
        await client.query('ALTER TABLE risk_models ADD COLUMN org_id TEXT DEFAULT NULL');
        console.log('✓ Added org_id column');
    } catch (e) {
        if (e.message?.includes('already exists')) console.log('ℹ org_id already exists');
        else console.log('ALTER:', e.message);
    }

    // 2. Clear
    await client.query('DELETE FROM risk_models');
    console.log('✓ Cleared risk_models');

    // 3. Insert models
    const models = [
        ['v3.2', 'production', 14, '1.8%', '97.5%', 'Velocity scan anomaly + geo-fencing. FP reduced 40%.', 5],
        ['v3.3-beta', 'sandbox', 16, '1.2%', '98.3%', 'ML behavioral analysis with LSTM time-series.', 2],
        ['v3.1', 'archived', 12, '3.2%', '95.1%', 'Baseline: duplicate detection, geo, velocity.', 35],
        ['v3.0', 'archived', 10, '4.1%', '92.8%', 'First multi-factor model with network risk.', 65],
        ['v2.0', 'archived', 8, '5.7%', '89.2%', 'Legacy model. Basic rules only.', 120],
    ];

    const weights = [
        { scan_velocity: 0.22, geo_anomaly: 0.18, duplicate_rate: 0.15, batch_integrity: 0.12, partner_trust: 0.10, time_pattern: 0.08, serial_reuse: 0.06, device_fingerprint: 0.04, network_risk: 0.02, supply_chain_distance: 0.015, currency_mismatch: 0.005, volume_spike: 0.01 },
        { scan_velocity: 0.18, geo_anomaly: 0.16, duplicate_rate: 0.12, batch_integrity: 0.10, partner_trust: 0.09, behavioral_lstm: 0.04, blockchain_seal: 0.03 },
        { scan_velocity: 0.20, geo_anomaly: 0.15, duplicate_rate: 0.15, batch_integrity: 0.12, partner_trust: 0.10, time_pattern: 0.08, serial_reuse: 0.08, device_fingerprint: 0.05 },
        { scan_velocity: 0.20, geo_anomaly: 0.18, duplicate_rate: 0.16, batch_integrity: 0.12, partner_trust: 0.10, time_pattern: 0.08 },
        { scan_velocity: 0.25, geo_anomaly: 0.20, duplicate_rate: 0.20, batch_integrity: 0.15, partner_trust: 0.10 },
    ];

    for (let i = 0; i < models.length; i++) {
        const [ver, status, factors, fp, tp, summary, daysAgo] = models[i];
        const id = uuidv4();
        const created = new Date(Date.now() - daysAgo * 86400000).toISOString();
        const deployed = status === 'production' ? created : null;
        const approved = status === 'production' ? 'admin@tonyisking.com + compliance@tonyisking.com' : null;

        await client.query(
            `INSERT INTO risk_models (id, version, status, weights, factors, fp_rate, tp_rate, change_summary, test_dataset, org_id, created_at, deployed_at, approved_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [id, ver, status, JSON.stringify(weights[i]), factors, fp, tp, summary, 'scan_events_30d', orgId, created, deployed, approved]
        );
        console.log('✓', ver, `(${status})`);
    }

    const { rows } = await client.query('SELECT version, status, org_id FROM risk_models ORDER BY created_at DESC');
    console.log('\n✅ Done!', JSON.stringify(rows, null, 2));

    client.release();
    await pool.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
