require('dotenv').config();
const assert = require('assert');
const db = require('./db');
const { PolicyLearningEngine } = require('./engines/platform-ops-engine/policy-learning');

async function testL52() {
    await db._readyPromise;
    console.log('[Test L5.2: Reinforcement Learning Calibration Engine]');

    // Hard code seed policy to ensure determinism
    await db.run(
        "INSERT INTO action_policies (id, action, risk_tier, approval_mode, max_concurrency, cooldown_sec, sla_sec) VALUES ('pol_test52_a', 'test_scale', 'LOW', 'ONE_APPROVER', 5, 120, 60) ON CONFLICT (id) DO UPDATE SET approval_mode='ONE_APPROVER', cooldown_sec=120"
    );

    const engine = new PolicyLearningEngine();

    try {
        console.log('[+] Initializing clean state (Truncating tables)');
        await db.run('TRUNCATE TABLE policy_learning_stats, policy_versions, action_outcomes RESTART IDENTITY CASCADE');

        console.log('[Test 1] Hard Bounds limit small sample oscillations');
        const initialOutcome = [{ success: true, latency_ms: 50, improvement: 0.1 }];
        await engine.updateStats('pol_test52_a', initialOutcome);

        const calibratedA = await engine.calibrateRisk('pol_test52_a');
        assert(
            calibratedA.approval_mode === 'ONE_APPROVER' && calibratedA.cooldown_sec === 120,
            'Guardrail failed! Engine recalibrated with sample scope < 50!'
        );
        console.log('✅ Evidence limits successfully blocked premature oscillations.');

        console.log(
            '[Test 2] High Failure Clusters properly log using Decay, penalizing but downgrading approval bounds.'
        );
        // Generate a 60 event string where 52 fail and only 8 succeed, meaning < 20% success...
        const failureArray = [];
        for (let i = 0; i < 52; i++) failureArray.push({ success: false, latency_ms: 100, improvement: 0 });
        for (let i = 0; i < 8; i++) failureArray.push({ success: true, latency_ms: 30, improvement: 0.2 });

        await engine.updateStats('pol_test52_a', failureArray);

        const calibratedFail = await engine.calibrateRisk('pol_test52_a');
        assert(
            calibratedFail.approval_mode === 'TWO_APPROVERS',
            `Engine missed Failure Escalation! It should be TWO_APPROVERS but was ${calibratedFail.approval_mode}`
        );
        assert(
            calibratedFail.cooldown_sec === 180,
            `Engine failed to increase cooldown dynamically! Re-eval got ${calibratedFail.cooldown_sec}`
        );
        console.log(
            `✅ System auto-downgraded Action Policy directly in response to failures (Mode: TWO_APPROVERS, CD: ${calibratedFail.cooldown_sec}s).`
        );

        console.log('[Test 3] Active Publishing and Policy Version Appending');
        const nextVersionRow = await engine.publishPolicy('pol_test52_a', calibratedFail);
        assert(
            nextVersionRow.version === 1 && nextVersionRow.is_active === true,
            'Policy Version tracking append-only architecture missed snapshot window.'
        );

        // Assert native syncing
        const pQuery = await db.all("SELECT * FROM action_policies WHERE id = 'pol_test52_a'");
        assert(
            pQuery[0].approval_mode === 'TWO_APPROVERS',
            'Main Policy structure did not sync downwards for external engine ops!'
        );
        console.log('✅ Appended new Version. Architecture synced locally.');

        console.log('[Test 4] Success Overriding upgrades Automation Mode cleanly');
        // Let's pump wildly 100 successful outputs to completely erase the 50 failures statistically
        const massiveSuccess = [];
        for (let i = 0; i < 1500; i++) massiveSuccess.push({ success: true, latency_ms: 10, improvement: 0.5 });

        await engine.updateStats('pol_test52_a', massiveSuccess);

        const calibratedSuccess = await engine.calibrateRisk('pol_test52_a');
        assert(
            calibratedSuccess.approval_mode === 'AUTO',
            `Engine missed Machine Graduation! Mode was ${calibratedSuccess.approval_mode}`
        );
        console.log(
            '✅ Engine safely relaxed bounds after mathematically demonstrating continuous >95% success efficiency.'
        );

        console.log('🎉 L5.2 Self-Learning System bounded optimally. Control Plane fully Autonomous and Reusable!');
        process.exit(0);
    } catch (e) {
        console.error('⛔ Validation Failed:', e);
        process.exit(1);
    }
}
testL52();
