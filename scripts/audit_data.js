const db = require('./server/db');
(async () => {
  // Data integrity checks - compare counts
  const checks = [
    { name: 'anomaly_detections (duplicate)', sql: "SELECT count(*) as cnt FROM anomaly_detections WHERE anomaly_type LIKE 'duplicate%' AND org_id = 'org-demo-001'" },
    { name: 'anomaly_detections (geo)', sql: "SELECT count(*) as cnt FROM anomaly_detections WHERE anomaly_type IN ('geo_anomaly','location_anomaly','geo_mismatch') AND org_id = 'org-demo-001'" },
    { name: 'anomaly_detections (mismatch)', sql: "SELECT count(*) as cnt FROM anomaly_detections WHERE anomaly_type IN ('mismatch','quantity_mismatch','weight_mismatch') AND org_id = 'org-demo-001'" },
    { name: 'ops_incidents_v2 (open)', sql: "SELECT count(*) as cnt FROM ops_incidents_v2 WHERE status = 'open' AND org_id = 'org-demo-001'" },
    { name: 'ops_incidents_v2 (resolved)', sql: "SELECT count(*) as cnt FROM ops_incidents_v2 WHERE status = 'resolved' AND org_id = 'org-demo-001'" },
    { name: 'ops_incidents_v2 (closed)', sql: "SELECT count(*) as cnt FROM ops_incidents_v2 WHERE status = 'closed' AND org_id = 'org-demo-001'" },
    { name: 'purchase_orders', sql: "SELECT count(*) as cnt FROM purchase_orders WHERE org_id = 'org-demo-001'" },
    { name: 'quality_checks', sql: "SELECT count(*) as cnt FROM quality_checks WHERE org_id = 'org-demo-001'" },
    { name: 'warehouses', sql: "SELECT count(*) as cnt FROM warehouses WHERE org_id = 'org-demo-001'" },
    { name: 'scan_events', sql: "SELECT count(*) as cnt FROM scan_events" },
    { name: 'shipments', sql: "SELECT count(*) as cnt FROM shipments" },
    { name: 'supplier_partners', sql: "SELECT count(*) as cnt FROM supplier_partners" },
    { name: 'products', sql: "SELECT count(*) as cnt FROM products" },
  ];
  
  console.log('=== DATA COUNTS ===');
  for (const c of checks) {
    try {
      const r = await db.prepare(c.sql).all();
      console.log(c.name + ':', r[0]?.cnt || 0);
    } catch (e) {
      console.log(c.name + ': ERROR -', e.message.slice(0,60));
    }
  }

  // Check tables with RLS
  console.log('\n=== RLS-ENABLED TABLES ===');
  const rlsTables = await db.prepare("SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE c.relrowsecurity = true AND n.nspname = 'public' ORDER BY c.relname").all();
  rlsTables.forEach(t => console.log(' -', t.relname));

  // Check indexes on key tables
  console.log('\n=== MISSING INDEXES ===');
  const indexChecks = [
    { table: 'anomaly_detections', col: 'org_id' },
    { table: 'anomaly_detections', col: 'anomaly_type' },
    { table: 'ops_incidents_v2', col: 'org_id' },
    { table: 'ops_incidents_v2', col: 'status' },
    { table: 'purchase_orders', col: 'org_id' },
    { table: 'shipments', col: 'status' },
    { table: 'scan_events', col: 'product_id' },
  ];
  for (const ic of indexChecks) {
    const idx = await db.prepare("SELECT indexname FROM pg_indexes WHERE tablename = '" + ic.table + "' AND indexdef LIKE '%" + ic.col + "%'").all();
    console.log(ic.table + '.' + ic.col + ':', idx.length > 0 ? 'indexed (' + idx[0].indexname + ')' : 'NO INDEX');
  }

  process.exit(0);
})();
