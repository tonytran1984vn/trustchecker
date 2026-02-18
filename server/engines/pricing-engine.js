/**
 * TrustChecker Pricing Engine v2.0
 * Hybrid pricing: Core Subscription + Usage-Based Add-ons + Freemium
 *
 * 2026 Model: Subscription tiers with metered overages
 */

// ═══════════════════════════════════════════════════════════════════
// PLAN DEFINITIONS
// ═══════════════════════════════════════════════════════════════════

const PLANS = {
    free: {
        name: 'Free',
        slug: 'free',
        tagline: 'Get started with product verification',
        price_monthly: 0,
        price_annual: 0,
        limits: {
            scans: 500,
            api_calls: 1000,
            storage_mb: 100,
            nft_mints: 0,
            carbon_calcs: 0,
            products: 10,
            team_members: 1,
        },
        features: [
            'Basic QR verification',
            'Public trust check page',
            'Community forum support',
            'Standard dashboard',
        ],
        sla: null,
        support: 'community',
        overage_enabled: false,
        badge: null,
    },

    starter: {
        name: 'Starter',
        slug: 'starter',
        tagline: 'For growing brands building trust',
        price_monthly: 49,
        price_annual: 470, // ~20% savings
        limits: {
            scans: 5000,
            api_calls: 10000,
            storage_mb: 1024,
            nft_mints: 10,
            carbon_calcs: 100,
            products: 100,
            team_members: 3,
        },
        features: [
            'Everything in Free',
            'Fraud detection alerts',
            'Basic analytics dashboard',
            'Email support (48h SLA)',
            'API access + SDK',
            '10 NFT certificates/mo',
            '100 carbon calculations/mo',
        ],
        sla: '99%',
        support: 'email',
        overage_enabled: true,
        badge: null,
    },

    pro: {
        name: 'Pro',
        slug: 'pro',
        tagline: 'Advanced trust infrastructure for scale',
        price_monthly: 199,
        price_annual: 1910, // ~20% savings
        limits: {
            scans: 25000,
            api_calls: 100000,
            storage_mb: 10240,
            nft_mints: 100,
            carbon_calcs: 1000,
            products: 1000,
            team_members: 10,
        },
        features: [
            'Everything in Starter',
            'AI anomaly detection',
            'Risk radar & heatmaps',
            'Supply chain intelligence',
            'Carbon footprint tracking',
            'Priority support (24h SLA)',
            'Custom branding',
            'Webhook integrations',
        ],
        sla: '99.5%',
        support: 'priority',
        overage_enabled: true,
        badge: 'POPULAR',
    },

    business: {
        name: 'Business',
        slug: 'business',
        tagline: 'Full-stack trust for enterprise brands',
        price_monthly: 499,
        price_annual: 4790, // ~20% savings
        limits: {
            scans: 100000,
            api_calls: 500000,
            storage_mb: 51200,
            nft_mints: 500,
            carbon_calcs: 5000,
            products: -1, // unlimited
            team_members: 50,
        },
        features: [
            'Everything in Pro',
            'Digital twin simulation',
            'Monte Carlo risk analysis',
            'Demand sensing AI',
            'GRI sustainability reports',
            'Dedicated account manager',
            'SSO/SAML integration',
            '99.9% SLA guarantee',
        ],
        sla: '99.9%',
        support: 'dedicated',
        overage_enabled: true,
        badge: null,
    },

    enterprise: {
        name: 'Enterprise',
        slug: 'enterprise',
        tagline: 'Custom deployment with white-glove service',
        price_monthly: null, // Custom
        price_annual: null,
        limits: {
            scans: -1,
            api_calls: -1,
            storage_mb: -1,
            nft_mints: -1,
            carbon_calcs: -1,
            products: -1,
            team_members: -1,
        },
        features: [
            'Everything in Business',
            'On-premise deployment option',
            'Custom SLA (99.95%+)',
            'Dedicated Slack channel',
            'Quarterly business reviews',
            'Custom integrations',
            'Data residency options',
            'SOC 2 Type II compliance',
            'ISO/IEC 27001:2022 certified',
        ],
        sla: '99.95%',
        support: 'dedicated_slack',
        overage_enabled: false, // All unlimited
        badge: null,
    },
};

// ═══════════════════════════════════════════════════════════════════
// USAGE-BASED ADD-ON PRICING
// ═══════════════════════════════════════════════════════════════════

