-- Data Integrity Fix — UNIQUE Constraints (#3 + #6)

-- Products: prevent duplicate SKU per org
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_products_org_sku 
    ON products(org_id, sku) WHERE sku IS NOT NULL AND sku != '';

-- Partners: prevent duplicate name per org
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_partners_org_name 
    ON partners(org_id, name) WHERE name IS NOT NULL AND name != '';

-- Fraud alerts: prevent duplicate alert per scan per type
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_fraud_scan_type 
    ON fraud_alerts(scan_event_id, alert_type) WHERE scan_event_id IS NOT NULL;

-- Ratings: one rating per user per entity
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_ratings_user_entity 
    ON ratings(user_id, entity_id, entity_type);

-- Certifications: prevent duplicate cert per org
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_certs_org_name_number 
    ON certifications(org_id, cert_name, cert_number) WHERE cert_name IS NOT NULL;

-- API keys: unique key hash
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_api_keys_hash 
    ON api_keys(key_hash) WHERE key_hash IS NOT NULL;

-- Score baselines table for retention protection (#9)
CREATE TABLE IF NOT EXISTS score_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL,
    org_id TEXT NOT NULL,
    scan_count INT DEFAULT 0,
    avg_fraud_score DECIMAL(5,3),
    avg_trust_score DECIMAL(5,3),
    valid_count INT DEFAULT 0,
    suspicious_count INT DEFAULT 0,
    counterfeit_count INT DEFAULT 0,
    baseline_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baseline_product ON score_baselines(product_id, baseline_date DESC);
CREATE INDEX IF NOT EXISTS idx_baseline_org ON score_baselines(org_id);

-- Enable RLS on score_baselines
ALTER TABLE score_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_baselines FORCE ROW LEVEL SECURITY;
CREATE POLICY baseline_isolation ON score_baselines FOR ALL
USING (org_id = current_setting('app.current_org', true));

SELECT 'Data integrity DB fixes applied — 6 UNIQUE indexes + score_baselines table' as result;
