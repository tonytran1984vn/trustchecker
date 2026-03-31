const db = require('../db');

/**
 * Assigner Engine for Multi-Armed Bandit testing.
 * Reads real-time Weight probabilities adjusted by the Bandit Cronjob to assign new Organizations into a Cohort dynamically based on Win-Rates.
 *
 * @param {string} experimentKey
 * @returns {Promise<string>} e.g., 'A_CONTROL' or 'B_OFFER_DISCOUNT'
 */
async function getBanditCohortAssignment(experimentKey = 'UPSELL_NUDGING_V1') {
    try {
        const config = await db.get(`SELECT weights, status FROM experiment_configs WHERE experiment_key = $1`, [
            experimentKey,
        ]);

        if (!config || config.status !== 'active') {
            // Safe Fallback Control Limit 50/50 Randomizer
            return Math.random() < 0.5 ? 'A_CONTROL' : 'B_OFFER_DISCOUNT';
        }

        const weightsObj = typeof config.weights === 'string' ? JSON.parse(config.weights) : config.weights;
        const totalWeight = Object.values(weightsObj).reduce((a, b) => a + b, 0);

        let randomThreshold = Math.random() * totalWeight;

        for (const [cohort, weight] of Object.entries(weightsObj)) {
            if (randomThreshold < weight) {
                return cohort;
            }
            randomThreshold -= weight;
        }
    } catch (e) {
        console.error('[Bandit Assignment] Fallback Fired:', e.message);
    }

    return 'A_CONTROL'; // Ultimate safe fallback
}

module.exports = { getBanditCohortAssignment };
