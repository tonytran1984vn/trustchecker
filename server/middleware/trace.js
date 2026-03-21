/**
 * Request Tracing Middleware v1.0 (A-12)
 * Generates unique traceId per request, propagates through all layers.
 * Usage: req.traceId available in all routes/engines.
 */
const crypto = require('crypto');

function traceMiddleware() {
    return (req, res, next) => {
        // Accept incoming trace ID (from gateway/client) or generate new
        req.traceId =
            req.headers['x-trace-id'] ||
            req.headers['x-request-id'] ||
            `tc-${Date.now().toString(36)}-${crypto.randomBytes(4).toString('hex')}`;

        // Propagate in response
        res.setHeader('X-Trace-Id', req.traceId);

        // Attach to req for engine/db use
        req.startTime = Date.now();

        // Log on response finish
        res.on('finish', () => {
            const duration = Date.now() - req.startTime;
            if (duration > 1000 || res.statusCode >= 500) {
                console.warn(
                    JSON.stringify({
                        trace: req.traceId,
                        method: req.method,
                        path: req.path,
                        status: res.statusCode,
                        duration_ms: duration,
                        user: req.user?.id || 'anonymous',
                        org: req.user?.orgId || null,
                    })
                );
            }
        });

        next();
    };
}

module.exports = { traceMiddleware };
