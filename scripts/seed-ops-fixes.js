/**
 * Seed Ops Workspace Fixes
 * Fills missing data identified in the Ops audit:
 * 1. batches.origin_facility
 * 2. ops_warehouses temperature
 * 3. shipments product_name (via product join)
 * 4. Realistic product names (replace "Test Product mmvq6l9f-*")
 * 5. scan_events sample data
 * 6. Resolved incidents for Case History
 * 7. demand_forecasts trend data
 * 8. ops_incidents_v2 affected_entity fill
 *
 * Idempotent — can be run multiple times.
 */
const db = require('../server/db');
const { v4: uuidv4 } = require('uuid');

const FACILITIES = [
  'Bangkok Factory A', 'Hanoi Mill 2', 'Singapore Hub', 'HCMC Plant 3',
  'Da Nang Warehouse', 'Chiang Mai Farm', 'Saigon Processing', 'Kuala Lumpur DC',
  'Phnom Penh Factory', 'Jakarta Plant 1', 'Taipei Facility', 'Seoul Center'
];

const PRODUCT_NAMES = [
  'Vietnam Robusta 500g', 'Thai Jasmine Rice 1kg', 'Arabica Reserve Blend',
  'Organic Green Tea 250g', 'Coconut Oil Cold-Pressed 500ml', 'Cashew Nut Premium 1kg',
  'Dragon Fruit Dried 200g', 'Black Pepper Phu Quoc 100g', 'Turmeric Powder 150g',
  'Cinnamon Sticks Ceylon 200g', 'Palm Sugar Organic 500g', 'Mango Dried Slices 250g',
  'Fish Sauce Nước Mắm 750ml', 'Rice Paper Sheets 400g', 'Matcha Grade A 100g',
  'Lemongrass Essential Oil 30ml', 'Cocoa Nibs Raw 300g', 'Moringa Powder 200g',
  'Ginger Root Dried 150g', 'Star Anise Whole 100g', 'Saffron Premium 5g',
  'White Pepper Ground 80g', 'Cardamom Green 100g', 'Vanilla Beans Grade A 10pc',
  'Clove Whole 100g', 'Nutmeg Whole 200g', 'Chili Flakes Bird Eye 80g',
  'Tamarind Paste 400g', 'Sesame Oil Cold-Pressed 500ml', 'Peanut Butter Natural 350g',
  'Spirulina Powder 150g', 'Chia Seeds Organic 500g', 'Quinoa White 1kg',
  'Honey Raw Wildflower 500g', 'Olive Oil Extra Virgin 750ml', 'Avocado Oil Premium 500ml',
  'Coconut Cream 400ml', 'Soy Sauce Naturally Brewed 500ml', 'Miso Paste White 300g',
  'Tofu Firm Organic 400g'
];

const WAREHOUSE_TEMPS = {
  'Bangkok Transit': 24, 'Hanoi Warehouse': 22, 'Singapore Port': 25,
  'HCMC Distribution': 26, 'Da Nang Hub': 23, 'KL Logistics': 24,
};

const TRENDS = [
  'rising +5%', 'stable', 'rising +12%', 'declining -3%', 'stable +1%',
  'seasonal peak', 'strong growth +8%', 'trending up +4%', 'plateau',
  'moderate rise +6%', 'dip -2% (expected)', 'steady'
];

