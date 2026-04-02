CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ENUM cho status (hard constraint)
DO $$ BEGIN
    CREATE TYPE incident_status AS ENUM (
        'open',
        'acknowledged',
        'in_progress',
        'escalated',
        'war_room_active',
        'resolved',
        'post_mortem',
        'closed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS ops_incidents (
    incident_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status incident_status NOT NULL DEFAULT 'open',
    severity_key TEXT NOT NULL,
    severity_payload JSONB NOT NULL,
    module TEXT,
    affected_entity TEXT,
    triggered_by TEXT NOT NULL,
    assigned_to TEXT,
    idempotency_key TEXT NOT NULL,

    -- SLA
    response_target_min INT NOT NULL,
    response_deadline TIMESTAMP NOT NULL,
    acknowledged_at TIMESTAMP,
    resolved_at TIMESTAMP,
    sla_breached BOOLEAN DEFAULT FALSE,

    -- metadata
    tags TEXT[],
    details JSONB DEFAULT '{}',

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_incident_idempotency ON ops_incidents(idempotency_key);
-- SLA Index 
CREATE INDEX IF NOT EXISTS idx_incident_sla_deadline ON ops_incidents(response_deadline);
-- Status Index
CREATE INDEX IF NOT EXISTS idx_incident_status ON ops_incidents(status);
-- War Room Constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_warroom ON ops_incidents(incident_id) WHERE status = 'war_room_active';

-- FSM Enforcement Table
CREATE TABLE IF NOT EXISTS incident_fsm_transitions (
    from_state incident_status,
    to_state incident_status,
    PRIMARY KEY (from_state, to_state)
);

-- Seed FSM Rules
INSERT INTO incident_fsm_transitions (from_state, to_state) VALUES
('open', 'acknowledged'),
('open', 'escalated'),
('acknowledged', 'in_progress'),
('acknowledged', 'escalated'),
('in_progress', 'escalated'),
('in_progress', 'resolved'),
('escalated', 'war_room_active'),
('escalated', 'resolved'),
('war_room_active', 'resolved'),
('resolved', 'post_mortem'),
('post_mortem', 'closed')
ON CONFLICT DO NOTHING;

-- Trigger: Enforce FSM
CREATE OR REPLACE FUNCTION enforce_fsm_transition()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = OLD.status THEN
        RETURN NEW;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM incident_fsm_transitions
        WHERE from_state = OLD.status
        AND to_state = NEW.status
    ) THEN
        RAISE EXCEPTION 'Invalid FSM transition: % -> %', OLD.status, NEW.status;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fsm_transition ON ops_incidents;
CREATE TRIGGER trg_fsm_transition BEFORE UPDATE ON ops_incidents FOR EACH ROW EXECUTE FUNCTION enforce_fsm_transition();

-- Auto-update timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_timestamp ON ops_incidents;
CREATE TRIGGER trg_update_timestamp BEFORE UPDATE ON ops_incidents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- EVENT SOURCING TABLE
CREATE TABLE IF NOT EXISTS incident_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    from_state incident_status,
    to_state incident_status,
    payload JSONB,
    actor TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    prev_hash TEXT,
    hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_events_incident_id ON incident_events(incident_id);

-- Append-only Guard
CREATE OR REPLACE FUNCTION prevent_event_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Event store is append-only';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_update_events ON incident_events;
CREATE TRIGGER trg_no_update_events BEFORE UPDATE OR DELETE ON incident_events FOR EACH ROW EXECUTE FUNCTION prevent_event_update();

-- AUTO-WRITE EVENT TRIGGER LOGIC (P2)
CREATE OR REPLACE FUNCTION log_incident_create()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO incident_events (
        incident_id,
        event_type,
        to_state,
        payload,
        actor,
        hash
    ) VALUES (
        NEW.incident_id,
        'INCIDENT_CREATED',
        NEW.status,
        jsonb_build_object('title', NEW.title),
        NEW.triggered_by,
        encode(digest(NEW.incident_id || NOW()::TEXT, 'sha256'), 'hex')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_create ON ops_incidents;
CREATE TRIGGER trg_log_create AFTER INSERT ON ops_incidents FOR EACH ROW EXECUTE FUNCTION log_incident_create();

CREATE OR REPLACE FUNCTION log_incident_event()
RETURNS TRIGGER AS $$
DECLARE
    v_prev_hash TEXT;
    v_new_hash TEXT;
BEGIN
    SELECT hash INTO v_prev_hash
    FROM incident_events
    WHERE incident_id = NEW.incident_id
    ORDER BY created_at DESC
    LIMIT 1;

    v_new_hash := encode(
        digest(
            coalesce(v_prev_hash, '') ||
            NEW.incident_id ||
            NEW.status::TEXT ||
            NOW()::TEXT,
            'sha256'
        ),
        'hex'
    );

    INSERT INTO incident_events (
        incident_id,
        event_type,
        from_state,
        to_state,
        payload,
        actor,
        prev_hash,
        hash
    ) VALUES (
        NEW.incident_id,
        'STATUS_CHANGED',
        OLD.status,
        NEW.status,
        jsonb_build_object('title', NEW.title, 'severity', NEW.severity_key),
        COALESCE(NEW.assigned_to, 'system'),
        v_prev_hash,
        v_new_hash
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_log_event ON ops_incidents;
CREATE TRIGGER trg_log_event AFTER UPDATE ON ops_incidents FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status) EXECUTE FUNCTION log_incident_event();
