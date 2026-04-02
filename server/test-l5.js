require('dotenv').config();
const assert = require('assert');
const db = require('./db');
const { RootCauseEngine } = require('./engines/platform-ops-engine/causal-graph');
const { ActionExecutor } = require('./engines/platform-ops-engine/action-executor');

const T0 = Date.now();

// Simulate Metric States suffering a Domino cascade
const mockMetricStateMap = new Map();
mockMetricStateMap.set('error_rate', { lastValue: 15, trendSlope: 5.2, lastTs: T0 }); // The Symptom showing on dashboard
mockMetricStateMap.set('latency', { lastValue: 800, trendSlope: 150, lastTs: T0 - 10000 }); // Affected 10s earlier
mockMetricStateMap.set('traffic', { lastValue: 5000, trendSlope: 300, lastTs: T0 - 15000 }); // The true root cause, arrived 15s ago

async function testL5() {
    await db._readyPromise;
    console.log('[Test L5: Autonomous Causal Execution]');
    try {
        console.log('[+] Initializing Causal Graph Topology');
        const engine = new RootCauseEngine();
        engine.buildTopology(); // Inject default edge weights
        engine.syncNodes(mockMetricStateMap, T0);

        console.log('[Test 1] Root Cause Backtracking');
        // We notify the system that `error_rate` is currently in an escalated state.
        const inference = engine.findRootCause('error_rate');

        assert(
            inference.rootCause !== 'error_rate',
            'Engine failed to backtrack; tunneled strictly on the symptom (error).'
        );
        assert(inference.rootCause === 'traffic', `Engine traced to wrong root cause: ${inference.rootCause}`);
        assert(inference.path.join('->') === 'traffic->latency->error_rate', 'Causal path extraction is mutated.');
        assert(inference.confidence > 0.4, `Confidence calculation failed to compound (${inference.confidence})`);
        console.log(
            `✅ Engine successfully traversed graph. Result: [${inference.path.join(' -> ')}] (Confidence: ${inference.confidence})`
        );

        console.log('[Test 2] Autonomous Action Execution Guardrails');
        const executor = new ActionExecutor();

        // Scenario A: High Confidence (Auto Execution)
        const highInference = { ...inference, confidence: 0.85 };
        const resA = await executor.execute('error_rate', highInference);
        assert(
            resA.mode === 'AUTO_EXECUTE' && resA.executed === true && resA.action === 'scale_up',
            'Guardrail accidentally blocked High Confidence Auto Execution!'
        );

        // Scenario B: Low Confidence (Recommend Only)
        const lowInference = { ...inference, confidence: 0.65 };
        const resB = await executor.execute('error_rate', lowInference);
        assert(
            resB.mode === 'RECOMMEND_ONLY' && resB.executed === false,
            'Engine executed dangerous command with weak causal confidence!'
        );

        // Ensure Log Persistence
        const logs = await db.all('SELECT * FROM autonomous_actions_log WHERE id IN ($1, $2) ORDER BY id ASC', [
            resA.log_id,
            resB.log_id,
        ]);
        assert(logs.length === 2, 'Action Engine failed to persist audit trail to PostgreSQL.');
        assert(
            logs[0].status === 'COMPLETED' && logs[1].status === 'PENDING',
            'Auditor failed to enforce semantic status state strings'
        );

        console.log('✅ Action executed and mathematically bounded by institutional safeguards.');
        console.log('🎉 L5 Autonomous Control Plane Architecture successfully completed!');
        process.exit(0);
    } catch (e) {
        console.error('⛔ Validation Failed:', e);
        process.exit(1);
    }
}
testL5();
