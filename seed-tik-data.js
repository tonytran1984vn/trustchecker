/**
 * Seed End-to-End Supply Chain Data for Tony is King
 * 
 * Creates: Partners → Batches → Shipments → Inventory → Evidence → QR Codes → Events
 */

const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const ORG = '54197b08-bd93-467d-a738-925ba22bdb6c';
const OWNER_ID = 'c85880af-d5c4-4c12-8b0a-70ef1ce63144'; // Tony Tran (Owner)
const SC_FOOD = 'sc-tik-food-001';
const SC_TECH = 'sc-tik-tech-001';

// ═══════════════════════════════════════════════════
// PARTNERS — 10 realistic Vietnamese supply chain partners
// ═══════════════════════════════════════════════════
const PARTNERS = [
  { id: 'p-tik-001', name: 'Dalat Highland Coffee Co.', type: 'supplier', country: 'Vietnam', region: 'Lam Dong', email: 'info@dalatcoffee.vn', tier: 'gold', sc: SC_FOOD },
  { id: 'p-tik-002', name: 'Mekong Fresh Farms', type: 'supplier', country: 'Vietnam', region: 'Can Tho', email: 'supply@mekongfresh.vn', tier: 'silver', sc: SC_FOOD },
  { id: 'p-tik-003', name: 'Saigon Pharma Labs', type: 'manufacturer', country: 'Vietnam', region: 'HCMC', email: 'lab@saigonpharma.vn', tier: 'gold', sc: SC_FOOD },
  { id: 'p-tik-004', name: 'VietPack Solutions', type: 'manufacturer', country: 'Vietnam', region: 'Binh Duong', email: 'ops@vietpack.vn', tier: 'silver', sc: SC_FOOD },
  { id: 'p-tik-005', name: 'Hanoi Silk House', type: 'supplier', country: 'Vietnam', region: 'Hanoi', email: 'silk@hanoihouse.vn', tier: 'bronze', sc: SC_FOOD },
  { id: 'p-tik-006', name: 'Pacific Cold Chain Logistics', type: 'logistics', country: 'Vietnam', region: 'HCMC', email: 'dispatch@pacificcc.vn', tier: 'gold', sc: SC_FOOD },
  { id: 'p-tik-007', name: 'TechVina Electronics', type: 'manufacturer', country: 'Vietnam', region: 'Da Nang', email: 'factory@techvina.vn', tier: 'silver', sc: SC_TECH },
  { id: 'p-tik-008', name: 'Shenzhen Components Ltd', type: 'supplier', country: 'China', region: 'Guangdong', email: 'sales@szcomp.cn', tier: 'gold', sc: SC_TECH },
  { id: 'p-tik-009', name: 'Green Earth Certification', type: 'auditor', country: 'Singapore', region: 'Singapore', email: 'audit@greenearth.sg', tier: 'gold', sc: SC_FOOD },
  { id: 'p-tik-010', name: 'Asia Distribution Network', type: 'distributor', country: 'Vietnam', region: 'HCMC', email: 'orders@asiadist.vn', tier: 'silver', sc: SC_FOOD },
];

// Product mapping for batch creation
const PRODUCTS = {
  coffee: ['9e4400ec-b79e-43fd-913c-39fc82e61a8f', '95ad5dd2-d561-4f41-ae3b-4de3982f7985', 'dec67458-88da-4b88-8493-4b2fde06db78'],
  pharma: ['ef111b1b-d082-4239-a35c-1c72f298259d', '2b60dc3c-db3e-4e8a-90a4-8ac166eaf01c', '3fd4700a-95b9-4c24-b8d9-dc9dc9272c00'],
  food: ['b8f77fe5-2fe6-4639-a0d5-a02e11c7eed0', 'c993302d-e588-484a-b2ca-0e7ec4174daf', 'cf0bc3a8-6485-4fbf-8e80-bce5ed19280f', '5c713ec8-07d3-4801-bf82-d19ef95a0baf', '90123435-0a86-479b-8e66-1f4a407f17c7'],
  supplement: ['ed8cc53e-0447-4c60-9b82-346be20138e1', '3763df22-7860-4d2d-8505-98eaf82903f5'],
  tech: ['21f46fb5-c6dd-416e-9542-1064989f74dc', '638dadef-1cf3-4915-835a-8e53f84f2d42', 'e412e37c-ca0e-431e-b80b-ab0b62465c8a'],
  luxury: ['6aa31474-4a10-433c-b9ba-b89cfa614183', '1cbf1c58-085e-414c-a715-84f2cd02f965', 'b5ed1914-4ba5-48c9-bc93-86ebeb274c94', '78037b13-9573-4f96-bf36-201019058602'],
  fresh: ['f8ced5bc-b2c4-4b98-8ae5-df87070ac505'],
  giftset: ['4ed237cf-4441-4f78-bb9c-c4aedf7bbc05'],
};

