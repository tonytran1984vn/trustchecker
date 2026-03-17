/**
 * TrustChecker v9.4 — Database Layer (PostgreSQL ONLY)
 *
 * PostgreSQL via Prisma. No SQLite.
 * DATABASE_URL must be set (via .env or PM2 ecosystem).
 *
 * API:
 *   db.get(sql, params)     → Promise<row|null>
 *   db.all(sql, params)     → Promise<row[]>
 *   db.run(sql, params)     → Promise<void>
 *   db.prepare(sql)         → { run(), get(), all() }
 *   db._readyPromise        → Promise (await in boot sequence)
 */

const path = require('path');

// D-05: PgBouncer integration
const DB_URL = process.env.PGBOUNCER_URL || process.env.DATABASE_URL;

if (!DB_URL) {
  console.error('\n❌ FATAL: DATABASE_URL is not set!');
  console.error('   Set it in .env or PM2 ecosystem.config.js');
  console.error('   Example: DATABASE_URL=postgresql://user:pass@localhost:5432/trustchecker\n');
  process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════
// POSTGRESQL BACKEND (Prisma + pg adapter)
// ═══════════════════════════════════════════════════════════════════

class PrismaBackend {
  constructor() {
    const { PrismaClient } = require('@prisma/client');
    const { PrismaPg } = require('@prisma/adapter-pg');
    const { Pool } = require('pg');

    // Create pg Pool from DATABASE_URL
    this._pool = new Pool({
            connectionString: DB_URL,
            max: 50,                        // Scale: 50 connections (was default 10)
            idleTimeoutMillis: 30000,        // Close idle after 30s
            connectionTimeoutMillis: 5000,   // Fail fast if pool exhausted
            statement_timeout: 30000,        // Kill queries > 30s
        });
    const adapter = new PrismaPg(this._pool);

    this.prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
    });
    this.ready = false;
    this._readyPromise = this._init();
  }

  async _init() {
    // Test connection
    const client = await this._pool.connect();
    client.release();
    console.log('✅ PostgreSQL connected via Prisma (adapter-pg)');
    this.ready = true;
    return this;
  }

  // ─── SQL Dialect Translation ─────────────────────────────────
  // Converts legacy SQLite-style SQL to PostgreSQL.
  // Many route files still use datetime('now') etc. — this handles them transparently.

  _translateSQL(sql) {
    let t = sql;

    // datetime('now') → NOW()
    t = t.replace(/datetime\('now'\)/gi, 'NOW()');

    // datetime('now', '±N days/hours/...') → NOW() ± INTERVAL 'N unit'
    t = t.replace(
      /datetime\('now',\s*'([+-]?\d+)\s*(day|days|hour|hours|minute|minutes|month|months)'\)/gi,
      (_, n, u) => {
        const num = parseInt(n);
        const op = num >= 0 ? '+' : '-';
        return `NOW() ${op} INTERVAL '${Math.abs(num)} ${u.toLowerCase()}'`;
      }
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
    // JULIANDAY('now') → (EXTRACT(EPOCH FROM NOW()) / 86400.0)
    t = t.replace(/JULIANDAY\('now'\)/gi, '(EXTRACT(EPOCH FROM NOW()) / 86400.0)');
    t = t.replace(/JULIANDAY\((\w+)\)/gi, '(EXTRACT(EPOCH FROM $1::TIMESTAMP) / 86400.0)');

    // GROUP_CONCAT(column) → STRING_AGG(column, ',')
    t = t.replace(/GROUP_CONCAT\((\w+)\)/gi, "STRING_AGG($1::TEXT, ',')");

    // GROUP_CONCAT(column, sep) → STRING_AGG(column, sep)
    t = t.replace(/GROUP_CONCAT\((\w+),\s*'([^']+)'\)/gi, "STRING_AGG($1::TEXT, '$2')");

    // IFNULL(a, b) → COALESCE(a, b)
    t = t.replace(/IFNULL\(/gi, 'COALESCE(');

    // json_extract(column, '$.key') -> (column::jsonb)->>'key'
    t = t.replace(/json_extract\((\w+),\s*'\\\$\.(\w+)'\)/gi, "($1::jsonb)->>'$2'");

    // Boolean/Integer compatibility: revoked = 1 → revoked = true, = 0 → = false
    t = t.replace(/\b(revoked|is_active|is_system|mfa_enabled|collision_detected|alert_triggered|is_secret|is_latest|must_change_password)\s*=\s*1\b/gi, '$1 = true');
    t = t.replace(/\b(revoked|is_active|is_system|mfa_enabled|collision_detected|alert_triggered|is_secret|is_latest|must_change_password)\s*=\s*0\b/gi, '$1 = false');

    // INSERT OR IGNORE → INSERT ... ON CONFLICT DO NOTHING
    const hadOrIgnore = /INSERT\s+OR\s+IGNORE\s+INTO/i.test(t);
    t = t.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');

    // INSERT OR REPLACE → use ON CONFLICT DO UPDATE (upsert)
    t = t.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'INSERT INTO');

    // Skip DDL — Prisma handles schema via migrations
    if (/^\s*CREATE\s+(TABLE|INDEX)/i.test(t)) {
      console.warn('[DB] ⚠️ DDL statement skipped (use Prisma migrations):', t.slice(0, 80));
      return null;
    }

    // Skip ALTER TABLE — Prisma manages schema
    if (/^\s*ALTER\s+TABLE/i.test(t)) {
      return null;
    }

    // Skip PRAGMA — PostgreSQL doesn't use them
    if (/^\s*PRAGMA/i.test(t)) {
      return null;
    }

    // Convert ? → $1, $2, ... (skip if query already has $1 params)
    if (!/\$\d+/.test(t)) {
      let idx = 0;
      t = t.replace(/\?/g, () => `$${++idx}`);
    }

    // Append ON CONFLICT DO NOTHING for INSERT OR IGNORE
    if (hadOrIgnore) t += ' ON CONFLICT DO NOTHING';

    return t;
  }

  _convert(row) {
    if (!row) return null;
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      if (typeof v === 'bigint') { out[k] = Number(v); }
      else if (v instanceof Date) { out[k] = v.toISOString(); }
      else if (typeof v === 'string' && v !== '' && !isNaN(v) && !isNaN(parseFloat(v)) && /^-?\d+(\.\d+)?$/.test(v) && v.length < 16) {
        // Auto-convert pure numeric strings from PG (COUNT, SUM, NUMERIC columns)
        out[k] = Number(v);
      }
      else { out[k] = v; }
    }
    return out;
  }

  // ─── RLS Context ────────────────────────────────────────────
  // Set per-request org context for PostgreSQL Row Level Security.
  // orgGuard middleware calls setOrgContext() before route handlers.

  _rlsOrgId = '';

  setOrgContext(orgId) {
    this._rlsOrgId = orgId || '';
  }

  clearOrgContext() {
    this._rlsOrgId = '';
  }

  /**
   * Execute a query with RLS context.
   * Acquires a dedicated pg client, sets app.current_org, runs query, releases.
   */
  async _withRLS(fn) {
    const client = await this._pool.connect();
    try {
      if (this._rlsOrgId) {
        await client.query(`SET app.current_org = '${this._rlsOrgId.replace(/'/g, "''")}'`);
      } else {
        await client.query("SET app.current_org = ''");
      }
      return await fn(client);
    } finally {
      client.release();
    }
  }

  // ─── Public API ──────────────────────────────────────────────

  async get(sql, params = []) {
    const t = this._translateSQL(sql);
    if (!t) return null;
    try {
      const result = await this._withRLS(async (client) => {
        return client.query(t, params);
      });
      return result.rows.length > 0 ? this._convert(result.rows[0]) : null;
    } catch (e) {
      console.error('DB.get error:', e.message, '\nSQL:', t);
      throw e;
    }
  }

  async all(sql, params = []) {
    const t = this._translateSQL(sql);
    if (!t) return [];
    try {
      const result = await this._withRLS(async (client) => {
        return client.query(t, params);
      });
      return result.rows.map(r => this._convert(r));
    } catch (e) {
      console.error('DB.all error:', e.message, '\nSQL:', t);
      throw e;
    }
  }

  async run(sql, params = []) {
    const t = this._translateSQL(sql);
    if (!t) return this;
    try {
      await this._withRLS(async (client) => {
        return client.query(t, params);
      });
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
        await self._withRLS(async (client) => {
          return client.query(t, params);
        });
        return this;
      },
      async get(...params) {
        const result = await self._withRLS(async (client) => {
          return client.query(t, params);
        });
        return result.rows.length > 0 ? self._convert(result.rows[0]) : null;
      },
      async all(...params) {
        const result = await self._withRLS(async (client) => {
          return client.query(t, params);
        });
        return result.rows.map(r => self._convert(r));
      }
    };
  }

  exec() { /* no-op: Prisma manages schema via migrations */ }
  save() { /* no-op: PostgreSQL auto-persists */ }

  /** Direct Prisma client for type-safe queries in new code */
  get client() { return this.prisma; }

  async disconnect() {
    await this.prisma.$disconnect();
    await this._pool.end();
    console.log('🔌 PostgreSQL disconnected');
  }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════

const db = new PrismaBackend();
module.exports = db;
