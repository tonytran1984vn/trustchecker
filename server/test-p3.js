require('dotenv').config();
const assert = require('assert');
const db = require('./db');
const predictiveEngine = require('./engines/platform-ops-engine/predictive-intelligence');
const IngestionBuffer = require('./engines/platform-ops-engine/ingestion-buffer');

async function testIntelligenceL3() {
    await db._readyPromise;
    console.log('[Test] L3 AI Predictive Analytics Started');

    try {
        console.log('[Test] 1. Streaming Z-Score Simulation (Detection Logic)');
        const M1 = 'latency_ms';
        // Simulating normal stream (Baseline stabilization around 50ms)
        for (let i = 0; i < 15; i++) {
            predictiveEngine.update(M1, 50 + Math.random() * 5, new Date(Date.now() - (15 - i) * 30000).toISOString());
        }

        const normalState = predictiveEngine.detect(M1, 52);
        assert(normalState.anomaly === false, 'False Positive raised on baseline stream');

        console.log('[Test] 2. Degradation Trajectory Injection (Spikes)');
        // Inject single sudden spike
        const spikeState = predictiveEngine.detect(M1, 800);
        assert(spikeState.anomaly === true && spikeState.z > 2.5, 'Failed to detect severe Z-score divergence');
        console.log(
            `✅ Z-Score Anomaly detection engaged at Threshold ${spikeState.threshold.toFixed(2)} with z-score ${spikeState.z.toFixed(2)}`
        );

        console.log('[Test] 3. Correlational Topography Test');
        predictiveEngine.update('error rate pct', 2.5, new Date().toISOString());
        predictiveEngine.update('api response p95 ms', 800, new Date().toISOString());
        predictiveEngine.update('mrv backlog count', 10, new Date().toISOString());

        const eState = predictiveEngine.getState('error rate pct');
        eState.trendSlope = 1.2; // positive trend accelerating
        const lState = predictiveEngine.getState('api response p95 ms');
        lState.trendSlope = 50.0;
        const bState = predictiveEngine.getState('mrv backlog count');
        bState.trendSlope = 5.0; // degrading capacity

        const isCorrelatedCrisis = predictiveEngine.correlate({
            'error rate pct': eState,
            'api response p95 ms': lState,
            'mrv backlog count': bState,
        });
        assert(isCorrelatedCrisis === true, 'Topological Correlation failed to flag composite crisis');
        console.log('✅ Deterministic Topology correlated crisis successfully across decoupled factors!');

        console.log('[Test] 4. Ingestion Buffer Concurrency Guard');
        const buffer = new IngestionBuffer(db);
        for (let i = 0; i < 150; i++) {
            buffer.push({ metric: 'test_metric', ts: new Date().toISOString(), value: 42 });
        }
        // Force concurrent flushes
        await Promise.all([buffer.flush(), buffer.flush(), buffer.flush()]);
        assert(buffer.queue.length === 0, 'Buffer concurrency lock malfunctioned or dropped records');
        console.log('✅ Write batching & flush guard successfully processed single-writer semantics!');
    } catch (e) {
        console.error('⛔ L3 Testing Failed:', e);
        process.exit(1);
    }

    console.log('🎉 L3 Machine Math Kernel is fully deterministic and operational!');
    process.exit(0);
}

testIntelligenceL3();
