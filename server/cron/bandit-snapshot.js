/**
 * Redis Immortal Snapshot Engine (Phase 16 Hardening).
 * Background task running every 5 minutes locking RAM Multi-Touch Matrices into Postgres.
 * Enables zero-downtime Cold Boot recovery of MAB Probabilities.
 */

const db = require('../db');
const { getRedisClient } = require('../services/redis');

async function snapshotBanditBrain() {
    const redis = getRedisClient();
    if (!redis) return;

    try {
        console.log('📸 [Bandit Snapshot] Persisting RAM Brain to Storage...');
        await db._readyPromise;

        // Collect all active contexts and cohorts
        // Key pattern: bandit_state:{ctx}:{cohort}
        // Actually we don't know the exact keys without KEYS *. Instead, scan or use a known set.
        // It's safer to use SCAN to capture all state organically
        let cursor = '0';
        const matchedKeys = [];
        do {
            // Node-Redis scanner
            const res = await redis.scan(cursor, 'MATCH', 'bandit_state:*', 'COUNT', 100);
            cursor = res[0];
            matchedKeys.push(...res[1]);
        } while (cursor !== '0');

        console.log(`🔍 Discovered ${matchedKeys.length} Causal Ram blocks.`);

        for (const key of matchedKeys) {
            const fragments = key.split(':');
            // bandit_state:T1_HIGH_ENT:A_CONTROL -> fragments[1] = T1_HIGH_ENT, fragments[2] = A_CONTROL
            if (fragments.length < 3) continue;

            const ctx = fragments.slice(1, fragments.length - 1).join(':') || 'GLOBAL';
            const variant = fragments[fragments.length - 1];

            const count = parseInt((await redis.hget(key, 'count')) || '0');
            const reward_sum = parseFloat((await redis.hget(key, 'reward_sum')) || '0');
            const reward_sq_sum = parseFloat((await redis.hget(key, 'reward_sq_sum')) || '0');

            await db.run(
                `INSERT INTO bandit_state_snapshots (context_key, variant, count, reward_sum, reward_sq_sum, updated_at) 
                 VALUES ($1, $2, $3, $4, $5, NOW())
                 ON CONFLICT (context_key, variant) DO UPDATE SET 
                    count = EXCLUDED.count,
                    reward_sum = EXCLUDED.reward_sum,
                    reward_sq_sum = EXCLUDED.reward_sq_sum,
                    updated_at = NOW()`,
                [ctx, variant, count, reward_sum, reward_sq_sum]
            );
        }

        console.log(
            `🏦 [Bandit Snapshot] Flushed ${matchedKeys.length} Memory States into Immutable PostgreSQL Backup.`
        );
    } catch (e) {
        console.error('🚨 Snapshot Failure:', e.message);
    }
}

async function restoreBanditBrain() {
    const redis = getRedisClient();
    if (!redis) return;

    try {
        await db._readyPromise;

        // Safety Guard: Only restore if Redis seems empty or missing GLOBAL
        const hasGlobal = await redis.hkeys('bandit_state:GLOBAL:A_CONTROL');
        if (hasGlobal && hasGlobal.length > 0) {
            console.log('✅ [Bandit Restore] Redis RAM already active. Skipping Restore.');
            return;
        }

        console.log('🔄 [Bandit Restore] Cold Boot Detected! Resurrecting Causal Memory from Database...');
        const snapshots = await db.all(`SELECT * FROM bandit_state_snapshots`);

        for (const snap of snapshots) {
            const key = `bandit_state:${snap.context_key}:${snap.variant}`;
            await redis.hset(key, 'count', snap.count);
            await redis.hset(key, 'reward_sum', snap.reward_sum);
            await redis.hset(key, 'reward_sq_sum', snap.reward_sq_sum);
        }

        console.log(`🛡️ [Bandit Restore] Resurrected ${snapshots.length} Memory States smoothly.`);
    } catch (e) {
        console.error('🚨 Restore Failure:', e.message);
    }
}

// Support continuous cron intervals or trigger-once
if (require.main === module) {
    const isDaemon = process.argv.includes('--daemon');
    if (isDaemon) {
        console.log('⏰ Running Immortal Brain Interval (every 5 minutes)...');
        restoreBanditBrain().then(() => {
            setInterval(() => snapshotBanditBrain(), 5 * 60 * 1000); // 5 Mins
            snapshotBanditBrain();
        });
    } else {
        snapshotBanditBrain().then(() => process.exit(0));
    }
}

module.exports = { snapshotBanditBrain, restoreBanditBrain };
