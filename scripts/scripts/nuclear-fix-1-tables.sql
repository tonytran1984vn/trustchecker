-- TrustChecker Nuclear Fix 1 — Add org_id + RLS to 4 remaining tables
-- Run as: sudo -u postgres psql -d trustchecker -f /opt/trustchecker/scripts/nuclear-fix-1-tables.sql

-- 1. audit_log — partitioned table, add org_id to parent + children
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS org_id TEXT;

-- Backfill audit_log.org_id from users based on actor_id
UPDATE audit_log al SET org_id = u.org_id
FROM users u WHERE al.actor_id = u.id AND al.org_id IS NULL;

-- 2. ticket_messages
ALTER TABLE ticket_messages ADD COLUMN IF NOT EXISTS org_id TEXT;
UPDATE ticket_messages tm SET org_id = st.org_id
FROM support_tickets st WHERE tm.ticket_id = st.id AND tm.org_id IS NULL;

-- 3. sanction_hits
ALTER TABLE sanction_hits ADD COLUMN IF NOT EXISTS org_id TEXT;

-- 4. webhook_events
ALTER TABLE webhook_events ADD COLUMN IF NOT EXISTS org_id TEXT;

-- Enable RLS on all 4
DO $do$
DECLARE
  tbl text;
  tables text[] := ARRAY['audit_log','ticket_messages','sanction_hits','webhook_events'];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS org_isolation ON %I', tbl);
    EXECUTE format($f$
      CREATE POLICY org_isolation ON %I FOR ALL
      USING (
        org_id::text = current_setting('app.current_org', true)
        OR COALESCE(current_setting('app.current_org', true), '') = ''
        OR org_id IS NULL
      )
      WITH CHECK (
        org_id::text = current_setting('app.current_org', true)
        OR COALESCE(current_setting('app.current_org', true), '') = ''
        OR org_id IS NULL
      )
    $f$, tbl);
    RAISE NOTICE 'RLS enabled on %', tbl;
  END LOOP;
END;
$do$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_org ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_org ON ticket_messages(org_id);
CREATE INDEX IF NOT EXISTS idx_sanction_hits_org ON sanction_hits(org_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_org ON webhook_events(org_id);
