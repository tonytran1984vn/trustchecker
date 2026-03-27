/**
 * Rate Limiter Middleware (Audit M-4 — Redis-backed)
 *
 * Hybrid rate limiter:
 *  - Redis sliding window (shared across PM2 workers) — primary
 *  - In-memory fallback when Redis is unavailable
 *
 * Per-route and per-user limits with trust-based org scaling.
 */
const logger = require('../lib/logger');

class RateLimiter {
    constructor() {
        this.windows = new Map(); // key → [timestamps] (in-memory fallback)
        this.blocked = new Map(); // key → unblock_time

        // Cleanup every 5 minutes (in-memory fallback)
        this._cleanupTimer = setInterval(() => this.cleanup(), 300000);
        if (this._cleanupTimer.unref) this._cleanupTimer.unref();

        // Lazy-load Redis to avoid circular deps at module load
        this._redis = null;
        this._redisAvailable = null; // null = not checked, true/false = checked
    }

    async _getRedis() {
        if (this._redisAvailable === false) return null;
        if (this._redis) return this._redis;
        try {
            const { checkRateLimit, getRedisClient } = require('../redis');
            const client = getRedisClient();
            await client.ping();
            this._redis = { checkRateLimit };
            this._redisAvailable = true;
            return this._redis;
        } catch (e) {
            this._redisAvailable = false;
            // Retry Redis availability every 60s
            setTimeout(() => {
                this._redisAvailable = null;
            }, 60000).unref();
            return null;
        }
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

        return async (req, res, next) => {
            // Bypass rate limiting in test environment
            if (process.env.NODE_ENV === 'test') return next();
            const key = self._getKey(req, keyGen);

            // M-4 FIX: Try Redis first (shared across PM2 workers)
            try {
                const redis = await self._getRedis();
                if (redis) {
                    const windowSec = Math.ceil(windowMs / 1000);
                    const result = await redis.checkRateLimit(key, max, windowSec);
                    res.set('X-RateLimit-Limit', max);
                    res.set('X-RateLimit-Remaining', result.remaining);
                    res.set('X-RateLimit-Reset', result.resetAt.toISOString());

                    if (!result.allowed) {
                        const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
                        res.set('Retry-After', Math.max(1, retryAfter));
                        return res.status(429).json({
                            error: message,
                            retry_after_seconds: Math.max(1, retryAfter),
                            limit: max,
                            window_ms: windowMs,
                        });
                    }
                    return next();
                }
            } catch (e) {
                // Redis failed — fall through to in-memory
            }

            // Fallback: in-memory sliding window
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
                    window_ms: windowMs,
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
                    window_ms: windowMs,
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
        // Behind reverse proxy (Nginx), req.ip is always 127.0.0.1
        // Use X-Forwarded-For to get real client IP
        const forwarded = req.headers['x-forwarded-for'];
        const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip || req.connection?.remoteAddress || 'unknown';
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
            redis_available: this._redisAvailable,
        };
    }

