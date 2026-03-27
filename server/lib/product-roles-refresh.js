/**
 * Product Roles Materialized View Refresh Utility
 * Refreshes `org_product_roles` concurrently for zero-downtime updates.
 */
const db = require('../db');

let refreshInProgress = false;
let lastRefresh = 0;
const MIN_INTERVAL_MS = 30_000; // Don't refresh more than once per 30s

async function refreshProductRoles() {
    if (refreshInProgress) return;
    if (Date.now() - lastRefresh < MIN_INTERVAL_MS) return;

    refreshInProgress = true;
    try {
        await db.run('REFRESH MATERIALIZED VIEW CONCURRENTLY org_product_roles');
        lastRefresh = Date.now();
        console.log('[product-roles] Materialized view refreshed at', new Date().toISOString());
    } catch (err) {
        // View might not exist yet — not fatal
        if (err.message.includes('does not exist')) {
            console.warn('[product-roles] Materialized view not found, skipping refresh');
        } else {
            console.error('[product-roles] Refresh error:', err.message);
        }
    } finally {
        refreshInProgress = false;
    }
}

module.exports = { refreshProductRoles };
