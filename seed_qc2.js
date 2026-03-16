const db = require('./server/db');
const { v4: uuidv4 } = require('uuid');
const ORG = 'org-demo-001';
const batches = [
  '2d0aae58-44a9-4aed-8175-a4bd5f5d8a0c',
  'b428daa9-a009-44ef-95ef-099d4fceb202',
  '297fd007-78e7-46ce-a1cd-a57dc5de78c0',
  '565b0f88-eba7-437e-9e56-0cd1b524fe8b',
  'acbe8554-d323-4fc8-890c-bb66734f0784',
  '5c99e01c-97e3-49cf-b4fb-78bf943b9508'
];
const qcs = [
  {p:'Arabica Coffee Beans',t:'incoming',cp:'Receiving Dock A',r:'pass',s:95,d:0,n:'Moisture 11.2%, Grade A'},
  {p:'Robusta Coffee',t:'incoming',cp:'Receiving Dock A',r:'pass',s:88,d:1,n:'Moisture 12.1%, Grade B+'},
  {p:'Organic Turmeric',t:'incoming',cp:'Lab Analysis',r:'fail',s:45,d:3,n:'Heavy metal contamination detected'},
  {p:'Eco Bags 250g',t:'packaging',cp:'Packaging Line 2',r:'pass',s:92,d:0,n:'Seal test passed'},
  {p:'IoT Sensor v3',t:'equipment',cp:'Tech Lab',r:'pass',s:98,d:0,n:'All 200 units calibrated'},
  {p:'Tamper Labels',t:'packaging',cp:'Packaging Line 1',r:'conditional',s:72,d:2,n:'2% adhesive failure rate'},
];
(async () => {
  for (let i = 0; i < qcs.length; i++) {
    const q = qcs[i];
    const id = uuidv4();
    try {
      await db.prepare('INSERT INTO quality_checks (id, org_id, batch_id, check_type, checkpoint, product, result, score, defects_found, inspector, notes, inspected_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())')
        .run(id, ORG, batches[i], q.t, q.cp, q.p, q.r, q.s, q.d, 'QC-Manager', q.n);
      console.log('OK', q.p, q.r);
    } catch (e) { console.log('ERR:', e.message.slice(0,80)); }
  }
  const c = await db.prepare('SELECT count(*) as cnt FROM quality_checks WHERE org_id = ?').all(ORG);
  console.log('Total QC:', c[0].cnt);
  process.exit(0);
})();