const USAGE_PRICING = {
    scans: {
        name: 'QR Scans',
        unit: 'scan',
        // Volume discount tiers (per scan)
        tiers: [
            { up_to: 1000, price: 0.05 },    // First 1K overage: $0.05/scan
            { up_to: 10000, price: 0.03 },   // 1K–10K: $0.03
            { up_to: 50000, price: 0.02 },   // 10K–50K: $0.02
            { up_to: Infinity, price: 0.01 }, // 50K+: $0.01
        ],
    },

    nft_mints: {
        name: 'NFT Certificate Mints',
        unit: 'mint',
        tiers: [
            { up_to: 50, price: 2.00 },      // Basic mint
            { up_to: 200, price: 1.50 },      // Volume
            { up_to: Infinity, price: 0.50 }, // High volume
        ],
    },

    carbon_calcs: {
        name: 'Carbon Calculations',
        unit: 'calculation',
        tiers: [
            { up_to: Infinity, price: 0.01 }, // $10/1000 = $0.01 each
        ],
        bundle: { size: 1000, price: 10.00 }, // Or buy in bundles
    },

    api_calls: {
        name: 'API Calls',
        unit: 'call',
        tiers: [
            { up_to: Infinity, price: 0.001 }, // $1/1000 calls
        ],
    },
};

// ═══════════════════════════════════════════════════════════════════
// PRICING CALCULATIONS
// ═══════════════════════════════════════════════════════════════════

/**
 * Calculate overage cost for a usage type using volume discount tiers.
 * @param {string} type - Usage type (scans, nft_mints, carbon_calcs, api_calls)
 * @param {number} overageCount - Number of units over the plan limit
 * @returns {{ cost: number, breakdown: Array }}
 */
function calculateOverageCost(type, overageCount) {
    if (overageCount <= 0) return { cost: 0, breakdown: [] };

    const pricing = USAGE_PRICING[type];
    if (!pricing) return { cost: 0, breakdown: [] };

    let remaining = overageCount;
    let totalCost = 0;
    const breakdown = [];
    let prevUp = 0;

    for (const tier of pricing.tiers) {
        const tierSize = tier.up_to === Infinity ? remaining : tier.up_to - prevUp;
        const units = Math.min(remaining, tierSize);

        if (units > 0) {
            const cost = Math.round(units * tier.price * 100) / 100;
            totalCost += cost;
            breakdown.push({
                range: `${prevUp + 1}–${prevUp + units}`,
                units,
                unit_price: tier.price,
                subtotal: cost,
            });
            remaining -= units;
        }

        prevUp = tier.up_to === Infinity ? prevUp + units : tier.up_to;
        if (remaining <= 0) break;
    }

    return {
        cost: Math.round(totalCost * 100) / 100,
        breakdown,
    };
}

/**
 * Estimate the full invoice for a billing period.
 * @param {string} planName - Current plan slug
 * @param {string} billingCycle - 'monthly' or 'annual'
 * @param {Object} usage - { scans, nft_mints, carbon_calcs, api_calls }
 * @returns {Object} Invoice estimate
 */
function estimateInvoice(planName, billingCycle, usage = {}) {
    const plan = PLANS[planName] || PLANS.free;
    const isAnnual = billingCycle === 'annual';

    const baseCost = isAnnual
        ? (plan.price_annual || 0)
        : (plan.price_monthly || 0);

    const overages = {};
    let totalOverage = 0;

    if (plan.overage_enabled) {
        for (const [type, limit] of Object.entries(plan.limits)) {
            if (USAGE_PRICING[type] && usage[type]) {
                const used = usage[type];
                const allowed = limit > 0 ? limit : Infinity;
                const overage = Math.max(0, used - allowed);

                if (overage > 0) {
                    const result = calculateOverageCost(type, overage);
                    overages[type] = {
                        included: allowed,
                        used,
                        overage,
                        ...result,
                    };
                    totalOverage += result.cost;
                }
            }
        }
    }

    const monthlyCost = isAnnual
        ? Math.round((baseCost / 12 + totalOverage) * 100) / 100
        : baseCost + totalOverage;

    return {
        plan: plan.name,
        billing_cycle: billingCycle,
        base_cost: baseCost,
        base_cost_monthly: isAnnual ? Math.round(baseCost / 12 * 100) / 100 : baseCost,
        overages,
        overage_total: Math.round(totalOverage * 100) / 100,
        total: Math.round((baseCost + totalOverage) * 100) / 100,
        monthly_equivalent: monthlyCost,
        savings: isAnnual && plan.price_monthly
            ? { amount: (plan.price_monthly * 12) - baseCost, percent: Math.round((1 - baseCost / (plan.price_monthly * 12)) * 100) }
            : null,
    };
}

/**
 * Compare plans for upgrade/downgrade decision.
 */
