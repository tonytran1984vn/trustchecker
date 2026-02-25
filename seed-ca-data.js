// Seed batches + supply chain events for Tony Is King org
// With proper batch_id, locations, and route logic
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const ORG_ID = '54197b08-bd93-467d-a738-925ba22bdb6c';

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  // 1. Get existing products
  const { rows: products } = await client.query(
    'SELECT id, name FROM products WHERE org_id = $1 LIMIT 10', [ORG_ID]
  );
  console.log(`Found ${products.length} products`);

  if (products.length === 0) {
    console.log('⚠️ No products found. Creating sample products first...');
    const sampleProducts = [
      { name: 'Premium Robusta Coffee 500g', sku: 'COFFEE-ROB-500' },
      { name: 'Arabica Single Origin 250g', sku: 'COFFEE-ARA-250' },
      { name: 'Organic Cashew Nuts 1kg', sku: 'CASHEW-ORG-1KG' },
      { name: 'Dragon Fruit Dried 200g', sku: 'DFRUIT-DRY-200' },
      { name: 'Black Pepper Whole 500g', sku: 'PEPPER-BLK-500' },
    ];
    for (const p of sampleProducts) {
      const id = uuidv4();
      await client.query(
        `INSERT INTO products (id, name, sku, org_id, status, created_at) 
         VALUES ($1, $2, $3, $4, 'active', NOW())
         ON CONFLICT DO NOTHING`,
        [id, p.name, p.sku, ORG_ID]
      );
      products.push({ id, name: p.name });
    }
    console.log(`✅ Created ${sampleProducts.length} sample products`);
  }

  // 2. Define batches with full supply chain routes
  const batchRoutes = [
    {
      batch_number: 'BATCH-2026-001',
      product_idx: 0,
      quantity: 5000,
      origin: 'Dalat Coffee Farm, Vietnam',
      status: 'delivered',
      mfg_date: '2026-01-15',
      route: [
        { type: 'harvested', location: 'Dalat Coffee Farm, Vietnam', time: '2026-01-15T06:00:00Z', notes: 'Organic robusta beans harvested from highland farm' },
        { type: 'quality_check', location: 'QC Lab Dalat', time: '2026-01-16T09:00:00Z', notes: 'Moisture 11.2%, Grade A certified' },
        { type: 'processed', location: 'HCMC Processing Hub', time: '2026-01-18T14:00:00Z', notes: 'Roasted, ground, vacuum-packed' },
        { type: 'packaged', location: 'Binh Duong Factory', time: '2026-01-20T10:00:00Z', notes: '5000 units packaged, QR applied' },
        { type: 'shipped', location: 'Cat Lai Port, HCMC', time: '2026-01-22T08:00:00Z', notes: 'Container MSKU-2841920 loaded' },
        { type: 'customs_cleared', location: 'Singapore Customs', time: '2026-01-25T16:00:00Z', notes: 'Import clearance approved' },
        { type: 'delivered', location: 'Singapore DC, Jurong', time: '2026-01-26T11:00:00Z', notes: 'Received at distribution center' },
      ],
    },
    {
      batch_number: 'BATCH-2026-002',
      product_idx: 1,
      quantity: 3000,
      origin: 'Dalat Coffee Farm, Vietnam',
      status: 'in_transit',
      mfg_date: '2026-02-01',
      route: [
        { type: 'harvested', location: 'Dalat Coffee Farm, Vietnam', time: '2026-02-01T07:00:00Z', notes: 'Arabica single origin, altitude 1500m' },
        { type: 'quality_check', location: 'QC Lab Dalat', time: '2026-02-02T10:00:00Z', notes: 'Cupping score 86/100' },
        { type: 'processed', location: 'Da Nang Packaging Center', time: '2026-02-05T13:00:00Z', notes: 'Light roast, nitrogen-flushed packaging' },
        { type: 'shipped', location: 'Hai Phong Port', time: '2026-02-08T09:00:00Z', notes: 'Vessel: COSCO Pacific Star, ETA Tokyo Feb 15' },
        { type: 'in_transit', location: 'Tokyo Warehouse, Chiba', time: '2026-02-15T14:00:00Z', notes: 'Arrived at Chiba warehouse, pending customs' },
      ],
    },
    {
      batch_number: 'BATCH-2026-003',
      product_idx: 2,
      quantity: 2000,
      origin: 'Binh Phuoc Farm',
      status: 'shipped',
      mfg_date: '2026-02-10',
      route: [
        { type: 'harvested', location: 'Binh Phuoc', time: '2026-02-10T06:30:00Z', notes: 'Organic cashew, USDA certified farm' },
        { type: 'processed', location: 'Binh Duong Factory', time: '2026-02-12T11:00:00Z', notes: 'Shelled, roasted, salted. 2000 bags packed' },
        { type: 'quality_check', location: 'HCMC Processing Hub', time: '2026-02-13T15:00:00Z', notes: 'Lab test passed: aflatoxin < 2ppb' },
        { type: 'shipped', location: 'Cat Lai Port, HCMC', time: '2026-02-15T07:00:00Z', notes: 'Shipped to Seoul via Busan gateway' },
        { type: 'in_transit', location: 'Busan', time: '2026-02-19T12:00:00Z', notes: 'Transshipment at Busan port' },
        { type: 'in_transit', location: 'Seoul', time: '2026-02-20T18:00:00Z', notes: 'Customs clearance in progress' },
      ],
    },
    {
      batch_number: 'BATCH-2026-004',
      product_idx: 3,
      quantity: 8000,
      origin: 'Phu Quoc',
      status: 'manufactured',
      mfg_date: '2026-02-18',
      route: [
        { type: 'harvested', location: 'Phu Quoc', time: '2026-02-18T05:00:00Z', notes: 'Red dragon fruit, farm-to-factory in 24h' },
        { type: 'processed', location: 'Can Tho', time: '2026-02-19T10:00:00Z', notes: 'Freeze-dried, 200g packs sealed' },
        { type: 'quality_check', location: 'Can Tho', time: '2026-02-19T16:00:00Z', notes: 'Shelf life test 18 months confirmed' },
        { type: 'packaged', location: 'HCMC Processing Hub', time: '2026-02-21T09:00:00Z', notes: '8000 units ready for distribution' },
      ],
    },
    {
      batch_number: 'BATCH-2026-005',
      product_idx: 4,
      quantity: 10000,
      origin: 'Phu Quoc',
      status: 'delivered',
      mfg_date: '2026-01-05',
      route: [
        { type: 'harvested', location: 'Phu Quoc', time: '2026-01-05T06:00:00Z', notes: 'Black pepper, premium grade, sun-dried' },
        { type: 'processed', location: 'HCMC Processing Hub', time: '2026-01-08T12:00:00Z', notes: 'Cleaned, graded, vacuum sealed' },
        { type: 'shipped', location: 'Cat Lai Port, HCMC', time: '2026-01-10T08:00:00Z', notes: 'FCL container to Hamburg' },
        { type: 'in_transit', location: 'Singapore Customs', time: '2026-01-12T14:00:00Z', notes: 'Transshipment Singapore' },
        { type: 'customs_cleared', location: 'Hamburg', time: '2026-01-28T10:00:00Z', notes: 'EU phytosanitary cleared' },
        { type: 'delivered', location: 'Munich', time: '2026-01-30T16:00:00Z', notes: 'Delivered to Kaufland distribution' },
      ],
    },
  ];

  // 3. Insert batches and events
  let totalBatches = 0, totalEvents = 0;

  for (const br of batchRoutes) {
    const batchId = uuidv4();
    const productId = products[br.product_idx % products.length].id;

    // Insert batch
    await client.query(
      `INSERT INTO batches (id, batch_number, product_id, quantity, manufactured_date, origin_facility, org_id, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT DO NOTHING`,
      [batchId, br.batch_number, productId, br.quantity, br.mfg_date, br.origin, ORG_ID, br.status]
    );
    totalBatches++;
    console.log(`  📦 Batch: ${br.batch_number} (${products[br.product_idx % products.length].name})`);

    // Insert supply chain events with batch_id
    for (const evt of br.route) {
      const eventId = uuidv4();
      await client.query(
        `INSERT INTO supply_chain_events (id, event_type, product_id, batch_id, location, actor, details, org_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [eventId, evt.type, productId, batchId, evt.location, 'system',
          JSON.stringify({ notes: evt.notes, batch_number: br.batch_number }), ORG_ID, evt.time]
      );
      totalEvents++;
    }
  }

  console.log(`\n✅ Seeded ${totalBatches} batches and ${totalEvents} supply chain events`);
  console.log('📍 Locations covered: Dalat → HCMC → Binh Duong → Cat Lai → Singapore → Tokyo → Seoul → Hamburg → Munich');

  client.release();
  await pool.end();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
