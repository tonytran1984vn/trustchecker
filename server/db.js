/**
 * TrustChecker v9.5.1 — Database Layer (PostgreSQL ONLY)
 *
 * PostgreSQL via Prisma.
 * DATABASE_URL must be set (via .env or PM2 ecosystem).
 *
 * v9.5.1: AsyncLocalStorage-based RLS context (fixes race condition).
 *         Connection safety: double-release guard, app-level query timeout.
 *         SQL translator logging (10% sampled for migration tracking).
 *
 * API:
 *   db.get(sql, params)     → Promise<row|null>
 *   db.all(sql, params)     → Promise<row[]>
 *   db.run(sql, params)     → Promise<void>
 *   db.prepare(sql)         → { run(), get(), all() }
 *   db._readyPromise        → Promise (await in boot sequence)
 */

const logger = require('./lib/logger');
const { safeGetContext } = require('./lib/request-context');

// D-05: PgBouncer integration
const DB_URL = process.env.PGBOUNCER_URL || process.env.DATABASE_URL;

if (!DB_URL) {
    logger.error('FATAL: DATABASE_URL is not set. Set it in .env or PM2 ecosystem.config.js');
    process.exit(1);
}

// ═══════════════════════════════════════════════════════════════════
// POSTGRESQL BACKEND (Prisma + pg adapter)
// ═══════════════════════════════════════════════════════════════════

// Application-level query timeout (ms) — safety net above PG statement_timeout
const APP_QUERY_TIMEOUT = 35000;
// Slow query threshold (ms) — queries exceeding this are logged as warnings
const SLOW_QUERY_THRESHOLD = 500;

// SQL translator logging: sample rate (0.0 = off, 1.0 = all)
const SQL_LOG_SAMPLE_RATE = 0.1;
let _translationCount = 0;
let _translationSkipCount = 0;

class PrismaBackend {
    constructor() {
        const { PrismaClient } = require('@prisma/client');
        const { PrismaPg } = require('@prisma/adapter-pg');
        const { Pool } = require('pg');

        // Create pg Pool from DATABASE_URL
        this._pool = new Pool({
            connectionString: DB_URL,
            max: 50, // Scale: 50 connections
            idleTimeoutMillis: 30000, // Close idle after 30s
            connectionTimeoutMillis: 5000, // Fail fast if pool exhausted
            statement_timeout: 30000, // Kill queries > 30s
            idle_in_transaction_session_timeout: 10000, // Kill idle transactions after 10s
        });
        const adapter = new PrismaPg(this._pool);

        this.prisma = new PrismaClient({
            adapter,
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
        });
        this.ready = false;
        this._readyPromise = this._init();
    }

    async _init() {
        // Test connection
        const client = await this._pool.connect();
        client.release();
        logger.info('PostgreSQL connected via Prisma (adapter-pg)', {
            pool: { max: 50, statementTimeout: '30s', idleInTransaction: '10s' },
        });
        this.ready = true;
        return this;
    }

    // ─── SQL Dialect Translation ─────────────────────────────────
    // Converts legacy SQL patterns to PostgreSQL-native syntax.
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
        t = t.replace(/datetime\('now',\s*\?\)/gi, 'NOW() + CAST(? AS INTERVAL)');

        // datetime(?) → CAST(? AS TIMESTAMP)
        t = t.replace(/datetime\(\?\)/gi, 'CAST(? AS TIMESTAMP)');

        // DATE(column) → column::DATE
        t = t.replace(/DATE\((\w+)\)/gi, '$1::DATE');

        // DATE('now') → CURRENT_DATE
        t = t.replace(/DATE\('now'\)/gi, 'CURRENT_DATE');

        // strftime('%Y-%m', column) → TO_CHAR(column, 'YYYY-MM')
        t = t.replace(/strftime\('%Y-%m',\s*(\w+)\)/gi, "TO_CHAR($1, 'YYYY-MM')");

        // strftime('%Y-%m', ?) → TO_CHAR(CAST(? AS TIMESTAMP), 'YYYY-MM')
        t = t.replace(/strftime\('%Y-%m',\s*\?\)/gi, "TO_CHAR(CAST(? AS TIMESTAMP), 'YYYY-MM')");

        // strftime('%Y-W%W', column) → TO_CHAR(column, 'IYYY-"W"IW')
        t = t.replace(/strftime\('%Y-W%W',\s*(\w+)\)/gi, 'TO_CHAR($1, \'IYYY-"W"IW\')');

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
        t = t.replace(
            /\b(revoked|is_active|is_system|mfa_enabled|collision_detected|alert_triggered|is_secret|is_latest|must_change_password)\s*=\s*1\b/gi,
            '$1 = true'
        );
        t = t.replace(
            /\b(revoked|is_active|is_system|mfa_enabled|collision_detected|alert_triggered|is_secret|is_latest|must_change_password)\s*=\s*0\b/gi,
            '$1 = false'
        );

