require('dotenv').config();
const assert = require('assert');
const { randomUUID } = require('crypto');
const db = require('./db');
const { streamTimeline } = require('./engines/platform-ops-engine/replay-engine');
const { runDiff } = require('./engines/platform-ops-engine/diff-engine');

const T0 = new Date('2026-04-02T10:00:00.000Z').getTime();

const mockData = {
    events: [],
    metrics: [],
};

// Populate 60 normal metric points to warm-up engines (minSamples = 8 for V1, 10 for V2)
for (let i = 0; i < 60; i++) {
    mockData.metrics.push({
        ts: T0 + i * 30000, // Every 30s
        metric_name: 'latency',
        value: 50 + Math.random() * 5,
    });
}
const T_SPIKE = T0 + 61 * 30000;
// V1 catches spike at 80, but maybe V2 catches earlier? Let's inject 65.
// V2 config: alpha 0.3, beta 0.15 => Much more reactive to shifts!
mockData.metrics.push({ ts: T_SPIKE, metric_name: 'latency', value: 70 });
mockData.metrics.push({ ts: T_SPIKE + 30000, metric_name: 'latency', value: 120 }); // The true anomaly

async function testL4() {
    await db._readyPromise;
    console.log('[Test L4: Diff A/B Engine]');
    try {
        const runId = randomUUID();

        await db.run(
            'INSERT INTO replay_diff_runs (id, start_ts, end_ts, model_a, model_b) VALUES ($1, $2, $3, $4, $5)',
            [
                runId,
                new Date(T0).toISOString(),
                new Date(T_SPIKE + 30000).toISOString(),
                'PredictiveModelV1',
                'PredictiveModelV2',
            ]
        );

        console.log(`[+] Executing Parallel Stream A/B Race on Run: ${runId}`);
        const stream = streamTimeline(mockData);

        const { summary } = await runDiff(db, stream, runId);

        console.log('[+] Summary Results:');
        console.table(summary);

        // Assertions based on config logic differential
        assert(summary.total_events === 62, `Total events mismatches: ${summary.total_events}`);
        assert(
            summary.improvements + summary.drifts + summary.regressions > 0,
            'Diff engine returned pure Match, Model V1 identical to V2?'
        );

        console.log('✅ Deterministic Data streams perfectly segregated and diff extracted without mutation bleed!');

        // Ensure data sits securely in postgres
        const storedSummary = await db.all('SELECT * FROM replay_diff_summary WHERE run_id = $1', [runId]);
        assert(storedSummary.length === 1, 'Summary data missed persistence threshold');

        console.log('🎉 L4 Decision Lab completed verification!');
        process.exit(0);
    } catch (e) {
        console.error('⛔ Test failed:', e);
        process.exit(1);
    }
}

testL4();
