/**
 * TrustChecker v9.0 — Database Layer (Dual-Mode)
 *
 * Auto-selects backend based on DATABASE_URL environment variable:
 *   - If DATABASE_URL set → PostgreSQL via Prisma
 *   - If not set → SQLite via sql.js (legacy mode)
 *
 * Both backends expose the same async API:
 *   db.get(sql, params)     → Promise<row|null>
 *   db.all(sql, params)     → Promise<row[]>
 *   db.run(sql, params)     → Promise<void>
 *   db.prepare(sql)         → { run(), get(), all() }
 *   db._readyPromise        → Promise (await in boot sequence)
 */

const USE_POSTGRES = !!process.env.DATABASE_URL;

// ═══════════════════════════════════════════════════════════════════
// POSTGRESQL BACKEND (Prisma)
// ═══════════════════════════════════════════════════════════════════

class PrismaBackend {
  constructor() {
    const { PrismaClient } = require('@prisma/client');
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });
    this.ready = false;
    this._readyPromise = this._init();
  }

  async _init() {
    await this.prisma.$connect();
    console.log('✅ PostgreSQL connected via Prisma');
    this.ready = true;
    return this;
  }

  // ─── SQL Dialect Translation ─────────────────────────────────

  _translateSQL(sql) {
    let t = sql;

    // datetime('now') → NOW()
    t = t.replace(/datetime\('now'\)/gi, 'NOW()');

    // datetime('now', '-N days/hours/...') → NOW() - INTERVAL 'N unit'
    t = t.replace(
      /datetime\('now',\s*'(-?\d+)\s*(day|days|hour|hours|minute|minutes|month|months)'\)/gi,
      (_, n, u) => `NOW() - INTERVAL '${Math.abs(parseInt(n))} ${u.toLowerCase()}'`
    );

    // datetime('now', ?) → NOW() + CAST(? AS INTERVAL)
    t = t.replace(/datetime\('now',\s*\?\)/gi, "NOW() + CAST(? AS INTERVAL)");

    // datetime(?) → CAST(? AS TIMESTAMP)
    t = t.replace(/datetime\(\?\)/gi, "CAST(? AS TIMESTAMP)");

    // DATE(column) → column::DATE
    t = t.replace(/DATE\((\w+)\)/gi, '$1::DATE');

    // DATE('now') → CURRENT_DATE
    t = t.replace(/DATE\('now'\)/gi, 'CURRENT_DATE');

    // strftime('%Y-%m', column) → TO_CHAR(column, 'YYYY-MM')
    t = t.replace(/strftime\('%Y-%m',\s*(\w+)\)/gi, "TO_CHAR($1, 'YYYY-MM')");

    // strftime('%Y-%m', ?) → TO_CHAR(CAST(? AS TIMESTAMP), 'YYYY-MM')
    t = t.replace(/strftime\('%Y-%m',\s*\?\)/gi, "TO_CHAR(CAST(? AS TIMESTAMP), 'YYYY-MM')");

    // strftime('%Y-W%W', column) → TO_CHAR(column, 'IYYY-"W"IW')
    t = t.replace(/strftime\('%Y-W%W',\s*(\w+)\)/gi, "TO_CHAR($1, 'IYYY-\"W\"IW')");

    // JULIANDAY(column) → EXTRACT(EPOCH FROM column::TIMESTAMP) / 86400
    t = t.replace(/JULIANDAY\((\w+)\)/gi, '(EXTRACT(EPOCH FROM $1::TIMESTAMP) / 86400.0)');

    // GROUP_CONCAT(column) → STRING_AGG(column, ',')
    t = t.replace(/GROUP_CONCAT\((\w+)\)/gi, "STRING_AGG($1::TEXT, ',')");

    // GROUP_CONCAT(column, sep) → STRING_AGG(column, sep)
    t = t.replace(/GROUP_CONCAT\((\w+),\s*'([^']+)'\)/gi, "STRING_AGG($1::TEXT, '$2')");

    // IFNULL(a, b) → COALESCE(a, b)
    t = t.replace(/IFNULL\(/gi, 'COALESCE(');

    // Skip DDL — Prisma handles schema via migrations
    if (/^\s*CREATE\s+(TABLE|INDEX)/i.test(t)) {
      console.warn('[DB] ⚠️ DDL statement skipped in Prisma mode (use migrations):', t.slice(0, 80));
      return null;
    }

    // Convert ? → $1, $2, ...
    let idx = 0;
    t = t.replace(/\?/g, () => `$${++idx}`);

    return t;
  }

  _convert(row) {
    if (!row) return null;
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      out[k] = typeof v === 'bigint' ? Number(v) : v instanceof Date ? v.toISOString() : v;
    }
    return out;
  }

  // ─── Public API ──────────────────────────────────────────────

  async get(sql, params = []) {
    const t = this._translateSQL(sql);
    if (!t) return null;
    try {
      const rows = await this.prisma.$queryRawUnsafe(t, ...params);
      return rows.length > 0 ? this._convert(rows[0]) : null;
    } catch (e) {
      console.error('DB.get error:', e.message, '\nSQL:', t);
      throw e;
    }
  }

  async all(sql, params = []) {
    const t = this._translateSQL(sql);
    if (!t) return [];
    try {
      const rows = await this.prisma.$queryRawUnsafe(t, ...params);
      return rows.map(r => this._convert(r));
    } catch (e) {
      console.error('DB.all error:', e.message, '\nSQL:', t);
      throw e;
    }
  }

  async run(sql, params = []) {
    const t = this._translateSQL(sql);
    if (!t) return this;
    try {
      await this.prisma.$executeRawUnsafe(t, ...params);
    } catch (e) {
      console.error('DB.run error:', e.message, '\nSQL:', t);
      throw e;
    }
    return this;
  }

  prepare(sql) {
    const self = this;
    const t = this._translateSQL(sql);
    if (!t) {
      return { run() { return this; }, get() { return null; }, all() { return []; } };
    }
    return {
      async run(...params) {
        await self.prisma.$executeRawUnsafe(t, ...params);
        return this;
      },
      async get(...params) {
        const rows = await self.prisma.$queryRawUnsafe(t, ...params);
        return rows.length > 0 ? self._convert(rows[0]) : null;
      },
      async all(...params) {
        const rows = await self.prisma.$queryRawUnsafe(t, ...params);
        return rows.map(r => self._convert(r));
      }
    };
  }

  exec() { /* no-op: Prisma manages schema via migrations */ }
  save() { /* no-op: PostgreSQL auto-persists */ }

  /** Direct Prisma client for type-safe queries in new code */
  get client() { return this.prisma; }

  async disconnect() {
    await this.prisma.$disconnect();
    console.log('🔌 PostgreSQL disconnected');
  }
}

