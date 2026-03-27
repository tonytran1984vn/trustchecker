-- ═══════════════════════════════════════════════════════════════════
-- TrustChecker — Phase 2: Backfill Legacy Data → New Schema
-- ═══════════════════════════════════════════════════════════════════
-- Run AFTER Phase 0 (DDL) and Phase 1 (dual-write enabled)
-- All ops are idempotent — safe to re-run
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────
-- STEP 1: products → product_definitions
-- ─────────────────────────────────────────────────

INSERT INTO product_definitions (id, name, brand_org_id, category, description, origin_country, status, created_at, updated_at)
SELECT
  id,
  name,
  COALESCE(org_id, 'UNKNOWN_ORG'),
  COALESCE(category, ''),
  COALESCE(description, ''),
  COALESCE(origin_country, ''),
  status,
  created_at,
  updated_at
FROM products
ON CONFLICT DO NOTHING;


-- ─────────────────────────────────────────────────
-- STEP 2: products → product_catalogs (self-catalog)
-- ─────────────────────────────────────────────────

INSERT INTO product_catalogs (id, org_id, product_definition_id, sku, status, created_at)
SELECT
  id || '_catalog',                             -- deterministic ID for safe re-runs
  COALESCE(org_id, 'UNKNOWN_ORG'),
  id,
  sku,
  status,
  created_at
FROM products
WHERE org_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;


-- ─────────────────────────────────────────────────
-- STEP 3: batches → link product_definition_id + current_owner_org_id
-- ─────────────────────────────────────────────────

UPDATE batches b
SET
  product_definition_id = b.product_id,
  current_owner_org_id  = p.org_id
FROM products p
WHERE p.id = b.product_id
  AND b.product_definition_id IS NULL;


-- ─────────────────────────────────────────────────
-- STEP 4: QR first_scanned_at backfill
-- ─────────────────────────────────────────────────

-- 4a. Mark first scans
WITH first_scans AS (
  SELECT DISTINCT ON (qr_code_id)
    id, qr_code_id, scanned_at
  FROM scan_events
  WHERE qr_code_id IS NOT NULL
  ORDER BY qr_code_id, scanned_at ASC
)
UPDATE scan_events se
SET is_first_scan = true
FROM first_scans fs
WHERE se.id = fs.id
  AND se.is_first_scan IS NOT true;

-- 4b. Populate qr_codes.first_scanned_at
UPDATE qr_codes q
SET
  first_scanned_at = sub.first_scan,
  scan_count = sub.cnt,
  qr_state = CASE
    WHEN sub.cnt > 0 THEN 'active'
    ELSE 'activated'
  END
FROM (
  SELECT
    qr_code_id,
    MIN(scanned_at) AS first_scan,
    COUNT(*) AS cnt
  FROM scan_events
  WHERE qr_code_id IS NOT NULL
  GROUP BY qr_code_id
) sub
WHERE q.id = sub.qr_code_id
  AND q.first_scanned_at IS NULL;


-- ─────────────────────────────────────────────────
-- STEP 5: Initial trust score snapshots (version 1)
-- ─────────────────────────────────────────────────

-- Products
INSERT INTO trust_score_snapshots (id, entity_type, entity_id, score, components, version, calculated_at)
SELECT
  'tscore_prod_' || id,                         -- deterministic ID
  'product',
  id,
  trust_score,
  jsonb_build_object(
    'legacy_import', true,
    'original_score', trust_score
  ),
  1,
  now()
FROM products
ON CONFLICT (id) DO NOTHING;

-- Organizations
INSERT INTO trust_score_snapshots (id, entity_type, entity_id, score, components, version, calculated_at)
SELECT
  'tscore_org_' || id,                          -- deterministic ID
  'org',
  id,
  75.00,  -- baseline for existing orgs
  jsonb_build_object('legacy_import', true, 'baseline', true),
  1,
  now()
FROM organizations
ON CONFLICT (id) DO NOTHING;


COMMIT;

-- V1: Count check — products ↔ product_definitions
SELECT 'products' as tbl, count(*) FROM products
UNION ALL
SELECT 'product_definitions', count(*) FROM product_definitions;

-- V2: Count check — products ↔ product_catalogs
SELECT 'products_with_org' as tbl, count(*) FROM products WHERE org_id IS NOT NULL
UNION ALL
SELECT 'product_catalogs', count(*) FROM product_catalogs;

-- V3: Orphan check — batches without product_definition_id
SELECT count(*) as orphan_batches FROM batches WHERE product_definition_id IS NULL;

-- V4: QR coverage — first scan populated
SELECT
  count(*) as total_qr,
  count(first_scanned_at) as has_first_scan,
  count(*) - count(first_scanned_at) as missing_first_scan
FROM qr_codes;

-- V5: Orphan catalogs (FK integrity)
SELECT count(*) as orphan_catalogs
FROM product_catalogs pc
LEFT JOIN product_definitions pd ON pc.product_definition_id = pd.id
WHERE pd.id IS NULL;
-- Expected: 0

-- V6: Duplicate product_definitions (unique constraint check)
SELECT name, brand_org_id, count(*) as dupes
FROM product_definitions
GROUP BY name, brand_org_id
HAVING count(*) > 1;
-- Expected: 0 rows

-- V7: First scan uniqueness (must be exactly 1 per QR)
SELECT qr_code_id, count(*) as cnt
FROM scan_events
WHERE is_first_scan = true
GROUP BY qr_code_id
HAVING count(*) > 1;
-- Expected: 0 rows

-- V8: First scan consistency (no orphan first_scan without QR)
SELECT count(*) as orphan_first_scans
FROM scan_events
WHERE is_first_scan = true
  AND qr_code_id IS NULL;
-- Expected: 0

-- V9: Trust score snapshot coverage
SELECT entity_type, count(*) as snapshot_count
FROM trust_score_snapshots
WHERE version = 1
GROUP BY entity_type;
-- Expected: product ≈ products count, org ≈ organizations count
