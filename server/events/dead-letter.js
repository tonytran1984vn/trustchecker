/**
 * TrustChecker v9.2 — Dead Letter Queue
 * ═══════════════════════════════════════════════════════════
 * Captures failed events/jobs after max retries exhausted.
 * Supports inspection, replay, and metrics.
 *
 * Storage: Redis list `dlq:{consumerGroup}:{eventType}` or in-memory array.
 *
 * Usage:
 *   const dlq = require('./dead-letter');
 *   dlq.push('fraud-worker', event, error);
 *   const items = await dlq.inspect('fraud-worker', 10);
 *   await dlq.replay('fraud-worker', itemId, handler);
 */

let _redis = null;

function getRedis() {
    if (_redis) return _redis;
    try {
        const { getRedisClient } = require('../redis');
        _redis = getRedisClient();
        return _redis;
    } catch {
        return null;
    }
}

const DLQ_PREFIX = 'dlq:';
const DLQ_MAX_AGE_DAYS = 30;

// In-memory fallback
const memoryDLQ = new Map();

/**
 * Push a failed event/job to the dead letter queue.
 * @param {string} consumerGroup - consumer group that failed
 * @param {object} event - the original event envelope
 * @param {Error|string} error - failure reason
 * @param {object} opts - { attempts, originalQueue }
 */
async function push(consumerGroup, event, error, opts = {}) {
    const entry = {
        id: `dlq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        consumerGroup,
        event,
        error: typeof error === 'string' ? error : error?.message || 'Unknown error',
        stack: error?.stack || null,
        attempts: opts.attempts || 0,
        originalQueue: opts.originalQueue || null,
        pushedAt: new Date().toISOString(),
        replayed: false,
    };

    const redis = getRedis();
    const key = `${DLQ_PREFIX}${consumerGroup}`;

    if (redis) {
        try {
            await redis.lpush(key, JSON.stringify(entry));
            await redis.expire(key, DLQ_MAX_AGE_DAYS * 86400);
        } catch (e) {
            console.error('[DLQ] Redis push failed, using memory:', e.message);
            _pushMemory(consumerGroup, entry);
        }
    } else {
        _pushMemory(consumerGroup, entry);
    }

    console.warn(`💀 [DLQ] ${consumerGroup}: ${event.type || 'unknown'} → ${entry.error}`);
    _stats.total++;
    _stats.byGroup[consumerGroup] = (_stats.byGroup[consumerGroup] || 0) + 1;

    return entry.id;
}

function _pushMemory(group, entry) {
    if (!memoryDLQ.has(group)) memoryDLQ.set(group, []);
    const list = memoryDLQ.get(group);
    list.unshift(entry);
    // Cap at 1000 per group
    if (list.length > 1000) list.length = 1000;
}

/**
 * Inspect DLQ entries for a consumer group.
 * @param {string} consumerGroup
 * @param {number} limit - max entries to return (default 50)
 * @returns {Promise<object[]>}
 */
async function inspect(consumerGroup, limit = 50) {
    const redis = getRedis();
    const key = `${DLQ_PREFIX}${consumerGroup}`;

    if (redis) {
        try {
            const items = await redis.lrange(key, 0, limit - 1);
            return items.map(i => JSON.parse(i));
        } catch {
            // fallthrough to memory
        }
    }

    const list = memoryDLQ.get(consumerGroup) || [];
    return list.slice(0, limit);
}

/**
 * Replay a specific DLQ entry through a handler.
 * @param {string} consumerGroup
 * @param {string} entryId
 * @param {function} handler - async (event) => void
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function replay(consumerGroup, entryId, handler) {
    const entries = await inspect(consumerGroup, 500);
    const entryIndex = entries.findIndex(e => e.id === entryId);

    if (entryIndex === -1) {
        return { success: false, error: 'Entry not found' };
    }

    const entry = entries[entryIndex];

    try {
        await handler(entry.event);
        // Mark as replayed
        entry.replayed = true;
        entry.replayedAt = new Date().toISOString();
        _stats.replayed++;

        // Persist updated entry to Redis
        const redis = getRedis();
        if (redis) {
            const key = `${DLQ_PREFIX}${consumerGroup}`;
            try {
                await redis.lset(key, entryIndex, JSON.stringify(entry));
            } catch { /* Best effort — memory entry is already updated */ }
        }

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

/**
 * Replay all entries for a consumer group.
 * @param {string} consumerGroup
 * @param {function} handler - async (event) => void
 * @returns {Promise<{total: number, success: number, failed: number}>}
 */
async function replayAll(consumerGroup, handler) {
    const entries = await inspect(consumerGroup, 500);
    let success = 0, failed = 0;

    for (const entry of entries) {
        if (entry.replayed) continue;
        try {
            await handler(entry.event);
            entry.replayed = true;
            success++;
        } catch {
            failed++;
        }
    }

    _stats.replayed += success;
    return { total: entries.length, success, failed };
}

/**
 * Get DLQ depth per consumer group.
 */
async function depth() {
    const redis = getRedis();
    const result = {};

    if (redis) {
        try {
            // Scan for dlq:* keys
            let cursor = '0';
            do {
                const [newCursor, keys] = await redis.scan(cursor, 'MATCH', `${DLQ_PREFIX}*`, 'COUNT', 100);
                cursor = newCursor;
                for (const key of keys) {
                    const group = key.replace(DLQ_PREFIX, '');
                    result[group] = await redis.llen(key);
                }
            } while (cursor !== '0');
        } catch {
            // fallthrough to memory
        }
    }

    // Include memory entries
    for (const [group, list] of memoryDLQ.entries()) {
        result[group] = (result[group] || 0) + list.length;
    }

    return result;
}

/**
 * Purge DLQ for a consumer group (admin only).
 */
async function purge(consumerGroup) {
    const redis = getRedis();
    const key = `${DLQ_PREFIX}${consumerGroup}`;

    if (redis) {
        try { await redis.del(key); } catch { /* ignore */ }
    }
    memoryDLQ.delete(consumerGroup);
    delete _stats.byGroup[consumerGroup];
}

// ─── Stats ───────────────────────────────────────────────────
const _stats = { total: 0, replayed: 0, byGroup: {} };

function getStats() {
    return { ..._stats };
}

module.exports = { push, inspect, replay, replayAll, depth, purge, getStats };
