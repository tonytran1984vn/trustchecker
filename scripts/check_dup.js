const db = require('./server/db');
(async () => {
  // Get 3 recent duplicate alerts with all their data
  const rows = await db.prepare(`
    SELECT ad.id, ad.source_id, ad.source_type, ad.severity, ad.status, 
           ad.description, ad.details, ad.detected_at, ad.org_id
    FROM anomaly_detections ad
    WHERE ad.anomaly_type LIKE 'duplicate%'
    ORDER BY ad.detected_at DESC LIMIT 3
  `).all();
  
  rows.forEach((r, i) => {
    console.log(`\n=== Alert ${i} ===`);
    console.log('source_id:', r.source_id);
    console.log('source_type:', r.source_type);
    console.log('severity:', r.severity, '| status:', r.status);
    console.log('description:', r.description);
    console.log('details:', JSON.stringify(r.details));
    console.log('org_id:', r.org_id);
  });
  
  // Check if any source_id matches scan_events
  const match = await db.prepare(`
    SELECT count(*) as cnt FROM anomaly_detections ad 
    INNER JOIN scan_events se ON ad.source_id::text = se.id::text 
    WHERE ad.anomaly_type LIKE 'duplicate%'
  `).all();
  console.log('\nJOIN matches:', JSON.stringify(match));

  // Check what source_id looks like in scan_events
  const seIds = await db.prepare('SELECT id FROM scan_events LIMIT 3').all();
  console.log('Sample scan_events IDs:', seIds.map(r => r.id));
  
  // Check what source_id looks like in anomaly
  const adIds = await db.prepare("SELECT source_id FROM anomaly_detections WHERE anomaly_type LIKE 'duplicate%' LIMIT 3").all();
  console.log('Sample anomaly source_ids:', adIds.map(r => r.source_id));
  
  process.exit(0);
})();
