-- SQL Migration for Billing-Grade Usage Ledger

-- The UsageEvent table is created by Prisma normally.
-- Since Prisma natively lacks powerful PARTITION BY RANGE syntax, 
-- we execute this raw SQL script to override and apply Partitioning logic.

-- 1. Drop existing UsageEvent (if created initially by Prisma)
DROP TABLE IF EXISTS "usage_events" CASCADE;

-- 2. Create the Parent Table with PARTITION BY RANGE
CREATE TABLE "usage_events" (
    id BIGSERIAL,
    event_id TEXT NOT NULL,
    org_id TEXT NOT NULL,
    feature TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 1,

    occurred_at TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    source TEXT DEFAULT 'api',
    idempotency_key TEXT,
    user_id TEXT,
    metadata JSONB,

    schema_version INT DEFAULT 1,

    -- Note: PRIMARY KEY for partitioned tables MUST include the partition key!
    PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

-- 3. Create initial Partitions (e.g. Current Month and Next Month)
-- Tip: A scheduled CRON should be made to Auto-create these blocks.
CREATE TABLE usage_events_2026_03
    PARTITION OF "usage_events"
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE usage_events_2026_04
    PARTITION OF "usage_events"
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE usage_events_2026_05
    PARTITION OF "usage_events"
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- 4. Apply Strategic Indexes
-- 4.1 Global Idempotency (Cannot easily UNIQUE across partitions in Postgres without occurred_at in it, 
--     so we index it. Application layer or Redis must heavily protect UX double inserts, or we create a separate hash-mapping table for strict global uniqueness if highly required).
CREATE UNIQUE INDEX ux_usage_event_id ON "usage_events" (event_id, occurred_at);

-- 4.2 Query and Reconcile Indexes
CREATE INDEX idx_usage_org_feature_time ON "usage_events" (org_id, feature, occurred_at DESC);
CREATE INDEX idx_usage_occurred_at ON "usage_events" (occurred_at);

-- Notes: 
-- You must run this directly against your PostgreSQL Database instance.
-- psql -d <database> -f create-usage-ledger-partition.sql
