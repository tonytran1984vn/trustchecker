/**
 * DW Reconciliator: Nightly Causal Bandit Sync (Phase 14).
 * Sweeps Truth Data Warehouse recalculating precise Delayed IPS Revenues to wash out RAM-drift events.
 */

const db = require('../db');
const { getRedisClient } = require('../services/redis');

const EXPERIMENT_KEY = 'UPSELL_NUDGING_V1';

async function runDWReconciliationSync() {
    console.log('🔄 [DW Reconciliator] Aligning Real-time Causal States with Base Truth Warehouse...');
    await db._readyPromise;
    const redis = getRedisClient();
    if (!redis) return console.log('🚨 Redis Unavailable! Skipping Daily Causal Recon.');

    try {
        // Fetch ALL Exposures with Propensity Scores
        const exposures = await db.all(
            `
            SELECT 
                org_id, 
                json_extract(payload, '$.cohort') as cohort,
                COALESCE(context_key, 'GLOBAL') as ctx,
                CAST(json_extract(payload, '$.propensity_score') AS FLOAT) as ps,
                occurred_at as exp_date
            FROM dw_raw_events
            WHERE event_type = 'EXPERIMENT_EXPOSED'
              AND json_extract(payload, '$.experiment_key') = $1
            ORDER BY occurred_at ASC
        `,
            [EXPERIMENT_KEY]
        );

        // Fetch ALL Revenues per Org
        const revenues = await db.all(`
            SELECT org_id, amount, occurred_at as rev_date
            FROM dw_raw_events
            WHERE event_type = 'INVOICE_PAID'
            ORDER BY occurred_at ASC
        `);

        // Index Invoices by org_id
        const revByOrg = {};
        for (const r of revenues) {
            if (!revByOrg[r.org_id]) revByOrg[r.org_id] = [];
            revByOrg[r.org_id].push({ amount: parseFloat(r.amount), date: new Date(r.rev_date).getTime() });
        }

        // Master State
        const reconciledState = {};

        // 1. O(N) Matcher: Find Nearest Exposure Before Revenue
        for (const exp of exposures) {
            const ctx = exp.ctx;
            const cohort = exp.cohort;
            const ps = parseFloat(exp.ps || 0.5);
            const expTs = new Date(exp.exp_date).getTime();

            const key = `${ctx}:${cohort}`;
            if (!reconciledState[key]) reconciledState[key] = { count: 0, reward_sum: 0, reward_sq_sum: 0 };

            reconciledState[key].count += 1;

            // Search assigned revenues matched to this single exposure block
            const orgRevs = revByOrg[exp.org_id] || [];
            let creditedLTV = 0;

            for (let i = 0; i < orgRevs.length; i++) {
                const r = orgRevs[i];
                if (r.date >= expTs) {
                    // Claim it, calculate IPS and Delay
                    const delay_days = Math.max(0, (r.date - expTs) / (1000 * 60 * 60 * 24));
                    const decay = Math.exp(-0.05 * delay_days);
                    const ips_debiased_reward = (r.amount / ps) * decay;
                    creditedLTV += ips_debiased_reward;

                    // Remove from list so it's not double-counted for earlier exposures!
                    orgRevs.splice(i, 1);
                    i--;
                }
            }

            reconciledState[key].reward_sum += creditedLTV;
            reconciledState[key].reward_sq_sum += creditedLTV * creditedLTV;
        }

        console.log(`🧹 Rebuilt Causal Snapshot:`, reconciledState);

        // 2. Erase Ram Drift and OVERWRITE Sync!
        for (const [key, metrics] of Object.entries(reconciledState)) {
            const redisKey = `bandit_state:${key}`;
            await redis.hset(redisKey, 'count', metrics.count);
            await redis.hset(redisKey, 'reward_sum', metrics.reward_sum);
            await redis.hset(redisKey, 'reward_sq_sum', metrics.reward_sq_sum);
        }

        console.log(`✅ [Reconciliator] Causal AI Synced. Master DW Overwrote Runtime RAM Drifts.`);
    } catch (e) {
        console.error('🚨 Reconciliation Crash:', e.message);
    }
}

if (require.main === module) {
    runDWReconciliationSync().then(() => process.exit(0));
}

module.exports = { runDWReconciliationSync };
