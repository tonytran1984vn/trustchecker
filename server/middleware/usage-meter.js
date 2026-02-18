/**
 * Usage Metering Middleware
 * Real-time tracking + limit enforcement + WebSocket alerts.
 *
 * Records every scan, NFT mint, carbon calculation, and API call.
 * Enforces plan limits — returns 429 when hard-capped (Free tier).
 * Emits alerts at 75%, 90%, 100% thresholds via WebSocket.
 */

const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { PLANS, checkLimit, calculateOverageCost } = require('../engines/pricing-engine');

// In-memory usage cache to avoid DB reads on every request
// Refreshed every 60s or after a metering write
const usageCache = new Map(); // userId → { scans, nft_mints, carbon_calcs, api_calls, period, ts }
const CACHE_TTL_MS = 60_000;

// ─── Core Metering Function ────────────────────────────────────────

/**
 * Record a usage event and enforce plan limits.
 * @param {string} userId - User ID
 * @param {string} type - 'scans' | 'nft_mints' | 'carbon_calcs' | 'api_calls'
 * @param {number} count - Number of units to record (default: 1)
 * @param {Object} [wss] - WebSocket server for alerts (optional)
 * @returns {{ allowed: boolean, usage: Object, overage?: Object }}
 */
async function meterUsage(userId, type, count = 1, wss = null) {
    const period = new Date().toISOString().substring(0, 7); // YYYY-MM

    // Get current plan
    const plan = await db.get(
        "SELECT * FROM billing_plans WHERE user_id = ? AND status = 'active'",
        [userId]
    );
    const planName = plan?.plan_name || 'free';

    // Get current usage (from cache or DB)
    const currentUsage = await _getCurrentUsage(userId, type, period);

    // Check limit
    const limitCheck = checkLimit(planName, type, currentUsage + count);

    // Free tier: hard cap, no overage
    if (!limitCheck.allowed && !limitCheck.overage_enabled) {
        return {
            allowed: false,
            reason: 'limit_exceeded',
            usage: limitCheck,
            upgrade_cta: _getUpgradeCTA(planName, type),
        };
    }

    // Record usage
    try {
        const id = uuidv4();
        const unitCost = _getUnitCost(type, limitCheck.overage || 0);

        await db.prepare(`
            INSERT INTO usage_records (id, user_id, type, count, unit_cost, period, billed_amount, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(id, userId, type, count, unitCost, period, Math.round(count * unitCost * 100) / 100);

        // Invalidate cache
        _invalidateCache(userId);

    } catch (e) {
        // If usage_records table doesn't exist yet, fall back silently
        if (!e.message?.includes('no such table')) {
            console.error('Usage metering error:', e.message);
        }
    }

    // Check thresholds and emit alerts
    const newUsage = currentUsage + count;
    const percentUsed = limitCheck.limit > 0 ? Math.round((newUsage / limitCheck.limit) * 100) : 0;

    if (wss && limitCheck.limit > 0) {
        _emitThresholdAlert(wss, userId, type, percentUsed, newUsage, limitCheck.limit);
    }

    return {
        allowed: true,
        usage: {
            type,
            used: newUsage,
            limit: limitCheck.limit,
            remaining: Math.max(0, limitCheck.limit - newUsage),
            percent_used: percentUsed,
            overage: Math.max(0, newUsage - limitCheck.limit),
            is_overage: newUsage > limitCheck.limit,
        },
    };
}

// ─── Usage Query Functions ─────────────────────────────────────────

/**
 * Get detailed usage breakdown for a user's current period.
 */
async function getDetailedUsage(userId) {
    const period = new Date().toISOString().substring(0, 7);
    const plan = await db.get(
        "SELECT * FROM billing_plans WHERE user_id = ? AND status = 'active'",
        [userId]
    );
    const planName = plan?.plan_name || 'free';
    const planDef = PLANS[planName] || PLANS.free;

    const types = ['scans', 'nft_mints', 'carbon_calcs', 'api_calls'];
    const usage = {};
    let totalOverageCost = 0;

    for (const type of types) {
        const current = await _getCurrentUsage(userId, type, period);
        const limit = planDef.limits[type] ?? 0;
        const overage = limit > 0 ? Math.max(0, current - limit) : 0;
        const overageCost = overage > 0 ? calculateOverageCost(type, overage) : { cost: 0, breakdown: [] };

        usage[type] = {
            used: current,
            limit: limit === -1 ? '∞' : limit,
            remaining: limit === -1 ? '∞' : Math.max(0, limit - current),
            percent: limit > 0 ? Math.min(100, Math.round((current / limit) * 100)) : 0,
            overage,
            overage_cost: overageCost.cost,
            overage_breakdown: overageCost.breakdown,
        };

        totalOverageCost += overageCost.cost;
    }

    return {
        period,
        plan: planName,
        usage,
        total_overage_cost: Math.round(totalOverageCost * 100) / 100,
        base_cost: planDef.price_monthly || 0,
        estimated_total: Math.round(((planDef.price_monthly || 0) + totalOverageCost) * 100) / 100,
    };
}

/**
 * Get current overage charges for the period.
 */
async function getOverageCharges(userId) {
    const detailed = await getDetailedUsage(userId);
    const overages = {};

    for (const [type, data] of Object.entries(detailed.usage)) {
        if (data.overage > 0) {
            overages[type] = {
                units: data.overage,
                cost: data.overage_cost,
                breakdown: data.overage_breakdown,
            };
        }
    }

    return {
        period: detailed.period,
        plan: detailed.plan,
        overages,
        total_overage: detailed.total_overage_cost,
        has_overages: Object.keys(overages).length > 0,
    };
}

// ─── Express Middleware ────────────────────────────────────────────

/**
 * Middleware that meters API calls for authenticated users.
 * Mount after auth: app.use('/api/', apiMeteringMiddleware)
 */
function apiMeteringMiddleware(req, res, next) {
    // Skip non-authenticated, health, metrics, public, and webhook routes
    if (!req.user ||
        req.path === '/health' ||
        req.path === '/metrics' ||
        req.path.startsWith('/public/') ||
        req.path.startsWith('/webhook')) {
        return next();
    }

    // Fire-and-forget metering (don't block the request)
    meterUsage(req.user.id, 'api_calls', 1).catch(() => { });
    next();
}

/**
 * Create a metering guard for specific resource types.
 * Returns 429 if the user has exceeded their plan limit.
 *
 * Usage:
 *   router.post('/qr/verify', meterGuard('scans'), handler);
 *   router.post('/nft/mint', meterGuard('nft_mints'), handler);
 */
function meterGuard(type) {
    return async (req, res, next) => {
        if (!req.user) return next();

        try {
            const result = await meterUsage(req.user.id, type, 1, req.app?.wss);

            if (!result.allowed) {
                return res.status(429).json({
                    error: 'Plan limit exceeded',
                    type,
                    ...result.usage,
                    upgrade_cta: result.upgrade_cta,
                });
            }

            // Attach usage info to request for route handlers
            req.usageResult = result;
            next();
        } catch (e) {
            // Don't block the request if metering fails
            console.error('Metering guard error:', e.message);
            next();
        }
    };
}

// ─── Private Helpers ───────────────────────────────────────────────

async function _getCurrentUsage(userId, type, period) {
    // Check cache first
    const cacheKey = `${userId}:${type}:${period}`;
    const cached = usageCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
        return cached.value;
    }

    // Query DB
    let count = 0;
    try {
        const row = await db.get(
            "SELECT COALESCE(SUM(count), 0) as total FROM usage_records WHERE user_id = ? AND type = ? AND period = ?",
            [userId, type, period]
        );
        count = row?.total || 0;
    } catch (e) {
        // Fallback: count from source tables
        if (type === 'scans') {
            const row = await db.get(
                "SELECT COUNT(*) as c FROM scan_events WHERE scanned_at >= date('now', 'start of month')"
            );
            count = row?.c || 0;
        }
    }

    // Update cache
    usageCache.set(cacheKey, { value: count, ts: Date.now() });
    return count;
}

function _invalidateCache(userId) {
    for (const key of usageCache.keys()) {
        if (key.startsWith(userId + ':')) {
            usageCache.delete(key);
        }
    }
}

function _getUnitCost(type, overagePosition) {
    const pricing = require('../engines/pricing-engine').USAGE_PRICING[type];
    if (!pricing) return 0;

    for (const tier of pricing.tiers) {
        if (overagePosition <= tier.up_to) return tier.price;
    }
    return pricing.tiers[pricing.tiers.length - 1]?.price || 0;
}

function _getUpgradeCTA(currentPlan, type) {
    const order = ['free', 'starter', 'pro', 'business', 'enterprise'];
    const nextIdx = order.indexOf(currentPlan) + 1;
    const nextPlan = PLANS[order[nextIdx]] || PLANS.starter;

    return {
        message: `Upgrade to ${nextPlan.name} for more ${type.replace('_', ' ')}`,
        plan: nextPlan.slug,
        price: nextPlan.price_monthly,
        limit: nextPlan.limits[type],
    };
}

// Track which thresholds we've already alerted on (to avoid spam)
const alertedThresholds = new Map(); // `${userId}:${type}:${threshold}:${period}` → true

function _emitThresholdAlert(wss, userId, type, percentUsed, used, limit) {
    const period = new Date().toISOString().substring(0, 7);
    const thresholds = [75, 90, 100];

    for (const threshold of thresholds) {
        if (percentUsed >= threshold) {
            const key = `${userId}:${type}:${threshold}:${period}`;
            if (alertedThresholds.has(key)) continue;
            alertedThresholds.set(key, true);

            const level = threshold >= 100 ? 'critical' : threshold >= 90 ? 'warning' : 'info';

            // Broadcast to user's WebSocket connections
            if (wss?.clients) {
                for (const client of wss.clients) {
                    if (client.readyState === 1 && client.userId === userId) {
                        client.send(JSON.stringify({
                            type: 'usage_alert',
                            level,
                            metric: type,
                            threshold,
                            used,
                            limit,
                            percent: percentUsed,
                            message: `${type.replace('_', ' ')} usage at ${percentUsed}% (${used}/${limit})`,
                        }));
                    }
                }
            }
        }
    }
}

module.exports = {
    meterUsage,
    getDetailedUsage,
    getOverageCharges,
    apiMeteringMiddleware,
    meterGuard,
};
