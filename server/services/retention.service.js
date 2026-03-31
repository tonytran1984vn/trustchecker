const { getRedisClient } = require('./redis');
const db = require('../db');

/**
 * Retention Decision Engine.
 * Evaluates whether an organization hitting a quota limit should receive a behavioral NUDGE (Extra Quota) or an Upsale Discount.
 * Prevents logic bleed by keeping decision matrices away from Enforcement middlewares.
 */
class RetentionService {
    // Contextual Bucket Parsing
    static buildContextKey(orgPlan, country, usageLvl) {
        // Mock demographic extraction - Real systems fetch this from Stripe/Mixpanel
        const tier = country === 'US' ? 'T1' : 'T3';
        const size = orgPlan === 'enterprise' ? 'ENT' : 'SMB';
        const vel = usageLvl > 1000 ? 'HIGH' : 'LOW';
        return `${tier}_${vel}_${size}`;
    }

    // Helper: Online Gaussian Sampling from Memory State
    static _sampleGaussian(mean, variance) {
        const stdDev = Math.sqrt(Math.min(Math.max(variance, 0.01), 10000));
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1 + 1e-10)) * Math.cos(2.0 * Math.PI * u2);
        return z0 * stdDev + mean;
    }

    // Hybrid Run-time MAB Router (Thompson Sampling via Redis Caching)
    static async getBanditAssignment(ctx) {
        const redis = getRedisClient();
        const variants = ['A_CONTROL', 'B_OFFER_DISCOUNT'];
        const w = { A_CONTROL: 0.5, B_OFFER_DISCOUNT: 0.5 };

        if (redis) {
            let contextPassed = false;
            let targetGroup = `bandit_state:${ctx}`;

            // Try Local Context first
            let countA = await redis.hget(`${targetGroup}:A_CONTROL`, 'count');
            let countB = await redis.hget(`${targetGroup}:B_OFFER_DISCOUNT`, 'count');

            // Step 1: Minimum Samples Guard - Fallback to GLOBAL if sparse
            if (!countA || !countB || parseInt(countA) + parseInt(countB) < 100) {
                targetGroup = `bandit_state:GLOBAL`;
                countA = await redis.hget(`${targetGroup}:A_CONTROL`, 'count');
                countB = await redis.hget(`${targetGroup}:B_OFFER_DISCOUNT`, 'count');
            } else {
                contextPassed = true;
            }

            // Step 2: Global Layer Guard
            if (!countA || !countB || parseInt(countA) + parseInt(countB) < 100) {
                // Return Default 50/50 - System hasn't matured yet
                return { cohort: Math.random() < 0.5 ? 'A_CONTROL' : 'B_OFFER_DISCOUNT', propensity: 0.5 };
            }

            // Step 3: Run O(1) Real-time Gaussian Posterior Loop
            const scores = {};
            for (const v of variants) {
                const c = parseInt((await redis.hget(`${targetGroup}:${v}`, 'count')) || '1');
                const s = parseFloat((await redis.hget(`${targetGroup}:${v}`, 'reward_sum')) || '0');
                const sq = parseFloat((await redis.hget(`${targetGroup}:${v}`, 'reward_sq_sum')) || '0');

                const mean = s / c;
                let variance = sq / c - mean * mean;
                variance = Math.min(Math.max(variance, 0.01), 10000); // Guard Causal Caps

                // MC Sub-Simulation
                const wins = 0;
                const SIM = 1000;
                for (let i = 0; i < SIM; i++) {
                    const sample = this._sampleGaussian(mean, variance / c);
                    // Just 1 loop doesn't compute probability directly unless we simulate against other arm,
                    // Actually, for 2 arms, we can directly simulate and track wins.
                }
                scores[v] = { mean, variance: variance / c };
            }

            // Monte Carlo against exact generated profiles
            const SIM = 1000;
            const wins = { A_CONTROL: 0, B_OFFER_DISCOUNT: 0 };
            for (let i = 0; i < SIM; i++) {
                const sA = this._sampleGaussian(scores['A_CONTROL'].mean, scores['A_CONTROL'].variance);
                const sB = this._sampleGaussian(scores['B_OFFER_DISCOUNT'].mean, scores['B_OFFER_DISCOUNT'].variance);
                if (sA > sB) wins['A_CONTROL']++;
                else wins['B_OFFER_DISCOUNT']++;
            }

            // Norm + Floor
            w['A_CONTROL'] = Math.max(0.05, wins['A_CONTROL'] / SIM);
            w['B_OFFER_DISCOUNT'] = Math.max(0.05, wins['B_OFFER_DISCOUNT'] / SIM);
            const sumW = w['A_CONTROL'] + w['B_OFFER_DISCOUNT'];
            w['A_CONTROL'] /= sumW;
            w['B_OFFER_DISCOUNT'] /= sumW;
        }

        // Output probability assignment roll
        const r = Math.random();
        if (r <= w['A_CONTROL']) return { cohort: 'A_CONTROL', propensity: w['A_CONTROL'] };
        return { cohort: 'B_OFFER_DISCOUNT', propensity: w['B_OFFER_DISCOUNT'] };
    }

    /**
     * @returns {Promise<{action: 'NUDGE_EXTRA_QUOTA' | 'OFFER_DISCOUNT' | 'BLOCK', emergencyKey?: string, allowedUsage?: number, offerType?: string, cohort?: string }>}
     */
    static async evaluateRetentionAction(orgId, feature, limit, current) {
        // Guardrails: Only applies when Limit is reached natively.
        if (limit <= 0) return { action: 'BLOCK' };

        const orgPlan = 'starter'; // Mocked
        const country = 'US'; // Mocked
        const contextKey = this.buildContextKey(orgPlan, country, current);

        const assignment = await this.getBanditAssignment(contextKey);
        const cohort = assignment.cohort;

        // Async dispatch attribution exposure
        this.trackExposure(orgId, 'UPSELL_NUDGING_V1', cohort, contextKey, assignment.propensity).catch(e =>
            console.error(e)
        );

        // 1. EVALUATE COHORT B: Disgruntle Offer Instead of Allow
        if (cohort === 'B_OFFER_DISCOUNT') {
            return { action: 'OFFER_DISCOUNT', offerType: '30_PERCENT_DISCOUNT', cohort };
        }

        // 2. EVALUATE COHORT A: Gratiute Nuding (10% Bonus Emergency Quota)
        const redis = getRedisClient();
        if (redis) {
            const emergencyKey = `emergency_quota:${orgId}:${feature}`;
            const emergencyUsed = await redis.get(emergencyKey);

            // Anti-abuse Guard: Only grant 10% Extra
            const overflowAllowed = Math.ceil(limit * 1.1);

            if (!emergencyUsed && current <= overflowAllowed) {
                // Return decision back to enforcement gateway to temporarily hold passage
                return { action: 'NUDGE_EXTRA_QUOTA', emergencyKey, allowedUsage: overflowAllowed, cohort };
            }
        }

        // Exhausted options, Fallback to Block
        return { action: 'BLOCK' };
    }

    static async trackExposure(orgId, experimentKey, cohort, contextKey, propensityScore) {
        const { AnalyticsService } = require('./analytics.service');
        await AnalyticsService.publishEvent('EXPERIMENT_EXPOSED', 1, orgId, {
            experiment_key: experimentKey,
            cohort: cohort,
            context_hash: contextKey,
            propensity_score: propensityScore,
        });
    }
}

module.exports = { RetentionService };
