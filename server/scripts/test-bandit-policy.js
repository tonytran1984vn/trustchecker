/**
 * Counterfactual Engine CLI (Phase 17: Autonomous Policy Gate).
 * Simulates Hypothetical Revenue Uplifts strictly applying Causal Kill-Switches.
 * Execution: node server/scripts/test-bandit-policy.js
 */

const db = require('../db');
const { evaluatePolicy, computeDoublyRobust, policyGate } = require('../utils/causal-inference');

async function runPolicyTest() {
    await db._readyPromise;
    console.log('🤖 [Counterfactual AI] Booting Policy Simulation Engine...');

    // Pull Causal History
    const observations = await db.all(`
        SELECT context_key as contextKey, variant, reward, propensity_score as propensityScore
        FROM fact_experiment_observations
    `);

    console.log(`📊 Found ${observations.length} Historical Impressions.`);

    // Current Logging Policy
    const baseline = evaluatePolicy(observations, { 'GLOBAL': { 'A_CONTROL': 1, 'B_OFFER_DISCOUNT': 1 } }); 

    // The Admin's Proposed Policy
    const newPolicy = {
        "GLOBAL": { "A_CONTROL": 0.5, "B_OFFER_DISCOUNT": 0.5 },
        "T1_HIGH_ENT": { "A_CONTROL": 0.2, "B_OFFER_DISCOUNT": 0.8 },
        "T3_LOW_SMB": { "A_CONTROL": 0.9, "B_OFFER_DISCOUNT": 0.1 }
    };

    console.log('---');
    console.log('🧪 Simulating Proposed AI Rollout:');
    console.log(JSON.stringify(newPolicy, null, 2));

    const result = evaluatePolicy(observations, newPolicy);
    const drUplift = computeDoublyRobust(observations);

    console.log(' ');
    console.log(`📈 Baseline V: $${baseline.V_pi.toFixed(2)} / exposure`);
    console.log(`🚀 Proposed V: $${result.V_pi.toFixed(2)} / exposure`);
    console.log(`🛡️ Effective Sample Size (ESS) Ratio: ${(result.ESS_ratio * 100).toFixed(1)}%`);
    
    // Autonomous Policy Gate Final Kill Switch
    const decision = policyGate(result, baseline.V_pi);

    console.log(`\n🚦 AUTONOMOUS DECISION GATE: ${decision}`);

    if (decision.includes('REJECT')) {
        console.log('❌ AI Override: Policy is mathematically unsafe. Aborting deployment unconditionally.');
    } else if (decision.includes('SHADOW')) {
        console.log('⚠️ AI Override: Policy variance is volatile. Deploying passively for metric gathering only.');
    } else {
        console.log('✅ AI Approval: Policy stabilized and profitable. Clearing for fractional traffic rollout.');
    }

    console.log(`\n(ℹ️ Doubly Robust Context-Bound Uplift Trend: $${drUplift.toFixed(3)} incremental value per variant flip)`);
    process.exit(0);
}

if (require.main === module) {
    runPolicyTest().catch(e => {
        console.error(e);
        process.exit(1);
    });
}
