/**
 * TrustChecker v9.0 — Response Cache Middleware (Redis-backed)
 *
 * Dual-mode: Redis (if REDIS_URL set) or in-memory Map (fallback).
 * Same API as before — zero route file changes needed.
 *
 * Usage in routes:
 *   const { cacheMiddleware, clearCacheByPrefix } = require('../cache');
 *   router.get('/stats', cacheMiddleware(60), handler);  // Cache 60 seconds
 *
 * Cache invalidation:
 *   clearCacheByPrefix('/api/scm/risk');  // After data mutations
 */

const USE_REDIS = !!process.env.REDIS_URL;

// ═══════════════════════════════════════════════════════════════════
// IN-MEMORY BACKEND (fallback when Redis unavailable)
// ═══════════════════════════════════════════════════════════════════

class InMemoryCache {
    constructor() {
        this.store = new Map();
        this.hits = 0;
        this.misses = 0;
        this._cleanupInterval = setInterval(() => this._cleanup(), 60000);
        if (this._cleanupInterval.unref) this._cleanupInterval.unref();
    }

    async get(key) {
        const entry = this.store.get(key);
        if (!entry) { this.misses++; return null; }
        if (Date.now() > entry.expiresAt) {
            this.store.delete(key);
            this.misses++;
            return null;
        }
        this.hits++;
        return entry.data;
    }

    async set(key, data, ttlSeconds) {
        this.store.set(key, {
            data,
            expiresAt: Date.now() + ttlSeconds * 1000,
            createdAt: Date.now()
        });
    }

    async clearByPrefix(prefix) {
        let cleared = 0;
        for (const key of this.store.keys()) {
            if (key.startsWith(prefix)) {
                this.store.delete(key);
                cleared++;
            }
        }
        return cleared;
    }

    async clearAll() {
        this.store.clear();
    }

    async stats() {
        return {
            backend: 'memory',
            entries: this.store.size,
            hits: this.hits,
            misses: this.misses,
            hit_rate: this.hits + this.misses > 0
                ? Math.round(this.hits / (this.hits + this.misses) * 100) + '%'
                : '0%'
        };
    }

    _cleanup() {
        const now = Date.now();
        let cleaned = 0;
        for (const [key, entry] of this.store) {
            if (now > entry.expiresAt) {
                this.store.delete(key);
                cleaned++;
            }
        }
        if (cleaned > 0) {
            console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// REDIS BACKEND
// ═══════════════════════════════════════════════════════════════════

class RedisCache {
    constructor() {
        this.hits = 0;
        this.misses = 0;
        this._redis = null;
    }

    _getClient() {
        if (!this._redis) {
            const { getRedisClient } = require('./redis');
            this._redis = getRedisClient();
        }
        return this._redis;
    }

    async get(key) {
        try {
            const data = await this._getClient().get(`cache:${key}`);
            if (!data) { this.misses++; return null; }
            this.hits++;
            return JSON.parse(data);
        } catch (e) {
            this.misses++;
            return null;
        }
    }

    async set(key, data, ttlSeconds) {
        try {
            await this._getClient().setex(
                `cache:${key}`,
                ttlSeconds,
                JSON.stringify(data)
            );
        } catch (e) {
            console.error('Redis cache set error:', e.message);
        }
    }

    async clearByPrefix(prefix) {
        try {
            const client = this._getClient();
            let cursor = '0';
            let cleared = 0;
            do {
                const [nextCursor, keys] = await client.scan(
                    cursor, 'MATCH', `cache:${prefix}*`, 'COUNT', 100
                );
                cursor = nextCursor;
                if (keys.length > 0) {
                    await client.del(...keys);
                    cleared += keys.length;
                }
            } while (cursor !== '0');
            return cleared;
        } catch (e) {
            console.error('Redis cache clear error:', e.message);
            return 0;
        }
    }

    async clearAll() {
        try {
            const client = this._getClient();
            let cursor = '0';
            do {
                const [nextCursor, keys] = await client.scan(cursor, 'MATCH', 'cache:*', 'COUNT', 100);
                cursor = nextCursor;
                if (keys.length > 0) await client.del(...keys);
            } while (cursor !== '0');
        } catch (e) {
            console.error('Redis cache clearAll error:', e.message);
        }
    }

    async stats() {
        let entries = 0;
        try {
            const client = this._getClient();
            // Count cache keys efficiently
            let cursor = '0';
            do {
                const [nextCursor, keys] = await client.scan(cursor, 'MATCH', 'cache:*', 'COUNT', 1000);
                cursor = nextCursor;
                entries += keys.length;
            } while (cursor !== '0');
        } catch (e) { /* Redis unavailable */ }

        return {
            backend: 'redis',
            entries,
            hits: this.hits,
            misses: this.misses,
            hit_rate: this.hits + this.misses > 0
                ? Math.round(this.hits / (this.hits + this.misses) * 100) + '%'
                : '0%'
        };
    }
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS — Same API regardless of backend
// ═══════════════════════════════════════════════════════════════════

const cache = USE_REDIS ? new RedisCache() : new InMemoryCache();

console.log(`📦 Cache backend: ${USE_REDIS ? 'Redis' : 'In-Memory'}`);

/**
 * Express middleware that caches JSON responses.
 * Only caches GET requests with 200 status.
 *
 * @param {number} ttlSeconds - Cache TTL in seconds
 * @param {function} [keyFn] - Custom key generator (req) => string
 */
function cacheMiddleware(ttlSeconds = 60, keyFn) {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') return next();

        const key = keyFn ? keyFn(req) : `${req.originalUrl}:${req.user?.id || 'anon'}`;

        // Make async but non-blocking
        cache.get(key).then(cached => {
            if (cached) {
                res.set('X-Cache', 'HIT');
                res.set('X-Cache-TTL', `${ttlSeconds}s`);
                res.set('X-Cache-Backend', USE_REDIS ? 'redis' : 'memory');
                return res.json(cached);
            }

            // Override res.json to capture and cache the response
            const originalJson = res.json.bind(res);
            let jsonWrapped = false;
            res.json = (data) => {
                // Restore original immediately to prevent double-wrapping
                res.json = originalJson;
                jsonWrapped = true;
                if (res.statusCode === 200) {
                    cache.set(key, data, ttlSeconds).catch(() => { });
                }
                res.set('X-Cache', 'MISS');
                res.set('X-Cache-Backend', USE_REDIS ? 'redis' : 'memory');
                return originalJson(data);
            };

            next();
        }).catch(() => next());
    };
}

/**
 * Clear cache entries matching a URL prefix.
 * Call after mutations to keep cache consistent.
 */
function clearCacheByPrefix(prefix) {
    return cache.clearByPrefix(prefix);
}

module.exports = { cache, cacheMiddleware, clearCacheByPrefix };