const ALL_PRODUCT_IDS = Object.values(PRODUCTS).flat();

// Facilities
const FACILITIES = ['Dalat Processing Plant', 'HCMC Central Factory', 'Binh Duong Packaging Hub', 'Da Nang Tech Assembly', 'Can Tho Cold Storage'];

// Randomizers
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = arr => arr[rand(0, arr.length - 1)];
const dayOffset = d => { const dt = new Date(); dt.setDate(dt.getDate() + d); return dt.toISOString(); };

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ═══ 1. PARTNERS ═══
    console.log('Seeding partners...');
    for (const p of PARTNERS) {
      await client.query(
        `INSERT INTO partners (id, name, type, country, region, contact_email, kyc_status, trust_score, risk_level, status, compliance_score, quality_score, delivery_score, financial_score, composite_score, tier, org_id, supply_chain_id, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
         ON CONFLICT (id) DO NOTHING`,
        [p.id, p.name, p.type, p.country, p.region, p.email,
         p.tier === 'gold' ? 'verified' : 'pending',
         p.tier === 'gold' ? rand(85, 98) : rand(60, 80),
         p.tier === 'gold' ? 'low' : p.tier === 'silver' ? 'medium' : 'high',
         'active',
         rand(70, 99), rand(75, 98), rand(70, 95), rand(65, 95), rand(72, 96),
         p.tier, ORG, p.sc]
      );
    }
    console.log(`  ✓ ${PARTNERS.length} partners created`);

    // ═══ 2. BATCHES ═══
    console.log('Seeding batches...');
    const batches = [];
    const STATUSES = ['active', 'active', 'active', 'in_transit', 'delivered', 'verified'];
    let batchNum = 1000;

    for (const pid of ALL_PRODUCT_IDS) {
      const batchCount = rand(2, 4);
      for (let i = 0; i < batchCount; i++) {
        batchNum++;
        const bId = uuidv4();
        const status = pick(STATUSES);
        const mfgDaysAgo = rand(5, 120);
        const expiryDaysFromNow = rand(180, 730);
        
        await client.query(
          `INSERT INTO batches (id, batch_number, product_id, quantity, manufactured_date, expiry_date, origin_facility, status, created_at, org_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),$9) ON CONFLICT (id) DO NOTHING`,
          [bId, `TIK-B${batchNum}`, pid, rand(100, 5000),
           dayOffset(-mfgDaysAgo), dayOffset(expiryDaysFromNow),
           pick(FACILITIES), status, ORG]
        );
        batches.push({ id: bId, product_id: pid, number: `TIK-B${batchNum}`, status });
      }
    }
    console.log(`  ✓ ${batches.length} batches created`);

    // ═══ 3. SHIPMENTS ═══
    console.log('Seeding shipments...');
    const carriers = ['Pacific Cold Chain', 'VietExpress', 'DHL Vietnam', 'Viettel Post', 'Giao Hang Nhanh'];
    const shipmentStatuses = ['pending', 'in_transit', 'in_transit', 'delivered', 'delivered'];
    let shipCount = 0;

    for (const batch of batches) {
      if (Math.random() > 0.3) { // 70% of batches have shipments
        const fromPartner = pick(PARTNERS.filter(p => p.type === 'supplier' || p.type === 'manufacturer'));
        const toPartner = pick(PARTNERS.filter(p => p.type === 'distributor' || p.type === 'logistics'));
        const status = pick(shipmentStatuses);

        // GPS coordinates in Vietnam
        const lat = 10.76 + (Math.random() * 10); // 10.76 - 20.76
        const lng = 106.66 + (Math.random() * 3); // 106.66 - 109.66

        await client.query(
          `INSERT INTO shipments (id, batch_id, from_partner_id, to_partner_id, carrier, tracking_number, status, estimated_delivery, actual_delivery, current_lat, current_lng, created_at, org_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW(),$12) ON CONFLICT (id) DO NOTHING`,
          [uuidv4(), batch.id, fromPartner.id, toPartner.id,
           pick(carriers), `TRK${rand(100000, 999999)}VN`,
           status,
           dayOffset(rand(3, 14)),
           status === 'delivered' ? dayOffset(-rand(1, 7)) : null,
           lat, lng, ORG]
        );
        shipCount++;
      }
    }
    console.log(`  ✓ ${shipCount} shipments created`);

    // ═══ 4. INVENTORY ═══
    console.log('Seeding inventory...');
    // Get warehouse IDs
    const wh = await client.query(`SELECT id, name FROM ops_warehouses WHERE org_id = $1`, [ORG]);
    let invCount = 0;

    if (wh.rows.length > 0) {
      for (const pid of ALL_PRODUCT_IDS) {
        // Each product in 1-2 warehouses
        const whCount = rand(1, Math.min(2, wh.rows.length));
        for (let w = 0; w < whCount; w++) {
          const warehouse = wh.rows[w];
          const qty = rand(50, 2000);
          await client.query(
            `INSERT INTO inventory (id, product_id, partner_id, location, quantity, min_stock, max_stock, last_sync, updated_at, org_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),NOW(),$8) ON CONFLICT (id) DO NOTHING`,
            [uuidv4(), pid, pick(PARTNERS).id, warehouse.name,
             qty, Math.floor(qty * 0.2), qty * 3, ORG]
          );
          invCount++;
        }
      }
    }
    console.log(`  ✓ ${invCount} inventory records created`);

    // ═══ 5. EVIDENCE ═══
    console.log('Seeding evidence...');
    const evidenceTypes = [
      { title: 'Certificate of Origin', type: 'certificate', file: 'coo_cert.pdf' },
      { title: 'GMP Compliance Certificate', type: 'certificate', file: 'gmp_cert.pdf' },
      { title: 'Lab Test Report', type: 'report', file: 'lab_report.pdf' },
      { title: 'Organic Certification', type: 'certificate', file: 'organic_cert.pdf' },
      { title: 'ISO 22000 Audit Report', type: 'report', file: 'iso22000_audit.pdf' },
      { title: 'Carbon Footprint Assessment', type: 'report', file: 'carbon_assessment.pdf' },
      { title: 'Pesticide Residue Analysis', type: 'report', file: 'pesticide_analysis.pdf' },
      { title: 'HACCP Certification', type: 'certificate', file: 'haccp_cert.pdf' },
      { title: 'Fair Trade Certificate', type: 'certificate', file: 'fairtrade_cert.pdf' },
      { title: 'Quality Inspection Report', type: 'report', file: 'quality_inspection.pdf' },
    ];
    const verStatuses = ['verified', 'verified', 'verified', 'pending', 'uploaded'];
    let evCount = 0;

    // Evidence for partners
    for (const partner of PARTNERS) {
      const evItems = rand(2, 4);
      for (let e = 0; e < evItems; e++) {
        const ev = pick(evidenceTypes);
        const vStatus = pick(verStatuses);
        await client.query(
          `INSERT INTO evidence_items (id, title, description, file_name, file_type, file_size, sha256_hash, entity_type, entity_id, uploaded_by, verification_status, verified_at, tags, status, created_at, org_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),$15) ON CONFLICT (id) DO NOTHING`,
          [uuidv4(), `${ev.title} — ${partner.name}`,
           `${ev.type} for ${partner.name}`, ev.file, 'application/pdf',
           rand(50000, 2000000),
           require('crypto').randomBytes(32).toString('hex'),
           'partner', partner.id, OWNER_ID,
           vStatus,
           vStatus === 'verified' ? dayOffset(-rand(1, 30)) : null,
           JSON.stringify([ev.type, partner.type]),
           'active', ORG]
        );
        evCount++;
      }
    }

    // Evidence for top batches
    for (const batch of batches.slice(0, 20)) {
      const ev = pick(evidenceTypes);
      await client.query(
        `INSERT INTO evidence_items (id, title, description, file_name, file_type, file_size, sha256_hash, entity_type, entity_id, uploaded_by, verification_status, tags, status, created_at, org_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),$14) ON CONFLICT (id) DO NOTHING`,
        [uuidv4(), `${ev.title} — ${batch.number}`,
         `${ev.type} for batch ${batch.number}`, ev.file, 'application/pdf',
         rand(50000, 1500000),
         require('crypto').randomBytes(32).toString('hex'),
         'batch', batch.id, OWNER_ID,
         pick(verStatuses),
         JSON.stringify([ev.type, 'batch']),
         'active', ORG]
      );
      evCount++;
    }
    console.log(`  ✓ ${evCount} evidence items created`);

    // ═══ 6. QR CODES ═══
    console.log('Seeding QR codes...');
    for (const pid of ALL_PRODUCT_IDS) {
      const shortCode = `TIK${rand(100000, 999999)}`;
      await client.query(
        `INSERT INTO qr_codes (id, product_id, qr_data, status, generated_by, generated_at, org_id)
         VALUES ($1,$2,$3,$4,$5,NOW(),$6) ON CONFLICT (id) DO NOTHING`,
        [uuidv4(), pid,
         JSON.stringify({ type: 'product_trace', code: shortCode, url: `https://trustchecker.io/verify/${shortCode}` }),
         'active', OWNER_ID, ORG]
      );
    }
    console.log(`  ✓ ${ALL_PRODUCT_IDS.length} QR codes created`);

    // ═══ 7. SUPPLY CHAIN EVENTS ═══
    console.log('Seeding supply chain events...');
    const eventTypes = [
      { type: 'HARVESTED', loc: 'Farm' },
      { type: 'RECEIVED', loc: 'Processing Plant' },
      { type: 'QUALITY_CHECK', loc: 'QC Lab' },
      { type: 'PROCESSED', loc: 'Factory Floor' },
      { type: 'PACKAGED', loc: 'Packaging Line' },
      { type: 'SHIPPED', loc: 'Loading Dock' },
      { type: 'IN_TRANSIT', loc: 'Highway' },
      { type: 'CUSTOMS_CLEARED', loc: 'Customs Office' },
      { type: 'DELIVERED', loc: 'Distribution Center' },
      { type: 'SHELVED', loc: 'Retail Store' },
    ];
    let eventCount = 0;

    for (const batch of batches) {
      // Each batch gets 4-8 events in chronological order
      const numEvents = rand(4, 8);
      let dayAgo = rand(30, 90);

      for (let e = 0; e < numEvents; e++) {
        const evt = eventTypes[Math.min(e, eventTypes.length - 1)];
        const actorPartner = pick(PARTNERS);

        await client.query(
          `INSERT INTO supply_chain_events (id, batch_id, product_id, event_type, location, actor, partner_id, details, created_at, org_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO NOTHING`,
          [uuidv4(), batch.id, batch.product_id,
           evt.type, evt.loc,
           actorPartner.name, actorPartner.id,
           JSON.stringify({ temperature: rand(2, 25), humidity: rand(40, 80), notes: `${evt.type} at ${evt.loc} for ${batch.number}` }),
           dayOffset(-dayAgo),
           ORG]
        );
        dayAgo -= rand(1, 5);
        eventCount++;
      }
    }
    console.log(`  ✓ ${eventCount} supply chain events created`);

    await client.query('COMMIT');
    console.log('\n═══════════════════════════');
    console.log('SEED COMPLETE ✅');
    console.log('═══════════════════════════');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('SEED FAILED:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

seed();
