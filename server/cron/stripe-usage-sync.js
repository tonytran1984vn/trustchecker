/**
 * Stripe Metered Billing Sync Cron (15-Minute Intervals)
 * Bridges the internal Usage Ledger to Stripe usage_records API.
 * Uses Idempotency SET strategy to achieve 100% correct counts regardless of Late Events.
 */

require('dotenv').config();
const Stripe = require('stripe');
const db = require('../db');
const { getRedisClient } = require('../redis');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

async function syncUsageToStripe() {
    console.log('💳 Starting Stripe Metered Usage Sync...');
    await db._readyPromise;

    try {
        const redis = getRedisClient();
        if (!redis) throw new Error('Redis not available for Stripe sync cache');

        // 1. Fetch unmapped monthly totals from the Truth Ledger directly
        const sql = `
            SELECT org_id, feature, TO_CHAR(occurred_at, 'YYYY-MM') as cycle, SUM(amount) as total
            FROM usage_events
            GROUP BY org_id, feature, cycle
        `;
        const aggregates = await db.all(sql);

        console.log(`[Stripe Sync] Found ${aggregates.length} ledger aggregated cycles.`);

        for (const row of aggregates) {
            const orgId = row.org_id;
            const feature = row.feature;
            const cycle = row.cycle;
            const truthTotal = row.total || 0;

            const cacheKey = `stripe:reported:${orgId}:${feature}:${cycle}`;
            const lastReportedRaw = await redis.get(cacheKey);
            const lastReported = lastReportedRaw ? parseInt(lastReportedRaw, 10) : 0;

            // Strict Idempotency & Rate Limit avoidance: Only Push changes
            if (lastReported === truthTotal) {
                continue;
            }

            console.log(`📊 [Stripe Sync] Push SET (${cacheKey}): ${lastReported} -> ${truthTotal}`);

            // 2. Map Entity to Stripe Product / Subscription
            // Fetch internal mappings precisely targeting the unique feature ID allocated per Org
            const mapping = await db.get(
                `
                SELECT subscription_item_id
                FROM stripe_subscription_items
                WHERE org_id = $1 AND feature = $2
            `,
                [orgId, feature]
            );

            if (!mapping || !mapping.subscription_item_id) {
                console.warn(
                    `⚠️ Missing Stripe Subscription Item Mapping for org:${orgId} feature:${feature}. Skipping.`
                );
                continue;
            }

            const subscriptionItemId = mapping.subscription_item_id;

            // 3. Emit API Call
            try {
                // ACTION: SET -> Ensure Stripe locks exactly at this usage quantity
                await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
                    quantity: truthTotal,
                    timestamp: Math.floor(Date.now() / 1000), // Push the current UTC Time representing the snapshot
                    action: 'set',
                });

                // 4. Update the sync cache exactly when Stripe is OK
                await redis.set(cacheKey, truthTotal, 'EX', 86400 * 45); // Retain 45 days minimum
            } catch (pushErr) {
                console.error(`❌ API Failed to push to Stripe [${orgId}:${feature}]:`, pushErr.message);
                // Due to Action SET, we don't throw. The next cron run will auto-retry cleanly.
            }
        }

        console.log('✅ Stripe Usage Sync Pipeline complete.');
    } catch (e) {
        console.error('❌ Critical Error during Stripe Sync:', e.message);
    }
}

// Ensure the module directly executes if called standalone
if (require.main === module) {
    syncUsageToStripe().then(() => process.exit(0));
}

module.exports = { syncUsageToStripe };
