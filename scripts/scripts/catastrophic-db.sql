-- Catastrophic Failure Fix — DB Schema Changes
-- v9.4.4: version columns, soft-delete support, offsite backup prep

-- #5: Soft-delete columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS deactivated_by TEXT;

-- #6: Version columns for optimistic locking on critical tables
ALTER TABLE ops_incidents_v2 ADD COLUMN IF NOT EXISTS version INT DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS version INT DEFAULT 0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS version INT DEFAULT 0;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS version INT DEFAULT 0;
ALTER TABLE fraud_alerts ADD COLUMN IF NOT EXISTS version INT DEFAULT 0;
ALTER TABLE certifications ADD COLUMN IF NOT EXISTS version INT DEFAULT 0;
ALTER TABLE compliance_records ADD COLUMN IF NOT EXISTS version INT DEFAULT 0;
ALTER TABLE evidence_items ADD COLUMN IF NOT EXISTS version INT DEFAULT 0;
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS version INT DEFAULT 0;
ALTER TABLE risk_models ADD COLUMN IF NOT EXISTS version INT DEFAULT 0;

-- #9: Backup verification improvements
CREATE TABLE IF NOT EXISTS backup_offsite_log (
    id BIGSERIAL PRIMARY KEY,
    backup_file TEXT,
    backup_size BIGINT,
    offsite_location TEXT,
    upload_status TEXT DEFAULT 'pending',
    checksum TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    verified_at TIMESTAMPTZ
);
