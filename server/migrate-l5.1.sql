CREATE TABLE IF NOT EXISTS action_policies (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  risk_tier TEXT NOT NULL,               -- LOW | MEDIUM | HIGH | CRITICAL
  approval_mode TEXT NOT NULL,           -- AUTO | ONE_APPROVER | TWO_APPROVERS | MANUAL
  max_concurrency INT DEFAULT 1,         
  cooldown_sec INT DEFAULT 300,          
  sla_sec INT DEFAULT 60,                
  constraints JSONB                      
);

CREATE TABLE IF NOT EXISTS action_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  action TEXT,
  target JSONB,                          
  root_cause TEXT,
  confidence DOUBLE PRECISION,
  status TEXT,                           -- PENDING | APPROVED | REJECTED | EXECUTED | EXPIRED | ROLLEDBACK
  risk_tier TEXT,
  context JSONB,                         
  dedupe_key TEXT,                -- Prevents duplicate spams concurrently
  expires_at TIMESTAMPTZ
);

ALTER TABLE action_proposals DROP CONSTRAINT IF EXISTS action_proposals_dedupe_key_key;

CREATE TABLE IF NOT EXISTS action_approvals (
  id BIGSERIAL PRIMARY KEY,
  proposal_id UUID REFERENCES action_proposals(id),
  approver_id TEXT,
  decision TEXT,                         -- APPROVE | REJECT
  decided_at TIMESTAMPTZ DEFAULT now(),
  comment TEXT
);

CREATE TABLE IF NOT EXISTS action_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id UUID REFERENCES action_proposals(id),
  executed_at TIMESTAMPTZ DEFAULT now(),
  result TEXT,                           -- SUCCESS | FAILED
  latency_ms INT,
  output JSONB
);

-- Seed Default Essential Policies
INSERT INTO action_policies (id, action, risk_tier, approval_mode, max_concurrency, cooldown_sec, sla_sec) 
VALUES 
('pol_scale', 'scale_up', 'LOW', 'AUTO', 5, 120, 60),
('pol_restart', 'restart_service', 'MEDIUM', 'ONE_APPROVER', 1, 300, 120),
('pol_rollback', 'rollback_release', 'HIGH', 'TWO_APPROVERS', 1, 600, 300),
('pol_throttle', 'throttle_traffic', 'MEDIUM', 'AUTO', 2, 60, 60)
ON CONFLICT (id) DO NOTHING;
