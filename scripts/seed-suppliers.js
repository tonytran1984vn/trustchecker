/**
 * Seed suppliers & locations into PostgreSQL
 * Run: node scripts/seed-suppliers.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SUPPLIERS = [
  { id: 'SUP-001', name: 'Golden Beans Co.', normalized: 'golden beans', type: 'Manufacturer', country: 'Vietnam', trust: 92, delivery: 96, quality: 94, compliance: 88, financial: 85, composite: 91, tier: 'Gold', contracts: 2, risk: 'Low', kyc: 'verified', locations: [
    { country: 'Vietnam', address: 'Ho Chi Minh City' },
    { country: 'Thailand', address: 'Bangkok' },
  ]},
  { id: 'SUP-002', name: 'Ceylon Leaf Ltd', normalized: 'ceylon leaf', type: 'Manufacturer', country: 'Sri Lanka', trust: 88, delivery: 91, quality: 93, compliance: 90, financial: 82, composite: 89, tier: 'Gold', contracts: 1, risk: 'Low', kyc: 'verified', locations: [
    { country: 'Sri Lanka', address: 'Colombo' },
  ]},
  { id: 'SUP-003', name: 'NZ Manuka Inc', normalized: 'nz manuka', type: 'Producer', country: 'New Zealand', trust: 95, delivery: 89, quality: 98, compliance: 95, financial: 92, composite: 94, tier: 'Platinum', contracts: 1, risk: 'Low', kyc: 'verified', locations: [
    { country: 'New Zealand', address: 'Auckland' },
    { country: 'Australia', address: 'Sydney' },
  ]},
  { id: 'SUP-004', name: 'Pacific Pack', normalized: 'pacific pack', type: 'Packaging', country: 'Thailand', trust: 78, delivery: 85, quality: 82, compliance: 75, financial: 80, composite: 80, tier: 'Silver', contracts: 1, risk: 'Medium', kyc: 'verified', locations: [
    { country: 'Thailand', address: 'Chon Buri' },
  ]},
  { id: 'SUP-005', name: 'Mekong Logistics', normalized: 'mekong logistics', type: '3PL', country: 'Vietnam', trust: 65, delivery: 72, quality: 70, compliance: 60, financial: 68, composite: 67, tier: 'Bronze', contracts: 0, risk: 'High', kyc: 'pending', locations: [
    { country: 'Vietnam', address: 'Ho Chi Minh City' },
    { country: 'Cambodia', address: 'Phnom Penh' },
    { country: 'Vietnam', address: 'Hanoi' },
  ]},
];

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const s of SUPPLIERS) {
      // Upsert partner
      await client.query(`
        INSERT INTO partners (id, name, normalized_name, type, country, trust_score, delivery_score, quality_score, compliance_score, financial_score, composite_score, tier, risk_level, contracts, kyc_status, status, created_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'active',NOW())
        ON CONFLICT (id) DO UPDATE SET
          name=$2, normalized_name=$3, type=$4, country=$5,
          trust_score=$6, delivery_score=$7, quality_score=$8,
          compliance_score=$9, financial_score=$10, composite_score=$11,
          tier=$12, risk_level=$13, contracts=$14, kyc_status=$15
      `, [s.id, s.name, s.normalized, s.type, s.country, s.trust, s.delivery, s.quality, s.compliance, s.financial, s.composite, s.tier, s.risk, s.contracts, s.kyc]);

      // Upsert locations
      for (const loc of s.locations) {
        const locId = uuidv4();
        await client.query(`
          INSERT INTO partner_locations (id, partner_id, country, address, status, created_at)
          SELECT $1, $2, $3, $4, 'active', NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM partner_locations WHERE partner_id = $2 AND country = $3 AND address = $4
          )
        `, [locId, s.id, loc.country, loc.address]);
      }
      console.log(`  ✅ ${s.name} + ${s.locations.length} locations`);
    }

    await client.query('COMMIT');
    console.log('\n✅ All suppliers seeded!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Seed error:', e.message);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
