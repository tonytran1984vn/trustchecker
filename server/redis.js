/**
 * TrustChecker v9.0 — Redis Client
 * Centralized Redis connection for sessions, cache, rate limiting
 */

const Redis = require('ioredis');
const { safeParse } = require('./utils/safe-json');

let redis = null;

function getRedisClient() {
    if (redis) return redis;

    const url = process.env.REDIS_URL || 'redis://localhost:6379';

    redis = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            const delay = Math.min(times * 200, 3000);
            return delay;
        },
        lazyConnect: true
    });

    redis.on('connect', () => {
        console.log('✅ Redis connected');
    });

    redis.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
    });

    return redis;
}

// ─── Session Store ───────────────────────────────────────────────
const SESSION_PREFIX = 'session:';
const SESSION_TTL = 86400; // 24 hours

async function setSession(sessionId, data) {
    const client = getRedisClient();
    await client.setex(
        `${SESSION_PREFIX}${sessionId}`,
        SESSION_TTL,
        JSON.stringify(data)
    );
}

async function getSession(sessionId) {
    const client = getRedisClient();
    const data = await client.get(`${SESSION_PREFIX}${sessionId}`);
    return data ? safeParse(data) : null;
}

async function deleteSession(sessionId) {
    const client = getRedisClient();
    await client.del(`${SESSION_PREFIX}${sessionId}`);
}

// ─── Cache Store ─────────────────────────────────────────────────
const CACHE_PREFIX = 'cache:';

async function cacheGet(key) {
    const client = getRedisClient();
    const data = await client.get(`${CACHE_PREFIX}${key}`);
    return data ? safeParse(data) : null;
}

async function cacheSet(key, value, ttlSeconds = 300) {
    const client = getRedisClient();
    await client.setex(
        `${CACHE_PREFIX}${key}`,
        ttlSeconds,
        JSON.stringify(value)
    );
}

async function cacheDelete(key) {
    const client = getRedisClient();
    await client.del(`${CACHE_PREFIX}${key}`);
}

// ─── JWT Blacklist ───────────────────────────────────────────────
const BLACKLIST_PREFIX = 'jwt:blacklist:';

async function blacklistToken(jti, ttlSeconds = 3600) {
    const client = getRedisClient();
    await client.setex(`${BLACKLIST_PREFIX}${jti}`, ttlSeconds, '1');
}

async function isTokenBlacklisted(jti) {
    const client = getRedisClient();
    return await client.exists(`${BLACKLIST_PREFIX}${jti}`) === 1;
}

// ─── Rate Limiter (Sliding Window) ───────────────────────────────
const RATE_PREFIX = 'rate:';
let _rateCounter = 0;

async function checkRateLimit(key, maxRequests, windowSeconds) {
    const client = getRedisClient();
    const now = Date.now();
    const windowStart = now - (windowSeconds * 1000);
    const redisKey = `${RATE_PREFIX}${key}`;

    const pipeline = client.pipeline();
    pipeline.zremrangebyscore(redisKey, '-inf', windowStart);
    pipeline.zadd(redisKey, now, `${now}-${process.pid}-${_rateCounter++}`);
    pipeline.zcard(redisKey);
    pipeline.expire(redisKey, windowSeconds);

    const results = await pipeline.exec();
    const requestCount = results[2][1];

    return {
        allowed: requestCount <= maxRequests,
        remaining: Math.max(0, maxRequests - requestCount),
        total: maxRequests,
        resetAt: new Date(now + (windowSeconds * 1000))
    };
}

// ─── Pub/Sub for Cross-Service Events ────────────────────────────

function createSubscriber() {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    const sub = new Redis(url, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            const delay = Math.min(times * 200, 3000);
            return delay;
        },
    });

    sub.on('error', (err) => {
        console.error('❌ Redis subscriber error:', err.message);
    });

    return sub;
}

async function publish(channel, data) {
    const client = getRedisClient();
    await client.publish(channel, JSON.stringify(data));
}

// ─── Graceful Shutdown ───────────────────────────────────────────
async function disconnect() {
    if (redis) {
        await redis.quit();
        redis = null;
        console.log('🔌 Redis disconnected');
    }
}

module.exports = {
    getRedisClient,
    // Sessions
    setSession,
    getSession,
    deleteSession,
    // Cache
    cacheGet,
    cacheSet,
    cacheDelete,
    // JWT
    blacklistToken,
    isTokenBlacklisted,
    // Rate Limiting
    checkRateLimit,
    // Pub/Sub
    createSubscriber,
    publish,
    // Lifecycle
    disconnect
};
