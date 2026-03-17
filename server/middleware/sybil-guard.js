/**
 * Sybil Detection Guard v1.0 (ATK-12)
 * Detects and mitigates Sybil attacks on supplier ratings.
 * Weights ratings by org age, scan volume, and plan tier.
 */
const db = require('../db');

// Cache org quality scores (refresh every 5 min)
let orgQualityCache = new Map();
let lastCacheRefresh = 0;

async function refreshOrgQuality() {
    if (Date.now() - lastCacheRefresh < 300000) return;
    try {
        const orgs = await db.all(`
            SELECT o.id, o.created_at, o.plan,
                   (SELECT COUNT(*) FROM products WHERE org_id = o.id) as product_count,
                   (SELECT COUNT(*) FROM scan_events se 
                    JOIN products p ON se.product_id = p.id WHERE p.org_id = o.id) as scan_count
            FROM organizations o
        `);
        orgQualityCache = new Map();
        for (const org of orgs) {
            const agedays = (Date.now() - new Date(org.created_at)) / 86400000;
            const ageFactor = Math.min(agedays / 90, 1.0);    // Max after 90 days
            const activityFactor = Math.min((org.product_count + org.scan_count) / 100, 1.0);
            const planFactor = org.plan === 'enterprise' ? 1.0 : org.plan === 'pro' ? 0.8 : 0.3;
            orgQualityCache.set(org.id, {
                weight: Math.round((ageFactor * 0.3 + activityFactor * 0.4 + planFactor * 0.3) * 100) / 100,
                agedays: Math.round(agedays),
                products: org.product_count,
                scans: org.scan_count,
            });
        }
        lastCacheRefresh = Date.now();
    } catch(e) { /* non-critical */ }
}

// Get weighted rating for use in network intelligence
async function getWeightedRating(orgId, rawScore) {
    await refreshOrgQuality();
    const quality = orgQualityCache.get(orgId) || { weight: 0.1 };
    return {
        weighted_score: Math.round(rawScore * quality.weight * 100) / 100,
        weight: quality.weight,
        quality,
    };
}

module.exports = { getWeightedRating, refreshOrgQuality };
