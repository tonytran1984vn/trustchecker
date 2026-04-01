/**
 * SaaS Entitlement Engine V2
 * Orchestrator service to fetch, cache, and resolve entitlements.
 */

const db = require('../db');
const { cacheGet, cacheSet, cacheDelete } = require('../redis');
const { safeParse } = require('../utils/safe-json');
const { resolveAllEntitlements } = require('./entitlement.resolver');

const CACHE_TTL = 900; // 15 minutes

// 1. System Defaults (Static Blueprint)
const SYSTEM_FEATURES = {
    products: { default: true },
    qr: { default: true },
    dashboard: { default: true },
    fraud: { default: false },
    reports: { default: false },
    scm_tracking: { default: false },
    support: { default: false },
    inventory: { default: false },
    logistics: { default: false },
    partners: { default: false },
    ai_forecast: { default: false },
    demand_sensing: { default: false },
    risk_radar: { default: false },
    anomaly: { default: false },
    kyc: { default: false },
    compliance: { default: false },
    evidence: { default: false },
    sustainability: { default: false },
    leaks: { default: false },
    trust_graph: { default: false },
    what_if: { default: false },
    monte_carlo: { default: false },
    carbon: { default: false },
    digital_twin: { default: false },
    epcis: { default: false },
    blockchain: { default: false },
    nft: { default: false },
    branding: { default: false },
    wallet: { default: false },
    webhooks: { default: false },
    integrations: { default: false },
    white_label: { default: false },
};

// 2. Plan Entitlements (B2B SaaS Contract Packaging)
const PLAN_ENTITLEMENTS = {
    core: {
        qr: { enabled: true, limit: 1000 },
        products: { enabled: true },
        scm_tracking: { enabled: false }, // Explicitly disabled for reference
        carbon: { enabled: false },
    },
    pro: {
        qr: { enabled: true, limit: 25000 },
        products: { enabled: true },
        scm_tracking: { enabled: true },
        support: { enabled: true },
        partners: { enabled: true },
        carbon: { enabled: true },
        inventory: { enabled: true },
    },
    enterprise: {
        qr: { enabled: true, limit: -1 }, // Infinity
        products: { enabled: true },
        scm_tracking: { enabled: true },
        support: { enabled: true },
        partners: { enabled: true },
        carbon: { enabled: true },
        inventory: { enabled: true },
        risk_radar: { enabled: true },
        ai_forecast: { enabled: true },
        digital_twin: { enabled: true },
        blockchain: { enabled: true },
        kyc: { enabled: true },
        overclaim: { enabled: true },
        exec_dashboard: { enabled: true },
    },
};

class EntitlementService {
    /**
     * Get all entitlements deeply merged for an organization.
     */
    static async getOrgEntitlements(orgId, plan = null) {
        if (!orgId) return {};

        const cacheKey = `org:${orgId}:entitlements:v2`;

        try {
            const cached = await cacheGet(cacheKey);
            // Feature Rollback Safety: Match schema version
            if (cached && cached.version === 2 && cached.data) {
                return cached.data;
            }
        } catch (e) {
            console.warn('[Entitlement] Cache get failed:', e.message);
        }

        // Cold Start Cache Stampede Protection (In-Memory minimal debounce lock)
        if (!EntitlementService._locks) EntitlementService._locks = new Map();
        if (EntitlementService._locks.has(cacheKey)) {
            return await EntitlementService._locks.get(cacheKey);
        }

        const fetchPromise = (async () => {
            let orgPlan = plan || 'core';
            let orgFlags = {};

            try {
                const org = await db.get('SELECT plan, feature_flags FROM organizations WHERE id = $1', [orgId]);
                if (org) {
                    orgPlan = org.plan || orgPlan;
                    orgFlags = safeParse(org.feature_flags, {});
                }
            } catch (e) {
                console.error('[Entitlement] DB fetch failed:', e.message);
            }

            const planFeatures = PLAN_ENTITLEMENTS[orgPlan] || PLAN_ENTITLEMENTS['core'];
            const finalEntitlements = resolveAllEntitlements(SYSTEM_FEATURES, planFeatures, orgFlags);

            try {
                // Version-embedded cache wrapper
                await cacheSet(cacheKey, { version: 2, data: finalEntitlements }, CACHE_TTL);
            } catch (e) {
                console.warn('[Entitlement] Cache set failed:', e.message);
            }

            EntitlementService._locks.delete(cacheKey);
            return finalEntitlements;
        })();

        EntitlementService._locks.set(cacheKey, fetchPromise);
        return fetchPromise;
    }

    /**
     * Write-Through Cache implementation. Forces a refresh and writes to cache.
     */
    static async refreshCache(orgId) {
        try {
            // Delete lock so getOrgEntitlements forces a fresh DB read
            const cacheKey = `org:${orgId}:entitlements:v2`;
            if (EntitlementService._locks) EntitlementService._locks.delete(cacheKey);

            // Delete old cache to be safe, then call getOrgEntitlements which will fetch and set cache
            await cacheDelete(cacheKey);
            await EntitlementService.getOrgEntitlements(orgId);
        } catch (e) {
            console.warn('[Entitlement] Cache refresh failed:', e.message);
        }
    }
}

module.exports = { EntitlementService, SYSTEM_FEATURES, PLAN_ENTITLEMENTS };
