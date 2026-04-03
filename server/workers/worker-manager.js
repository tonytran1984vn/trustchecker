/**
 * TrustChecker v9.2 — Worker Manager
 * ═══════════════════════════════════════════════════════════
 * Enterprise worker process management with:
 *   - Per-org rate limiting (token bucket)
 *   - Priority queue (enterprise > pro > core > free)
 *   - Concurrent job limits per worker
 *   - Job timeout with forced termination
 *   - Health monitoring and graceful shutdown
 *
 * Usage:
 *   const WorkerManager = require('./workers/worker-manager');
 *   const mgr = new WorkerManager();
 *   mgr.registerHandler('anomaly', async (job) => { ... });
 *   mgr.start();
 */

const EventEmitter = require('events');

// ─── Plan Priority Weights ──────────────────────────────────
const PLAN_PRIORITY = {
    enterprise: 100,
    pro: 60,
    core: 30,
    free: 10,
};

// ─── Token Bucket for Per-Org Throttling ─────────────────
class TokenBucket {
    /**
     * @param {number} capacity - max tokens (burst)
     * @param {number} refillRate - tokens added per second
     */
    constructor(capacity, refillRate) {
        this.capacity = capacity;
        this.tokens = capacity;
        this.refillRate = refillRate;
        this.lastRefill = Date.now();
    }

    consume(count = 1) {
        this._refill();
        if (this.tokens >= count) {
            this.tokens -= count;
            return true;
        }
        return false;
    }

    _refill() {
        const now = Date.now();
        const elapsed = (now - this.lastRefill) / 1000;
        this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillRate);
        this.lastRefill = now;
    }

    getStatus() {
        this._refill();
        return { tokens: Math.floor(this.tokens), capacity: this.capacity };
    }
}

// ─── Org Throttle Configuration ──────────────────────────
const ORG_LIMITS = {
    enterprise: { capacity: 100, refillRate: 20 }, // 100 burst, 20/sec sustained
    pro: { capacity: 50, refillRate: 10 },
    core: { capacity: 20, refillRate: 5 },
    free: { capacity: 5, refillRate: 1 },
};

class WorkerManager extends EventEmitter {
    constructor(opts = {}) {
        super();
        this.handlers = new Map();
        this.concurrency = opts.concurrency || 5;
        this.jobTimeout = opts.jobTimeoutMs || 60_000;
        this.running = false;
        this._activeJobs = 0;
        this._orgBuckets = new Map();

        // ─── Stats ───────────────────────────────────────
        this._stats = {
            processed: 0,
            succeeded: 0,
            failed: 0,
            throttled: 0,
            timedOut: 0,
            byQueue: {},
            byOrg: {},
        };
    }

    // ─── Handler Registration ────────────────────────────────
    registerHandler(queueName, handler, opts = {}) {
        this.handlers.set(queueName, {
            handler,
            concurrency: opts.concurrency || this.concurrency,
            timeout: opts.timeoutMs || this.jobTimeout,
        });

        this._stats.byQueue[queueName] = { processed: 0, succeeded: 0, failed: 0 };
    }

    // ─── Per-Org Throttle ─────────────────────────────────
    _getOrgBucket(orgId, plan) {
        const key = orgId || 'system';
        if (!this._orgBuckets.has(key)) {
            const limits = ORG_LIMITS[plan] || ORG_LIMITS.free;
            this._orgBuckets.set(key, new TokenBucket(limits.capacity, limits.refillRate));
        }
        return this._orgBuckets.get(key);
    }

    canProcess(job) {
        const orgId = job.data?.orgId || job.data?.context?.orgId;
        const plan = job.data?.orgPlan || job.data?.context?.orgPlan || 'core';
        const bucket = this._getOrgBucket(orgId, plan);
        return bucket.consume(1);
    }

    // ─── Priority Sorting ────────────────────────────────────
    /**
     * Sort jobs by plan priority (enterprise first) then by age (FIFO within same priority).
     */
    static sortByPriority(jobs) {
        return jobs.sort((a, b) => {
            const pA = PLAN_PRIORITY[a.data?.orgPlan || a.opts?.priority || 'core'] || 10;
            const pB = PLAN_PRIORITY[b.data?.orgPlan || b.opts?.priority || 'core'] || 10;
            if (pB !== pA) return pB - pA; // Higher priority first
            // Same priority → FIFO by creation time
            return (a.createdAt || 0) - (b.createdAt || 0);
        });
    }

    // ─── Job Execution ───────────────────────────────────────
    async processJob(job, queueName) {
        const config = this.handlers.get(queueName);
        if (!config) {
            console.warn(`[worker-manager] No handler for queue: ${queueName}`);
            return;
        }

        // Check per-org throttle
        if (!this.canProcess(job)) {
            this._stats.throttled++;
            this.emit('throttled', { job, queue: queueName });
            // Requeue with delay (handled by caller)
            return { throttled: true };
        }

        // Check concurrency
        if (this._activeJobs >= config.concurrency) {
            return { busy: true };
        }

        this._activeJobs++;
        this._stats.processed++;
        this._stats.byQueue[queueName] && this._stats.byQueue[queueName].processed++;

        const orgId = job.data?.orgId || 'system';
        this._stats.byOrg[orgId] = (this._stats.byOrg[orgId] || 0) + 1;

        const startTime = Date.now();

        try {
            // Execute with timeout
            const result = await Promise.race([
                config.handler(job),
                new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Job timeout')), config.timeout);
                }),
            ]);

            this._stats.succeeded++;
            this._stats.byQueue[queueName] && this._stats.byQueue[queueName].succeeded++;

            this.emit('completed', {
                job,
                queue: queueName,
                durationMs: Date.now() - startTime,
            });

            return { success: true, result };
        } catch (err) {
            if (err.message === 'Job timeout') {
                this._stats.timedOut++;
            }
            this._stats.failed++;
            this._stats.byQueue[queueName] && this._stats.byQueue[queueName].failed++;

            this.emit('failed', {
                job,
                queue: queueName,
                error: err.message,
                durationMs: Date.now() - startTime,
            });

            return { success: false, error: err.message };
        } finally {
            this._activeJobs = Math.max(0, this._activeJobs - 1);
        }
    }

    // ─── Lifecycle ───────────────────────────────────────────
    start() {
        this.running = true;
        console.info(`🔧 [worker-manager] Started (concurrency: ${this.concurrency}, timeout: ${this.jobTimeout}ms)`);
        this.emit('started');
    }

    async stop() {
        this.running = false;
        // Wait for active jobs to complete (max 30s)
        const deadline = Date.now() + 30_000;
        while (this._activeJobs > 0 && Date.now() < deadline) {
            await new Promise(r => setTimeout(r, 100));
        }
        if (this._activeJobs > 0) {
            console.warn(`[worker-manager] Force stop with ${this._activeJobs} active jobs`);
        }
        console.info('🔧 [worker-manager] Stopped');
        this.emit('stopped');
    }

    // ─── Health & Diagnostics ────────────────────────────────
    getHealth() {
        return {
            running: this.running,
            activeJobs: this._activeJobs,
            registeredQueues: Array.from(this.handlers.keys()),
            orgBuckets: this._getOrgBucketStatus(),
        };
    }

    getStats() {
        return { ...this._stats };
    }

    _getOrgBucketStatus() {
        const status = {};
        for (const [key, bucket] of this._orgBuckets.entries()) {
            status[key] = bucket.getStatus();
        }
        return status;
    }
}

module.exports = {
    WorkerManager,
    TokenBucket,
    PLAN_PRIORITY,
    ORG_LIMITS,
};
