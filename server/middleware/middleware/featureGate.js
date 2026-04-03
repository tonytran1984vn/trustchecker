/**
 * Feature Gate Middleware — Plan-Based Access Control
 *
 * Controls access to modules based on the user's billing plan.
 * Plans: core → pro → enterprise (each includes all lower tiers).
 *
 * Usage:
 *   const { requireFeature } = require('../middleware/featureGate');
 *   router.get('/radar', requireFeature('risk_radar'), handler);
 */

// ─── Plan → Feature mapping ────────────────────────────────────────────────
const PLAN_HIERARCHY = ['core', 'pro', 'enterprise'];

const FEATURE_PLANS = {
    // Core tier
    products: 'core',
    qr: 'core',
    dashboard: 'core',
    fraud: 'core',
    reports: 'core',
    scm_tracking: 'core',
    inventory: 'core',
    support: 'core',
    partners: 'core',

    // Pro tier ($299/mo)
    ai_forecast: 'pro',
    demand_sensing: 'pro',
    risk_radar: 'pro',
    anomaly: 'pro',
    kyc: 'pro',
    compliance: 'pro',
    evidence: 'pro',
    sustainability: 'pro',
    leaks: 'pro',
    trust_graph: 'pro',
    what_if: 'pro',
    monte_carlo: 'pro',
    carbon: 'pro',
    digital_twin: 'pro',
    blockchain: 'pro',
    nft: 'pro',

    // Enterprise tier ($5,000/mo)
    epcis: 'enterprise',
    branding: 'enterprise',
    wallet: 'enterprise',
    webhooks: 'enterprise',
    integrations: 'enterprise',
    white_label: 'enterprise',
    overclaim: 'enterprise',
    erp_integration: 'enterprise',
    exec_dashboard: 'enterprise',
    lineage: 'enterprise',
    governance: 'enterprise',
    registry_export: 'enterprise',
    ivu_cert: 'enterprise',
};

/**
 * Get the minimum plan required for a feature.
 * @param {string} feature - Feature key
 * @returns {string} Plan name
 */
function getRequiredPlan(feature) {
    return FEATURE_PLANS[feature] || 'enterprise';
}

/**
 * Check if a user's plan includes access to a feature.
 * @param {string} userPlan - User's current plan name
 * @param {string} requiredPlan - Minimum required plan
 * @returns {boolean}
 */
function hasAccess(userPlan, requiredPlan) {
    const userLevel = PLAN_HIERARCHY.indexOf(userPlan || 'core');
    const requiredLevel = PLAN_HIERARCHY.indexOf(requiredPlan);
    return userLevel >= requiredLevel;
}

/**
 * Express middleware — gates access to a feature based on user plan.
 * If the user doesn't have access, returns 403 with upgrade info.
 *
 * Admin role bypasses all feature gates.
 *
 * @param {string} feature - Feature key from FEATURE_PLANS
 */
function requireFeature(feature) {
    return (req, res, next) => {
        // Admin always has full access
        if (req.user && req.user.role === 'admin') return next();

        const userPlan = req.user?.plan || 'core';
        const requiredPlan = getRequiredPlan(feature);

        if (hasAccess(userPlan, requiredPlan)) {
            return next();
        }

        res.status(403).json({
            error: 'Feature not available on your plan',
            feature,
            current_plan: userPlan,
            required_plan: requiredPlan,
            upgrade_url: '/billing',
            plans: {
                core: 'Free — QR traceability, product catalog, SCM, inventory, partners',
                pro: '$299/mo — Risk radar, carbon, AI analytics, blockchain, NFT, KYC',
                enterprise: '$5,000/mo — ERP integration, overclaim, governance, lineage, IVU cert',
            },
        });
    };
}

/**
 * Get all features available for a plan.
 * @param {string} plan - Plan name
 * @returns {string[]} Array of feature keys
 */
function getFeaturesForPlan(plan) {
    return Object.entries(FEATURE_PLANS)
        .filter(([, requiredPlan]) => hasAccess(plan, requiredPlan))
        .map(([feature]) => feature);
}

module.exports = {
    requireFeature,
    hasAccess,
    getRequiredPlan,
    getFeaturesForPlan,
    FEATURE_PLANS,
    PLAN_HIERARCHY,
};
