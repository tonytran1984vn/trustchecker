const db = require('./server/db');
(async () => {
  // Simulate what happens during an actual API call
  // Check if RLS policies exist on anomaly_detections
  const policies = await db.prepare("SELECT polname, polcmd, polqual FROM pg_policy WHERE polrelid = 'anomaly_detections'::regclass").all();
  console.log('RLS policies on anomaly_detections:', policies);
  
  // Check if RLS is enabled
  const rls = await db.prepare("SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'anomaly_detections'").all();
  console.log('RLS enabled:', rls);
  
  // Same for ops_incidents_v2
  try {
    const pol2 = await db.prepare("SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'ops_incidents_v2'::regclass").all();
    console.log('RLS policies on ops_incidents_v2:', pol2);
    const rls2 = await db.prepare("SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = 'ops_incidents_v2'").all();
    console.log('RLS enabled:', rls2);
  } catch(e) { console.log('No policies for ops_incidents_v2'); }
  
  // Check deployed workspace file for closedCases
  const ws = require('fs').readFileSync('/opt/trustchecker/client/pages/ops/ops-monitor-workspace.js', 'utf8');
  console.log('\nWorkspace has closedCases:', ws.includes('closedCases'));
  console.log('Workspace has 5 APIs:', ws.includes('All 5'));
  
  process.exit(0);
})();
