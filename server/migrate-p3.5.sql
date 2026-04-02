CREATE TABLE IF NOT EXISTS replay_snapshots (
    ts TIMESTAMPTZ PRIMARY KEY,
    state JSONB NOT NULL
);

-- Note: Because replay_snapshots is a heavy JSONB payload mapping deep telemetry states, 
-- it's kept simple over primary key. No partition necessary unless keeping hundreds of thousands of snapshots.
