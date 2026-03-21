/**
 * Centralized Error Handler v1.0 (A-02)
 * Sanitizes error responses in production.
 * Structured error logging with trace IDs.
 */

function errorHandler() {
    return (err, req, res, next) => {
        const status = err.status || err.statusCode || 500;
        const isProduction = process.env.NODE_ENV === 'production';
        const traceId = req.traceId || req.headers['x-request-id'] || 'unknown';

        // Log full error details
        console.error(
            JSON.stringify({
                level: 'error',
                type: 'unhandled_error',
                trace: traceId,
                method: req.method,
                path: req.path,
                status,
                error: err.message,
                stack: isProduction ? undefined : err.stack,
                user: req.user?.id || null,
                org: req.user?.orgId || null,
                timestamp: new Date().toISOString(),
            })
        );

        // Sanitized response
        res.status(status).json({
            error: isProduction && status >= 500 ? 'Internal server error' : err.message,
            code: err.code || 'INTERNAL_ERROR',
            trace: traceId,
            ...(isProduction ? {} : { stack: err.stack }),
        });
    };
}

// 404 handler
function notFoundHandler() {
    return (req, res) => {
        res.status(404).json({
            error: 'Endpoint not found',
            path: req.path,
            method: req.method,
            hint: 'Check /api/docs for available endpoints',
        });
    };
}

module.exports = { errorHandler, notFoundHandler };