// ═══════════════════════════════════════════════════════════════════
// SQLITE BACKEND (Legacy — sql.js)
// ═══════════════════════════════════════════════════════════════════

class SQLiteBackend {
  constructor() {
    this.db = null;
    this.ready = false;
    this._readyPromise = this._init();
  }

  async _init() {
    const initSqlJs = require('sql.js');
    const path = require('path');
    const fs = require('fs');

    const DB_PATH = path.join(__dirname, '..', 'data', 'trustchecker.db');
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

    this._dbPath = DB_PATH;
    const SQL = await initSqlJs();

    if (fs.existsSync(DB_PATH)) {
      const buffer = fs.readFileSync(DB_PATH);
      this.db = new SQL.Database(buffer);
    } else {
      this.db = new SQL.Database();
    }

    // ─── Performance PRAGMAs (Quick Win #1) ─────────────────────────
    this.db.run('PRAGMA journal_mode = WAL');      // Write-Ahead Logging: 10x read concurrency
    this.db.run('PRAGMA synchronous = NORMAL');     // Safe + Fast (WAL protects against corruption)
    this.db.run('PRAGMA cache_size = -20000');       // 20MB page cache (default 2MB)
    this.db.run('PRAGMA mmap_size = 67108864');      // 64MB memory-mapped I/O
    this.db.run('PRAGMA temp_store = MEMORY');       // Temp tables in memory
    this.db.run('PRAGMA busy_timeout = 5000');       // Wait 5s on lock instead of failing instantly
    console.log('  ↳ SQLite PRAGMAs: WAL, cache=20MB, mmap=64MB');

    this._initSchema();
    this.ready = true;

    // Auto-save to disk every 30s — prevents data loss on crash
    this._autoSave = setInterval(() => {
      try { this.save(); } catch (e) { console.error('Auto-save error:', e.message); }
    }, 30000);
    if (this._autoSave.unref) this._autoSave.unref();

    console.log('✅ SQLite loaded (legacy mode, optimized, auto-save 30s)');
    return this;
  }

