-- server/services/compliance-engine/schema.sql
-- Migration File cho Khối Lõi Compliance Engine (10k RPS DB Design)

-- 1. Thiết lập Table Partitioning theo Ngày (Day-Tier)
CREATE TABLE evaluation_logs (
    request_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    org_id VARCHAR(50) NOT NULL,
    
    -- LEASE-LOCK FIELDS
    status VARCHAR(20) NOT NULL, -- 'PROCESSING', 'DONE', 'FAILED'
    locked_at TIMESTAMP WITH TIME ZONE,
    lock_owner_id VARCHAR(100),  -- process.env.POD_NAME hoặc Hostname để Trace Split-brain
    
    -- FORENSIC INTEGRITY HASH CHAIN
    context_hash VARCHAR(128),     
    policy_snapshot_hash VARCHAR(128),
    hash_key_id VARCHAR(50),
    
    -- EXTRACTED HOT FIELDS CHO KIỂM TOÁN TỐC ĐỘ CAO (Không parse JSONB)
    is_allowed BOOLEAN,
    rejection_reason TEXT,
    violated_rule_ids JSONB,  -- Text[]
    
    -- HEAVY DATA LƯU TRỮ TRACE
    decision_trace JSONB,
    decision_jsonb JSONB,     -- RAW
    policy_version_id VARCHAR(50), 
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    
    PRIMARY KEY (request_id, created_at)
) PARTITION BY RANGE (created_at);

-- 2. Tối Ưu Hóa Tìm Kiếm (Hot Path Indexes)
-- Chú ý Postgres: Do Bảng Partitioned, việc ràng buộc UNIQUE(request_id) chỉ khả thi trong vách ngăn 1 Partition hoặc kèm theo Cột Ngày.
-- Đảm bảo Lõi Idempotency bằng PostgreSQL LISTEN/NOTIFY và App Layer Promise Lock.
CREATE INDEX idx_eval_logs_request_id ON evaluation_logs (request_id);
CREATE INDEX idx_eval_logs_status ON evaluation_logs (status);
CREATE INDEX idx_eval_logs_created_at ON evaluation_logs (created_at);
CREATE INDEX idx_eval_logs_org_id ON evaluation_logs (org_id);

-- 3. Tạo Sẵn Partition cho 10 Ngày tới 
CREATE TABLE evaluation_logs_y2026m03d29 PARTITION OF evaluation_logs FOR VALUES FROM ('2026-03-29') TO ('2026-03-30');
CREATE TABLE evaluation_logs_y2026m03d30 PARTITION OF evaluation_logs FOR VALUES FROM ('2026-03-30') TO ('2026-03-31');
CREATE TABLE evaluation_logs_y2026m03d31 PARTITION OF evaluation_logs FOR VALUES FROM ('2026-03-31') TO ('2026-04-01');

-- 4. Bảng Định nghĩa Rules tĩnh
CREATE TABLE policy_rules (
    id VARCHAR(100) PRIMARY KEY,
    org_id VARCHAR(50),
    version_id VARCHAR(50),
    priority INT,
    condition_json JSONB,
    effect VARCHAR(20),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
