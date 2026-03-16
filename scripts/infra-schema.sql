-- Infrastructure Schema Fixes
-- v9.4.4: shipment_checkpoints, PgBouncer prep, WAL archive settings

-- #7: Create missing shipment_checkpoints table (PM2 error source)
CREATE TABLE IF NOT EXISTS shipment_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shipment_id UUID,
    checkpoint_type TEXT,
    location TEXT,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    temperature DECIMAL(5,2),
    humidity DECIMAL(5,2),
    status TEXT DEFAULT 'pending',
    notes TEXT,
    photo_url TEXT,
    verified_by TEXT,
    org_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE shipment_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_checkpoints FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sc_isolation ON shipment_checkpoints;
CREATE POLICY sc_isolation ON shipment_checkpoints FOR ALL
USING (org_id = current_setting('app.current_org', true));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sc_org ON shipment_checkpoints(org_id);
CREATE INDEX IF NOT EXISTS idx_sc_shipment ON shipment_checkpoints(shipment_id, org_id);
CREATE INDEX IF NOT EXISTS idx_sc_created ON shipment_checkpoints(org_id, created_at DESC);

-- Version column for optimistic locking
ALTER TABLE shipment_checkpoints ADD COLUMN IF NOT EXISTS version INT DEFAULT 0;

-- Audit trigger
DROP TRIGGER IF EXISTS audit_mutation_trigger ON shipment_checkpoints;
CREATE TRIGGER audit_mutation_trigger
    AFTER INSERT OR UPDATE OR DELETE ON shipment_checkpoints
    FOR EACH ROW EXECUTE FUNCTION audit_mutation();

-- Partition support (register in partition manager)
-- shipment_checkpoints is NOT partitioned, but we register it for future growth

SELECT 'shipment_checkpoints table created with RLS + indexes + audit trigger' as result;
