/**
 * Usage Reconciliation Cron / Script
 * Overwrites Redis Fast-path caches with accurate sum of Truth Ledger DB
 */

require('dotenv').config();
const db = require('../db');
const { getRedisClient } = require('../redis');

async function reconcileUsage() {
    console.log('🔄 Starting Nightly Usage Reconciliation...');
    await db._readyPromise;

    try {
        const redis = getRedisClient();
        if (!redis) {
            throw new Error('Redis not available for reconciliation');
        }

        // Aggregate current sum grouped by Org, Feature, Cycle
        // `cycle` translates to TO_CHAR(occurred_at, 'YYYY-MM') in PostgreSQL
        const sql = `
            SELECT org_id, feature, TO_CHAR(occurred_at, 'YYYY-MM') as cycle, SUM(amount) as total
            FROM usage_events
            GROUP BY org_id, feature, cycle
        `;

        const usageAggregates = await db.all(sql);
        console.log(`[Reconcile Usage] Found ${usageAggregates.length} composite counters from Truth DB.`);

        for (const row of usageAggregates) {
            const cacheKey = `usage:${row.org_id}:${row.feature}:${row.cycle}`;
            const truthTotal = row.total || 0;

            // Fetch current cache val to compare drift
            const cachedVal = await redis.get(cacheKey);
            const redisVal = cachedVal ? parseInt(cachedVal, 10) : 0;

            if (redisVal !== truthTotal) {
                console.log(`⚠️ Fixing Drift for ${cacheKey} -> Redis = ${redisVal}, Truth = ${truthTotal}`);
                await redis.set(cacheKey, truthTotal, 'EX', 86400 * 40);
            } else {
                // Perfectly synced!
            }

            // (Optional) Populate usage_aggregates_monthly table for Fast Dashboards
            // This can be done via UPSERT if Prisma/DB Schema allows it.
            await db.run(
                `
                 INSERT INTO usage_aggregates_monthly (org_id, feature, cycle, total)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (org_id, feature, cycle) 
                 DO UPDATE SET total = EXCLUDED.total
             `,
                [row.org_id, row.feature, row.cycle, truthTotal]
            );
        }

        console.log('✅ Reconciliation completed successfully.');
    } catch (e) {
        console.error('❌ Reconciliation failed:', e.message);
    }
}

// Ensure the module directly executes if called standalone:
if (require.main === module) {
    reconcileUsage().then(() => process.exit(0));
}

module.exports = { reconcileUsage };
