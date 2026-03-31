/**
 * SaaS Quota Service
 * Orchestrates Entitlements, Runtime Usage, and Quota Evaluation.
 */

const { getRedisClient } = require('../redis');
const { EntitlementService } = require('./entitlement.service');
const { evaluateQuota } = require('./quota.evaluator');
const { usageQueue } = require('../workers/usage.worker');

// Defines the billing cycle (e.g., YYYY-MM)
function getCurrentBillingCycle() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
}

class QuotaService {
    /**
     * The core check logic called by Middleware.
     * Request -> EntitlementService -> UsageService -> QuotaEvaluator -> Result
     *
     * @param {string} orgId
     * @param {string} feature
     * @param {Object} context context object (e.g., { role: 'admin' })
     * @returns {Object} { allowed, action, reason, exceeded, remaining }
     */
    static async check(orgId, feature, context = {}) {
        // 1. Get resolved entitlement (pure rights)
        const entitlements = await EntitlementService.getOrgEntitlements(orgId, context.plan);
        const entitlement = entitlements[feature];

        if (!entitlement) {
            return {
                allowed: false,
                action: 'BLOCK',
                reason: 'FEATURE_DISABLED',
                exceeded: false,
                remaining: 0,
                reset_at: this.getCycleResetTimestamp(),
            };
        }

        // 2. Get current runtime usage (Redis System of Record projection)
        let currentUsage = 0;

        // Only fetch usage from Redis if feature has a hard limit
        if (entitlement.limit !== undefined && entitlement.limit > 0) {
            const redis = getRedisClient();
            if (redis) {
                const cycle = getCurrentBillingCycle();
                const cacheKey = `usage:${orgId}:${feature}:${cycle}`;
                try {
                    const val = await redis.get(cacheKey);
                    currentUsage = val ? parseInt(val, 10) : 0;
                } catch (e) {
                    console.warn('[QuotaService] Failed to read Redis usage:', e.message);
                }
            }
        }

        // 3. Evaluate via pure engine
        const usageContext = { current: currentUsage, period: getCurrentBillingCycle() };
        const result = evaluateQuota({ entitlement, usage: usageContext, context });

        // Append billing reset timestamp for UX transparency
        result.reset_at = this.getCycleResetTimestamp();
        return result;
    }

    /**
     * Helper to compute the exact Date string when the current billing cycle ends.
     */
    static getCycleResetTimestamp() {
        const now = new Date();
        // End of the current month
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        return nextMonth.toISOString();
    }

    /**
     * Async usage tracking (fire-and-forget or background queue processor).
     * Option A (Pragmatic): Redis INCR with TTL expiration spanning the billing cycle + buffer.
     * Prevents Double-Counting using an Idempotency Key (eventId).
     *
     * @param {string} orgId
     * @param {string} feature
     * @param {string} eventId Unique identifier for this transaction/event
     * @param {number} increment
     */
    static async trackUsage(orgId, feature, eventId, increment = 1) {
        if (!orgId || !feature || !eventId) {
            console.warn('[QuotaService] trackUsage missing orgId, feature, or eventId');
            return;
        }

        // Async execution to prevent blocking HTTP req
        setImmediate(async () => {
            const redis = getRedisClient();
            if (!redis) return;

            const cycle = getCurrentBillingCycle();
            const idempotencyKey = `usage_event:${eventId}`;
            const cacheKey = `usage:${orgId}:${feature}:${cycle}`;

            try {
                // Check Idempotency First (Distributed System Write-Ahead Pattern)
                const isNewEvent = await redis.set(idempotencyKey, 'pending', 'NX', 'EX', 86400);
                if (!isNewEvent) {
                    const status = await redis.get(idempotencyKey);
                    console.log(`[QuotaService] Skipping usage event: ${eventId} (Status: ${status})`);
                    return; // Skip: Already processed or currently processing
                }

                const multi = redis.pipeline();
                multi.incrby(cacheKey, increment);
                // Set TTL to roughly 40 days (ensure cycle ends cleanly before expiration)
                multi.expire(cacheKey, 86400 * 40);

                // Append payload to message queue for async Ledger insertion
                const eventPayload = {
                    event_id: eventId,
                    org_id: orgId,
                    feature: feature,
                    amount: increment,
                    occurred_at: new Date().toISOString(), // Critical: The time the engine generated the trace
                    idempotency_key: eventId,
                    source: 'api',
                };

                await multi.exec();

                // Fire and forget to BullMQ Worker Queue (Retry + DLQ Safe)
                usageQueue
                    .add('usage_event', eventPayload, {
                        jobId: eventId, // BullMQ native idempotency safeguard
                        attempts: 5,
                        backoff: {
                            type: 'exponential',
                            delay: 1000,
                        },
                    })
                    .catch(err => console.error('[QuotaService] BullMQ Enqueue failed:', err.message));

                // Duplicate into Snowflake Pipeline
                const { AnalyticsService } = require('./analytics.service');
                AnalyticsService.publishEvent('USAGE_TRACKED', 1, orgId, {
                    feature: feature,
                    increment: increment,
                }).catch(err => console.error('[Analytics] Failed DW Push:', err.message));

                // Mark event as done safely so it won't be retried
                await redis.set(idempotencyKey, 'done', 'EX', 86400);
            } catch (e) {
                console.error('[QuotaService] Failed to track usage async:', e.message);
                // In a robust system, we would push to a dead-letter queue or delete the pending key
                await redis.del(idempotencyKey).catch(() => {});
            }
        });
    }
}

module.exports = { QuotaService };
