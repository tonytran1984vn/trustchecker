const db = require('../../db');

class PolicyLearningEngine {
    constructor() {
        this.LIMITS = {
            cooldown_sec: [60, 1800],
            confidence_threshold: [0.7, 0.95], // Assuming confidence config was attached at action_policies.constraints if needed
        };
    }

    normalizeScore(outcome) {
        return {
            success: outcome.success ? 1 : 0,
            reward: outcome.improvement,
            cost: outcome.latency_ms,
        };
    }

    // Weight penalty using Logarithmic decay to prevent Black Swan/Cluster failure oscillations
    calculateDecayPenalty(recentClusterSize) {
        if (recentClusterSize <= 1) return 1;
        return 1 / Math.log1p(recentClusterSize); // Logarithmic backoff limiting absolute feedback destruction
    }

    async updateStats(policyId, outcomeAggregates) {
        const statsRow = await db.all('SELECT * FROM policy_learning_stats WHERE policy_id = $1', [policyId]);

        let stats = { sample_size: 0, success_rate: 1.0, failure_rate: 0.0, avg_improvement: 0.0, avg_latency: 0.0 };
        if (statsRow.length > 0) stats = statsRow[0];

        // Process Feedback Array
        const currentCluster = outcomeAggregates.length;

        for (const out of outcomeAggregates) {
            const norm = this.normalizeScore(out);
            const n = ++stats.sample_size;

            // Logarithmic Penalty to prevent Black Swans pulling stats down universally
            const decay = !out.success ? this.calculateDecayPenalty(currentCluster) : 1;

            const currentFailureWeight = out.success ? 0 : 1;
            stats.success_rate = (stats.success_rate * (n - 1) + norm.success) / n;
            stats.failure_rate = (stats.failure_rate * (n - 1) + currentFailureWeight * decay) / n;

            stats.avg_improvement = (stats.avg_improvement * (n - 1) + norm.reward) / n;
            stats.avg_latency = (stats.avg_latency * (n - 1) + norm.cost) / n;
        }

        await db.run(
            `INSERT INTO policy_learning_stats (policy_id, success_rate, failure_rate, avg_improvement, avg_latency, sample_size)
             VALUES ($1, $2, $3, $4, $5, $6) 
             ON CONFLICT (policy_id) DO UPDATE SET 
             success_rate = EXCLUDED.success_rate, failure_rate = EXCLUDED.failure_rate, 
             avg_improvement = EXCLUDED.avg_improvement, avg_latency = EXCLUDED.avg_latency, 
             sample_size = EXCLUDED.sample_size`,
            [
                policyId,
                stats.success_rate,
                stats.failure_rate,
                stats.avg_improvement,
                stats.avg_latency,
                stats.sample_size,
            ]
        );

        return stats;
    }

    clamp(val, min, max) {
        return Math.max(min, Math.min(max, val));
    }

    async calibrateRisk(policyId) {
        const statsRow = await db.all('SELECT * FROM policy_learning_stats WHERE policy_id = $1', [policyId]);
        const policyRow = await db.all('SELECT * FROM action_policies WHERE id = $1', [policyId]);

        if (statsRow.length === 0 || policyRow.length === 0) return null;
        const stats = statsRow[0];
        const p = { ...policyRow[0] }; // shallow clone the master

        // Hard Guard: Require Minimum Evidence sample limit
        if (stats.sample_size < 50) return p;

        // 1. Approval Downgrade/Upgrade logic
        if (stats.failure_rate > 0.08) {
            p.approval_mode = 'TWO_APPROVERS';
        } else if (stats.success_rate > 0.95) {
            p.approval_mode = 'AUTO'; // Machine graduation
        } else if (stats.success_rate > 0.8 && p.approval_mode === 'TWO_APPROVERS') {
            p.approval_mode = 'ONE_APPROVER'; // Relax slowly
        }

        // 2. Cooldown Scaling (Multi-Armed tuning)
        if (stats.failure_rate > 0.1) {
            p.cooldown_sec = this.clamp(p.cooldown_sec + 60, this.LIMITS.cooldown_sec[0], this.LIMITS.cooldown_sec[1]);
        } else if (stats.success_rate > 0.9) {
            p.cooldown_sec = this.clamp(p.cooldown_sec - 30, this.LIMITS.cooldown_sec[0], this.LIMITS.cooldown_sec[1]); // Shrink safely
        }

        // Constraints scaling is simulated...

        return p;
    }

    async publishPolicy(policyId, newConfig) {
        // Find existing version to increment
        const existingVersions = await db.all(
            'SELECT version FROM policy_versions WHERE policy_id = $1 ORDER BY version DESC LIMIT 1',
            [policyId]
        );
        const nextVersion = existingVersions.length > 0 ? existingVersions[0].version + 1 : 1;

        // Archive old versions mathematically guaranteeing Replay determinism
        await db.run('UPDATE policy_versions SET is_active = false WHERE policy_id = $1', [policyId]);

        const insert = await db.all(
            `INSERT INTO policy_versions (policy_id, version, config, is_active) 
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [policyId, nextVersion, JSON.stringify(newConfig), true]
        );

        // Mirror active state downwards to the core tables for backward compatibility to L5.1 without breaking standard Ops
        await db.run(`UPDATE action_policies SET approval_mode = $1, cooldown_sec = $2 WHERE id = $3`, [
            newConfig.approval_mode,
            newConfig.cooldown_sec,
            policyId,
        ]);

        return insert[0];
    }
}

module.exports = { PolicyLearningEngine };
