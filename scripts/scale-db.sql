-- Billion-Row Scale Fix — DB Changes
-- #6: Composite ORDER BY indexes
-- #7: PostgreSQL tuning
-- #3 + #9: Materialized views
-- #10: Retention policy helper

-- ═══════════════════════════════════════════
-- FIX #6: Composite indexes for ORDER BY
-- ═══════════════════════════════════════════
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fraud_status_created 
    ON fraud_alerts(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_status_created 
    ON support_tickets(status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_anomaly_status_severity 
    ON anomaly_detections(status, severity);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_product_at 
    ON scan_events(product_id, scanned_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_user_created 
    ON invoices(user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_org_created 
    ON products(org_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_org_created 
    ON evidence_items(org_id, created_at DESC);

-- Additional covering indexes for hot queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_org_role 
    ON users(org_id, role, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_org_date_result 
    ON scan_events(org_id, scanned_at DESC, result);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fraud_org_status_created 
    ON fraud_alerts(org_id, status, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trust_product_calc 
    ON trust_scores(product_id, calculated_at DESC);

-- ═══════════════════════════════════════════
-- FIX #3 + #9: Materialized Views
-- ═══════════════════════════════════════════

-- Dashboard counts — refreshed every 5 min by scheduler
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_dashboard_counts AS
SELECT 
    org_id,
    (SELECT count(*) FROM users u WHERE u.org_id = o.org_id) as user_count,
    (SELECT count(*) FROM products p WHERE p.org_id = o.org_id) as product_count,
    (SELECT count(*) FROM scan_events se WHERE se.org_id = o.org_id) as scan_count,
    (SELECT count(*) FROM scan_events se WHERE se.org_id = o.org_id AND DATE(se.scanned_at) = CURRENT_DATE) as scans_today,
    (SELECT count(*) FROM fraud_alerts fa WHERE fa.org_id = o.org_id AND fa.status = 'open') as open_fraud,
    (SELECT count(*) FROM evidence_items ei WHERE ei.org_id = o.org_id) as evidence_count,
    (SELECT count(*) FROM support_tickets st WHERE st.org_id = o.org_id AND st.status = 'open') as open_tickets,
    (SELECT count(*) FROM anomaly_detections ad WHERE ad.org_id = o.org_id AND ad.status = 'open') as open_anomalies,
    NOW() as refreshed_at
FROM (SELECT DISTINCT org_id FROM organizations WHERE status = 'active') o;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_org ON mv_dashboard_counts(org_id);

-- Scan daily aggregation — refreshed every 15 min
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_scan_daily AS
SELECT 
    org_id,
    DATE(scanned_at) as scan_date,
    COUNT(*) as total_scans,
    COUNT(*) FILTER (WHERE result = 'valid') as valid_count,
    COUNT(*) FILTER (WHERE result = 'suspicious') as suspicious_count,
    COUNT(*) FILTER (WHERE result = 'counterfeit') as counterfeit_count,
    AVG(fraud_score) as avg_fraud_score,
    AVG(trust_score) as avg_trust_score
FROM scan_events
GROUP BY org_id, DATE(scanned_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_scan_daily_key ON mv_scan_daily(org_id, scan_date);
CREATE INDEX IF NOT EXISTS idx_mv_scan_daily_date ON mv_scan_daily(scan_date DESC);

-- Audit action summary — refreshed hourly 
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_audit_summary AS
SELECT 
    org_id,
    action,
    COUNT(*) as count,
    MAX(timestamp) as last_occurred
FROM audit_log
WHERE timestamp > NOW() - INTERVAL '90 days'
GROUP BY org_id, action;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_audit_key ON mv_audit_summary(org_id, action);

-- Anomaly stats — refreshed every 15 min
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_anomaly_stats AS
SELECT
    org_id,
    anomaly_type,
    severity,
    status,
    COUNT(*) as count
FROM anomaly_detections
GROUP BY org_id, anomaly_type, severity, status;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_anomaly_key ON mv_anomaly_stats(org_id, anomaly_type, severity, status);

-- ═══════════════════════════════════════════
-- FIX #10: Data retention helper table
-- ═══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    retention_days INT DEFAULT 365,
    last_purge TIMESTAMPTZ,
    rows_purged BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(org_id, table_name)
);

-- Insert default policies
INSERT INTO data_retention_policies (org_id, table_name, retention_days) 
VALUES 
    ('*', 'audit_log', 730),
    ('*', 'scan_events', 365),
    ('*', 'data_mutation_log', 180),
    ('*', 'fraud_alerts', 365),
    ('*', 'error_log', 90)
ON CONFLICT DO NOTHING;

SELECT 'Scale DB changes applied' as result;