        // INSERT OR IGNORE → INSERT ... ON CONFLICT DO NOTHING
        const hadOrIgnore = /INSERT\s+OR\s+IGNORE\s+INTO/i.test(t);
        t = t.replace(/INSERT\s+OR\s+IGNORE\s+INTO/gi, 'INSERT INTO');

        // INSERT OR REPLACE → use ON CONFLICT DO UPDATE (upsert)
        t = t.replace(/INSERT\s+OR\s+REPLACE\s+INTO/gi, 'INSERT INTO');

        // Skip DDL — Prisma handles schema via migrations
        if (/^\s*CREATE\s+(TABLE|INDEX)/i.test(t)) {
            logger.warn('[DB] DDL statement skipped (use Prisma migrations)', { sql: t.slice(0, 80) });
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

        // ─── SQL Translator Logging (10% sampled) ────────────────────
        if (t !== sql) {
            _translationCount++;
            if (Math.random() < SQL_LOG_SAMPLE_RATE) {
                logger.debug('SQL translated', {
                    original: sql.slice(0, 120),
                    translated: t.slice(0, 120),
                    totalTranslations: _translationCount,
                });
            }
        } else {
            _translationSkipCount++;
        }

        return t;
    }

    _convert(row) {
        if (!row) return null;
        // L-1 FIX: Only auto-convert known-safe aggregate columns (COUNT, SUM, etc.)
        // Avoids corrupting numeric SKUs, phone numbers, or long IDs
        const SAFE_NUMERIC_COLUMNS =
            /^(cnt|count|total|sum|avg|min|max|score|rate|version|quantity|remaining|defects|active_count|fulfilled|cancelled|critical|high|low|total_orders|total_checks|failed_checks|total_defects)$/i;
        const out = {};
        for (const [k, v] of Object.entries(row)) {
            if (typeof v === 'bigint') {
                out[k] = Number(v);
            } else if (v instanceof Date) {
                out[k] = v.toISOString();
            } else if (
                typeof v === 'string' &&
                v !== '' &&
                !isNaN(v) &&
                !isNaN(parseFloat(v)) &&
                /^-?\d+(\.\d+)?$/.test(v) &&
                (v.length < 10 || SAFE_NUMERIC_COLUMNS.test(k))
            ) {
                // Auto-convert aggregate/metric columns from PG (COUNT, SUM, NUMERIC)
                out[k] = Number(v);
            } else {
                out[k] = v;
            }
        }
        return out;
    }

    // ─── RLS Context (AsyncLocalStorage-based) ─────────────────
    // v9.5.1: orgId is now read from per-request AsyncLocalStorage context.
    // Previously used singleton _rlsOrgId which had race conditions.

    // Legacy compat: setOrgContext/clearOrgContext are no-ops now.
    // orgGuard calls updateContext() which sets orgId in AsyncLocalStorage.
    setOrgContext(orgId) {
        // Legacy no-op — context is now managed by AsyncLocalStorage
        // Kept for backward compatibility with any code that still calls this.
    }

    clearOrgContext() {
        // Legacy no-op
    }

    /**
     * Execute a query with RLS context.
     * Reads orgId from AsyncLocalStorage (per-request, no race condition).
     * Connection safety: cancel-race guard, query cancellation, slow query logging.
     */
    async _withRLS(fn) {
        // Capture context BEFORE awaiting the connection pool
        // pg pool connection queuing can drop AsyncLocalStorage context
        const ctx = safeGetContext();
        const orgId = ctx.orgId || '';

        const client = await this._pool.connect();
        let released = false;
        let finished = false; // Cancel-race guard: prevents cancelling wrong query after PID reuse
        let timeoutId = null;
        const queryStart = Date.now();

        try {
            if (orgId) {
                await client.query("SELECT set_config('app.current_org', $1, false)", [orgId]);
            } else {
                await client.query("SELECT set_config('app.current_org', '', false)");
            }

            // Application-level timeout with query cancellation + race guard
            const result = await Promise.race([
                fn(client).then(res => {
                    finished = true;
                    return res;
                }),
                new Promise((_, reject) => {
                    timeoutId = setTimeout(async () => {
                        // Cancel-race guard: don't cancel if query already finished
                        // This prevents killing a different query on the same PID
                        if (finished) return;

                        try {
                            if (client.processID) {
                                const cancelResult = await this._pool.query('SELECT pg_cancel_backend($1)', [
                                    client.processID,
                                ]);
                                const success = cancelResult.rows?.[0]?.pg_cancel_backend ?? false;
                                logger.warn('Query cancellation attempted', {
                                    success,
                                    processID: client.processID,
                                    requestId: ctx.requestId,
                                    path: ctx.path,
                                    timeout: APP_QUERY_TIMEOUT,
                                });
                            }
                        } catch (cancelErr) {
                            logger.error('Failed to cancel query', {
                                error: cancelErr.message,
                                processID: client.processID,
                            });
                        }
                        reject(new Error(`Query timeout (${APP_QUERY_TIMEOUT}ms)`));
                    }, APP_QUERY_TIMEOUT);
                }),
            ]);

            // Slow query detection
            const duration = Date.now() - queryStart;
            if (duration > SLOW_QUERY_THRESHOLD) {
                logger.warn('Slow query detected', {
                    duration,
                    requestId: ctx.requestId,
                    orgId: orgId || '(none)',
                    path: ctx.path,
                });
            }

            return result;
        } finally {
            if (timeoutId) clearTimeout(timeoutId);
            if (!released) {
                client.release();
                released = true;
            }
        }
    }

