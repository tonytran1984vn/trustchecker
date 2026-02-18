/**
 * TrustChecker v9.2 — Enhanced Redis Job Queue
 * ═══════════════════════════════════════════════════════════
 * Background job processing with:
 *   - Priority queue (enterprise > pro > core > free)
 *   - Per-tenant throttling via WorkerManager
 *   - Retry with exponential backoff (3 attempts)
 *   - Dead letter queue integration
 *   - In-memory fallback when Redis unavailable
 *
 * Usage:
 *   const { addJob, QUEUES } = require('./queue');
 *   await addJob(QUEUES.BLOCKCHAIN, 'create-seal', { eventId, dataHash }, {
 *       priority: 'enterprise', tenantId: 'org-123', maxRetries: 3
 *   });
 */

const USE_REDIS = !!process.env.REDIS_URL;
let _dlqModule = null;
function _getDLQ() {
    if (!_dlqModule) {
        try { _dlqModule = require('./events/dead-letter'); } catch { _dlqModule = null; }
    }
    return _dlqModule;
}

// ═══════════════════════════════════════════════════════════════
// QUEUE NAMES
// ═══════════════════════════════════════════════════════════════
const QUEUES = {
    BLOCKCHAIN: 'blockchain',
    TRUST_SCORE: 'trust-score',
    EVIDENCE: 'evidence',
    REPORTS: 'reports',
    ANOMALY: 'anomaly',
    NOTIFICATIONS: 'notifications',
    AI_SIMULATION: 'ai-simulation',
    AI_DETECTION: 'ai-detection',
    AI_ANALYTICS: 'ai-analytics',
    SCM_EVENTS: 'scm-events',
    FRAUD_ANALYSIS: 'fraud-analysis',
};

// ═══════════════════════════════════════════════════════════════
// PRIORITY WEIGHTS
// ═══════════════════════════════════════════════════════════════
const PRIORITY = {
    critical: 100,
    enterprise: 80,
    pro: 60,
    core: 30,
    free: 10,
    default: 30,
};

// ═══════════════════════════════════════════════════════════════
// RETRY CONFIG
// ═══════════════════════════════════════════════════════════════
const DEFAULT_MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 15000]; // exponential backoff

// ═══════════════════════════════════════════════════════════════
// IN-MEMORY FALLBACK (when Redis unavailable)
// ═══════════════════════════════════════════════════════════════
class InMemoryQueue {
    constructor() {
        this.jobs = [];
        this.workers = new Map();
        this.stats = { added: 0, completed: 0, failed: 0, retried: 0, dlq: 0 };
    }

    async addJob(queueName, name, data, opts = {}) {
        const job = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            queue: queueName,
            name,
            data,
            opts,
            priority: PRIORITY[opts.priority] || PRIORITY.default,
            createdAt: Date.now(),
            attempts: 0,
            maxRetries: opts.maxRetries ?? DEFAULT_MAX_RETRIES,
            tenantId: opts.tenantId || data?.orgId || null,
            status: 'pending',
        };
        this.stats.added++;

        const handler = this.workers.get(queueName);
        if (handler) {
            await this._executeWithRetry(job, handler);
        } else {
            // Insert in priority order
            this._insertByPriority(job);
        }
        return job;
    }

    _insertByPriority(job) {
        // Cap pending jobs to prevent unbounded growth
        const MAX_PENDING = 10000;
        if (this.jobs.length >= MAX_PENDING) {
            console.warn(`[Queue] InMemory queue full (${MAX_PENDING}), dropping oldest low-priority job`);
            this.jobs.pop(); // Drop lowest priority (end of sorted array)
        }
        const idx = this.jobs.findIndex(j => j.priority < job.priority);
        if (idx === -1) this.jobs.push(job);
        else this.jobs.splice(idx, 0, job);
    }

    async _executeWithRetry(job, handler) {
        while (job.attempts < job.maxRetries) {
            try {
                job.attempts++;
                await handler(job);
                job.status = 'completed';
                this.stats.completed++;
                return;
            } catch (e) {
                if (job.attempts < job.maxRetries) {
                    this.stats.retried++;
                    const delay = RETRY_DELAYS[job.attempts - 1] || 15000;
                    await new Promise(r => setTimeout(r, Math.min(delay, 100))); // cap delay in memory mode
                }
            }
        }

        job.status = 'dead';
        this.stats.failed++;
        this.stats.dlq++;
        const dlq = _getDLQ();
        if (dlq) {
            try {
                await dlq.push(`queue:${job.queue}`, job, `Max retries exhausted`, { attempts: job.attempts, originalQueue: job.queue });
            } catch { /* DLQ unavailable */ }
        }
        console.error(`⚠️ Job ${job.queue}:${job.name} → DLQ after ${job.attempts} attempts`);
    }

    async registerWorker(queueName, handler) {
        this.workers.set(queueName, handler);
        // Process pending jobs sorted by priority — await each to avoid unhandled rejections
        const pending = this.jobs.filter(j => j.queue === queueName);
        this.jobs = this.jobs.filter(j => j.queue !== queueName);
        for (const job of pending) {
            await this._executeWithRetry(job, handler);
        }
    }

    getStats() {
        return { backend: 'memory', ...this.stats, pending: this.jobs.length };
    }
}

