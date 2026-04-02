-- 1. BASELINE ENGINE STATE
CREATE TABLE IF NOT EXISTS ops_metric_baselines (
    metric_name TEXT PRIMARY KEY,
    ema DOUBLE PRECISION,
    variance DOUBLE PRECISION,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PARTITIONED TELEMETRY STORE
-- Drop existing naive table if it exists to replace with partitioned variant
DROP TABLE IF EXISTS ops_metrics_telemetry CASCADE;

CREATE TABLE ops_metrics_telemetry (
    id BIGSERIAL,
    metric_name TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    tags JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (id, ts)
) PARTITION BY RANGE (ts);

-- 3. INITIAL PARTITIONS (Current month and next)
-- Using April 2026 as starting point
CREATE TABLE IF NOT EXISTS ops_metrics_telemetry_y2026m04 
PARTITION OF ops_metrics_telemetry 
FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE IF NOT EXISTS ops_metrics_telemetry_y2026m05 
PARTITION OF ops_metrics_telemetry 
FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- 4. CRITICAL INDICES
CREATE INDEX IF NOT EXISTS idx_metric_ts_desc ON ops_metrics_telemetry (metric_name, ts DESC);
CREATE INDEX IF NOT EXISTS idx_tags_gin ON ops_metrics_telemetry USING GIN (tags);

-- 5. AGGREGATION ROLLUP CACHE (Optional Fast Path)
CREATE TABLE IF NOT EXISTS ops_metrics_1m_rollup (
    metric_name TEXT NOT NULL,
    bucket_ts TIMESTAMPTZ NOT NULL,
    avg_value DOUBLE PRECISION,
    max_value DOUBLE PRECISION,
    min_value DOUBLE PRECISION,
    PRIMARY KEY (metric_name, bucket_ts)
);
