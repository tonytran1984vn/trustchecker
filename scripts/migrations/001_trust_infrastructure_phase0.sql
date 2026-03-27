-- ═══════════════════════════════════════════════════════════════════
-- TrustChecker — Phase 0: Trust Infrastructure Schema Migration
-- ═══════════════════════════════════════════════════════════════════
-- Purpose: Create new tables alongside existing ones (zero downtime)
-- Strategy: Additive only — no DROP, no ALTER existing columns
-- Rollback: DROP all tables created in this migration
-- Author: TrustChecker Architecture Team
-- Date: 2026-03-27
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────────────────────────────────────────────
-- 1. PRODUCT DEFINITION (separated from legacy products)
--    Mapping: products.name → name, products.org_id → brand_org_id
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_definitions (
  id                      text PRIMARY KEY,
  name                    text NOT NULL,
  brand_org_id            text NOT NULL,
  manufacturer_org_id     text,                -- OEM case: different from brand owner
  category                text DEFAULT '',
  description             text DEFAULT '',
  origin_country          text DEFAULT '',
  attributes              jsonb DEFAULT '{}',   -- flexible specs
  status                  text DEFAULT 'active',
  created_at              timestamptz DEFAULT now(),
  updated_at              timestamptz DEFAULT now()
);

-- Soft unique: same product name under same brand
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_def_name_brand
  ON product_definitions(name, brand_org_id);

CREATE INDEX IF NOT EXISTS idx_product_def_brand_org
  ON product_definitions(brand_org_id);

CREATE INDEX IF NOT EXISTS idx_product_def_manufacturer
  ON product_definitions(manufacturer_org_id)
  WHERE manufacturer_org_id IS NOT NULL;


