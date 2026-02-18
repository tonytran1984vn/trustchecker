/**
 * Security Middleware
 * Additional security headers and request sanitization beyond helmet
 */

/**
 * Custom security headers middleware
 */
function securityHeaders(req, res, next) {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');
    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Permissions policy (disable unused APIs)
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self), payment=(self)');
    // Prevent DNS prefetching for privacy
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    // API request ID for tracing
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    res.setHeader('X-Request-Id', requestId);
    req.requestId = requestId;

    next();
}

/**
 * Request sanitizer middleware
 * DEPRECATED: WAF middleware handles request filtering more robustly.
 * Kept as no-op to avoid breaking imports.
 */
function sanitizeRequest(req, res, next) {
    // No-op — WAF middleware (waf.js) provides comprehensive SQL/XSS/path-traversal filtering
    next();
}

/**
 * Request logger middleware
 */
function requestLogger(req, res, next) {
    const start = Date.now();
    const originalEnd = res.end;

    res.end = function (...args) {
        const duration = Date.now() - start;
        const logEntry = {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration_ms: duration,
            ip: req.ip,
            request_id: req.requestId,
            timestamp: new Date().toISOString()
        };

        // Log slow requests
        if (duration > 1000) {
            console.warn(`⚠️ Slow request (${duration}ms): ${req.method} ${req.path}`);
        }

        // Store for metrics (in-memory, last 1000)
        if (!requestLogger._entries) requestLogger._entries = [];
        requestLogger._entries.push(logEntry);
        if (requestLogger._entries.length > 1000) {
            requestLogger._entries = requestLogger._entries.slice(-500);
        }

        originalEnd.apply(res, args);
    };

    next();
}

requestLogger.getEntries = (limit = 50) => {
    return (requestLogger._entries || []).slice(-limit).reverse();
};

requestLogger.getMetrics = () => {
    const entries = requestLogger._entries || [];
    const last100 = entries.slice(-100);
    const avgDuration = last100.length > 0
        ? Math.round(last100.reduce((s, e) => s + e.duration_ms, 0) / last100.length)
        : 0;

    const statusCounts = {};
    entries.forEach(e => {
        const group = `${Math.floor(e.status / 100)}xx`;
        statusCounts[group] = (statusCounts[group] || 0) + 1;
    });

    return {
        total_requests: entries.length,
        avg_response_ms: avgDuration,
        status_distribution: statusCounts,
        slow_requests: entries.filter(e => e.duration_ms > 1000).length
    };
};

module.exports = { securityHeaders, sanitizeRequest, requestLogger };
