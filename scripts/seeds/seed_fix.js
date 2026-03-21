const db = require('./server/db');
const { v4: uuidv4 } = require('uuid');

(async () => {
  const ORG = 'org-demo-001';

  // 1. Create missing indexes
  console.log('=== Creating indexes ===');
  const indexes = [
    "CREATE INDEX IF NOT EXISTS idx_anomaly_type ON anomaly_detections(anomaly_type)",
    "CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status)",
    "CREATE INDEX IF NOT EXISTS idx_anomaly_detected ON anomaly_detections(detected_at DESC)",
  ];
  for (const sql of indexes) {
    try { await db.run(sql); console.log('  ✅', sql.match(/idx_\w+/)?.[0]); } 
    catch (e) { console.log('  ⚠️', e.message.slice(0,60)); }
  }

  // 2. Seed purchase_orders
  console.log('\n=== Seeding purchase_orders ===');
  const pos = [
    { supplier: 'VietNam Coffee Corp', product: 'Arabica Coffee Beans', qty: 5000, unit: 'kg', price: 4.50, status: 'approved', delivery: '2026-03-20' },
    { supplier: 'Thai Packaging Ltd', product: 'Eco-Friendly Bags 250g', qty: 20000, unit: 'pcs', price: 0.12, status: 'pending', delivery: '2026-03-25' },
    { supplier: 'Singapore Logistics Hub', product: 'Cold Chain Containers', qty: 50, unit: 'units', price: 850.00, status: 'shipped', delivery: '2026-03-18' },
    { supplier: 'Korea Tech Sensors', product: 'IoT Temperature Sensor v3', qty: 200, unit: 'pcs', price: 35.00, status: 'approved', delivery: '2026-04-01' },
    { supplier: 'Japanese Seal Co', product: 'Tamper-Proof Labels', qty: 100000, unit: 'pcs', price: 0.03, status: 'delivered', delivery: '2026-03-10' },
    { supplier: 'EU GreenCert AG', product: 'Carbon Offset Credits', qty: 500, unit: 'tons', price: 28.00, status: 'pending', delivery: '2026-04-15' },
    { supplier: 'India Spice Traders', product: 'Organic Turmeric Powder', qty: 2000, unit: 'kg', price: 8.20, status: 'approved', delivery: '2026-03-28' },
    { supplier: 'VietNam Coffee Corp', product: 'Robusta Coffee Beans', qty: 8000, unit: 'kg', price: 2.80, status: 'shipped', delivery: '2026-03-22' },
  ];
  for (const po of pos) {
    const id = uuidv4();
    const poNum = 'PO-' + Date.now().toString(36).toUpperCase().slice(-4) + '-' + Math.floor(Math.random()*900+100);
    try {
      await db.run(
        `INSERT INTO purchase_orders (id, po_number, supplier, product, quantity, unit, unit_price, total_amount, status, delivery_date, payment_terms, org_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
        [id, poNum, po.supplier, po.product, po.qty, po.unit, po.price, po.qty * po.price, po.status, po.delivery, 'Net 30', ORG]
      );
      console.log('  ✅', poNum, po.product);
    } catch (e) { console.log('  ⚠️ PO:', e.message.slice(0,80)); }
  }

  // 3. Seed quality_checks
  console.log('\n=== Seeding quality_checks ===');
  const qcs = [
    { batch: 'B-2026-001', product: 'Arabica Coffee Beans', inspector: 'QC-Manager', result: 'pass', score: 95, notes: 'Moisture 11.2%, Grade A' },
    { batch: 'B-2026-002', product: 'Robusta Coffee Beans', inspector: 'QC-Lead', result: 'pass', score: 88, notes: 'Moisture 12.1%, Grade B+' },
    { batch: 'B-2026-003', product: 'Organic Turmeric Powder', inspector: 'QC-Manager', result: 'fail', score: 45, notes: 'Contamination detected — batch quarantined' },
    { batch: 'B-2026-004', product: 'Eco-Friendly Bags 250g', inspector: 'QC-Lead', result: 'pass', score: 92, notes: 'Print quality OK, seal test passed' },
    { batch: 'B-2026-005', product: 'IoT Temperature Sensor v3', inspector: 'Tech-QC', result: 'pass', score: 98, notes: 'All 200 units calibrated within ±0.2°C' },
    { batch: 'B-2026-006', product: 'Tamper-Proof Labels', inspector: 'QC-Lead', result: 'conditional', score: 72, notes: '2% adhesive failure rate — acceptable for indoor use only' },
  ];
  for (const qc of qcs) {
    const id = uuidv4();
    try {
      await db.run(
        `INSERT INTO quality_checks (id, batch_id, product_name, inspector, result, score, notes, org_id, checked_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`,
        [id, qc.batch, qc.product, qc.inspector, qc.result, qc.score, qc.notes, ORG]
      );
      console.log('  ✅', qc.batch, qc.result);
    } catch (e) { console.log('  ⚠️ QC:', e.message.slice(0,80)); }
  }

  // 4. Seed mismatch anomalies
  console.log('\n=== Seeding mismatch anomalies ===');
  const mismatches = [
    { type: 'quantity_mismatch', sev: 'high', desc: 'PO expected 5000kg but received 4750kg — 250kg shortage', details: { expected: 5000, actual: 4750, variance: -250, unit: 'kg', product: 'Arabica Coffee Beans' } },
    { type: 'weight_mismatch', sev: 'medium', desc: 'Container weight 2350kg vs manifest 2400kg — 50kg discrepancy', details: { expected: 2400, actual: 2350, variance: -50, unit: 'kg', route: 'SGSIN-VNHCM' } },
    { type: 'mismatch', sev: 'critical', desc: 'Product label shows "Organic" but certification expired 2 months ago', details: { product: 'Organic Turmeric Powder', issue: 'expired_certification', cert_expiry: '2026-01-15' } },
    { type: 'quantity_mismatch', sev: 'low', desc: 'Minor count variance on tamper labels: 99,850 received vs 100,000 ordered', details: { expected: 100000, actual: 99850, variance: -150, unit: 'pcs', product: 'Tamper-Proof Labels' } },
    { type: 'mismatch', sev: 'high', desc: 'Temperature log shows 8°C spike during transit — cold chain breach suspected', details: { max_temp: 12, threshold: 4, duration_hrs: 2.5, route: 'SG-Warehouse → HCM-Distribution' } },
    { type: 'weight_mismatch', sev: 'medium', desc: 'Bag weight variance detected: 248g avg vs 250g spec on 500 samples', details: { expected: 250, actual: 248, variance: -2, unit: 'g', product: 'Eco-Friendly Bags 250g' } },
  ];
  for (const m of mismatches) {
    const id = uuidv4();
    try {
      await db.run(
        `INSERT INTO anomaly_detections (id, source_id, source_type, anomaly_type, severity, status, description, details, org_id, detected_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW() - INTERVAL '${Math.floor(Math.random()*14)+1} days')`,
        [id, uuidv4(), 'shipment', m.type, m.sev, 'open', m.desc, JSON.stringify(m.details), ORG]
      );
      console.log('  ✅', m.type, m.sev);
    } catch (e) { console.log('  ⚠️ Mismatch:', e.message.slice(0,80)); }
  }

  // Verify counts
  console.log('\n=== Verification ===');
  const poCount = await db.all("SELECT count(*) as cnt FROM purchase_orders WHERE org_id = 'org-demo-001'");
  const qcCount = await db.all("SELECT count(*) as cnt FROM quality_checks WHERE org_id = 'org-demo-001'");
  const mmCount = await db.all("SELECT count(*) as cnt FROM anomaly_detections WHERE anomaly_type IN ('mismatch','quantity_mismatch','weight_mismatch') AND org_id = 'org-demo-001'");
  console.log('Purchase Orders:', poCount[0].cnt);
  console.log('Quality Checks:', qcCount[0].cnt);
  console.log('Mismatch Alerts:', mmCount[0].cnt);

  process.exit(0);
})();
