/**
 * TrustChecker v9.2 — Event Bus (Redis Streams + In-Memory Fallback)
 * ═══════════════════════════════════════════════════════════
 * Domain event publishing and consumption with:
 *   - Redis Streams (XADD/XREADGROUP) for production
 *   - In-memory EventEmitter fallback for dev/testing
 *   - At-least-once delivery via consumer groups + XACK
 *   - Schema validation before publish
 *   - Dead letter queue integration for failed processing
 *   - Per-tenant context propagation in event envelopes
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

const crypto = require('crypto');

// ─── Configuration ───────────────────────────────────────────
const CONFIG = {
    streamPrefix: 'events:',
    consumerGroupPrefix: 'cg:',
    maxRetries: 3,
    retryDelays: [1000, 5000, 15000], // exponential backoff ms
    batchSize: 10,
    blockMs: 2000,            // XREADGROUP block timeout
    maxStreamLength: 10000,   // MAXLEN ~ trim old entries
    enableValidation: true,
};

// ─── Event Envelope ──────────────────────────────────────────
function createEnvelope(type, data, context = {}) {
    return {
        id: `evt-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        type,
        version: getSchemaVersion(type),
        data,
        context: {
            orgId: context.orgId || null,
            userId: context.userId || null,
            tenantPlan: context.tenantPlan || null,
            traceId: context.traceId || null,
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
        this._running = false;
        this._stats = { published: 0, consumed: 0, failed: 0, dlq: 0 };
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

    // A-16: Publisher ACL — restrict who can publish certain events
    static PUBLISHER_ACL = {
        'FRAUD_DETECTED': ['fraud-engine', 'anomaly-engine', 'scan-guard'],
        'TRUST_SCORE_UPDATED': ['trust-engine'],
        'KILL_SWITCH_ACTIVATED': ['kill-switch-engine', 'platform-admin'],
        'SCAN_COMPLETED': ['qr-routes', 'mobile-scan'],
        'CONTAGION_DETECTED': ['contagion-engine'],
    };

    async publish(type, data, context = {}) {
        // A-16: Check publisher authorization
        const allowed = SafeEventBus.PUBLISHER_ACL[type];
        if (allowed && context.publisher && !allowed.includes(context.publisher)) {
            console.warn(`[EVENT-BUS] Unauthorized publish: ${context.publisher} → ${type}`);
            this._stats.failed++;
            return; // Silently reject
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
            console.error(`[event-bus] Publish failed for '${type}':`, err.message);
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
                    console.error(`[event-bus] Poller error for ${key}:`, err.message);
                }
            }

            // Schedule next poll
            if (this._running) {
                // Use blockMs as backoff when no messages, 100ms when actively processing
                const nextDelay = results ? 100 : CONFIG.blockMs;
                const timer = setTimeout(poll, nextDelay);
                this._pollers.set(key, timer);
            }
        };

        // Start immediately
        poll();
    }

    /**
     * Process a single message with retry + DLQ.
     */
    async _processMessage(client, streamKey, groupName, consumerGroup, msgId, fields, handler) {
        // Parse envelope from fields
        let envelope;
        try {
            const raw = fields[fields.indexOf('envelope') + 1];
            envelope = JSON.parse(raw);
        } catch {
            console.error(`[event-bus] Invalid message format: ${msgId}`);
            await client.xack(streamKey, groupName, msgId);
            return;
        }

        let attempts = 0;
        let lastError = null;

        while (attempts < CONFIG.maxRetries) {
            try {
                await handler(envelope);
                await client.xack(streamKey, groupName, msgId);
                this._stats.consumed++;
                return; // Success
            } catch (err) {
                attempts++;
                lastError = err;
                console.warn(`[event-bus] Attempt ${attempts}/${CONFIG.maxRetries} failed for ${envelope.type}: ${err.message}`);

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
        // ACK to prevent reprocessing
        await client.xack(streamKey, groupName, msgId);
    }

    async stop() {
        this._running = false;
        for (const timer of this._pollers.values()) {
            clearTimeout(timer);
        }
        this._pollers.clear();
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


    // A-16: Publisher ACL — restrict who can publish certain events
    static PUBLISHER_ACL = {
        'FRAUD_DETECTED': ['fraud-engine', 'anomaly-engine', 'scan-guard'],
        'TRUST_SCORE_UPDATED': ['trust-engine'],
        'KILL_SWITCH_ACTIVATED': ['kill-switch-engine', 'platform-admin'],
        'SCAN_COMPLETED': ['qr-routes', 'mobile-scan'],
        'CONTAGION_DETECTED': ['contagion-engine'],
    };

    async publish(type, data, context = {}) {
        // A-16: Check publisher authorization
        const allowed = SafeEventBus.PUBLISHER_ACL[type];
        if (allowed && context.publisher && !allowed.includes(context.publisher)) {
            console.warn(`[EVENT-BUS] Unauthorized publish: ${context.publisher} → ${type}`);
            this._stats.failed++;
            return; // Silently reject
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
            // Wrap in async IIFE with error handling to prevent unhandled rejections
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
                                console.error(`[event-bus] DLQ push failed for ${consumerGroup}:`, dlqErr.message);
                            }
                        }
                    }
                }
            })().catch(err => {
                console.error(`[event-bus] Unhandled error in subscriber ${consumerGroup}:`, err.message);
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

console.log(`📡 Event bus: ${USE_REDIS ? 'Redis Streams' : 'In-Memory'}`);

module.exports = eventBus;
