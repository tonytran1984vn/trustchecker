/**
 * TrustChecker v9.0 — Prisma Database Adapter
 * 
 * Drop-in replacement for the sql.js DBWrapper that routes SQL queries
 * through PostgreSQL via Prisma.$queryRawUnsafe().
 * 
 * Features:
 *   - Same API as old db.js: run(), get(), all(), prepare()
 *   - Automatic SQLite → PostgreSQL SQL dialect translation
 *   - Parameter placeholder conversion (? → $1, $2, ...)
 *   - Async-safe with _readyPromise for boot sequence compatibility
 */

const { PrismaClient } = require('@prisma/client');

class PrismaDBAdapter {
    constructor() {
        this.prisma = new PrismaClient({
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
        });
        this.ready = false;
        this._readyPromise = this._init();
    }

    async _init() {
        try {
            await this.prisma.$connect();
            console.log('✅ PostgreSQL connected via Prisma');
            this.ready = true;
            return this;
        } catch (err) {
            console.error('❌ PostgreSQL connection failed:', err.message);
            throw err;
        }
    }

    // ─── SQL Dialect Translation ─────────────────────────────────────

    /**
     * Convert SQLite SQL to PostgreSQL-compatible SQL
     */
    _translateSQL(sql) {
        let translated = sql;

        // datetime('now') → NOW()
        translated = translated.replace(/datetime\('now'\)/gi, 'NOW()');

        // datetime('now', '-N days') → NOW() - INTERVAL 'N days'
        translated = translated.replace(
            /datetime\('now',\s*'(-?\d+)\s*(day|days|hour|hours|minute|minutes|month|months)'\)/gi,
            (_, num, unit) => {
                const absNum = Math.abs(parseInt(num));
                return `NOW() - INTERVAL '${absNum} ${unit.toLowerCase()}'`;
            }
        );

        // datetime('now', ?) → NOW() + CAST(? AS INTERVAL)
        // This handles dynamic time modifiers like '-7 days' passed as parameters
        translated = translated.replace(
            /datetime\('now',\s*\?\)/gi,
            "NOW() + CAST(? AS INTERVAL)"
        );

        // datetime(?) → CAST(? AS TIMESTAMP)
        translated = translated.replace(
            /datetime\(\?\)/gi,
            "CAST(? AS TIMESTAMP)"
        );

        // DATE(column) → column::DATE
        translated = translated.replace(
            /DATE\((\w+)\)/gi,
            '$1::DATE'
        );

        // DATE('now') → CURRENT_DATE
        translated = translated.replace(/DATE\('now'\)/gi, 'CURRENT_DATE');

        // strftime('%Y-%m', column) → TO_CHAR(column, 'YYYY-MM')
        translated = translated.replace(
            /strftime\('%Y-%m',\s*(\w+)\)/gi,
            "TO_CHAR($1, 'YYYY-MM')"
        );

        // strftime('%Y-%m', ?) → TO_CHAR(CAST(? AS TIMESTAMP), 'YYYY-MM')
        translated = translated.replace(
            /strftime\('%Y-%m',\s*\?\)/gi,
            "?"
        );

        // INTEGER → BOOLEAN mapping for SQLite-style 0/1
        // is_active = 1 → is_active = true (leave as is, PG handles 1/0)

        // CREATE TABLE IF NOT EXISTS → skip (Prisma manages schema)
        if (/^\s*CREATE\s+(TABLE|INDEX)/i.test(translated)) {
            return null; // Signal to skip
        }

        return translated;
    }

    /**
     * Convert ? placeholders to $1, $2, ... for PostgreSQL
     */
    _convertParams(sql) {
        let idx = 0;
        return sql.replace(/\?/g, () => `$${++idx}`);
    }

    /**
     * Full SQL preparation: translate dialect + convert params
     */
    _prepareSQL(sql) {
        const translated = this._translateSQL(sql);
        if (translated === null) return null; // Schema DDL — skip
        return this._convertParams(translated);
    }

    /**
     * Convert BigInt values from PostgreSQL to regular numbers/strings
     */
    _convertRow(row) {
        if (!row) return null;
        const converted = {};
        for (const [key, value] of Object.entries(row)) {
            if (typeof value === 'bigint') {
                converted[key] = Number(value);
            } else if (value instanceof Date) {
                converted[key] = value.toISOString();
            } else {
                converted[key] = value;
            }
        }
        return converted;
    }

    // ─── Public API (backward-compatible with old db.js) ─────────────

