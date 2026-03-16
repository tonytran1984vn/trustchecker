-- TrustChecker Step 4 — Add missing org_id indexes
-- Run as: sudo -u postgres psql -d trustchecker -f /opt/trustchecker/scripts/add-org-indexes.sql

-- Tables that HAVE org_id but LACK an org_id index
-- (Identified by comparing pg_indexes with information_schema.columns)

CREATE INDEX IF NOT EXISTS idx_compliance_records_org ON compliance_records(org_id);
CREATE INDEX IF NOT EXISTS idx_evidence_items_org ON evidence_items(org_id);
CREATE INDEX IF NOT EXISTS idx_forensic_cases_org ON forensic_cases(org_id);
CREATE INDEX IF NOT EXISTS idx_kyc_businesses_org ON kyc_businesses(org_id);
CREATE INDEX IF NOT EXISTS idx_kyc_checks_org ON kyc_checks(org_id);
CREATE INDEX IF NOT EXISTS idx_leak_alerts_org ON leak_alerts(org_id);
CREATE INDEX IF NOT EXISTS idx_iot_readings_org ON iot_readings(org_id);
CREATE INDEX IF NOT EXISTS idx_data_retention_policies_org ON data_retention_policies(org_id);
CREATE INDEX IF NOT EXISTS idx_channel_rules_org ON channel_rules(org_id);
CREATE INDEX IF NOT EXISTS idx_cie_tenant_config_org ON cie_tenant_config(org_id);
CREATE INDEX IF NOT EXISTS idx_model_change_requests_org ON model_change_requests(org_id);
CREATE INDEX IF NOT EXISTS idx_pending_role_approvals_org ON pending_role_approvals(org_id);
CREATE INDEX IF NOT EXISTS idx_blockchain_seals_org ON blockchain_seals(org_id);
CREATE INDEX IF NOT EXISTS idx_carbon_actions_org ON carbon_actions(org_id);
CREATE INDEX IF NOT EXISTS idx_certifications_org ON certifications(org_id);
CREATE INDEX IF NOT EXISTS idx_cie_anchors_org ON cie_anchors(org_id);
CREATE INDEX IF NOT EXISTS idx_cie_passports_org ON cie_passports(org_id);
CREATE INDEX IF NOT EXISTS idx_cie_snapshots_org ON cie_snapshots(org_id);
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships(org_id);
CREATE INDEX IF NOT EXISTS idx_qr_codes_org ON qr_codes(org_id);
CREATE INDEX IF NOT EXISTS idx_record_versions_org_idx ON record_versions(org_id);
