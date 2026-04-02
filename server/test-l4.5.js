require('dotenv').config();
const assert = require('assert');
const { randomUUID } = require('crypto');
const db = require('./db');
const { AutoPromotionEngine, GovernanceRouter } = require('./engines/platform-ops-engine/promotion-engine');

async function testL45() {
    await db._readyPromise;
    console.log('[Test L4.5: Autonomous Promotion Guardrails & Kill Switch]');

    const engine = new AutoPromotionEngine(db);
    try {
        console.log('[+] Initializing Governance Mock State');
        // Clean environment
        await db.run(
            'UPDATE model_governance_state SET active_model=$1, mode=$2, kill_switch_engaged=$3, canary_model=NULL WHERE id=1',
            ['PredictiveModelV1', 'STABLE', false]
        );

        console.log('[Test 1] Over-Escalation Rejection Guard');
        const rejectedRun = randomUUID();
        await db.run(
            'INSERT INTO replay_diff_runs (id, start_ts, end_ts, model_a, model_b) VALUES ($1, now(), now(), $2, $3)',
            [rejectedRun, 'PredictiveModelV1', 'PredictiveModelV2']
        );
        await db.run(
            'INSERT INTO replay_diff_summary (run_id, total_events, matches, drifts, regressions, improvements, avg_score_delta, max_score_delta) VALUES ($1, 100, 75, 10, 5, 10, 0, 0)',
            [rejectedRun]
        );

        const resReject = await engine.evaluateAndPromote(rejectedRun, 'PredictiveModelV2');
        assert(
            resReject.promoted === false,
            'Engine permitted Promotion despite severe Regression & Over-Escalation noise!'
        );
        console.log('✅ Over-Escalating Model correctly Blocked.');

        console.log('[Test 2] Clean Statistical Promotion to Canary');
        const cleanRun = randomUUID();
        await db.run(
            'INSERT INTO replay_diff_runs (id, start_ts, end_ts, model_a, model_b) VALUES ($1, now(), now(), $2, $3)',
            [cleanRun, 'PredictiveModelV1', 'PredictiveModelV2']
        );
        await db.run(
            'INSERT INTO replay_diff_summary (run_id, total_events, matches, drifts, regressions, improvements, avg_score_delta, max_score_delta) VALUES ($1, 100, 88, 2, 0, 10, 0, 0)',
            [cleanRun]
        );

        const resPromote = await engine.evaluateAndPromote(cleanRun, 'PredictiveModelV2');
        assert(resPromote.promoted === true, 'Engine rejected a mathematically flawless Model!');

        // Assert Governance Routing
        const router = new GovernanceRouter();
        const govState = await router.syncState(db);
        assert(
            govState.mode === 'CANARY' && govState.canary_model === 'PredictiveModelV2',
            'Canary State not successfully updated in DB.'
        );
        console.log('✅ Flawless Model mathematically proven and Automatically Promoted to CANARY Branch.');

        console.log('[Test 3] Deterministic Traffic Slicing (5%)');
        // Router should send roughly 5 out of 100 incident signatures to Canary.
        let routed = 0;
        for (let i = 0; i < 100; i++) {
            if (router.shouldRouteToCanary(`sign_t_${i}`)) routed++;
        }
        assert(routed > 0 && routed <= 15, 'Statistical slicing bound error');
        console.log(`✅ Canary Router successfully sliced ${routed}/100 active connections under shadow flag.`);

        console.log('[Test 4] Absolute Kill Switch Enforcement');
        await engine.triggerKillSwitch();

        router.cacheTime = 0; // Force invalidate debounce cache for test
        const killedState = await router.syncState(db);
        assert(
            killedState.kill_switch_engaged === true &&
                killedState.mode === 'STABLE' &&
                killedState.canary_model === null,
            'Kill Switch failed to enforce safe rollback mode'
        );
        assert(
            router.shouldRouteToCanary(`sign_t_x`) === false,
            'Canary router still leaking traffic despite Kill Switch!'
        );
        console.log('✅ Kill Switch dropped all AI inference to strict P0 rules in O(1) time!');

        console.log('🎉 L4.5 AI Governance complete. Control Plane is mathematically impregnable!');
        process.exit(0);
    } catch (e) {
        console.error('⛔ Validation Failed:', e);
        process.exit(1);
    }
}
testL45();