function comparePlans(fromPlan, toPlan) {
    const from = PLANS[fromPlan] || PLANS.free;
    const to = PLANS[toPlan];
    if (!to) return null;

    const order = ['free', 'starter', 'pro', 'business', 'enterprise'];
    const direction = order.indexOf(toPlan) > order.indexOf(fromPlan) ? 'upgrade' : 'downgrade';

    const limitChanges = {};
    for (const [key, toVal] of Object.entries(to.limits)) {
        const fromVal = from.limits[key] || 0;
        limitChanges[key] = {
            from: fromVal === -1 ? '∞' : fromVal,
            to: toVal === -1 ? '∞' : toVal,
            change: toVal === -1 ? '∞' : (fromVal === -1 ? '—' : toVal - fromVal),
        };
    }

    const newFeatures = to.features.filter(f => !from.features.includes(f));

    return {
        direction,
        from: { name: from.name, price: from.price_monthly },
        to: { name: to.name, price: to.price_monthly },
        price_diff: (to.price_monthly || 0) - (from.price_monthly || 0),
        limit_changes: limitChanges,
        new_features: newFeatures,
        sla_change: { from: from.sla, to: to.sla },
    };
}

/**
 * Generate enterprise quote based on estimated usage.
 */
function generateEnterpriseQuote(estimatedUsage, requirements = {}) {
    const base = PLANS.business.price_monthly;
    let multiplier = 1.5; // Enterprise premium

    // Adjust based on scale
    if (estimatedUsage.scans > 500000) multiplier += 0.5;
    if (estimatedUsage.scans > 1000000) multiplier += 1.0;
    if (requirements.on_premise) multiplier += 2.0;
    if (requirements.data_residency) multiplier += 0.5;
    if (requirements.custom_sla) multiplier += 0.3;
    if (requirements.dedicated_infrastructure) multiplier += 1.5;

    const estimated_monthly = Math.round(base * multiplier);
    const estimated_annual = Math.round(estimated_monthly * 12 * 0.85); // 15% annual discount

    return {
        plan: 'Enterprise (Custom)',
        estimated_monthly,
        estimated_annual,
        note: 'This is a preliminary estimate. Final pricing subject to review.',
        includes: [
            `${estimatedUsage.scans?.toLocaleString() || 'Unlimited'} scans/month`,
            'Unlimited API calls',
            'Unlimited storage',
            requirements.on_premise ? 'On-premise deployment' : 'Cloud deployment',
            requirements.custom_sla || '99.95% SLA',
            'Dedicated support + Slack channel',
            'SOC 2 compliance',
        ],
        next_steps: [
            'Schedule a call with our enterprise team',
            'Share your technical requirements',
            'Receive a formal proposal within 48 hours',
        ],
    };
}

/**
 * Get public pricing data (no sensitive info).
 */
function getPublicPricing() {
    const plans = {};
    for (const [slug, plan] of Object.entries(PLANS)) {
        plans[slug] = {
            name: plan.name,
            slug: plan.slug,
            tagline: plan.tagline,
            price_monthly: plan.price_monthly,
            price_annual: plan.price_annual,
            limits: plan.limits,
            features: plan.features,
            sla: plan.sla,
            badge: plan.badge,
        };
    }

    return {
        plans,
        usage_pricing: USAGE_PRICING,
        currency: 'USD',
        annual_discount_percent: 20,
        free_trial_days: 14,
    };
}

/**
 * Check if a usage type is within plan limits.
 * @returns {{ allowed: boolean, remaining: number, limit: number, used: number }}
 */
function checkLimit(planName, usageType, currentUsage) {
    const plan = PLANS[planName] || PLANS.free;
    const limit = plan.limits[usageType];

    if (limit === undefined) return { allowed: true, remaining: Infinity, limit: -1, used: currentUsage };
    if (limit === -1) return { allowed: true, remaining: Infinity, limit: -1, used: currentUsage };
    if (limit === 0) return { allowed: false, remaining: 0, limit: 0, used: currentUsage };

    const remaining = Math.max(0, limit - currentUsage);
    const allowed = plan.overage_enabled ? true : remaining > 0;

    return {
        allowed,
        remaining,
        limit,
        used: currentUsage,
        overage: Math.max(0, currentUsage - limit),
        overage_enabled: plan.overage_enabled,
        percent_used: Math.round((currentUsage / limit) * 100),
    };
}

module.exports = {
    PLANS,
    USAGE_PRICING,
    calculateOverageCost,
    estimateInvoice,
    comparePlans,
    generateEnterpriseQuote,
    getPublicPricing,
    checkLimit,
};
