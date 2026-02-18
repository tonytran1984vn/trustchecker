/**
 * Rate Limiter Middleware
 * In-memory sliding window rate limiter with per-route and per-user limits
 */

class RateLimiter {
    constructor() {
        this.windows = new Map(); // key → [timestamps]
        this.blocked = new Map(); // key → unblock_time

        // Cleanup every 5 minutes
        this._cleanupTimer = setInterval(() => this.cleanup(), 300000);
        if (this._cleanupTimer.unref) this._cleanupTimer.unref();
    }

    /**
     * Create Express middleware with specified limits
     * @param {Object} options
     * @param {number} options.windowMs - Time window in ms (default: 60000 = 1 min)
     * @param {number} options.max - Max requests per window (default: 60)
     * @param {string} options.keyGenerator - 'ip' | 'user' | 'combined' (default: 'ip')
     * @param {string} options.message - Error message when rate limited
     */
    middleware(options = {}) {
        const windowMs = options.windowMs || 60000;
        const max = options.max || 60;
        const keyGen = options.keyGenerator || 'ip';
        const message = options.message || 'Too many requests, please try again later';
        const self = this;

        return (req, res, next) => {
            // Bypass rate limiting in test environment
            if (process.env.NODE_ENV === 'test') return next();
            const key = self._getKey(req, keyGen);
            const now = Date.now();

            // Check if blocked
            const blockedUntil = self.blocked.get(key);
            if (blockedUntil && now < blockedUntil) {
                const retryAfter = Math.ceil((blockedUntil - now) / 1000);
                res.set('Retry-After', retryAfter);
                res.set('X-RateLimit-Limit', max);
                res.set('X-RateLimit-Remaining', 0);
                res.set('X-RateLimit-Reset', new Date(blockedUntil).toISOString());
                return res.status(429).json({
                    error: message,
                    retry_after_seconds: retryAfter,
                    limit: max,
                    window_ms: windowMs
                });
            }

            // Get or create window
            if (!self.windows.has(key)) self.windows.set(key, []);
            const timestamps = self.windows.get(key);

            // Remove old entries outside window
            const windowStart = now - windowMs;
            while (timestamps.length > 0 && timestamps[0] < windowStart) {
                timestamps.shift();
            }

            // Check limit
            if (timestamps.length >= max) {
                // Block for remaining window time
                const resetTime = timestamps[0] + windowMs;
                self.blocked.set(key, resetTime);

                const retryAfter = Math.ceil((resetTime - now) / 1000);
                res.set('Retry-After', retryAfter);
                res.set('X-RateLimit-Limit', max);
                res.set('X-RateLimit-Remaining', 0);
                res.set('X-RateLimit-Reset', new Date(resetTime).toISOString());
                return res.status(429).json({
                    error: message,
                    retry_after_seconds: retryAfter,
                    limit: max,
                    window_ms: windowMs
                });
            }

            // Allow request
            timestamps.push(now);
            res.set('X-RateLimit-Limit', max);
            res.set('X-RateLimit-Remaining', max - timestamps.length);
            res.set('X-RateLimit-Reset', new Date(now + windowMs).toISOString());
            next();
        };
    }

    _getKey(req, keyGen) {
        const ip = req.ip || req.connection?.remoteAddress || 'unknown';
        if (keyGen === 'user' && req.user) return `user:${req.user.id}`;
        if (keyGen === 'combined' && req.user) return `${ip}:${req.user.id}`;
        return `ip:${ip}`;
    }

    cleanup() {
        const now = Date.now();
        // Clean old blocks
        for (const [key, until] of this.blocked) {
            if (until < now) this.blocked.delete(key);
        }
        // Clean old windows (no activity in last 5 min)
        for (const [key, timestamps] of this.windows) {
            if (timestamps.length === 0 || timestamps[timestamps.length - 1] < now - 300000) {
                this.windows.delete(key);
            }
        }
    }

    getStats() {
        return {
            active_windows: this.windows.size,
            active_blocks: this.blocked.size,
        };
    }
}

// Singleton with preset configurations
const limiter = new RateLimiter();

module.exports = {
    rateLimiter: limiter,

    // Preset middlewares
    apiLimit: limiter.middleware({ windowMs: 60000, max: 60, message: 'API rate limit exceeded (60/min)' }),
    authLimit: limiter.middleware({ windowMs: 900000, max: 10, message: 'Too many auth attempts (10/15min)' }),
    scanLimit: limiter.middleware({ windowMs: 60000, max: 30, message: 'Scan rate limit exceeded (30/min)' }),
    uploadLimit: limiter.middleware({ windowMs: 3600000, max: 50, message: 'Upload limit exceeded (50/hour)' }),
    exportLimit: limiter.middleware({ windowMs: 3600000, max: 10, message: 'Export limit exceeded (10/hour)' }),
};
