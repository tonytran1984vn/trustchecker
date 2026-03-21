/**
 * Request-Scoped Execution Context (Foundation Layer)
 *
 * Uses Node.js AsyncLocalStorage to provide per-request isolated context.
 * This replaces the singleton mutable state pattern (e.g., db._rlsOrgId)
 * that caused race conditions between concurrent requests.
 *
 * Usage:
 *   const { getContext, safeGetContext } = require('./request-context');
 *   const ctx = getContext();      // Returns {} if outside request (silent)
 *   const ctx = safeGetContext();  // Returns {} + logs warning if missing
 *
 * Middleware entry point:
 *   app.use(requestContextMiddleware);  // Must be before orgGuard
 *
 * ⚠️ Context propagation caveats:
 *   - Works with: async/await, Promises, queueMicrotask
 *   - Breaks with: setTimeout, setInterval, raw EventEmitter (use runInContext for these)
 */
'use strict';

const { AsyncLocalStorage } = require('async_hooks');
const crypto = require('crypto');

const asyncLocalStorage = new AsyncLocalStorage();

// Track context leak warnings (avoid log flood — max 1 per path per minute)
const _leakWarnings = new Map();
const LEAK_WARN_INTERVAL = 60000;

/**
 * Express middleware — creates a new context for each request.
 * Must be mounted BEFORE orgGuard and any DB-accessing middleware.
 */
function requestContextMiddleware(req, res, next) {
    const context = {
        requestId: req.headers['x-request-id'] || crypto.randomUUID(),
        orgId: null,       // Set later by orgGuard middleware
        userId: null,      // Set later by authMiddleware
        sessionId: null,   // Set later by authMiddleware
        startTime: Date.now(),
        method: req.method,
        path: req.originalUrl || req.url,
    };

    // Attach requestId to response headers for tracing
    res.setHeader('X-Request-Id', context.requestId);

    // Attach to req for middleware that needs to update context
    req._context = context;

    asyncLocalStorage.run(context, () => next());
}

/**
 * Get the current request context.
 * Returns the context store or an empty object if called outside a request.
 */
function getContext() {
    return asyncLocalStorage.getStore() || {};
}

/**
 * Get context with leak detection — logs warning when called outside a request.
 * Use in critical paths (DB queries, audit logging) to detect context loss early.
 */
function safeGetContext() {
    const store = asyncLocalStorage.getStore();
    if (!store) {
        // Rate-limited warning to avoid log flood
        const caller = new Error().stack?.split('\n')[2]?.trim() || 'unknown';
        const now = Date.now();
        const lastWarn = _leakWarnings.get(caller) || 0;
        if (now - lastWarn > LEAK_WARN_INTERVAL) {
            _leakWarnings.set(caller, now);
            // Lazy-load logger to avoid circular dependency at module load time
            try {
                const logger = require('./logger');
                logger.warn('Request context missing — possible AsyncLocalStorage leak', {
                    caller: caller.slice(0, 120),
                    hint: 'Wrap with runInContext() if calling from setTimeout/EventEmitter',
                });
            } catch (_) {
                console.warn('[CONTEXT LEAK]', caller.slice(0, 120));
            }
        }
        return {};
    }
    return store;
}

/**
 * Update the current context (e.g., after auth resolves orgId).
 * Call from middleware:
 *   updateContext({ orgId: req.user.org_id, userId: req.user.id });
 */
function updateContext(updates) {
    const store = asyncLocalStorage.getStore();
    if (store) {
        Object.assign(store, updates);
    }
}

/**
 * Run a function within the current context.
 * Use this for setTimeout/setInterval/EventEmitter callbacks
 * that would otherwise lose context.
 *
 * Example:
 *   setTimeout(runInContext(() => { db.get(...) }), 1000);
 */
function runInContext(fn) {
    const currentStore = asyncLocalStorage.getStore();
    if (!currentStore) return fn;
    return (...args) => asyncLocalStorage.run(currentStore, () => fn(...args));
}

/**
 * Run a function with a system context (not a request context).
 * Use for boot-time initialization, cron jobs, background tasks,
 * and event consumers — prevents false-positive leak warnings.
 *
 * Example:
 *   await runWithSystemContext('boot:db-init', async () => { await db.run(...) });
 *   await runWithSystemContext('cron:cleanup', async () => { ... });
 */
function runWithSystemContext(source, fn) {
    const ctx = {
        requestId: `sys-${crypto.randomUUID().slice(0, 8)}`,
        orgId: null,
        userId: null,
        sessionId: null,
        startTime: Date.now(),
        method: 'SYSTEM',
        path: source,
    };
    return asyncLocalStorage.run(ctx, fn);
}

module.exports = {
    requestContextMiddleware,
    getContext,
    safeGetContext,
    updateContext,
    runInContext,
    runWithSystemContext,
};

