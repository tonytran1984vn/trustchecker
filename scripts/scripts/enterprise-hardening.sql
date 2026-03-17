-- Enterprise Hardening — Fix PM2 crash causes + composite indexes
-- Run as: sudo -u postgres psql -d trustchecker -f /opt/trustchecker/scripts/enterprise-hardening.sql

BEGIN;

-- ═══════════════════════════════════════════════════════════════════
-- FIX PM2 CRASH #1: Missing partition functions
-- These are called by partition-manager.js on startup and cause repeated errors
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION create_monthly_partitions(base_table TEXT, months_ahead INT DEFAULT 3)
RETURNS void AS $$
DECLARE
    start_date DATE;
    end_date DATE;
    part_name TEXT;
    i INT;
BEGIN
    FOR i IN 0..months_ahead LOOP
        start_date := date_trunc('month', CURRENT_DATE + (i || ' months')::interval);
        end_date := start_date + '1 month'::interval;
        part_name := base_table || '_' || to_char(start_date, 'YYYY_MM');
        
        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = part_name) THEN
            EXECUTE format(
                'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                part_name, base_table, start_date, end_date
            );
            RAISE NOTICE 'Created partition: %', part_name;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION drop_old_partitions(base_table TEXT, months_to_keep INT DEFAULT 12)
RETURNS void AS $$
DECLARE
    cutoff DATE;
    rec RECORD;
BEGIN
    cutoff := date_trunc('month', CURRENT_DATE - (months_to_keep || ' months')::interval);
    
    FOR rec IN
        SELECT inhrelid::regclass::text AS part_name
        FROM pg_inherits
        WHERE inhparent = base_table::regclass
        ORDER BY inhrelid::regclass::text
    LOOP
        -- Extract date from partition name (format: table_YYYY_MM)
        BEGIN
            IF to_date(substring(rec.part_name FROM '\d{4}_\d{2}$'), 'YYYY_MM') < cutoff THEN
                EXECUTE format('DROP TABLE IF EXISTS %I', rec.part_name);
                RAISE NOTICE 'Dropped old partition: %', rec.part_name;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            NULL; -- Skip partitions with non-date suffixes (e.g., _default)
        END;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_partition_health()
RETURNS TABLE(parent_table TEXT, partition_count INT, total_rows BIGINT) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        inhparent::regclass::text AS parent_table,
        count(*)::int AS partition_count,
        sum(pg_stat_get_live_tuples(inhrelid))::bigint AS total_rows
    FROM pg_inherits
    GROUP BY inhparent
    ORDER BY inhparent::regclass::text;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════
-- FIX PM2 CRASH #2: Missing created_at on anomaly_detections
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE anomaly_detections ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ═══════════════════════════════════════════════════════════════════
-- FIX PM2 CRASH #3: trust/dashboard num_ratings alias
-- The trust engine queries: SELECT COUNT(*) as num_ratings FROM ratings
-- But the column alias differs from what stakeholder.js expects
-- ═══════════════════════════════════════════════════════════════════

-- (This is an application-level fix, handled in Python patch below)

-- ═══════════════════════════════════════════════════════════════════
-- PERFORMANCE: Composite indexes for SaaS query patterns
-- Pattern: WHERE org_id = ? ORDER BY created_at DESC
-- ═══════════════════════════════════════════════════════════════════

-- High-traffic tables (most queried with ORDER BY created_at)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_org_created ON products(org_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_scan_events_org_scanned ON scan_events(org_id, scanned_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fraud_alerts_org_created ON fraud_alerts(org_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_org_created ON ops_incidents_v2(org_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_org_created ON evidence_items(org_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_partners_org_created ON partners(org_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_tickets_org_created ON support_tickets(org_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_compliance_org_created ON compliance_records(org_id, created_at DESC);

-- Status-filtered queries: WHERE org_id = ? AND status = ?
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fraud_alerts_org_status ON fraud_alerts(org_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_incidents_org_status ON ops_incidents_v2(org_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tickets_org_status ON support_tickets(org_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_certifications_org_status ON certifications(org_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_anomaly_org_status ON anomaly_detections(org_id, status);

-- Purchase order queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_org_status ON purchase_orders(org_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_po_org_created ON purchase_orders(org_id, created_at DESC);

-- Audit log (partitioned — create on each partition)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_org_ts ON audit_log(org_id, timestamp DESC);

COMMIT;