  async save() {
    const fs = require('fs').promises;
    const data = this.db.export();
    const buffer = Buffer.from(data);
    await fs.writeFile(this._dbPath, buffer);
  }

  // Async wrappers over sync operations (for unified API)

  async get(sql, params = []) {
    const stmt = this.db.prepare(sql);
    if (params.length) stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }

  async all(sql, params = []) {
    const results = [];
    const stmt = this.db.prepare(sql);
    if (params.length) stmt.bind(params);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  }

  async run(sql, params = []) {
    this.db.run(sql, params);
    // Auto-save handles persistence (every 30s + graceful shutdown)
    return this;
  }

  prepare(sql) {
    const self = this;
    return {
      async run(...params) {
        self.db.run(sql, params);
        // Auto-save handles persistence (every 30s + graceful shutdown)
        return this;
      },
      async get(...params) {
        return self.get(sql, params);
      },
      async all(...params) {
        return self.all(sql, params);
      }
    };
  }

  exec(sql) {
    this.db.exec(sql);
    this.save();
  }

  async disconnect() {
    if (this.db) {
      this.db.close();
      console.log('🔌 SQLite closed');
    }
  }

  // ─── Schema (only used in SQLite mode) ───────────────────────
  _initSchema() {
    // Users & Auth
    this.db.run(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, role TEXT DEFAULT 'operator', company TEXT DEFAULT '', mfa_secret TEXT, mfa_enabled INTEGER DEFAULT 0, failed_attempts INTEGER DEFAULT 0, locked_until TEXT, created_at TEXT DEFAULT (datetime('now')), last_login TEXT)`);
    this.db.run(`CREATE TABLE IF NOT EXISTS refresh_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, token_hash TEXT NOT NULL, expires_at TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')), revoked INTEGER DEFAULT 0)`);
    this.db.run(`CREATE TABLE IF NOT EXISTS sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, ip_address TEXT, user_agent TEXT, created_at TEXT DEFAULT (datetime('now')), last_active TEXT DEFAULT (datetime('now')), revoked INTEGER DEFAULT 0)`);
    this.db.run(`CREATE TABLE IF NOT EXISTS passkey_credentials (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, credential_id TEXT NOT NULL UNIQUE, public_key TEXT NOT NULL, nickname TEXT DEFAULT 'My Passkey', sign_count INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now')), last_used TEXT, FOREIGN KEY (user_id) REFERENCES users(id))`);

    // Products & QR
    this.db.run(`CREATE TABLE IF NOT EXISTS products (id TEXT PRIMARY KEY, name TEXT NOT NULL, sku TEXT UNIQUE NOT NULL, description TEXT DEFAULT '', category TEXT DEFAULT '', manufacturer TEXT DEFAULT '', batch_number TEXT DEFAULT '', origin_country TEXT DEFAULT '', registered_by TEXT, trust_score REAL DEFAULT 100.0, status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS qr_codes (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, qr_data TEXT UNIQUE NOT NULL, qr_image_base64 TEXT, status TEXT DEFAULT 'active', generated_at TEXT DEFAULT (datetime('now')), expires_at TEXT)`);
    this.db.run(`CREATE TABLE IF NOT EXISTS scan_events (id TEXT PRIMARY KEY, qr_code_id TEXT, product_id TEXT, scan_type TEXT DEFAULT 'validation', device_fingerprint TEXT DEFAULT '', ip_address TEXT DEFAULT '', latitude REAL, longitude REAL, geo_city TEXT DEFAULT '', geo_country TEXT DEFAULT '', user_agent TEXT DEFAULT '', result TEXT DEFAULT 'pending', fraud_score REAL DEFAULT 0.0, trust_score REAL DEFAULT 0.0, response_time_ms INTEGER DEFAULT 0, scanned_at TEXT DEFAULT (datetime('now')))`);

    // Security
    this.db.run(`CREATE TABLE IF NOT EXISTS fraud_alerts (id TEXT PRIMARY KEY, scan_event_id TEXT, product_id TEXT, alert_type TEXT NOT NULL, severity TEXT DEFAULT 'medium', description TEXT DEFAULT '', details TEXT DEFAULT '{}', status TEXT DEFAULT 'open', resolved_by TEXT, resolved_at TEXT, created_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS trust_scores (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, score REAL NOT NULL, fraud_factor REAL DEFAULT 0.0, consistency_factor REAL DEFAULT 0.0, compliance_factor REAL DEFAULT 0.0, history_factor REAL DEFAULT 0.0, explanation TEXT DEFAULT '{}', calculated_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS blockchain_seals (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, event_id TEXT NOT NULL, data_hash TEXT NOT NULL, prev_hash TEXT DEFAULT '0', merkle_root TEXT, block_index INTEGER, nonce INTEGER DEFAULT 0, sealed_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS audit_log (id TEXT PRIMARY KEY, actor_id TEXT, action TEXT NOT NULL, entity_type TEXT DEFAULT '', entity_id TEXT DEFAULT '', details TEXT DEFAULT '{}', ip_address TEXT DEFAULT '', timestamp TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS anomaly_detections (id TEXT PRIMARY KEY, source_type TEXT NOT NULL, source_id TEXT, anomaly_type TEXT NOT NULL, severity TEXT DEFAULT 'medium', score REAL DEFAULT 0, description TEXT DEFAULT '', details TEXT DEFAULT '{}', status TEXT DEFAULT 'open', detected_at TEXT DEFAULT (datetime('now')), resolved_at TEXT)`);

    // SCM
    this.db.run(`CREATE TABLE IF NOT EXISTS batches (id TEXT PRIMARY KEY, batch_number TEXT UNIQUE NOT NULL, product_id TEXT NOT NULL, quantity INTEGER DEFAULT 0, manufactured_date TEXT, expiry_date TEXT, origin_facility TEXT DEFAULT '', status TEXT DEFAULT 'created', created_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS supply_chain_events (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, product_id TEXT, batch_id TEXT, uid TEXT DEFAULT '', location TEXT DEFAULT '', actor TEXT DEFAULT '', partner_id TEXT, details TEXT DEFAULT '{}', blockchain_seal_id TEXT, created_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, batch_id TEXT, partner_id TEXT, location TEXT DEFAULT '', quantity INTEGER DEFAULT 0, min_stock INTEGER DEFAULT 10, max_stock INTEGER DEFAULT 1000, last_sync TEXT, updated_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS partners (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT DEFAULT 'distributor', country TEXT DEFAULT '', region TEXT DEFAULT '', contact_email TEXT DEFAULT '', kyc_status TEXT DEFAULT 'pending', kyc_verified_at TEXT, trust_score REAL DEFAULT 50.0, risk_level TEXT DEFAULT 'medium', api_key TEXT, status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS shipments (id TEXT PRIMARY KEY, batch_id TEXT, from_partner_id TEXT, to_partner_id TEXT, carrier TEXT DEFAULT '', tracking_number TEXT DEFAULT '', status TEXT DEFAULT 'pending', estimated_delivery TEXT, actual_delivery TEXT, current_lat REAL, current_lng REAL, gps_trail TEXT DEFAULT '[]', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS iot_readings (id TEXT PRIMARY KEY, shipment_id TEXT NOT NULL, sensor_type TEXT DEFAULT 'temperature', value REAL NOT NULL, unit TEXT DEFAULT 'C', threshold_min REAL, threshold_max REAL, alert_triggered INTEGER DEFAULT 0, recorded_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS sla_definitions (id TEXT PRIMARY KEY, partner_id TEXT NOT NULL, sla_type TEXT DEFAULT 'delivery', metric TEXT DEFAULT '', threshold_value REAL DEFAULT 0, threshold_unit TEXT DEFAULT 'hours', penalty_amount REAL DEFAULT 0, penalty_currency TEXT DEFAULT 'USD', status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS sla_violations (id TEXT PRIMARY KEY, sla_id TEXT NOT NULL, partner_id TEXT, shipment_id TEXT, violation_type TEXT DEFAULT '', actual_value REAL DEFAULT 0, threshold_value REAL DEFAULT 0, penalty_amount REAL DEFAULT 0, status TEXT DEFAULT 'open', resolved_at TEXT, created_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS leak_alerts (id TEXT PRIMARY KEY, product_id TEXT, platform TEXT DEFAULT '', url TEXT DEFAULT '', listing_title TEXT DEFAULT '', listing_price REAL DEFAULT 0, authorized_price REAL DEFAULT 0, region_detected TEXT DEFAULT '', authorized_regions TEXT DEFAULT '[]', leak_type TEXT DEFAULT 'unauthorized_region', risk_score REAL DEFAULT 0.5, status TEXT DEFAULT 'open', created_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS supply_chain_graph (id TEXT PRIMARY KEY, from_node_id TEXT NOT NULL, from_node_type TEXT DEFAULT 'partner', to_node_id TEXT NOT NULL, to_node_type TEXT DEFAULT 'partner', relationship TEXT DEFAULT 'supplies', weight REAL DEFAULT 1.0, risk_score REAL DEFAULT 0.0, metadata TEXT DEFAULT '{}', created_at TEXT DEFAULT (datetime('now')))`);

    // KYC
    this.db.run(`CREATE TABLE IF NOT EXISTS kyc_businesses (id TEXT PRIMARY KEY, name TEXT NOT NULL, registration_number TEXT UNIQUE, country TEXT DEFAULT '', address TEXT DEFAULT '', industry TEXT DEFAULT '', contact_email TEXT DEFAULT '', contact_phone TEXT DEFAULT '', risk_level TEXT DEFAULT 'medium', verification_status TEXT DEFAULT 'pending', verified_at TEXT, verified_by TEXT, notes TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS kyc_checks (id TEXT PRIMARY KEY, business_id TEXT NOT NULL, check_type TEXT NOT NULL, provider TEXT DEFAULT 'internal', status TEXT DEFAULT 'pending', result TEXT DEFAULT '{}', score REAL DEFAULT 0.0, checked_by TEXT, created_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS sanction_hits (id TEXT PRIMARY KEY, business_id TEXT NOT NULL, list_name TEXT NOT NULL, match_score REAL DEFAULT 0.0, matched_entity TEXT DEFAULT '', details TEXT DEFAULT '{}', status TEXT DEFAULT 'pending_review', reviewed_by TEXT, reviewed_at TEXT, created_at TEXT DEFAULT (datetime('now')))`);

    // Evidence & Stakeholder
    this.db.run(`CREATE TABLE IF NOT EXISTS evidence_items (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '', file_name TEXT DEFAULT '', file_type TEXT DEFAULT '', file_size INTEGER DEFAULT 0, file_data TEXT, sha256_hash TEXT NOT NULL, blockchain_seal_id TEXT, entity_type TEXT DEFAULT '', entity_id TEXT DEFAULT '', uploaded_by TEXT, verification_status TEXT DEFAULT 'anchored', verified_at TEXT, file_path TEXT DEFAULT '', tags TEXT DEFAULT '[]', status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS ratings (id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, user_id TEXT NOT NULL, score INTEGER NOT NULL CHECK(score >= 1 AND score <= 5), comment TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS certifications (id TEXT PRIMARY KEY, entity_type TEXT DEFAULT 'product', entity_id TEXT NOT NULL, cert_name TEXT NOT NULL, cert_body TEXT DEFAULT '', cert_number TEXT DEFAULT '', issued_date TEXT, expiry_date TEXT, status TEXT DEFAULT 'active', document_hash TEXT DEFAULT '', added_by TEXT, created_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS compliance_records (id TEXT PRIMARY KEY, entity_type TEXT DEFAULT 'product', entity_id TEXT NOT NULL, framework TEXT NOT NULL, requirement TEXT DEFAULT '', status TEXT DEFAULT 'compliant', evidence TEXT DEFAULT '', checked_by TEXT, next_review TEXT, created_at TEXT DEFAULT (datetime('now')))`);

    // Billing
    this.db.run(`CREATE TABLE IF NOT EXISTS billing_plans (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan_name TEXT DEFAULT 'free', scan_limit INTEGER DEFAULT 100, api_limit INTEGER DEFAULT 500, storage_mb INTEGER DEFAULT 50, price_monthly REAL DEFAULT 0.0, status TEXT DEFAULT 'active', started_at TEXT DEFAULT (datetime('now')), expires_at TEXT)`);
    this.db.run(`CREATE TABLE IF NOT EXISTS usage_metrics (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, metric_type TEXT NOT NULL, value INTEGER DEFAULT 0, period TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan_name TEXT DEFAULT '', amount REAL DEFAULT 0.0, currency TEXT DEFAULT 'USD', status TEXT DEFAULT 'paid', period_start TEXT, period_end TEXT, created_at TEXT DEFAULT (datetime('now')))`);

    // System
    this.db.run(`CREATE TABLE IF NOT EXISTS system_settings (id TEXT PRIMARY KEY, category TEXT NOT NULL, setting_key TEXT NOT NULL, setting_value TEXT DEFAULT '', is_secret INTEGER DEFAULT 0, description TEXT DEFAULT '', updated_by TEXT, updated_at TEXT DEFAULT (datetime('now')), UNIQUE(category, setting_key))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS webhook_events (id TEXT PRIMARY KEY, event_type TEXT NOT NULL, source TEXT DEFAULT 'stripe', payload TEXT DEFAULT '{}', status TEXT DEFAULT 'received', processed_at TEXT, created_at TEXT DEFAULT (datetime('now')))`);

    // Support
    this.db.run(`CREATE TABLE IF NOT EXISTS support_tickets (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, subject TEXT NOT NULL, description TEXT DEFAULT '', category TEXT DEFAULT 'general', priority TEXT DEFAULT 'medium', status TEXT DEFAULT 'open', assigned_to TEXT, resolution TEXT DEFAULT '', created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), resolved_at TEXT)`);
    this.db.run(`CREATE TABLE IF NOT EXISTS ticket_messages (id TEXT PRIMARY KEY, ticket_id TEXT NOT NULL, sender_id TEXT NOT NULL, sender_role TEXT DEFAULT 'user', message TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')))`);

    // NFT & Sustainability
    this.db.run(`CREATE TABLE IF NOT EXISTS nft_certificates (id TEXT PRIMARY KEY, token_id INTEGER, product_id TEXT, entity_type TEXT DEFAULT 'product', entity_id TEXT, certificate_type TEXT DEFAULT 'authenticity', issuer TEXT DEFAULT 'TrustChecker', owner TEXT NOT NULL, metadata_hash TEXT NOT NULL, blockchain_seal_id TEXT, status TEXT DEFAULT 'active', transfer_history TEXT DEFAULT '[]', minted_at TEXT DEFAULT (datetime('now')), expires_at TEXT)`);
    this.db.run(`CREATE TABLE IF NOT EXISTS sustainability_scores (id TEXT PRIMARY KEY, product_id TEXT NOT NULL, carbon_footprint REAL DEFAULT 0, water_usage REAL DEFAULT 0, recyclability REAL DEFAULT 0, ethical_sourcing REAL DEFAULT 0, packaging_score REAL DEFAULT 0, transport_score REAL DEFAULT 0, overall_score REAL DEFAULT 0, grade TEXT DEFAULT 'C', certifications TEXT DEFAULT '[]', assessed_by TEXT, assessed_at TEXT DEFAULT (datetime('now')))`);
    this.db.run(`CREATE TABLE IF NOT EXISTS data_retention_policies (id TEXT PRIMARY KEY, table_name TEXT NOT NULL, retention_days INTEGER DEFAULT 365, action TEXT DEFAULT 'archive', is_active INTEGER DEFAULT 1, last_run TEXT, records_affected INTEGER DEFAULT 0, created_by TEXT, created_at TEXT DEFAULT (datetime('now')))`);

    // Indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_scan_product ON scan_events(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_scan_date ON scan_events(scanned_at)',
      'CREATE INDEX IF NOT EXISTS idx_qr_product ON qr_codes(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_fraud_product ON fraud_alerts(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_trust_product ON trust_scores(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id)',
      'CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status)',
      'CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_sce_product ON supply_chain_events(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_sce_batch ON supply_chain_events(batch_id)',
      'CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_shipments_batch ON shipments(batch_id)',
      'CREATE INDEX IF NOT EXISTS idx_iot_shipment ON iot_readings(shipment_id)',
      'CREATE INDEX IF NOT EXISTS idx_sla_partner ON sla_definitions(partner_id)',
      'CREATE INDEX IF NOT EXISTS idx_leak_product ON leak_alerts(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_graph_from ON supply_chain_graph(from_node_id)',
      'CREATE INDEX IF NOT EXISTS idx_graph_to ON supply_chain_graph(to_node_id)',
      'CREATE INDEX IF NOT EXISTS idx_kyc_checks_business ON kyc_checks(business_id)',
      'CREATE INDEX IF NOT EXISTS idx_sanction_business ON sanction_hits(business_id)',
      'CREATE INDEX IF NOT EXISTS idx_evidence_entity ON evidence_items(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_ratings_entity ON ratings(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_certifications_entity ON certifications(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_compliance_entity ON compliance_records(entity_type, entity_id)',
      'CREATE INDEX IF NOT EXISTS idx_billing_user ON billing_plans(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_metrics(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_invoices_user ON invoices(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status)',
      'CREATE INDEX IF NOT EXISTS idx_ticket_msgs ON ticket_messages(ticket_id)',
      'CREATE INDEX IF NOT EXISTS idx_nft_product ON nft_certificates(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_nft_owner ON nft_certificates(owner)',
      'CREATE INDEX IF NOT EXISTS idx_sustainability_product ON sustainability_scores(product_id)',
      'CREATE INDEX IF NOT EXISTS idx_anomaly_source ON anomaly_detections(source_type, source_id)',

      // Phase 12 & performance-critical additions
      'CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status)',
      'CREATE INDEX IF NOT EXISTS idx_shipments_from ON shipments(from_partner_id)',
      'CREATE INDEX IF NOT EXISTS idx_shipments_to ON shipments(to_partner_id)',
      'CREATE INDEX IF NOT EXISTS idx_fraud_status ON fraud_alerts(status)',
      'CREATE INDEX IF NOT EXISTS idx_sla_violations_status ON sla_violations(status)',
      'CREATE INDEX IF NOT EXISTS idx_scan_qr ON scan_events(qr_code_id)',
      'CREATE INDEX IF NOT EXISTS idx_seal_event ON blockchain_seals(event_id)',
      'CREATE INDEX IF NOT EXISTS idx_seal_block ON blockchain_seals(block_index)',
      'CREATE INDEX IF NOT EXISTS idx_iot_time ON iot_readings(recorded_at)',
      'CREATE INDEX IF NOT EXISTS idx_sce_time ON supply_chain_events(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_webhook_type ON webhook_events(event_type)',
    ];
    indexes.forEach(idx => this.db.run(idx));