    /**
     * Tag a SQL query with request context as a comment.
     * Visible in pg_stat_activity.query for production debugging.
     * Usage: db.get(db.tag(sql), params)
     */
    tag(sql) {
        const ctx = safeGetContext();
        if (ctx.requestId) {
            return `/* req:${ctx.requestId.slice(0, 8)} ${ctx.path ? 'path:' + ctx.path.slice(0, 30) : ''} */ ${sql}`;
        }
        return sql;
    }

    // ─── Public API ──────────────────────────────────────────────

    async get(sql, params = []) {
        const t = this._translateSQL(sql);
        if (!t) return null;
        try {
            const result = await this._withRLS(async client => {
                return client.query(t, params);
            });
            return result.rows.length > 0 ? this._convert(result.rows[0]) : null;
        } catch (e) {
            const ctx = safeGetContext();
            logger.error('DB.get error', { error: e.message, sql: t.slice(0, 200), requestId: ctx.requestId });
            throw e;
        }
    }

    async all(sql, params = []) {
        const t = this._translateSQL(sql);
        if (!t) return [];
        try {
            const result = await this._withRLS(async client => {
                return client.query(t, params);
            });
            return result.rows.map(r => this._convert(r));
        } catch (e) {
            const ctx = safeGetContext();
            logger.error('DB.all error', { error: e.message, sql: t.slice(0, 200), requestId: ctx.requestId });
            throw e;
        }
    }

    async run(sql, params = []) {
        const t = this._translateSQL(sql);
        if (!t) return this;
        try {
            await this._withRLS(async client => {
                return client.query(t, params);
            });
        } catch (e) {
            const ctx = safeGetContext();
            logger.error('DB.run error', { error: e.message, sql: t.slice(0, 200), requestId: ctx.requestId });
            throw e;
        }
        return this;
    }

