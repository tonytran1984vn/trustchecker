const db = require('./server/db');
(async () => {
  // Check the actual org table
  const orgs = await db.prepare("SELECT id, name, slug FROM organizations LIMIT 10").all();
  console.log('Organizations:', orgs);
  
  // Check if getOrgId resolves to what
  const user = await db.prepare("SELECT id, email, org_id, role FROM users WHERE email = 'ggc@demo.trustchecker.io'").get();
  console.log('GGC user:', user);
  
  // Check organizations table relationships
  const orgLookup = await db.prepare("SELECT * FROM organizations WHERE id = 'org-demo-001'").get();
  console.log('org-demo-001:', orgLookup);
  
  // Check if there's a UUID org that maps
  try {
    const orgUuid = await db.prepare("SELECT * FROM organizations WHERE id = '3309f9ca-484b-45e9-8e85-890036a374db'").get();
    console.log('UUID org:', orgUuid);
  } catch(e) { console.log('UUID org lookup err:', e.message); }
  
  // Check what the middleware actually passes as orgId - look at a recent request
  // Check the getOrgId function
  const fs = require('fs');
  const content = fs.readFileSync('/opt/trustchecker/server/routes/ops-data.js', 'utf8');
  const getOrgIdx = content.indexOf('function getOrgId');
  console.log('\ngetOrgId function:', content.substring(getOrgIdx, getOrgIdx + 100));
  
  process.exit(0);
})();
