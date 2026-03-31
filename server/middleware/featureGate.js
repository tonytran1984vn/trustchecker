/**
 * Feature Gate Middleware — SaaS Entitlement & Quota Enforcement
 *
 * Controls access to modules based on the QuotaService.
 * Returns proper HTTP semantics matching standard SaaS patterns:
 * 403 - Feature disabled or role disconnected
 * 429 - Hard limit quota exceeded
 */

const { QuotaService } = require('../services/quota.service');
const { getRedisClient } = require('../redis');
const db = require('../db');

/**
 * Express middleware — gates access to a feature via Enitlement & Quota Services.
 *
 * Platform Admin bypasses all feature gates natively.
 *
 * @param {string} feature - Feature key mapped to System Features
 */
function requireFeature(feature) {
    return async (req, res, next) => {
        // Platform admin bypass
        if (req.user && req.user.role === 'admin' && req.user.user_type === 'platform') return next();

        const orgId = req.orgId || req.user?.org_id || req.user?.orgId;

        if (!orgId) {
            if (req.user && req.user.role === 'admin') return next();
            // Orphaned context logic
            return res.status(403).json({ error: 'Orphaned user without entitlement' });
        }

        try {
            // 0. Enforce Global SaaS Payment Integrity
            // Intercept before quota metrics if customer billing is locked explicitly via Webhook worker
            const orgData = await db.get('SELECT billing_status, grace_period_until FROM organizations WHERE id = $1', [
                orgId,
            ]);

            if (orgData && orgData.billing_status === 'PAST_DUE') {
                const gracePeriod = orgData.grace_period_until ? new Date(orgData.grace_period_until) : null;
                if (!gracePeriod || new Date() > gracePeriod) {
                    return res.status(402).json({
                        code: 'PAYMENT_REQUIRED',
                        message: 'Payment Past Due limit exceeded. Feature disabled.',
                    });
                }
            } else if (orgData && orgData.billing_status === 'CANCELED') {
                // Free features still pass naturally because entitlement cache downgrades to Free structure.
            }

            const context = {
                role: req.user?.role,
                plan: req.user?.plan, // Optional: passes known plan to avoid extra DB query if missed cache
            };

            const result = await QuotaService.check(orgId, feature, context);

            if (!result.allowed) {
                // Semantic HTTP Response Schema
                const responseData = {
                    allowed: false,
                    feature,
                    limit: result.limit || 0,
                    current: result.current || 0,
                    remaining: result.remaining || 0,
                    reason: result.reason,
                    reset_at: result.reset_at,
                };

                if (result.reason === 'QUOTA_EXCEEDED') {
                    const { RetentionService } = require('../services/retention.service');
                    const decision = await RetentionService.evaluateRetentionAction(
                        orgId,
                        feature,
                        result.limit,
                        result.current
                    );

                    if (decision.action === 'OFFER_DISCOUNT') {
                        res.setHeader('X-Quota-Fallback-Offer', decision.offerType);
                        return res.status(429).json({
                            ...responseData,
                            message:
                                'You have exceeded your usage limits. Special Offer: Upgrade to the next tier and enjoy 30% off for 3 months.',
                        });
                    }

                    if (decision.action === 'NUDGE_EXTRA_QUOTA') {
                        const redis = getRedisClient();
                        if (result.current === result.limit + 1) {
                            await redis.set(decision.emergencyKey, 'active', 'EX', 86400 * 30);
                        }
                        res.setHeader('X-Emergency-Quota', 'ACTIVE');
                        req.quotaContext = result;
                        return next();
                    }

                    // BLOCK Action
                    return res.status(429).json({
                        ...responseData,
                        message:
                            'You have exhausted both your standard and emergency usage limits for this cycle. Please upgrade your plan.',
                    });
                } else if (result.reason === 'UNAUTHORIZED_ROLE') {
                    return res.status(403).json({
                        ...responseData,
                        message: 'Your current role does not have permission to utilize this feature.',
                    });
                } else {
                    return res.status(403).json({
                        ...responseData,
                        message: 'This feature is currently disabled or not included in your active plan.',
                    });
                }
            }

            // Allowed Request -> Track possible soft-limit overages or usage asynchronously.
            // BEHAVIORAL UPSALE TRIGGER: Fire Overage Warning Headers early
            if (result.limit > 0) {
                const ratio = result.current / result.limit;
                if (ratio >= 0.8) {
                    // 80% Warning Limit
                    res.setHeader('X-Quota-Warning', `${Math.floor(ratio * 100)}%`);
                    res.setHeader('X-Quota-Limit', result.limit.toString());
                    res.setHeader('X-Quota-Remaining', result.remaining.toString());
                }
            }

            // If Soft cap is reached but still allowed:
            if (result.action === 'WARN') {
                try {
                    const redis = getRedisClient();
                    if (redis && result.limit > 0) {
                        // Calculate bucket purely based on percentage (e.g., 80, 90, 100)
                        const percentage = Math.floor((result.current / result.limit) * 10) * 10;
                        const warnKey = `warn:${orgId}:${feature}:${percentage}`;

                        // Rate limit: 1 log/email per 3600 seconds (1 hour) per bucket
                        const isNewWarn = await redis.setnx(warnKey, '1');
                        if (isNewWarn === 1) {
                            await redis.expire(warnKey, 3600);
                            console.warn(
                                `[QuotaWarning] Org ${orgId} has reached ${percentage}% soft limit for ${feature}. Notifying owners.`
                            );
                            // Future: await SQS.push({ type: 'EMAIL_OVERAGE', orgId, feature, percentage });
                        }
                    }
                } catch (rErr) {
                    console.error('[FeatureGate] Warning throttle check failed:', rErr.message);
                }
            }

            // Optional Output enrichment if the API endpoint wants to know its limits via response headers.
            res.setHeader('X-Entitlement-Source', 'QuotaEngine');
            res.setHeader('X-Quota-Remaining', result.remaining || Infinity);
            if (result.reset_at) res.setHeader('X-Quota-Reset', result.reset_at);

            return next();
        } catch (err) {
            console.error('[FeatureGate] Quota Check Error:', err.message);
            return res.status(500).json({ error: 'Internal Entitlement Error' });
        }
    };
}

module.exports = {
    requireFeature,
};
