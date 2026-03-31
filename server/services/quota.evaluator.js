/**
 * Pure Engine: Quota Evaluation
 * Determines if a request should be allowed based on entitlements and current usage.
 * Isolated from external states (DB, Cache) for 100% testability.
 */

/**
 * Validates usage context against defined entitlement.
 * Evaluates soft/hard policies to decide if an action is allowed.
 *
 * @param {Object} input
 * @param {Object} input.entitlement - The resolved entitlement object (e.g., { enabled: true, limit: 1000 })
 * @param {Object} input.usage - The current usage data (e.g., { current: 500, period: 'month' })
 * @param {Object} input.context - The execution context (e.g., { role: 'supplier_admin' })
 * @param {string} input.policy - Fallback policy if not defined on entitlement ('hard' | 'soft')
 *
 * @returns {Object} { allowed: boolean, action: 'ALLOW' | 'BLOCK' | 'WARN', reason: string | null, exceeded: boolean, remaining: number, current: number, limit: number }
 */
function evaluateQuota({ entitlement, usage, context = {}, policy = 'hard' }) {
    // 1. Feature is explicitly disabled via Role mapping or explicit boolean flag
    if (!entitlement || !entitlement.enabled) {
        return {
            allowed: false,
            action: 'BLOCK',
            reason: 'FEATURE_DISABLED',
            exceeded: false,
            remaining: 0,
            current: usage?.current || 0,
            limit: 0,
        };
    }

    // 1b. Validate Context Role if specified
    if (entitlement.roles && Array.isArray(entitlement.roles)) {
        if (!context.role || !entitlement.roles.includes(context.role)) {
            return {
                allowed: false,
                action: 'BLOCK',
                reason: 'UNAUTHORIZED_ROLE',
                exceeded: false,
                remaining: 0,
                current: usage?.current || 0,
                limit: entitlement.limit || 0,
            };
        }
    }

    // 2. No limits setup (Unmetered module)
    if (entitlement.limit === undefined || entitlement.limit === null || entitlement.limit === -1) {
        return {
            allowed: true,
            action: 'ALLOW',
            reason: null,
            exceeded: false,
            remaining: Infinity,
            current: usage?.current || 0,
            limit: -1,
        };
    }

    const currentUsage = usage?.current || 0;
    const finalPolicy = entitlement.policy || policy;
    const remaining = Math.max(0, entitlement.limit - currentUsage);

    // 3. User has exceeded quota limits
    if (currentUsage >= entitlement.limit) {
        // Enforce hard cap (HTTP 4xx/5xx rejection)
        if (finalPolicy === 'hard') {
            return {
                allowed: false,
                action: 'BLOCK',
                reason: 'QUOTA_EXCEEDED',
                exceeded: true,
                remaining: 0,
                current: currentUsage,
                limit: entitlement.limit,
            };
        }

        // Soft cap: allow request but send warning (Overages or triggers)
        return {
            allowed: true,
            action: 'WARN',
            reason: 'QUOTA_WARNING',
            exceeded: true,
            remaining: 0,
            current: currentUsage,
            limit: entitlement.limit,
        };
    }

    // 4. Safe within quota limits
    return {
        allowed: true,
        action: 'ALLOW',
        reason: null,
        exceeded: false,
        remaining,
        current: currentUsage,
        limit: entitlement.limit,
    };
}

module.exports = {
    evaluateQuota,
};