    /**
     * Execute a function within a REAL database transaction.
     * Holds a SINGLE connection for the entire BEGIN→COMMIT/ROLLBACK scope.
     *
     * CRITICAL: db.get()/db.run()/db.all() each acquire separate connections,
     * making BEGIN/COMMIT/FOR UPDATE non-functional. This method fixes that.
     *
     * @param {Function} fn - async (tx) => result. tx has get/all/run methods.
     * @returns {Promise<any>} - The return value of fn
     * @throws {Error} - Auto-ROLLBACK on any error, then re-throws
     *
     * Usage:
     *   const result = await db.withTransaction(async (tx) => {
     *       const row = await tx.get('SELECT ... FOR UPDATE', [id]);
     *       await tx.run('UPDATE ...', [val]);
     *       return { status: 200, body: row };
     *   });
     */
    async withTransaction(fn, maxRetries = 3) {
        const client = await this._pool.connect();
        let released = false;
        const self = this;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                // Set RLS context (same as _withRLS)
                const ctx = safeGetContext();
                const orgId = ctx.orgId || '';
                if (orgId) {
                    await client.query('SET app.current_org = $1', [orgId]);
                } else {
                    await client.query("SET app.current_org = ''");
                }

                // UTC Clock Integrity Guard
                await client.query("SET timezone = 'UTC'");

                await client.query('BEGIN');

                // Transaction-scoped DB interface — all queries on SAME connection
                const tx = {
                    async get(sql, params = []) {
                        const t = self._translateSQL(sql);
                        if (!t) return null;
                        const result = await client.query(t, params);
                        return result.rows.length > 0 ? self._convert(result.rows[0]) : null;
                    },
                    async all(sql, params = []) {
                        const t = self._translateSQL(sql);
                        if (!t) return [];
                        const result = await client.query(t, params);
                        return result.rows.map(r => self._convert(r));
                    },
                    async run(sql, params = []) {
                        const t = self._translateSQL(sql);
                        if (!t) return;
                        await client.query(t, params);
                    },
                };

                const result = await fn(tx);
                await client.query('COMMIT');

                // Success, cleanup connection and return
                client.release();
                released = true;
                return result;
            } catch (e) {
                try {
                    await client.query('ROLLBACK');
                } catch (_) {
                    /* already rolled back */
                }

                // 40P01 = deadlock_detected, 40001 = serialization_failure
                if (e.code === '40P01' || e.code === '40001') {
                    attempt++;
                    if (attempt >= maxRetries) {
                        if (!released) client.release();
                        throw new Error(`Transaction failed after ${maxRetries} deadlocks: ` + e.message);
                    }
                    // Exponential backoff: 50ms, 100ms...
                    const backoff = Math.pow(2, attempt) * 25;
                    console.warn(
                        `[DB] Deadlock detected. Retrying transaction (Attempt ${attempt}/${maxRetries}) in ${backoff}ms...`
                    );
                    await new Promise(res => setTimeout(res, backoff));
                } else {
                    if (!released) client.release();
                    throw e; // Non-retryable error
                }
            }
        }
    }

    prepare(sql) {
        const self = this;
        const t = this._translateSQL(sql);
        if (!t) {
            return {
                run() {
                    return this;
                },
                get() {
                    return null;
                },
                all() {
                    return [];
                },
            };
        }
        return {
            async run(...params) {
                await self._withRLS(async client => {
                    return client.query(t, params);
                });
                return this;
            },
            async get(...params) {
                const result = await self._withRLS(async client => {
                    return client.query(t, params);
                });
                return result.rows.length > 0 ? self._convert(result.rows[0]) : null;
            },
            async all(...params) {
                const result = await self._withRLS(async client => {
                    return client.query(t, params);
                });
                return result.rows.map(r => self._convert(r));
            },
        };
    }

    /**
     * Run multiple queries in parallel on a SINGLE connection.
     * Avoids N × _withRLS() overhead (connection acquire + SET RLS context).
     * @param {Array<{sql: string, params?: any[]}>} queries
     * @returns {Promise<Array<row[]>>} results in same order as queries
     */
    async allBatch(queries) {
        const translatedQueries = queries
            .map(q => ({
                sql: this._translateSQL(q.sql),
                params: q.params || [],
            }))
            .filter(q => q.sql);

        return this._withRLS(async client => {
            const results = await Promise.all(translatedQueries.map(q => client.query(q.sql, q.params)));
            return results.map(r => r.rows.map(row => this._convert(row)));
        });
    }

    /**
     * Run multiple queries on a SINGLE raw PG connection (bypasses Prisma overhead).
     * Best for read-heavy analytics endpoints where _withRLS() overhead is the bottleneck.
     * Still sets RLS context via app.current_org.
     * @param {Array<{sql: string, params?: any[]}>} queries
     * @param {string} [orgId] - Optional org_id for RLS context
     * @returns {Promise<Array<row[]>>}
     */
    async rawBatch(queries, orgId) {
        const client = await this._pool.connect();
        try {
            // Set RLS context
            if (!orgId) {
                const ctx = safeGetContext();
                orgId = ctx.orgId || '';
            }
            // set_config() supports parameterized queries (SET doesn't with raw pg)
            await client.query("SELECT set_config('app.current_org', $1, true)", [orgId || '']);

            // Run all queries sequentially on same connection (fast: ~10ms each)
            const results = [];
            for (const q of queries) {
                const sql = this._translateSQL(q.sql);
                if (!sql) {
                    results.push([]);
                    continue;
                }
                try {
                    const r = await client.query(sql, q.params || []);
                    results.push(r.rows.map(row => this._convert(row)));
                } catch (e) {
                    logger.warn('rawBatch query error', { error: e.message, sql: (q.sql || '').slice(0, 100) });
                    results.push([]);
                }
            }
            return results;
        } finally {
            client.release();
        }
    }

    exec() {
        /* no-op: Prisma manages schema via migrations */
    }
    save() {
        /* no-op: PostgreSQL auto-persists */
    }

    /** Direct Prisma client for type-safe queries in new code */
    get client() {
        return this.prisma;
    }

    /** SQL translator stats (for monitoring) */
    getTranslatorStats() {
        return { translated: _translationCount, native: _translationSkipCount };
    }

    async disconnect() {
        await this.prisma.$disconnect();
        await this._pool.end();
        logger.info('PostgreSQL disconnected', this.getTranslatorStats());
    }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════

const db = new PrismaBackend();
module.exports = db;
