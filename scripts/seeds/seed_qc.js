const db = require('./server/db');
const { v4: uuidv4 } = require('uuid');
(async () => {
  const ORG = 'org-demo-001';
  const qcs = [
    { batch: 'B-2026-001', product: 'Arabica Coffee Beans', type: 'incoming', checkpoint: 'Receiving Dock A', inspector: 'QC-Manager', result: 'pass', score: 95, defects: 0, notes: 'Moisture 11.2%, Grade A' },
    { batch: 'B-2026-002', product: 'Robusta Coffee Beans', type: 'incoming', checkpoint: 'Receiving Dock A', inspector: 'QC-Lead', result: 'pass', score: 88, defects: 1, notes: 'Moisture 12.1%, Grade B+, minor color variation' },
    { batch: 'B-2026-003', product: 'Organic Turmeric Powder', type: 'incoming', checkpoint: 'Lab Analysis', inspector: 'QC-Manager', result: 'fail', score: 45, defects: 3, notes: 'Heavy metal contamination detected — batch quarantined' },
    { batch: 'B-2026-004', product: 'Eco-Friendly Bags 250g', type: 'packaging', checkpoint: 'Packaging Line 2', inspector: 'QC-Lead', result: 'pass', score: 92, defects: 0, notes: 'Print quality OK, seal test passed' },
    { batch: 'B-2026-005', product: 'IoT Temperature Sensor v3', type: 'equipment', checkpoint: 'Tech Lab', inspector: 'Tech-QC', result: 'pass', score: 98, defects: 0, notes: 'All 200 units calibrated within 0.2C' },
    { batch: 'B-2026-006', product: 'Tamper-Proof Labels', type: 'packaging', checkpoint: 'Packaging Line 1', inspector: 'QC-Lead', result: 'conditional', score: 72, defects: 2, notes: '2% adhesive failure rate — indoor use only' },
  ];
  for (const qc of qcs) {
    try {
      await db.run(
        `INSERT INTO quality_checks (id, org_id, batch_id, check_type, checkpoint, product, result, score, defects_found, inspector, notes, inspected_at, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW() - INTERVAL '${Math.floor(Math.random()*10)+1} days',NOW())`,
        [uuidv4(), ORG, qc.batch, qc.type, qc.checkpoint, qc.product, qc.result, qc.score, qc.defects, qc.inspector, qc.notes]
      );
      console.log('OK', qc.batch, qc.result);
    } catch (e) { console.log('ERR:', e.message.slice(0,80)); }
  }
  const cnt = await db.all("SELECT count(*) as cnt FROM quality_checks WHERE org_id = 'org-demo-001'");
  console.log('Total QC:', cnt[0].cnt);
  process.exit(0);
})();
