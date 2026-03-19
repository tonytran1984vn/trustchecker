/**
 * Security Middleware
 * Additional security headers and request sanitization beyond helmet
 */

/**
 * Custom security headers middleware
 */
function securityHeaders(req, res, next) {
    // HSTS — force HTTPS (S-05)
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    // CSP — prevent XSS payload execution (S-06)
    // NOTE: 'unsafe-inline' required for legacy client inline onclick handlers
    // TODO: refactor client to use nonces/event listeners, then remove unsafe-inline
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com https:; connect-src 'self' wss:; frame-ancestors 'none'");
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
    const requestId = `req-${Date.now()}-${require('crypto').randomBytes(6).toString('hex')}`;
    res.setHeader('X-Request-Id', requestId);
    req.requestId = requestId;

    next();
}

/**
 * Request sanitizer middleware
 * DEPRECATED: WAF middleware handles request filtering more robustly.
 * Kept as no-op to avoid breaking imports.
 */
// sanitizeRequest removed (S-18) — WAF middleware handles filtering
function sanitizeRequest(req, res, next) { next(); } // kept for backward compat

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

        // Circular buffer — O(1) insertion, no GC spikes
        if (!requestLogger._entries) {
            requestLogger._entries = new Array(1000);
            requestLogger._writeIndex = 0;
            requestLogger._count = 0;
        }
        requestLogger._entries[requestLogger._writeIndex] = logEntry;
        requestLogger._writeIndex = (requestLogger._writeIndex + 1) % 1000;
        if (requestLogger._count < 1000) requestLogger._count++;

        originalEnd.apply(res, args);
    };

    next();
}

// Helper: get ordered entries from circular buffer
function _getOrderedEntries() {
    if (!requestLogger._entries || !requestLogger._count) return [];
    const buf = requestLogger._entries;
    const count = requestLogger._count;
    const wi = requestLogger._writeIndex;
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(buf[(wi - count + i + 1000) % 1000]);
    }
    return result;
}

requestLogger.getEntries = (limit = 50) => {
    return _getOrderedEntries().slice(-limit).reverse();
};

requestLogger.getMetrics = () => {
    const entries = _getOrderedEntries();
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
