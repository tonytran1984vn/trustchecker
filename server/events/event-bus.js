/**
 * TrustChecker v9.5.1 — Event Bus (Redis Streams + In-Memory Fallback)
 * ═══════════════════════════════════════════════════════════
 * Domain event publishing and consumption with:
 *   - Redis Streams (XADD/XREADGROUP) for production
 *   - In-memory EventEmitter fallback for dev/testing
 *   - At-least-once delivery via consumer groups + XACK
 *   - Schema validation before publish
 *   - Dead letter queue integration for failed processing
 *   - Per-org context propagation in event envelopes
 *   - v9.5.1: Structured logging, auto context from AsyncLocalStorage
 *
 * Usage:
 *   const eventBus = require('./events/event-bus');
 *   // Publish
 *   await eventBus.publish('scan.created', { productId: '...' }, { orgId: '...' });
 *   // Subscribe
 *   eventBus.subscribe('scan.created', 'fraud-worker', async (event) => { ... });
 */

const EventEmitter = require('events');
const { validateEvent, getSchemaVersion } = require('./schema-registry');
const dlq = require('./dead-letter');
const logger = require('../lib/logger');
const { safeGetContext, runInContext } = require('../lib/request-context');

const crypto = require('crypto');

// ─── Configuration ───────────────────────────────────────────
const CONFIG = {
    streamPrefix: 'tc:events:',      // v9.5.1: prefixed with tc: for namespace clarity
    consumerGroupPrefix: 'cg:',
    maxRetries: 3,
    retryDelays: [1000, 5000, 15000], // exponential backoff ms
    batchSize: 10,
    blockMs: 2000,            // XREADGROUP block timeout
    maxStreamLength: 10000,   // MAXLEN ~ trim old entries
    enableValidation: true,
    // v9.5.1: Correctness guarantees
    pendingRecoveryIntervalMs: 30000,  // Check for stuck events every 30s
    pendingClaimMinIdleMs: 60000,      // Claim events idle >60s
    idempotencyTTL: 86400,             // Dedup key TTL: 24 hours
    idempotencyPrefix: 'tc:processed:', // Redis SET key prefix
};

// ─── Publisher ACL (shared) ──────────────────────────────────
const PUBLISHER_ACL = {
    'FRAUD_DETECTED': ['fraud-engine', 'anomaly-engine', 'scan-guard'],
    'TRUST_SCORE_UPDATED': ['trust-engine'],
    'KILL_SWITCH_ACTIVATED': ['kill-switch-engine', 'platform-admin'],
    'SCAN_COMPLETED': ['qr-routes', 'mobile-scan'],
    'CONTAGION_DETECTED': ['contagion-engine'],
};