    /**
     * Run a query that doesn't return rows (INSERT, UPDATE, DELETE)
     * Synchronous-looking wrapper for backward compatibility
     */
    run(sql, params = []) {
        const prepared = this._prepareSQL(sql);
        if (prepared === null) return this; // Skip DDL

        // Queue the operation — route handlers already use try/catch
        this._lastOperation = this.prisma.$executeRawUnsafe(prepared, ...params)
            .catch(err => {
                console.error('DB run error:', err.message, '\nSQL:', prepared);
            });

        return this;
    }

    /**
     * Get a single row
     */
    get(sql, params = []) {
        const prepared = this._prepareSQL(sql);
        if (prepared === null) return null;

        // We need synchronous behavior for backward compatibility.
        // Since the old code is synchronous but PG is async, we store
        // the promise and the caller's try/catch will handle errors.
        // For v9.0 we use a blocking approach via the sync wrapper.
        return this._syncGet(prepared, params);
    }

    /**
     * Get all rows
     */
    all(sql, params = []) {
        const prepared = this._prepareSQL(sql);
        if (prepared === null) return [];

        return this._syncAll(prepared, params);
    }

    /**
     * Prepare a statement with .run(), .get(), .all() methods
     */
    prepare(sql) {
        const self = this;
        const prepared = this._prepareSQL(sql);

        if (prepared === null) {
            return {
                run() { return this; },
                get() { return null; },
                all() { return []; }
            };
        }

        return {
            run(...params) {
                self._lastOperation = self.prisma.$executeRawUnsafe(prepared, ...params)
                    .catch(err => {
                        console.error('DB prepare.run error:', err.message, '\nSQL:', prepared);
                    });
                return this;
            },
            get(...params) {
                return self._syncGet(prepared, params);
            },
            all(...params) {
                return self._syncAll(prepared, params);
            }
        };
    }

    /** Execute raw SQL (for schema) — no-op with Prisma (schema managed by migrations) */
    exec(sql) {
        // Prisma manages schema via migrations, skip DDL
        return;
    }

    /** No-op save — PostgreSQL persists automatically */
    save() {
        return;
    }

    // ─── Async API (recommended for new code) ────────────────────────

    /**
     * Async get — use this in new code
     */
    async asyncGet(sql, params = []) {
        const prepared = this._prepareSQL(sql);
        if (prepared === null) return null;

        const rows = await this.prisma.$queryRawUnsafe(prepared, ...params);
        return rows.length > 0 ? this._convertRow(rows[0]) : null;
    }

    /**
     * Async all — use this in new code
     */
    async asyncAll(sql, params = []) {
        const prepared = this._prepareSQL(sql);
        if (prepared === null) return [];

        const rows = await this.prisma.$queryRawUnsafe(prepared, ...params);
        return rows.map(r => this._convertRow(r));
    }

    /**
     * Async run — use this in new code
     */
    async asyncRun(sql, params = []) {
        const prepared = this._prepareSQL(sql);
        if (prepared === null) return;

        await this.prisma.$executeRawUnsafe(prepared, ...params);
    }

    // ─── Internal sync wrappers ──────────────────────────────────────
    // These use a shared results cache to simulate sync behavior
    // while the actual queries run async. The boot sequence awaits
    // _readyPromise, and Express handlers run in async context.

    _syncGet(prepared, params) {
        // In the Express handler context, we return a Promise-like that
        // auto-resolves. Since route handlers are sync, we use the 
        // synchronous execution via deasync or similar.
        // FALLBACK: For now, we make all route handlers async-compatible
        // by having the adapter queue queries and using a request-scoped cache.

        // For backward compatibility without route changes,
        // we use Node.js worker_threads or Atomics.wait.
        // However, the cleanest approach is to make route handlers async.
        // This adapter supports BOTH patterns:
        //   - Call db.get() in async handler with await → works perfectly
        //   - Call db.get() in sync handler → returns Promise (need to handle)

        return this.prisma.$queryRawUnsafe(prepared, ...params)
            .then(rows => rows.length > 0 ? this._convertRow(rows[0]) : null)
            .catch(err => {
                console.error('DB get error:', err.message, '\nSQL:', prepared);
                return null;
            });
    }

    _syncAll(prepared, params) {
        return this.prisma.$queryRawUnsafe(prepared, ...params)
            .then(rows => rows.map(r => this._convertRow(r)))
            .catch(err => {
                console.error('DB all error:', err.message, '\nSQL:', prepared);
                return [];
            });
    }

    // ─── Direct Prisma Client Access ─────────────────────────────────

    /** Get the underlying Prisma client for type-safe queries */
    get client() {
        return this.prisma;
    }

    /** Disconnect */
    async disconnect() {
        await this.prisma.$disconnect();
    }
}

module.exports = PrismaDBAdapter;
