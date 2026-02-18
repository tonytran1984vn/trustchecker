/**
 * TrustChecker v9.2 — Structured Logger
 * ═══════════════════════════════════════════════════════════
 * JSON structured logging with:
 *   - Log levels: error, warn, info, debug, trace
 *   - Context propagation (requestId, userId, orgId, traceId)
 *   - Configurable output (console + optional file)
 *   - ECS-compatible format for log aggregation
 *
 * Usage:
 *   const { logger, createRequestLogger } = require('./observability/logger');
 *   logger.info('Server started', { port: 3000 });
 *   // or with request context:
 *   const log = createRequestLogger(req);
 *   log.info('Processing request', { path: req.path });
 */

const os = require('os');

// ─── Log Levels ──────────────────────────────────────────────
const LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4,
};

const LOG_LEVEL = LEVELS[process.env.LOG_LEVEL || 'info'] ?? LEVELS.info;
const SERVICE_NAME = process.env.SERVICE_NAME || 'trustchecker';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ─── Structured Log Entry ────────────────────────────────────
function formatEntry(level, message, meta = {}, context = {}) {
    const entry = {
        '@timestamp': new Date().toISOString(),
        level,
        message,
        service: SERVICE_NAME,
        env: NODE_ENV,
        host: os.hostname(),
        pid: process.pid,
    };

    // Context fields (request-scoped)
    if (context.requestId) entry.requestId = context.requestId;
    if (context.traceId) entry.traceId = context.traceId;
    if (context.spanId) entry.spanId = context.spanId;
    if (context.userId) entry.userId = context.userId;
    if (context.orgId) entry.orgId = context.orgId;

    // Merge extra metadata
    if (meta && typeof meta === 'object') {
        if (meta.error) {
            entry.error = {
                message: meta.error.message || meta.error,
                stack: meta.error.stack || null,
                code: meta.error.code || null,
            };
            const metaCopy = { ...meta };
            delete metaCopy.error;
            if (Object.keys(metaCopy).length > 0) entry.meta = metaCopy;
        } else {
            entry.meta = meta;
        }
    }

    // Duration tracking
    if (meta.durationMs !== undefined) entry.durationMs = meta.durationMs;

    return entry;
}

// ─── Logger Class ────────────────────────────────────────────
class Logger {
    constructor(context = {}) {
        this.context = context;
    }

    _log(level, message, meta = {}) {
        if (LEVELS[level] > LOG_LEVEL) return;

        const entry = formatEntry(level, message, meta, this.context);

        // Output
        const jsonStr = JSON.stringify(entry);
        switch (level) {
            case 'error':
                process.stderr.write(jsonStr + '\n');
                break;
            case 'warn':
                process.stderr.write(jsonStr + '\n');
                break;
            default:
                process.stdout.write(jsonStr + '\n');
        }
    }

    error(message, meta) { this._log('error', message, meta); }
    warn(message, meta) { this._log('warn', message, meta); }
    info(message, meta) { this._log('info', message, meta); }
    debug(message, meta) { this._log('debug', message, meta); }
    trace(message, meta) { this._log('trace', message, meta); }

    child(extraContext) {
        return new Logger({ ...this.context, ...extraContext });
    }
}

// ─── Root Logger ─────────────────────────────────────────────
const logger = new Logger();

// ─── Request Logger Factory ──────────────────────────────────
function createRequestLogger(req) {
    return new Logger({
        requestId: req.id || req.headers?.['x-request-id'] || `req-${Date.now()}`,
        traceId: req.headers?.['x-trace-id'] || req.headers?.traceparent?.split('-')?.[1] || null,
        userId: req.user?.id || null,
        orgId: req.user?.org_id || null,
    });
}

// ─── Express Middleware ──────────────────────────────────────
function requestLoggerMiddleware(req, res, next) {
    // Assign unique request ID
    req.id = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    res.setHeader('X-Request-Id', req.id);

    const start = process.hrtime.bigint();

    // Log on response finish
    const originalEnd = res.end;
    res.end = function (...args) {
        const durationNs = Number(process.hrtime.bigint() - start);
        const durationMs = Math.round(durationNs / 1e6);

        const level = res.statusCode >= 500 ? 'error'
            : res.statusCode >= 400 ? 'warn'
                : 'info';

        const log = createRequestLogger(req);
        log._log(level, `${req.method} ${req.originalUrl} ${res.statusCode}`, {
            method: req.method,
            path: req.originalUrl,
            statusCode: res.statusCode,
            durationMs,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
            contentLength: res.getHeader('content-length'),
        });

        originalEnd.apply(res, args);
    };

    next();
}

module.exports = {
    Logger,
    logger,
    createRequestLogger,
    requestLoggerMiddleware,
    LEVELS,
};