// ═══════════════════════════════════════════════════════════════
// REDIS BACKEND (Enhanced)
// ═══════════════════════════════════════════════════════════════
class RedisQueue {
    constructor() {
        this._redis = null;
        this.stats = { added: 0, completed: 0, failed: 0, retried: 0, dlq: 0 };
        this.workers = new Map();
    }

    _getClient() {
        if (!this._redis) {
            const { getRedisClient } = require('./redis');
            this._redis = getRedisClient();
        }
        return this._redis;
    }

    async addJob(queueName, name, data, opts = {}) {
        const client = this._getClient();
        const jobId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const job = {
            id: jobId,
            queue: queueName,
            name,
            data,
            opts,
            priority: PRIORITY[opts.priority] || PRIORITY.default,
            createdAt: Date.now(),
            attempts: 0,
            maxRetries: opts.maxRetries ?? DEFAULT_MAX_RETRIES,
            tenantId: opts.tenantId || data?.orgId || null,
            status: 'pending',
        };

        try {
            // Use sorted set for priority ordering
            await client.zadd(
                `pqueue:${queueName}`,
                job.priority,
                JSON.stringify(job)
            );
            await client.expire(`pqueue:${queueName}`, 86400);
            this.stats.added++;

            // Process immediately if worker registered
            const handler = this.workers.get(queueName);
            if (handler) {
                setImmediate(() => this._processNext(queueName, handler));
            }
        } catch (e) {
            console.error('Redis queue addJob error:', e.message);
            this.stats.failed++;
        }

        return job;
    }

    async _processNext(queueName, handler) {
        const client = this._getClient();
        try {
            // Pop highest priority job (ZPOPMAX)
            const result = await client.zpopmax(`pqueue:${queueName}`, 1);
            if (!result || result.length === 0) return;

            const job = JSON.parse(result[0]);
            await this._executeWithRetry(job, handler);
        } catch (e) {
            console.error(`Redis queue process error:`, e.message);
        }
    }

    async _executeWithRetry(job, handler) {
        while (job.attempts < job.maxRetries) {
            try {
                job.attempts++;
                await handler(job);
                job.status = 'completed';
                this.stats.completed++;
                return;
            } catch (e) {
                if (job.attempts < job.maxRetries) {
                    this.stats.retried++;
                    const delay = RETRY_DELAYS[job.attempts - 1] || 15000;
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }

        job.status = 'dead';
        this.stats.failed++;
        this.stats.dlq++;
        const dlq = _getDLQ();
        if (dlq) {
            try {
                await dlq.push(`queue:${job.queue}`, job, `Max retries exhausted`, { attempts: job.attempts, originalQueue: job.queue });
            } catch { /* DLQ unavailable */ }
        }
        console.error(`⚠️ Job ${job.queue}:${job.name} → DLQ after ${job.attempts} attempts`);
    }

    registerWorker(queueName, handler) {
        this.workers.set(queueName, handler);
    }

    getStats() {
        return { backend: 'redis', ...this.stats };
    }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT — Auto-select backend
// ═══════════════════════════════════════════════════════════════

const queue = USE_REDIS ? new RedisQueue() : new InMemoryQueue();
console.log(`📋 Queue backend: ${USE_REDIS ? 'Redis (priority)' : 'In-Memory (priority)'}`);

/**
 * Add a job to the named queue.
 * @param {string} queueName - One of QUEUES constants
 * @param {string} jobName - Descriptive job name
 * @param {object} data - Job payload
 * @param {object} opts - { priority, tenantId, maxRetries, delay }
 */
async function addJob(queueName, jobName, data, opts = {}) {
    return queue.addJob(queueName, jobName, data, opts);
}

/**
 * Register a worker to process jobs from a queue.
 * @param {string} queueName
 * @param {function} handler - async (job) => void
 */
function registerWorker(queueName, handler) {
    queue.registerWorker(queueName, handler);
}

module.exports = {
    QUEUES,
    PRIORITY,
    addJob,
    registerWorker,
    getQueueStats: () => queue.getStats(),
};
