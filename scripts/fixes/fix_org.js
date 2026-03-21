const db = require('./server/db');
(async () => {
  // Fix 1: Update incidents to use org-demo-001
  await db.prepare("UPDATE ops_incidents_v2 SET org_id = 'org-demo-001' WHERE org_id IN ('3309f9ca-484b-45e9-8e85-890036a374db', '54197b08-bd93-467d-a738-925ba22bdb6c')").run();
  console.log('Updated incidents org_id to org-demo-001');
  
  // Verify
  const verify = await db.prepare("SELECT org_id, status, count(*) as cnt FROM ops_incidents_v2 GROUP BY org_id, status ORDER BY org_id, status").all();
  console.log('After fix:', verify);
  
  // Fix 2: Check if RLS is blocking anomaly_detections
  // Let's trace what happens when the API is called
  // The db.prepare() uses Prisma with RLS - check if there's a SET command
  const content = require('fs').readFileSync('/opt/trustchecker/server/db.js', 'utf8');
  const rlsIdx = content.indexOf('_withRLS');
  if (rlsIdx > -1) {
    console.log('\nRLS section:', content.substring(rlsIdx, rlsIdx + 400));
  }
  
  // Check if org_id is being set via RLS
  const setIdx = content.indexOf('SET app.');
  if (setIdx > -1) {
    console.log('\nSET command:', content.substring(setIdx, setIdx + 200));
  }
  
  process.exit(0);
})();
