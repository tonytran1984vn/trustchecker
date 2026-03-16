-- TrustChecker Step 3 — Add org_id to multi-tenant tables that need it
-- Run as: sudo -u postgres psql -d trustchecker -f /opt/trustchecker/scripts/add-org-id-columns.sql

-- 1. Add org_id column to tables that need multi-tenant isolation
ALTER TABLE ratings ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE crisis_events ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE post_mortems ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE fee_distributions ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE consensus_rounds ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE partner_revenues ADD COLUMN IF NOT EXISTS org_id TEXT;

-- 2. Backfill org_id from users where possible
UPDATE ratings r SET org_id = u.org_id FROM users u WHERE r.user_id IS NOT NULL AND u.id = r.user_id AND r.org_id IS NULL;

-- 3. Enable RLS on newly org_id-enabled tables (with NULL-safe policy)
DO $do$
DECLARE
  tbl text;
  tables text[] := ARRAY['ratings','crisis_events','post_mortems','fee_distributions','invoices','consensus_rounds','partner_revenues'];
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

-- 4. Create indexes (not CONCURRENTLY since that can't be in DO block)
CREATE INDEX IF NOT EXISTS idx_ratings_org ON ratings(org_id);
CREATE INDEX IF NOT EXISTS idx_crisis_events_org ON crisis_events(org_id);
CREATE INDEX IF NOT EXISTS idx_post_mortems_org ON post_mortems(org_id);
CREATE INDEX IF NOT EXISTS idx_fee_distributions_org ON fee_distributions(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_consensus_rounds_org ON consensus_rounds(org_id);
CREATE INDEX IF NOT EXISTS idx_partner_revenues_org ON partner_revenues(org_id);
