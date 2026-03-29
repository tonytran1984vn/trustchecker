-- server/services/compliance-engine/schema-v2.sql
-- Nâng Cấp Schema: Bảng Luật Lệ Thuyên Chuyển Động (Dynamic Compliance Policies)

CREATE TABLE IF NOT EXISTS compliance_policies (
    id SERIAL PRIMARY KEY,
    org_id VARCHAR(50) NOT NULL DEFAULT 'SYSTEM', -- Lưới Lọc: Nếu một Org muốn Custom Rule Riêng So Với Hệ thống?
    action VARCHAR(50) NOT NULL,                  -- Cổng Kiểm duyệt: VD: PUBLISH_PRODUCT
    version_id VARCHAR(50) NOT NULL,              -- Định danh Snapshot (vd: v1.0.0, v2026.03.29)
    rules_jsonb JSONB NOT NULL,                   -- Bộ Mạch DSL Chứa Logic Độc Đáo
    is_active BOOLEAN DEFAULT FALSE,              -- Cờ Phất Báo Hiệu Đang Chấp Chưởng
    created_by UUID,                              -- Ai đã đọa Luật Mới? (Lưu ID Admin)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Invariant: Mỗi Org chỉ có 1 Version Định danh duy nhất ở 1 Action
    UNIQUE(org_id, action, version_id)
);

-- Index Truy Nã Nóng Lấy Luật Đương Thời Nhanh Chóng Cực Điểm
CREATE INDEX IF NOT EXISTS idx_compliance_policies_active ON compliance_policies (org_id, action) WHERE is_active = true;

-- [Khởi Tạo Hạt Giống] Rule Cổ Mẫu Độc Nhất V1 Tạm Của Chuyên Ngành Supply Chain
INSERT INTO compliance_policies (org_id, action, version_id, rules_jsonb, is_active, created_by)
VALUES (
    'SYSTEM',
    'PUBLISH_PRODUCT',
    'v1.0.0_bootstrap',
    '[
        {
            "rule_id": "risk_limit_strict",
            "priority": 100,
            "effect": "DENY",
            "message": "Supplier must explicitly have trust score >= 60",
            "condition": {
                "AND": [
                    { "field": "supplier.trust_score", "operator": "EXISTS" },
                    { "NOT": { "field": "supplier.trust_score", "operator": "GT", "value": 60 } }
                ]
            }
        }
    ]'::jsonb,
    true,
    NULL
) ON CONFLICT (org_id, action, version_id) DO NOTHING;