    /**
     * Create org-level middleware with trust-based limits.
     * Queries org_quotas for trust_multiplier → effective = base × multiplier.
     * Burst hard cap: absolute max 300/min regardless of trust.
     * M-4 FIX: Uses Redis when available for cross-worker consistency.
     */
    orgLimit(options = {}) {
        const baseMax = options.max || 200;
        const windowMs = options.windowMs || 60000;
        const BURST_HARD_CAP = options.burstCap || 300;
        const self = this;

        return async (req, res, next) => {
            if (process.env.NODE_ENV === 'test') return next();

            const orgId = req.user?.orgId || req.user?.org_id;
            if (!orgId) return next();

            try {
                // Lazy-load db to avoid circular deps
                const db = require('../db');

                // Get org trust multiplier (cached in org_quotas)
                let effectiveMax = baseMax;
                try {
                    const quota = await db.get(
                        'SELECT trust_multiplier, max_requests_per_min FROM org_quotas WHERE org_id = $1',
                        [orgId]
                    );
                    if (quota) {
                        const multiplier = parseFloat(quota.trust_multiplier) || 1.0;
                        effectiveMax = Math.min(
                            Math.round((quota.max_requests_per_min || baseMax) * multiplier),
                            BURST_HARD_CAP
                        );
                    }
                } catch (e) {
                    /* fallback to base */
                }

                const key = `org:${orgId}`;

                // M-4 FIX: Try Redis first
                try {
                    const redis = await self._getRedis();
                    if (redis) {
                        const windowSec = Math.ceil(windowMs / 1000);
                        const result = await redis.checkRateLimit(key, effectiveMax, windowSec);
                        res.set('X-RateLimit-Limit', effectiveMax);
                        res.set('X-RateLimit-Remaining', result.remaining);

                        if (!result.allowed) {
                            const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
                            res.set('Retry-After', Math.max(1, retryAfter));

                            // Log metric (best-effort)
                            try {
                                const { v4: mid } = require('uuid');
                                await db.run(
                                    'INSERT INTO system_metrics (id, metric_type, org_id, endpoint, details) VALUES ($1, $2, $3, $4, $5)',
                                    [
                                        mid(),
                                        'rate_limit_triggered',
                                        orgId,
                                        req.path,
                                        JSON.stringify({ effective_max: effectiveMax, source: 'redis' }),
                                    ]
                                );
                            } catch (e) {
                                /* best-effort */
                            }

                            return res.status(429).json({
                                error: 'Organization rate limit exceeded',
                                limit: effectiveMax,
                                retry_after_seconds: Math.max(1, retryAfter),
                            });
                        }
                        return next();
                    }
                } catch (e) {
                    // Redis failed — fall through to in-memory
                }

                // Fallback: in-memory sliding window with computed max
                const now = Date.now();

                const blockedUntil = self.blocked.get(key);
                if (blockedUntil && now < blockedUntil) {
                    const retryAfter = Math.ceil((blockedUntil - now) / 1000);
                    res.set('Retry-After', retryAfter);
                    res.set('X-RateLimit-Limit', effectiveMax);
                    res.set('X-RateLimit-Remaining', 0);

                    // Log metric (best-effort)
                    try {
                        const { v4: mid } = require('uuid');
                        await db.run(
                            'INSERT INTO system_metrics (id, metric_type, org_id, endpoint, details) VALUES ($1, $2, $3, $4, $5)',
                            [
                                mid(),
                                'rate_limit_triggered',
                                orgId,
                                req.path,
                                JSON.stringify({ effective_max: effectiveMax, source: 'memory' }),
                            ]
                        );
                    } catch (e) {
                        /* best-effort */
                    }

                    return res.status(429).json({
                        error: 'Organization rate limit exceeded',
                        limit: effectiveMax,
                        retry_after_seconds: retryAfter,
                    });
                }

                if (!self.windows.has(key)) self.windows.set(key, []);
                const timestamps = self.windows.get(key);

                const windowStart = now - windowMs;
                while (timestamps.length > 0 && timestamps[0] < windowStart) timestamps.shift();

                if (timestamps.length >= effectiveMax) {
                    const resetTime = timestamps[0] + windowMs;
                    self.blocked.set(key, resetTime);
                    res.set('Retry-After', Math.ceil((resetTime - now) / 1000));
                    res.set('X-RateLimit-Limit', effectiveMax);
                    res.set('X-RateLimit-Remaining', 0);
                    return res.status(429).json({
                        error: 'Organization rate limit exceeded',
                        limit: effectiveMax,
                    });
                }

                timestamps.push(now);
                res.set('X-RateLimit-Limit', effectiveMax);
                res.set('X-RateLimit-Remaining', effectiveMax - timestamps.length);
                next();
            } catch (err) {
                next(); // Don't block on rate limit errors
            }
        };
    }
}

// Singleton with preset configurations
const limiter = new RateLimiter();

module.exports = {
    rateLimiter: limiter,

    // Preset middlewares — use 'combined' key to separate users behind proxy
    apiLimit: limiter.middleware({
        windowMs: 60000,
        max: 200,
        keyGenerator: 'combined',
        message: 'API rate limit exceeded (200/min)',
    }),
    authLimit: limiter.middleware({ windowMs: 900000, max: 15, message: 'Too many auth attempts (15/15min)' }),
    scanLimit: limiter.middleware({ windowMs: 60000, max: 60, message: 'Scan rate limit exceeded (60/min)' }),
    uploadLimit: limiter.middleware({ windowMs: 3600000, max: 50, message: 'Upload limit exceeded (50/hour)' }),
    exportLimit: limiter.middleware({ windowMs: 3600000, max: 20, message: 'Export limit exceeded (20/hour)' }),

    // Org-level trust-based rate limiting (Phase 6)
    orgApiLimit: limiter.orgLimit({ max: 200, burstCap: 300 }),
};