-- ─────────────────────────────────────────────────
-- 2. PRODUCT CATALOG (participation layer)
--    Allows multiple orgs to list the same product definition
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS product_catalogs (
  id                      text PRIMARY KEY,
  org_id                  text NOT NULL,
  product_definition_id   text NOT NULL REFERENCES product_definitions(id),
  sku                     text DEFAULT '',
  price                   numeric,
  currency                text DEFAULT 'USD',
  status                  text DEFAULT 'active',
  created_at              timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_catalog_org_product
  ON product_catalogs(org_id, product_definition_id);

CREATE INDEX IF NOT EXISTS idx_catalog_org
  ON product_catalogs(org_id);


-- ─────────────────────────────────────────────────
-- 3. EXTEND BATCHES (backward-compatible)
--    Link to product_definitions for new lineage model
-- ─────────────────────────────────────────────────

ALTER TABLE batches
  ADD COLUMN IF NOT EXISTS product_definition_id text,
  ADD COLUMN IF NOT EXISTS current_owner_org_id  text,
  ADD COLUMN IF NOT EXISTS unit                  text DEFAULT 'pcs';


-- ─────────────────────────────────────────────────
-- 4. TRANSFER EVENTS (supply chain — org to org)
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transfer_events (
  id                text PRIMARY KEY,
  from_org_id       text NOT NULL,
  to_org_id         text NOT NULL,
  batch_id          text NOT NULL,
  quantity          numeric NOT NULL,
  status            text DEFAULT 'initiated',  -- initiated → completed → cancelled
  idempotency_key   text UNIQUE,
  metadata          jsonb DEFAULT '{}',
  created_at        timestamptz DEFAULT now(),
  completed_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_transfer_batch
  ON transfer_events(batch_id);

CREATE INDEX IF NOT EXISTS idx_transfer_from_org
  ON transfer_events(from_org_id);

CREATE INDEX IF NOT EXISTS idx_transfer_to_org
  ON transfer_events(to_org_id);


-- ─────────────────────────────────────────────────
-- 5. PRODUCTION EVENTS (transformation / aggregation / split)
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS production_events (
  id                  text PRIMARY KEY,
  org_id              text NOT NULL,
  output_batch_id     text NOT NULL,
  production_type     text DEFAULT 'assembly',  -- assembly, split, repack
  production_hash     text UNIQUE,              -- idempotency
  metadata            jsonb DEFAULT '{}',
  created_at          timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS production_inputs (
  id                  text PRIMARY KEY,
  production_event_id text NOT NULL REFERENCES production_events(id),
  input_batch_id      text NOT NULL,
  quantity            numeric NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_prod_inputs_event
  ON production_inputs(production_event_id);

CREATE INDEX IF NOT EXISTS idx_prod_inputs_batch
  ON production_inputs(input_batch_id);


-- ─────────────────────────────────────────────────
-- 6. INVENTORY LEDGER (double-entry, append-only)
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS inventory_ledger (
  id            text PRIMARY KEY,
  org_id        text NOT NULL,
  batch_id      text NOT NULL,
  delta_qty     numeric NOT NULL,              -- + inbound, - outbound
  reason        text NOT NULL,                 -- transfer, production, adjustment, recall
  ref_event_id  text,                          -- FK to source event
  ref_event_type text,                         -- transfer_event, production_event
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inv_ledger_org_batch
  ON inventory_ledger(org_id, batch_id);

CREATE INDEX IF NOT EXISTS idx_inv_ledger_batch
  ON inventory_ledger(batch_id);


-- ─────────────────────────────────────────────────
-- 7. TRUST SCORE ENGINE (versioned + event-driven)
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trust_score_snapshots (
  id              text PRIMARY KEY,
  entity_type     text NOT NULL,               -- product, batch, org
  entity_id       text NOT NULL,
  score           numeric(5,2),                -- 0.00 – 100.00
  components      jsonb DEFAULT '{}',          -- {verification: 85, chain: 92, ...}
  version         integer NOT NULL,
  calculated_at   timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trust_score_version
  ON trust_score_snapshots(entity_type, entity_id, version);

-- Efficient "get latest score" query
CREATE INDEX IF NOT EXISTS idx_trust_score_latest
  ON trust_score_snapshots(entity_type, entity_id, version DESC);

CREATE TABLE IF NOT EXISTS trust_score_events (
  id              text PRIMARY KEY,
  entity_type     text NOT NULL,
  entity_id       text NOT NULL,
  event_type      text NOT NULL,               -- scan_verified, fraud_detected, evidence_added...
  delta           numeric(5,2) DEFAULT 0,      -- score impact
  payload         jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trust_events_entity
  ON trust_score_events(entity_type, entity_id, created_at);


-- ─────────────────────────────────────────────────
-- 8. QR ANTI-COUNTERFEIT UPGRADE (extend existing qr_codes)
-- ─────────────────────────────────────────────────

ALTER TABLE qr_codes
  ADD COLUMN IF NOT EXISTS serial_number    text,
  ADD COLUMN IF NOT EXISTS first_scanned_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_scan_geo   jsonb,
  ADD COLUMN IF NOT EXISTS scan_count       integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS qr_state         text DEFAULT 'created';
  -- State machine: created → activated → first_scanned → active → suspended

-- Extend scan_events for anti-counterfeit
ALTER TABLE scan_events
  ADD COLUMN IF NOT EXISTS is_first_scan    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS device_type      text DEFAULT '';

-- Enforce exactly ONE first scan per QR code
CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_first_scan_unique
  ON scan_events(qr_code_id)
  WHERE is_first_scan = true;


-- ─────────────────────────────────────────────────
-- 9. FRAUD SIGNALS (separated from scan_events)
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fraud_signals (
  id              text PRIMARY KEY,
  scan_event_id   text,
  batch_id        text,
  signal_type     text NOT NULL,               -- geo_velocity, device_cluster, duplicate_scan
  severity        text DEFAULT 'medium',       -- low, medium, high, critical
  confidence      numeric(5,2) DEFAULT 0,
  score_impact    numeric(5,2) DEFAULT 0,      -- how much to reduce trust score
  details         jsonb DEFAULT '{}',
  status          text DEFAULT 'open',         -- open, investigating, confirmed, dismissed
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fraud_signals_scan
  ON fraud_signals(scan_event_id);

CREATE INDEX IF NOT EXISTS idx_fraud_signals_batch
  ON fraud_signals(batch_id);

CREATE INDEX IF NOT EXISTS idx_fraud_signals_status
  ON fraud_signals(status, severity);


-- ─────────────────────────────────────────────────
-- 10. EVIDENCE RECORDS (extend existing evidence_items)
--     Add hash-based integrity + entity linking
-- ─────────────────────────────────────────────────

ALTER TABLE evidence_items
  ADD COLUMN IF NOT EXISTS hash_sha256       text,
  ADD COLUMN IF NOT EXISTS verified_by_org   text,
  ADD COLUMN IF NOT EXISTS verified_at       timestamptz;


-- ─────────────────────────────────────────────────
-- 11a. EXTEND EXISTING blockchain_seals (backward-compatible)
-- ─────────────────────────────────────────────────

ALTER TABLE blockchain_seals
  ADD COLUMN IF NOT EXISTS tx_hash       text,
  ADD COLUMN IF NOT EXISTS chain         text DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS payload_hash  text;

-- ─────────────────────────────────────────────────
-- 11b. BLOCKCHAIN BATCHING (Merkle tree optimization)
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS blockchain_batches (
  id              text PRIMARY KEY,
  merkle_root     text NOT NULL,
  event_count     integer NOT NULL,
  seal_ids        text[] DEFAULT '{}',         -- array of blockchain_seal IDs
  sealed_at       timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────────
-- 12. CARBON FOOTPRINTS (per-batch, with inheritance)
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS carbon_footprints (
  id                      text PRIMARY KEY,
  batch_id                text NOT NULL,
  org_id                  text NOT NULL,
  scope                   text NOT NULL,        -- scope_1, scope_2, scope_3
  emission_kg_co2e        numeric NOT NULL,
  methodology             text DEFAULT '',      -- GHG Protocol, ISO 14064
  source                  text DEFAULT 'declared', -- calculated, declared, verified
  inherited_from_batch_id text,                 -- trace Scope 3 upstream (no double-count)
  verified_by             text,                 -- certifier org_id
  created_at              timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_carbon_batch
  ON carbon_footprints(batch_id);

CREATE INDEX IF NOT EXISTS idx_carbon_org
  ON carbon_footprints(org_id);

CREATE INDEX IF NOT EXISTS idx_carbon_inherited
  ON carbon_footprints(inherited_from_batch_id)
  WHERE inherited_from_batch_id IS NOT NULL;


-- ─────────────────────────────────────────────────
-- 13. TRUST RELATIONSHIPS (declared, not derived)
--     Derived relationships come from transfer/production events
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS trust_relationships (
  id                text PRIMARY KEY,
  org_id            text NOT NULL,
  partner_org_id    text NOT NULL,
  relationship_type text DEFAULT 'supplier',   -- supplier, distributor, co-manufacturer
  trust_level       text DEFAULT 'pending',    -- pending, verified, suspended
  source            text DEFAULT 'manual',     -- manual, system, invitation
  invited_at        timestamptz,
  accepted_at       timestamptz,
  created_at        timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_trust_rel_unique
  ON trust_relationships(org_id, partner_org_id);


-- ─────────────────────────────────────────────────
-- 14. PLATFORM GOVERNANCE (Super Admin — read/flag only)
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS platform_product_flags (
  id                    text PRIMARY KEY,
  product_definition_id text,
  product_id            text,                   -- legacy FK to products
  flagged_by            text NOT NULL,          -- platform admin user_id
  flag_type             text NOT NULL,          -- suspicious, counterfeit, compliance_violation
  reason                text DEFAULT '',
  status                text DEFAULT 'open',    -- open → investigating → confirmed → resolved
  resolution            text DEFAULT '',
  resolved_by           text,
  resolved_at           timestamptz,
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_flags_status
  ON platform_product_flags(status);

CREATE TABLE IF NOT EXISTS platform_actions (
  id            text PRIMARY KEY,
  admin_id      text NOT NULL,
  action_type   text NOT NULL,                 -- flag_product, resolve_flag, impersonate_org
  target_type   text NOT NULL,                 -- product, org, batch
  target_id     text NOT NULL,
  metadata      jsonb DEFAULT '{}',
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_actions_admin
  ON platform_actions(admin_id, created_at);

CREATE INDEX IF NOT EXISTS idx_platform_actions_target
  ON platform_actions(target_type, target_id);


-- ─────────────────────────────────────────────────
-- 15. IDEMPOTENCY KEYS (global — system-wide dedup)
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key             text PRIMARY KEY,
  result          jsonb,                       -- cached response
  created_at      timestamptz DEFAULT now(),
  expires_at      timestamptz DEFAULT (now() + interval '24 hours')
);


-- ─────────────────────────────────────────────────
-- 16. SUPPLY CHAIN EVENT LOG (extend for new event types)
-- ─────────────────────────────────────────────────

ALTER TABLE supply_chain_events
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS event_version   integer DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sce_idempotency
  ON supply_chain_events(idempotency_key)
  WHERE idempotency_key IS NOT NULL;


-- ─────────────────────────────────────────────────
-- 17. DUAL-WRITE FAILURES (Phase 1 dead-letter queue)
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS dual_write_failures (
  id              text PRIMARY KEY,
  write_type      text NOT NULL,         -- product, qr, batch
  idempotency_key text,
  payload         jsonb NOT NULL,
  error           text,
  retry_count     integer DEFAULT 0,
  resolved        boolean DEFAULT false,
  created_at      timestamptz DEFAULT now(),
  last_retry_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_dwf_unresolved
  ON dual_write_failures(resolved, retry_count)
  WHERE resolved = false;


COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- ROLLBACK SCRIPT (copy to separate file for emergency)
-- ═══════════════════════════════════════════════════════════════════
--
-- BEGIN;
-- DROP TABLE IF EXISTS idempotency_keys CASCADE;
-- DROP TABLE IF EXISTS platform_actions CASCADE;
-- DROP TABLE IF EXISTS platform_product_flags CASCADE;
-- DROP TABLE IF EXISTS trust_relationships CASCADE;
-- DROP TABLE IF EXISTS carbon_footprints CASCADE;
-- DROP TABLE IF EXISTS blockchain_batches CASCADE;
-- DROP TABLE IF EXISTS fraud_signals CASCADE;
-- DROP TABLE IF EXISTS trust_score_events CASCADE;
-- DROP TABLE IF EXISTS trust_score_snapshots CASCADE;
-- DROP TABLE IF EXISTS inventory_ledger CASCADE;
-- DROP TABLE IF EXISTS production_inputs CASCADE;
-- DROP TABLE IF EXISTS production_events CASCADE;
-- DROP TABLE IF EXISTS transfer_events CASCADE;
-- DROP TABLE IF EXISTS product_catalogs CASCADE;
-- DROP TABLE IF EXISTS product_definitions CASCADE;
--
-- -- Revert ALTERs
-- ALTER TABLE batches DROP COLUMN IF EXISTS product_definition_id;
-- ALTER TABLE batches DROP COLUMN IF EXISTS current_owner_org_id;
-- ALTER TABLE batches DROP COLUMN IF EXISTS unit;
-- ALTER TABLE qr_codes DROP COLUMN IF EXISTS serial_number;
-- ALTER TABLE qr_codes DROP COLUMN IF EXISTS first_scanned_at;
-- ALTER TABLE qr_codes DROP COLUMN IF EXISTS first_scan_geo;
-- ALTER TABLE qr_codes DROP COLUMN IF EXISTS scan_count;
-- ALTER TABLE qr_codes DROP COLUMN IF EXISTS qr_state;
-- ALTER TABLE scan_events DROP COLUMN IF EXISTS is_first_scan;
-- ALTER TABLE scan_events DROP COLUMN IF EXISTS device_type;
-- ALTER TABLE evidence_items DROP COLUMN IF EXISTS hash_sha256;
-- ALTER TABLE evidence_items DROP COLUMN IF EXISTS verified_by_org;
-- ALTER TABLE evidence_items DROP COLUMN IF EXISTS verified_at;
-- ALTER TABLE supply_chain_events DROP COLUMN IF EXISTS idempotency_key;
-- ALTER TABLE supply_chain_events DROP COLUMN IF EXISTS event_version;
-- DROP INDEX IF EXISTS idx_qr_first_scan_unique;
-- DROP INDEX IF EXISTS idx_sce_idempotency;
-- COMMIT;
