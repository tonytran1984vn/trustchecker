CREATE TABLE IF NOT EXISTS action_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES action_proposals(id),
  action TEXT,
  target JSONB,
  success BOOLEAN,
  latency_ms INT,
  pre_metrics JSONB,
  post_metrics JSONB,
  improvement DOUBLE PRECISION, 
  timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id TEXT REFERENCES action_policies(id),
  version INT,
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS policy_learning_stats (
  policy_id TEXT PRIMARY KEY REFERENCES action_policies(id),
  success_rate DOUBLE PRECISION DEFAULT 1.0,
  failure_rate DOUBLE PRECISION DEFAULT 0.0,
  avg_improvement DOUBLE PRECISION DEFAULT 0.0,
  avg_latency DOUBLE PRECISION DEFAULT 0.0,
  sample_size INT DEFAULT 0
);
