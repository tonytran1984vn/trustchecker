CREATE TABLE IF NOT EXISTS causal_graph_weights (
    edge_id TEXT PRIMARY KEY,
    source_node TEXT NOT NULL,
    target_node TEXT NOT NULL,
    weight DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    confidence DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS autonomous_actions_log (
    id BIGSERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    confidence DOUBLE PRECISION NOT NULL,
    mode TEXT NOT NULL, -- AUTO_EXECUTE | RECOMMEND_ONLY
    status TEXT NOT NULL, -- PENDING | COMPLETED | FAILED
    context JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);
