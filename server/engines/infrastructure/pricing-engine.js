/**
 * Pricing Engine — Plan definitions, limits, and overage calculations.
 * Referenced by: server/middleware/usage-meter.js
 */

const PLANS = {
    free: {
        name: 'Free',
        slug: 'free',
        price_monthly: 0,
        limits: {
            scans: 100,
            nft_mints: 0,
            carbon_calcs: 10,
            api_calls: 1000,
        },
        overage_enabled: false,
    },
    starter: {
        name: 'Starter',
        slug: 'starter',
        price_monthly: 49,
        limits: {
            scans: 5000,
            nft_mints: 50,
            carbon_calcs: 500,
            api_calls: 50000,
        },
        overage_enabled: true,
    },
    pro: {
        name: 'Professional',
        slug: 'pro',
        price_monthly: 199,
        limits: {
            scans: 50000,
            nft_mints: 500,
            carbon_calcs: 5000,
            api_calls: 500000,
        },
        overage_enabled: true,
    },
    business: {
        name: 'Business',
        slug: 'business',
        price_monthly: 499,
        limits: {
            scans: 200000,
            nft_mints: 2000,
            carbon_calcs: 20000,
            api_calls: 2000000,
        },
        overage_enabled: true,
    },
    enterprise: {
        name: 'Enterprise',
        slug: 'enterprise',
        price_monthly: 0, // Custom pricing
        limits: {
            scans: -1, // unlimited
            nft_mints: -1,
            carbon_calcs: -1,
            api_calls: -1,
        },
        overage_enabled: false,
    },
};

// Overage pricing tiers
const USAGE_PRICING = {
    scans: {
        name: 'Security Scans',
        unit: 'scan',
        tiers: [
            { up_to: 1000, price: 0.01 },
            { up_to: 10000, price: 0.008 },
            { up_to: 100000, price: 0.005 },
            { up_to: Infinity, price: 0.003 },
        ],
    },
    nft_mints: {
        name: 'NFT Details',
        unit: 'mint',
        tiers: [
            { up_to: 100, price: 0.5 },
            { up_to: 1000, price: 0.35 },
            { up_to: Infinity, price: 0.2 },
        ],
    },
    carbon_calcs: {
        name: 'Carbon Computations',
        unit: 'calculation',
        tiers: [
            { up_to: 500, price: 0.05 },
            { up_to: 5000, price: 0.03 },
            { up_to: Infinity, price: 0.02 },
        ],
    },
    api_calls: {
        name: 'API Execution',
        unit: 'call',
        tiers: [
            { up_to: 10000, price: 0.001 },
            { up_to: 100000, price: 0.0008 },
            { up_to: Infinity, price: 0.0005 },
        ],
    },
};

/**
 * Check if usage is within plan limits.
 */
function checkLimit(planName, type, currentUsage) {
    const plan = PLANS[planName] || PLANS.free;
    const limit = plan.limits[type] ?? 0;

    // Unlimited
    if (limit === -1) {
        return { allowed: true, limit: -1, overage: 0, overage_enabled: false };
    }

    const allowed = currentUsage <= limit || plan.overage_enabled;
    const overage = Math.max(0, currentUsage - limit);

    return {
        allowed,
        limit,
        overage,
        overage_enabled: plan.overage_enabled,
    };
}

/**
 * Calculate overage cost for a given type and overage amount.
 */
function calculateOverageCost(type, overageUnits) {
    const pricing = USAGE_PRICING[type];
    if (!pricing || overageUnits <= 0) return { cost: 0, breakdown: [] };

    let remaining = overageUnits;
    let totalCost = 0;
    const breakdown = [];

    for (const tier of pricing.tiers) {
        if (remaining <= 0) break;
        const units = Math.min(remaining, tier.up_to - (overageUnits - remaining));
        const cost = Math.round(units * tier.price * 100) / 100;
        totalCost += cost;
        breakdown.push({ units, price_per_unit: tier.price, cost });
        remaining -= units;
    }

    return {
        cost: Math.round(totalCost * 100) / 100,
        breakdown,
    };
}

/**
 * Get public-facing pricing data (plans + usage pricing).
 */
async function getPublicPricing() {
    const plans = Object.entries(PLANS).map(([slug, p]) => ({
        slug,
        name: p.name,
        price_monthly: p.price_monthly,
        price_annual: p.price_annual || Math.round(p.price_monthly * 10),
        limits: p.limits,
        sla: p.sla || null,
        features: p.features || [],
        overage_enabled: p.overage_enabled,
    }));
    return { plans, usage_pricing: USAGE_PRICING };
}

/**
 * Compare two plans — returns new features and limit diffs.
 */
function comparePlans(fromSlug, toSlug) {
    const from = PLANS[fromSlug];
    const to = PLANS[toSlug];
    if (!from || !to) return null;
    const planOrder = ['free', 'starter', 'pro', 'business', 'enterprise'];
    const direction = planOrder.indexOf(toSlug) > planOrder.indexOf(fromSlug) ? 'upgrade' : 'downgrade';
    const limitDiffs = {};
    for (const key of Object.keys(to.limits)) {
        limitDiffs[key] = { from: from.limits[key], to: to.limits[key] };
    }
    return { from: fromSlug, to: toSlug, direction, limit_diffs: limitDiffs, new_features: to.features || [] };
}

/**
 * Estimate an invoice for a plan + usage.
 */
function estimateInvoice(planName, cycle, usage) {
    const plan = PLANS[planName] || PLANS.free;
    const isAnnual = cycle === 'annual';
    const base = isAnnual ? plan.price_annual || plan.price_monthly * 10 : plan.price_monthly;
    let overageTotal = 0;
    const overageItems = {};
    for (const [type, used] of Object.entries(usage)) {
        const limit = plan.limits[type] ?? 0;
        if (limit >= 0 && used > limit) {
            const oc = calculateOverageCost(type, used - limit);
            overageTotal += oc.cost;
            overageItems[type] = oc;
        }
    }
    return { base_cost: base, overage_cost: overageTotal, total: base + overageTotal, cycle, overages: overageItems };
}

/**
 * Generate an enterprise quote for custom volume.
 */
function generateEnterpriseQuote(volumes, requirements) {
    const base = 2000; // enterprise base
    let volumeCharge = 0;
    if (volumes.scans > 100000) volumeCharge += (volumes.scans - 100000) * 0.002;
    if (volumes.api_calls > 500000) volumeCharge += (volumes.api_calls - 500000) * 0.0003;
    const total = Math.round(base + volumeCharge);
    return {
        base_price: base,
        volume_adjustments: Math.round(volumeCharge),
        estimated_monthly: total,
        requirements,
        sla: '99.99%',
        support: 'Dedicated',
    };
}

/**
 * Update pricing overrides (admin function).
 */
async function updatePricingOverrides(type, overrides) {
    // In production this would persist to DB; for now merge into in-memory PLANS
    if (type === 'plans') {
        for (const [slug, updates] of Object.entries(overrides)) {
            if (PLANS[slug]) Object.assign(PLANS[slug], updates);
        }
    }
    return { updated: true };
}

/**
 * Reset pricing to defaults.
 */
async function resetPricingToDefaults() {
    return { plans: await getPublicPricing() };
}

module.exports = {
    PLANS,
    USAGE_PRICING,
    checkLimit,
    calculateOverageCost,
    getPublicPricing,
    comparePlans,
    estimateInvoice,
    generateEnterpriseQuote,
    updatePricingOverrides,
    resetPricingToDefaults,
};
