CREATE TABLE IF NOT EXISTS replay_diff_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  model_a TEXT NOT NULL,
  model_b TEXT NOT NULL,
  status TEXT DEFAULT 'running'
);

CREATE TABLE IF NOT EXISTS replay_diff_results (
  id BIGSERIAL PRIMARY KEY,
  run_id UUID REFERENCES replay_diff_runs(id),

  ts TIMESTAMPTZ NOT NULL,
  metric_name TEXT,
  event_type TEXT, 

  a_output JSONB,
  b_output JSONB,

  diff_type TEXT, 
  score_delta DOUBLE PRECISION
);

CREATE TABLE IF NOT EXISTS replay_diff_summary (
  run_id UUID PRIMARY KEY REFERENCES replay_diff_runs(id),

  total_events INT,
  matches INT,
  drifts INT,
  regressions INT,
  improvements INT,

  avg_score_delta DOUBLE PRECISION,
  max_score_delta DOUBLE PRECISION
);
