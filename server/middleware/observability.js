/**
 * Observability Middleware — records actual request metrics
 * Plugs into Express to track real response times and error rates
 */
const observability = require('../engines/observability-engine');

function observabilityMiddleware(req, res, next) {
    const start = Date.now();
    const originalEnd = res.end;

    res.end = function (...args) {
        const duration = Date.now() - start;
        observability.recordRequest(req.method, req.path, res.statusCode, duration);
        originalEnd.apply(res, args);
    };

    next();
}

module.exports = { observabilityMiddleware };
