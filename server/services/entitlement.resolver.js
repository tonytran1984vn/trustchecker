/**
 * Pure functions for resolving entitlements.
 * Zero side-effects, fully testable compatibility and deep merge logic.
 */

/**
 * Compatibility Layer: Normalizes "flat boolean" inputs into standard schema.
 * e.g., true => { enabled: true }
 * e.g., { limit: 100 } => { enabled: false, limit: 100 }
 */
function normalizeEntitlement(flag) {
    if (typeof flag === 'boolean') {
        return { enabled: flag };
    }
    if (typeof flag === 'object' && flag !== null) {
        return {
            enabled: !!flag.enabled,
            limit: typeof flag.limit === 'number' ? flag.limit : undefined,
            roles: Array.isArray(flag.roles) ? flag.roles : undefined,
            policy: ['hard', 'soft'].includes(flag.policy) ? flag.policy : undefined,
        };
    }
    // Default unmatched types to false
    return { enabled: false };
}

/**
 * Deep merges partial overrides honoring the true/false intent of overrides.
 * Final = OrgOverride ?? PlanDefault ?? SystemDefault
 */
function mergeEntitlement(feature, planDefault, orgOverride) {
    const pDef = planDefault ? normalizeEntitlement(planDefault) : { enabled: false };
    const oOver = orgOverride ? normalizeEntitlement(orgOverride) : undefined;

    // If no org override exists at all, fallback cleanly to plan
    if (!oOver) return pDef;

    // Deep merge: Org Override takes precedence over Plan Default
    return {
        enabled: oOver.enabled ?? pDef.enabled ?? false,
        limit: oOver.limit ?? pDef.limit,
        roles: oOver.roles ?? pDef.roles,
        policy: oOver.policy ?? pDef.policy,
    };
}

/**
 * Resolves a full entitlement map deeply merged for all features.
 * Final = OrgOverride ?? PlanDefault ?? SystemDefault
 */
function resolveAllEntitlements(systemFeatures, planFeatures, orgFeatures) {
    const result = {};

    // 1. Unpack Suites/Bundles from orgFeatures
    const expandedOrgFeatures = { ...orgFeatures };
    try {
        const { FEATURE_LIST } = require('../routes/billing');
        if (FEATURE_LIST) {
            for (const feat of FEATURE_LIST) {
                if (feat.isBundle && feat.includes && expandedOrgFeatures[feat.id]) {
                    const isEnabled = normalizeEntitlement(expandedOrgFeatures[feat.id]).enabled;
                    if (isEnabled) {
                        for (const childId of feat.includes) {
                            if (!expandedOrgFeatures[childId]) {
                                expandedOrgFeatures[childId] = true;
                            }
                        }
                    }
                }
            }
        }
    } catch (e) {
        // Fallback gracefully if billing not found
    }

    for (const [featureKey, sysDef] of Object.entries(systemFeatures)) {
        // System defaults mapped directly as base
        const pDef = planFeatures?.[featureKey] || { enabled: sysDef.default };
        const oOver = expandedOrgFeatures?.[featureKey];

        result[featureKey] = mergeEntitlement(featureKey, pDef, oOver);
    }

    return result;
}

module.exports = {
    normalizeEntitlement,
    mergeEntitlement,
    resolveAllEntitlements,
};
