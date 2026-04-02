CREATE TABLE IF NOT EXISTS model_governance_state (
    id INT PRIMARY KEY DEFAULT 1,
    active_model VARCHAR(255) NOT NULL DEFAULT 'PredictiveModelV1',
    canary_model VARCHAR(255),
    mode VARCHAR(50) NOT NULL DEFAULT 'STABLE', -- STABLE | CANARY | KILLED
    kill_switch_engaged BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ DEFAULT now(),
    -- Enforce singleton row pattern
    CHECK (id = 1)
);

-- Seed singleton governance row safely
INSERT INTO model_governance_state (id) VALUES (1) ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS promotion_logs (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID REFERENCES replay_diff_runs(id),
    target_model VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- PROMOTED | REJECTED
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);