    // ─── Safe column migrations ─────────────────────────────────
    // Handle stale databases created before new columns were added.
    // ALTER TABLE ADD COLUMN is idempotent-safe via PRAGMA check.
    const safeAddColumn = (table, col, definition) => {
      try {
        const info = this.db.exec(`PRAGMA table_info(${table})`);
        const columns = info[0]?.values?.map(r => r[1]) || [];
        if (!columns.includes(col)) {
          this.db.run(`ALTER TABLE ${table} ADD COLUMN ${col} ${definition}`);
          console.log(`  ✅ Migration: added ${col} to ${table}`);
        }
      } catch (e) { /* column already exists or table doesn't exist yet */ }
    };

    // evidence_items migrations
    safeAddColumn('evidence_items', 'file_path', "TEXT DEFAULT ''");
    safeAddColumn('evidence_items', 'tags', "TEXT DEFAULT '[]'");
    safeAddColumn('evidence_items', 'status', "TEXT DEFAULT 'active'");
    // billing_plans migrations
    safeAddColumn('billing_plans', 'expires_at', 'TEXT');
    // users migrations
    safeAddColumn('users', 'mfa_secret', 'TEXT');
    safeAddColumn('users', 'mfa_enabled', 'INTEGER DEFAULT 0');
    safeAddColumn('users', 'mfa_backup_codes', 'TEXT');
    safeAddColumn('users', 'failed_attempts', 'INTEGER DEFAULT 0');
    safeAddColumn('users', 'locked_until', 'TEXT');

    // ─── Seed default admin user if users table is empty ─────────
    try {
      const userCount = this.db.exec('SELECT COUNT(*) as cnt FROM users');
      const count = userCount[0]?.values?.[0]?.[0] || 0;
      if (count === 0) {
        const bcrypt = require('bcryptjs');
        const { v4: uuidv4 } = require('uuid');
        const hash = bcrypt.hashSync('Admin@123456!', 12);
        const id = uuidv4();
        this.db.run(
          `INSERT INTO users (id, username, email, password_hash, role, company) VALUES (?, ?, ?, ?, ?, ?)`,
          [id, 'admin', 'admin@trustchecker.io', hash, 'admin', 'TrustChecker']
        );
        console.log('  🌱 Seeded default admin user (admin / Admin@123456!)');
      }
    } catch (e) { console.error('Seed error:', e.message); }
  }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT — Auto-select backend
// ═══════════════════════════════════════════════════════════════════

const db = USE_POSTGRES ? new PrismaBackend() : new SQLiteBackend();

module.exports = db;
