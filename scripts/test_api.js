const db = require('./server/db');
(async () => {
  try {
    // Test the exact query the API uses
    const rows = await db.prepare(`
      SELECT ad.* FROM anomaly_detections ad
      WHERE ad.anomaly_type LIKE 'duplicate%'
      AND (ad.org_id = 'org-demo-001' OR ad.org_id IS NULL)
      ORDER BY ad.detected_at DESC LIMIT 5
    `).all();
    console.log('Duplicate alerts found:', rows.length);
    if (rows[0]) console.log('First:', rows[0].id, rows[0].source_id, rows[0].severity, rows[0].status);
  } catch (e) {
    console.log('DUP ERROR:', e.message);
  }
  
  try {
    // Test incidents resolved
    const rows = await db.prepare(`
      SELECT * FROM ops_incidents_v2 
      WHERE status = 'resolved' 
      ORDER BY created_at DESC LIMIT 5
    `).all();
    console.log('\nResolved incidents:', rows.length);
    if (rows[0]) console.log('First:', rows[0].incident_id, rows[0].title, rows[0].status);
  } catch (e) {
    console.log('INC ERROR:', e.message);
  }

  // Check if deployed file has the right content
  const fs = require('fs');
  const content = fs.readFileSync('/opt/trustchecker/server/routes/ops-data.js', 'utf8');
  const dupIdx = content.indexOf('duplicate-alerts');
  console.log('\nDeployed file has duplicate-alerts at index:', dupIdx);
  // Show the query around that area
  const chunk = content.substring(dupIdx, dupIdx + 300);
  console.log('Query section:', chunk.substring(0, 300));
  
  process.exit(0);
})();
