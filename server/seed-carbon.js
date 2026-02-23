/**
 * Seed: carbon_credits + sustainability_scores
 * Uses app's db module (Prisma adapter)
 */
const db = require('./db');
const crypto = require('crypto');

async function main() {
    // Wait for DB connection
    await new Promise(r => setTimeout(r, 2000));

    // 1. Create carbon_credits table via db.prisma directly
    try {
        await db.prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS carbon_credits (
        id TEXT PRIMARY KEY,
        tenant_id TEXT,
        project_name TEXT NOT NULL,
        methodology TEXT DEFAULT 'VCS',
        vintage_year INTEGER DEFAULT 2024,
        quantity_tco2e REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        jurisdiction TEXT DEFAULT 'VN',
        verification_body TEXT,
        serial_number TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
        console.log('✅ carbon_credits table created');
    } catch (e) {
        console.log('⚠️ carbon_credits table creation:', e.message);
    }

    // 2. Seed carbon_credits
    const credits = [
        { id: 'CC-001', project: 'Vietnam Mangrove Restoration', meth: 'VCS', yr: 2024, qty: 1200, status: 'active', jur: 'VN', body: 'SCS Global' },
        { id: 'CC-002', project: 'Solar Farm Ha Tinh', meth: 'GS', yr: 2024, qty: 850, status: 'active', jur: 'VN', body: 'TUV SUD' },
        { id: 'CC-003', project: 'Biogas Mekong Delta', meth: 'CDM', yr: 2023, qty: 600, status: 'active', jur: 'VN', body: 'DNV GL' },
        { id: 'CC-004', project: 'EU Wind Farm Offset', meth: 'VCS', yr: 2024, qty: 2000, status: 'minted', jur: 'EU', body: 'Verra' },
        { id: 'CC-005', project: 'Singapore Green Building', meth: 'GS', yr: 2024, qty: 450, status: 'active', jur: 'APAC', body: 'Gold Standard' },
        { id: 'CC-006', project: 'Thailand Rice Methane Capture', meth: 'ACR', yr: 2023, qty: 380, status: 'retired', jur: 'APAC', body: 'ACR' },
        { id: 'CC-007', project: 'California Forest Conservation', meth: 'ACR', yr: 2024, qty: 1500, status: 'active', jur: 'US', body: 'ACR' },
        { id: 'CC-008', project: 'Vietnam Industrial Efficiency', meth: 'ISO14064', yr: 2024, qty: 720, status: 'active', jur: 'VN', body: 'Bureau Veritas' },
        { id: 'CC-009', project: 'EU ETS Allowance Transfer', meth: 'VCS', yr: 2023, qty: 950, status: 'retired', jur: 'EU', body: 'Verra' },
        { id: 'CC-010', project: 'REDD+ Borneo Rainforest', meth: 'REDD+', yr: 2024, qty: 3200, status: 'active', jur: 'APAC', body: 'Verra' },
        { id: 'CC-011', project: 'Vietnam Biomass Energy', meth: 'GS', yr: 2024, qty: 560, status: 'active', jur: 'VN', body: 'Gold Standard' },
        { id: 'CC-012', project: 'EU Carbon Capture Storage', meth: 'ISO14064', yr: 2024, qty: 1800, status: 'minted', jur: 'EU', body: 'SGS' },
    ];

    for (const c of credits) {
        try {
            await db.prisma.$executeRawUnsafe(
                `INSERT INTO carbon_credits (id, project_name, methodology, vintage_year, quantity_tco2e, status, jurisdiction, verification_body)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO NOTHING`,
                c.id, c.project, c.meth, c.yr, c.qty, c.status, c.jur, c.body
            );
        } catch (e) { /* skip */ }
    }
    const ccRows = await db.prisma.$queryRawUnsafe('SELECT COUNT(*)::int as c FROM carbon_credits');
    console.log('✅ carbon_credits:', ccRows[0]?.c, 'rows');

    // 3. Seed sustainability_scores
    const products = await db.all('SELECT id, name FROM products LIMIT 30');

    for (const p of products) {
        const carbon = Math.round((30 + Math.random() * 60) * 10) / 10;
        const water = Math.round((25 + Math.random() * 65) * 10) / 10;
        const recycle = Math.round((20 + Math.random() * 75) * 10) / 10;
        const ethical = Math.round((30 + Math.random() * 65) * 10) / 10;
        const packaging = Math.round((20 + Math.random() * 70) * 10) / 10;
        const transport = Math.round((25 + Math.random() * 60) * 10) / 10;
        const overall = Math.round((carbon * 0.2 + water * 0.15 + recycle * 0.2 + ethical * 0.2 + packaging * 0.1 + transport * 0.15) * 10) / 10;
        const grade = overall >= 90 ? 'A+' : overall >= 80 ? 'A' : overall >= 70 ? 'B' : overall >= 60 ? 'C' : overall >= 50 ? 'D' : 'F';
        const uid = crypto.randomUUID();

        try {
            await db.prisma.$executeRawUnsafe(
                `INSERT INTO sustainability_scores (id, product_id, carbon_footprint, water_usage, recyclability, ethical_sourcing, packaging_score, transport_score, overall_score, grade, assessed_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                uid, p.id, carbon, water, recycle, ethical, packaging, transport, overall, grade, 'system-seed'
            );
        } catch (e) { /* skip */ }
    }
    const ssRows = await db.prisma.$queryRawUnsafe('SELECT COUNT(*)::int as c FROM sustainability_scores');
    console.log('✅ sustainability_scores:', ssRows[0]?.c, 'rows');

    process.exit(0);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
