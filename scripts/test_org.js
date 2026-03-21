const db = require('./server/db');
(async () => {
  // Check what org_ids exist in anomaly_detections
  const orgIds = await db.prepare("SELECT org_id, count(*) as cnt FROM anomaly_detections WHERE anomaly_type LIKE 'duplicate%' GROUP BY org_id").all();
  console.log('Anomaly org_ids:', orgIds);
  
  // Check the user's org
  const users = await db.prepare("SELECT id, email, org_id FROM users LIMIT 5").all();
  console.log('Users:', users.map(u => ({ email: u.email, org_id: u.org_id })));
  
  // Try without any org filter (like getOrgId returns null)
  const noFilter = await db.prepare("SELECT count(*) as cnt FROM anomaly_detections WHERE anomaly_type LIKE 'duplicate%'").all();
  console.log('Without filter:', noFilter);
  
  // Check what org_ids exist in ops_incidents_v2
  const incOrgs = await db.prepare("SELECT org_id, status, count(*) as cnt FROM ops_incidents_v2 GROUP BY org_id, status ORDER BY org_id, status").all();
  console.log('Incident org_ids:', incOrgs);
  
  process.exit(0);
})();