// ─── Event Envelope ──────────────────────────────────────────
function createEnvelope(type, data, context = {}) {
    // Auto-fill context from AsyncLocalStorage if not provided
    const reqCtx = safeGetContext();

    return {
        id: `evt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        type,
        version: getSchemaVersion(type),
        data,
        context: {
            orgId: context.orgId || reqCtx.orgId || null,
            userId: context.userId || reqCtx.userId || null,
            orgPlan: context.orgPlan || null,
            traceId: context.traceId || reqCtx.requestId || null,
            source: context.source || 'api',
        },
        timestamp: new Date().toISOString(),
        publishedAt: Date.now(),
    };
}

// ═══════════════════════════════════════════════════════════════
//  REDIS STREAMS BACKEND
// ═══════════════════════════════════════════════════════════════
class RedisEventBus {
    constructor() {
        this._redis = null;
        this._subscribers = new Map(); // eventType → [{ group, handler }]
        this._pollers = new Map();     // group → interval
        this._recoveryTimers = [];     // XAUTOCLAIM recovery workers
        this._running = false;
        this._stats = { published: 0, consumed: 0, failed: 0, dlq: 0, recovered: 0, deduped: 0 };
        this._throttleMap = new Map(); // v9.5.0: Event throttle
    }

    _getClient() {
        if (!this._redis) {
            const { getRedisClient } = require('../redis');
            this._redis = getRedisClient();
        }
        return this._redis;
    }

    /**
     * Publish a domain event to Redis Stream.
     */
    async publish(type, data, context = {}) {
        // ACL check
        const allowed = PUBLISHER_ACL[type];
        if (allowed && context.publisher && !allowed.includes(context.publisher)) {
            logger.warn('Event publish unauthorized', { publisher: context.publisher, type });
            this._stats.failed++;
            return;
        }

        // v9.5.0: Throttle — max 1 event per type per org per 500ms
        const tKey = type + ':' + (data?.org_id || data?.orgId || 'g');
        const now = Date.now();
        if (this._throttleMap.has(tKey) && (now - this._throttleMap.get(tKey)) < 500) {
            return null; // Throttled
        }
        this._throttleMap.set(tKey, now);
        if (this._throttleMap.size > 2000) {
            const cutoff = now - 60000;
            for (const [k, t] of this._throttleMap) { if (t < cutoff) this._throttleMap.delete(k); }
        }
        // Validate schema
        if (CONFIG.enableValidation) {
            const { valid, errors } = validateEvent(type, data);
            if (!valid) {
                throw new Error(`Schema validation failed for '${type}': ${errors.join(', ')}`);
            }
        }

        const envelope = createEnvelope(type, data, context);
        const client = this._getClient();
        const streamKey = `${CONFIG.streamPrefix}${type}`;

        try {
            // XADD with MAXLEN ~ for auto-trimming
            await client.xadd(
                streamKey, 'MAXLEN', '~', CONFIG.maxStreamLength,
                '*',
                'envelope', JSON.stringify(envelope)
            );
            this._stats.published++;
            return envelope;
        } catch (err) {
            logger.error('Event publish failed', { type, error: err.message });
            throw err;
        }
    }

    /**
     * Subscribe a consumer group to an event type.
     */
    async subscribe(eventType, consumerGroup, handler) {
        const client = this._getClient();
        const streamKey = `${CONFIG.streamPrefix}${eventType}`;
        const groupName = `${CONFIG.consumerGroupPrefix}${consumerGroup}`;

        // Create consumer group (idempotent)
        try {
            await client.xgroup('CREATE', streamKey, groupName, '0', 'MKSTREAM');
        } catch (err) {
            if (!err.message.includes('BUSYGROUP')) throw err;
            // Group already exists — OK
        }

        // Register handler
        if (!this._subscribers.has(eventType)) {
            this._subscribers.set(eventType, []);
        }
        this._subscribers.get(eventType).push({ group: consumerGroup, groupName, handler });

        // Start polling if not already running
        if (!this._pollers.has(`${eventType}:${consumerGroup}`)) {
            this._startPoller(eventType, consumerGroup, groupName, handler);
            // Start pending recovery (XAUTOCLAIM) for stuck events
            this._startPendingRecovery(eventType, consumerGroup, groupName, handler);
        }
    }

    /**
     * Start a polling loop for a consumer group.
     */
    _startPoller(eventType, consumerGroup, groupName, handler) {
        const key = `${eventType}:${consumerGroup}`;
        this._running = true;

        const poll = async () => {
            if (!this._running) return;

            const client = this._getClient();
            const streamKey = `${CONFIG.streamPrefix}${eventType}`;
            const consumerName = `worker-${process.pid}`;

            try {
                // XREADGROUP — read pending messages
                const results = await client.xreadgroup(
                    'GROUP', groupName, consumerName,
                    'COUNT', CONFIG.batchSize,
                    'BLOCK', CONFIG.blockMs,
                    'STREAMS', streamKey, '>'
                );

                if (results) {
                    for (const [, messages] of results) {
                        for (const [msgId, fields] of messages) {
                            await this._processMessage(
                                client, streamKey, groupName, consumerGroup,
                                msgId, fields, handler
                            );
                        }
                    }
                }
            } catch (err) {
                if (err.message !== 'Connection is closed') {
                    logger.error('Event poller error', { key, error: err.message });
                }
            }

            // Schedule next poll
            if (this._running) {
                const nextDelay = 100;
                const timer = setTimeout(poll, nextDelay);
                this._pollers.set(key, timer);
            }
        };

        // Start immediately
        poll();
    }

    /**
     * Process a single message with idempotency check + retry + DLQ.
     */
    async _processMessage(client, streamKey, groupName, consumerGroup, msgId, fields, handler) {
        // Parse envelope from fields
        let envelope;
        try {
            const raw = fields[fields.indexOf('envelope') + 1];
            envelope = JSON.parse(raw);
        } catch {
            logger.error('Invalid event message format', { msgId });
            await client.xack(streamKey, groupName, msgId);
            return;
        }

        // ─── Idempotency check (consumer-side dedup) ─────────────
        // If this event was already processed (by this or another consumer),
        // ACK immediately to prevent double-processing.
        const dedupKey = `${CONFIG.idempotencyPrefix}${consumerGroup}:${envelope.id}`;
        try {
            const alreadyProcessed = await client.get(dedupKey);
            if (alreadyProcessed) {
                await client.xack(streamKey, groupName, msgId);
                this._stats.deduped++;
                return;
            }
        } catch {
            // Redis error on dedup check — proceed anyway (at-least-once > at-most-once)
        }

        let attempts = 0;
        let lastError = null;

        while (attempts < CONFIG.maxRetries) {
            try {
                await handler(envelope);
                // Success — ACK + mark as processed
                await client.xack(streamKey, groupName, msgId);
                try {
                    await client.setex(dedupKey, CONFIG.idempotencyTTL, '1');
                } catch { /* best-effort dedup mark */ }
                this._stats.consumed++;
                return;
            } catch (err) {
                attempts++;
                lastError = err;
                logger.warn('Event handler retry', {
                    type: envelope.type,
                    attempt: `${attempts}/${CONFIG.maxRetries}`,
                    error: err.message,
                });

                if (attempts < CONFIG.maxRetries) {
                    const delay = CONFIG.retryDelays[attempts - 1] || 15000;
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }

        // Max retries exhausted → DLQ
        this._stats.failed++;
        this._stats.dlq++;
        await dlq.push(consumerGroup, envelope, lastError, { attempts });
        // ACK to prevent reprocessing from PEL
        await client.xack(streamKey, groupName, msgId);
    }

    // ─── Pending Recovery (XAUTOCLAIM) ───────────────────────────
    // Reclaims events stuck in PEL (pending entries list) after consumer crash.
    // Runs every 30s, claims events idle > 60s.
    _startPendingRecovery(eventType, consumerGroup, groupName, handler) {
        const recover = async () => {
            if (!this._running) return;
            const client = this._getClient();
            const streamKey = `${CONFIG.streamPrefix}${eventType}`;
            const consumerName = `worker-${process.pid}`;

            try {
                // XAUTOCLAIM: claim messages idle > minIdleMs
                const result = await client.xautoclaim(
                    streamKey, groupName, consumerName,
                    CONFIG.pendingClaimMinIdleMs,
                    '0-0', 'COUNT', CONFIG.batchSize
                );

                // result = [nextStartId, [[id, fields], ...], deletedIds]
                const messages = result?.[1] || [];
                if (messages.length > 0) {
                    logger.info('Pending events recovered', {
                        stream: eventType,
                        group: consumerGroup,
                        count: messages.length,
                    });
                    for (const [msgId, fields] of messages) {
                        if (fields && fields.length > 0) {
                            await this._processMessage(
                                client, streamKey, groupName, consumerGroup,
                                msgId, fields, handler
                            );
                            this._stats.recovered++;
                        }
                    }
                }
            } catch (err) {
                // XAUTOCLAIM requires Redis 6.2+ — log but don't crash
                if (!err.message.includes('ERR unknown command')) {
                    logger.error('Pending recovery error', { stream: eventType, error: err.message });
                }
            }
        };

        const timer = setInterval(recover, CONFIG.pendingRecoveryIntervalMs);
        this._recoveryTimers.push(timer);
    }

    async stop() {
        this._running = false;
        for (const timer of this._pollers.values()) {
            clearTimeout(timer);
        }
        this._pollers.clear();
        for (const timer of this._recoveryTimers) {
            clearInterval(timer);
        }
        this._recoveryTimers = [];
    }

    getStats() {
        return { backend: 'redis-streams', ...this._stats };
    }
}

// ═══════════════════════════════════════════════════════════════
//  IN-MEMORY FALLBACK
// ═══════════════════════════════════════════════════════════════
class InMemoryEventBus {
    constructor() {
        this._emitter = new EventEmitter();
        this._emitter.setMaxListeners(100);
        this._stats = { published: 0, consumed: 0, failed: 0, dlq: 0 };
        this._throttleMap = new Map(); // v9.5.0: Event throttle
    }

    async publish(type, data, context = {}) {
        // ACL check
        const allowed = PUBLISHER_ACL[type];
        if (allowed && context.publisher && !allowed.includes(context.publisher)) {
            logger.warn('Event publish unauthorized', { publisher: context.publisher, type });
            this._stats.failed++;
            return;
        }

        // v9.5.0: Throttle — max 1 event per type per org per 500ms
        const tKey = type + ':' + (data?.org_id || data?.orgId || 'g');
        const now = Date.now();
        if (this._throttleMap.has(tKey) && (now - this._throttleMap.get(tKey)) < 500) {
            return null; // Throttled
        }
        this._throttleMap.set(tKey, now);
        if (this._throttleMap.size > 2000) {
            const cutoff = now - 60000;
            for (const [k, t] of this._throttleMap) { if (t < cutoff) this._throttleMap.delete(k); }
        }
        if (CONFIG.enableValidation) {
            const { valid, errors } = validateEvent(type, data);
            if (!valid) {
                throw new Error(`Schema validation failed for '${type}': ${errors.join(', ')}`);
            }
        }

        const envelope = createEnvelope(type, data, context);
        this._stats.published++;
        this._emitter.emit(type, envelope);
        return envelope;
    }

    async subscribe(eventType, consumerGroup, handler) {
        this._emitter.on(eventType, (envelope) => {
            (async () => {
                let attempts = 0;
                while (attempts < CONFIG.maxRetries) {
                    try {
                        await handler(envelope);
                        this._stats.consumed++;
                        return;
                    } catch (err) {
                        attempts++;
                        if (attempts >= CONFIG.maxRetries) {
                            this._stats.failed++;
                            this._stats.dlq++;
                            try {
                                await dlq.push(consumerGroup, envelope, err, { attempts });
                            } catch (dlqErr) {
                                logger.error('DLQ push failed', { consumerGroup, error: dlqErr.message });
                            }
                        }
                    }
                }
            })().catch(err => {
                logger.error('Unhandled event subscriber error', { consumerGroup, error: err.message });
            });
        });
    }

    async stop() {
        this._emitter.removeAllListeners();
    }

    getStats() {
        return { backend: 'memory', ...this._stats };
    }
}

// ═══════════════════════════════════════════════════════════════
//  SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════
const USE_REDIS = !!process.env.REDIS_URL;
const eventBus = USE_REDIS ? new RedisEventBus() : new InMemoryEventBus();

logger.info('Event bus initialized', { backend: USE_REDIS ? 'redis-streams' : 'in-memory' });

module.exports = eventBus;