async function main() {
  console.log('[seed-ops-fixes] Starting...');
  const orgRow = await db.get("SELECT org_id FROM users WHERE email = 'ops@tonyisking.com'");
  const orgId = orgRow?.org_id;
  console.log('[seed-ops-fixes] org_id:', orgId);

  // ─── 1. Update batches.origin_facility ───────────────
  console.log('[1] Updating batches.origin_facility...');
  const nullOrigins = await db.all(
    "SELECT id FROM batches WHERE origin_facility IS NULL OR origin_facility = '' LIMIT 100"
  );
  for (let i = 0; i < nullOrigins.length; i++) {
    const facility = FACILITIES[i % FACILITIES.length];
    await db.run('UPDATE batches SET origin_facility = $1 WHERE id = $2', [facility, nullOrigins[i].id]);
  }
  console.log(`  Updated ${nullOrigins.length} batches`);

  // ─── 2. Warehouse temperature ────────────────────────
  console.log('[2] Updating warehouse temperature...');
  // Check if column exists
  try {
    await db.run("ALTER TABLE ops_warehouses ADD COLUMN IF NOT EXISTS temperature NUMERIC DEFAULT NULL");
  } catch (e) {
    // Column might already exist
  }
  const warehouses = await db.all('SELECT id, name FROM ops_warehouses');
  for (const w of warehouses) {
    const temp = WAREHOUSE_TEMPS[w.name] || Math.floor(20 + Math.random() * 8);
    await db.run('UPDATE ops_warehouses SET temperature = $1 WHERE id = $2', [temp, w.id]);
  }
  console.log(`  Updated ${warehouses.length} warehouses with temperature`);

  // ─── 3. Update product names ─────────────────────────
  console.log('[3] Updating test product names...');
  const testProducts = await db.all(
    "SELECT id FROM products WHERE name LIKE 'Test Product mmvq6l9f%' LIMIT 40"
  );
  for (let i = 0; i < testProducts.length; i++) {
    const name = PRODUCT_NAMES[i % PRODUCT_NAMES.length];
    await db.run('UPDATE products SET name = $1 WHERE id = $2', [name, testProducts[i].id]);
  }
  console.log(`  Updated ${testProducts.length} product names`);

  // ─── 4. Seed scan_events ─────────────────────────────
  console.log('[4] Seeding scan_events...');
  const scanCount = await db.get('SELECT COUNT(*) as c FROM scan_events');
  if ((scanCount?.c || 0) < 5) {
    const products = await db.all('SELECT id, name FROM products LIMIT 10');
    const qrCodes = await db.all('SELECT id, qr_data FROM qr_codes LIMIT 10');
    const cities = ['Hanoi', 'HCMC', 'Bangkok', 'Singapore', 'Da Nang', 'Kuala Lumpur', 'Jakarta', 'Tokyo', 'Seoul', 'Taipei'];
    const countries = ['VN', 'VN', 'TH', 'SG', 'VN', 'MY', 'ID', 'JP', 'KR', 'TW'];
    const agents = [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    ];
    const scanTypes = ['verification', 'first_scan', 'activation', 'verification', 'verification'];

    for (let i = 0; i < 25; i++) {
      const id = uuidv4();
      const prod = products[i % products.length] || {};
      const qr = qrCodes[i % qrCodes.length] || {};
      const cityIdx = i % cities.length;
      const hoursAgo = Math.floor(Math.random() * 72);
      const scannedAt = new Date(Date.now() - hoursAgo * 60 * 60000).toISOString();
      const fraudScore = i < 20 ? (Math.random() * 0.15) : (i < 23 ? (0.3 + Math.random() * 0.3) : (0.7 + Math.random() * 0.3));

      try {
        await db.run(
          `INSERT INTO scan_events (id, qr_code_id, product_id, scan_type, geo_city, geo_country, user_agent, fraud_score, scanned_at, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)`,
          [id, qr.id || null, prod.id || null, scanTypes[i % scanTypes.length],
           cities[cityIdx], countries[cityIdx], agents[i % agents.length],
           parseFloat(fraudScore.toFixed(3)), scannedAt]
        );
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log('  Seeded 25 scan events');
  } else {
    console.log(`  Skipped — already ${scanCount.c} scans`);
  }

  // ─── 5. Resolve some incidents ───────────────────────
  console.log('[5] Resolving incidents for case history...');
  const openIncidents = await db.all(
    "SELECT id, incident_id FROM ops_incidents_v2 WHERE status = 'open' LIMIT 3"
  );
  const resolutions = [
    'Root cause identified: expired SSL certificate on partner API. Renewed and deployed.',
    'False positive — batch verified clean after manual inspection. Quality team confirmed.',
    'Warehouse temperature sensor recalibrated. Reading now within tolerance range.',
  ];
  for (let i = 0; i < Math.min(openIncidents.length, 2); i++) {
    await db.run(
      "UPDATE ops_incidents_v2 SET status = 'resolved', resolution = $1, resolved_at = NOW() WHERE id = $2",
      [resolutions[i], openIncidents[i].id]
    );
    console.log(`  Resolved ${openIncidents[i].incident_id}`);
  }

  // ─── 6. Update demand_forecasts trend ────────────────
  console.log('[6] Updating demand forecast trends...');
  try {
    await db.run("ALTER TABLE demand_forecasts ADD COLUMN IF NOT EXISTS trend TEXT DEFAULT NULL");
  } catch (e) {}
  const forecasts = await db.all(
    "SELECT id FROM demand_forecasts WHERE trend IS NULL OR trend = '' LIMIT 50"
  );
  for (let i = 0; i < forecasts.length; i++) {
    const trend = TRENDS[i % TRENDS.length];
    await db.run('UPDATE demand_forecasts SET trend = $1 WHERE id = $2', [trend, forecasts[i].id]);
  }
  console.log(`  Updated ${forecasts.length} forecasts with trend data`);

  // ─── 7. Fill incidents affected_entity ───────────────
  console.log('[7] Updating incident affected_entity...');
  const noEntity = await db.all(
    "SELECT id FROM ops_incidents_v2 WHERE affected_entity IS NULL OR affected_entity = '' LIMIT 20"
  );
  const entities = [
    'B-2026-0412', 'B-2026-0389', 'B-2026-0401', 'SHP-TIK-0019',
    'WH-BKK-01', 'SHP-TIK-0015', 'B-2026-0376', 'WH-HN-02',
    'PO-2026-0044', 'B-2026-0355', 'SHP-TIK-0008'
  ];
  for (let i = 0; i < noEntity.length; i++) {
    const entity = entities[i % entities.length];
    await db.run('UPDATE ops_incidents_v2 SET affected_entity = $1 WHERE id = $2', [entity, noEntity[i].id]);
  }
  console.log(`  Updated ${noEntity.length} incidents with affected_entity`);

  // ─── 8. Update shipment product names ────────────────
  console.log('[8] Enriching shipments with product_name...');
  try {
    await db.run("ALTER TABLE shipments ADD COLUMN IF NOT EXISTS product_name TEXT DEFAULT NULL");
  } catch (e) {}
  const shipments = await db.all(
    `SELECT s.id, p.name as pname FROM shipments s
     LEFT JOIN batches b ON s.batch_id = b.id
     LEFT JOIN products p ON b.product_id = p.id
     WHERE s.product_name IS NULL AND p.name IS NOT NULL LIMIT 100`
  );
  for (const s of shipments) {
    if (s.pname) {
      await db.run('UPDATE shipments SET product_name = $1 WHERE id = $2', [s.pname, s.id]);
    }
  }
  // Fill remaining with random product names
  const stillNull = await db.all(
    "SELECT id FROM shipments WHERE product_name IS NULL OR product_name = '' LIMIT 100"
  );
  for (let i = 0; i < stillNull.length; i++) {
    const name = PRODUCT_NAMES[i % PRODUCT_NAMES.length];
    await db.run('UPDATE shipments SET product_name = $1 WHERE id = $2', [name, stillNull[i].id]);
  }
  console.log(`  Updated ${shipments.length + stillNull.length} shipments`);

  console.log('[seed-ops-fixes] ✅ Done');
  process.exit(0);
}

main().catch(e => {
  console.error('[seed-ops-fixes] Error:', e.message);
  process.exit(1);
});
