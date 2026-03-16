-- TrustChecker RLS Migration — Multi-Tenant Isolation at Database Level
-- Run as: sudo -u postgres psql -d trustchecker -f /opt/trustchecker/scripts/rls-migration.sql
-- Date: 2026-03-14

BEGIN;

DO $do$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'anomaly_detections','batches','blockchain_seals','carbon_actions','certifications',
    'channel_rules','cie_anchors','cie_passports','cie_snapshots','cie_tenant_config',
    'compliance_records','data_retention_policies','demand_forecasts','duplicate_classifications',
    'evidence_items','forensic_cases','fraud_alerts','inventory','iot_readings',
    'kyc_businesses','kyc_checks','leak_alerts','memberships','model_change_requests',
    'nft_certificates','ops_incidents_v2','ops_warehouses','partner_locations','partners',
    'pending_role_approvals','products','purchase_orders','qr_codes','quality_checks',
    'rbac_roles','record_versions','risk_models','route_breaches','shipments',
    'sla_definitions','sla_violations','supply_chain_events','supply_chain_graph',
    'supply_chains','supply_routes','support_tickets','sustainability_scores',
    'transaction_fees','trust_scores','update_proposals','users'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    -- Force RLS even for table owner
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    -- Drop existing policy if any
    EXECUTE format('DROP POLICY IF EXISTS org_isolation ON %I', tbl);
    -- Create policy: allow when org_id matches session var, or when session var is empty (platform admin)
    EXECUTE format($f$
      CREATE POLICY org_isolation ON %I FOR ALL
      USING (
        org_id::text = current_setting('app.current_org', true)
        OR COALESCE(current_setting('app.current_org', true), '') = ''
      )
      WITH CHECK (
        org_id::text = current_setting('app.current_org', true)
        OR COALESCE(current_setting('app.current_org', true), '') = ''
      )
    $f$, tbl);
    RAISE NOTICE 'RLS enabled on %', tbl;
  END LOOP;
END;
$do$;

-- Also enable RLS on scan_events (partitioned table - parent)
ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_events FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation ON scan_events;
CREATE POLICY org_isolation ON scan_events FOR ALL
USING (
  org_id::text = current_setting('app.current_org', true)
  OR COALESCE(current_setting('app.current_org', true), '') = ''
)
WITH CHECK (
  org_id::text = current_setting('app.current_org', true)
  OR COALESCE(current_setting('app.current_org', true), '') = ''
);

COMMIT;
