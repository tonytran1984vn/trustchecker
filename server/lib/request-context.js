/**
 * Request-Scoped Execution Context (Foundation Layer)
 *
 * Uses Node.js AsyncLocalStorage to provide per-request isolated context.
 * This replaces the singleton mutable state pattern (e.g., db._rlsOrgId)
 * that caused race conditions between concurrent requests.
 *
 * Usage:
 *   const { getContext } = require('./request-context');
 *   const ctx = getContext();  // { requestId, orgId, userId, sessionId, startTime }
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

module.exports = {
    requestContextMiddleware,
    getContext,
    updateContext,
    runInContext,
};
