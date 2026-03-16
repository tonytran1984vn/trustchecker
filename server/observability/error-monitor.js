/**
 * Self-Hosted Error Monitor v9.4.3
 * Captures unhandled errors to DB + structured logs.
 * Zero external dependency — works standalone.
 */
const db = require('../db');

class ErrorMonitor {
    constructor() {
        this.errors = [];
        this.maxBuffer = 100;
        this._setupHandlers();
        this._flushInterval = setInterval(() => this._flush(), 30000);
        if (this._flushInterval.unref) this._flushInterval.unref();
    }

    _setupHandlers() {
        process.on('uncaughtException', (err) => {
            this.capture(err, { type: 'uncaughtException' });
            console.error('[ErrorMonitor] Uncaught:', err.message);
        });
        process.on('unhandledRejection', (reason) => {
            const err = reason instanceof Error ? reason : new Error(String(reason));
            this.capture(err, { type: 'unhandledRejection' });
            console.error('[ErrorMonitor] Unhandled rejection:', err.message);
        });
    }

    capture(err, context = {}) {
        this.errors.push({
            message: err.message,
            stack: err.stack?.substring(0, 2000),
            type: context.type || 'error',
            path: context.path || null,
            userId: context.userId || null,
            orgId: context.orgId || null,
            timestamp: new Date().toISOString()
        });
        if (this.errors.length >= this.maxBuffer) this._flush();
    }

    expressErrorHandler() {
        return (err, req, res, next) => {
            this.capture(err, {
                type: 'express',
                path: req.path,
                userId: req.user?.id,
                orgId: req.orgId
            });
            next(err);
        };
    }

    async _flush() {
        if (this.errors.length === 0) return;
        const batch = this.errors.splice(0);
        try {
            for (const e of batch) {
                await db.run(
                    `INSERT INTO error_log (message, stack, type, path, user_id, org_id, timestamp)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [e.message, e.stack, e.type, e.path, e.userId, e.orgId, e.timestamp]
                );
            }
        } catch (dbErr) {
            console.error('[ErrorMonitor] Flush failed:', dbErr.message);
        }
    }

    async getRecent(limit = 50) {
        return db.all('SELECT * FROM error_log ORDER BY timestamp DESC LIMIT $1', [limit]);
    }

    async getStats() {
        const [total, last24h, byType] = await Promise.all([
            db.get('SELECT COUNT(*) as c FROM error_log'),
            db.get("SELECT COUNT(*) as c FROM error_log WHERE timestamp > NOW() - INTERVAL '24 hours'"),
            db.all("SELECT type, COUNT(*) as c FROM error_log GROUP BY type ORDER BY c DESC")
        ]);
        return { total: total?.c || 0, last24h: last24h?.c || 0, byType };
    }
}

const monitor = new ErrorMonitor();
module.exports = monitor;
