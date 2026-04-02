const { ReplayState, streamTimeline } = require('./replay-engine');
const { PredictiveModelV1, PredictiveModelV2 } = require('./predictive-intelligence');
const { randomUUID } = require('crypto');

class CustomReplayState extends ReplayState {
    constructor(ModelClass) {
        super();
        this.engine = new ModelClass();
    }
}

class DiffReplayState {
    constructor() {
        this.stateA = new CustomReplayState(PredictiveModelV1);
        this.stateB = new CustomReplayState(PredictiveModelV2);
        this.diffs = [];
    }

    hydrateFromBase(baseStateSnapshot) {
        this.stateA.hydrate(baseStateSnapshot);
        this.stateB.hydrate(baseStateSnapshot);
    }

    compare(a, b, metric) {
        if (a.anomaly !== b.anomaly) {
            return {
                ts: metric.ts,
                metric: metric.metric_name,
                type: a.anomaly && !b.anomaly ? 'IMPROVEMENT' : b.anomaly && !a.anomaly ? 'REGRESSION' : 'DRIFT',
                a,
                b,
            };
        }

        // Compare computeRiskScore heuristics output bounds (since z and slopes might slightly vary)
        if (a.anomaly && b.anomaly) {
            // mock logic to abstract composite score check since we don't hold full incident pipeline correlation here
            const scoreA = this.stateA.engine.computeRiskScore(0.5, a.slope > 0 ? 1 : 0, 0.5, a.z);
            const scoreB = this.stateB.engine.computeRiskScore(0.5, b.slope > 0 ? 1 : 0, 0.5, b.z);

            const delta = Math.abs(scoreA - scoreB);
            if (delta > 0.2) {
                return {
                    ts: metric.ts,
                    metric: metric.metric_name,
                    type: 'DRIFT', // Statistical drift without topological split
                    delta,
                    scoreA,
                    scoreB,
                    a,
                    b,
                };
            }
        }
        return null;
    }

    applyMetricDiff(m) {
        // Both split engines update sequentially in single-event-loop avoiding mutation leaks
        this.stateA.engine.update(m.metric_name, m.value, new Date(m.ts).toISOString());
        const a = this.stateA.engine.detect(m.metric_name, m.value);

        this.stateB.engine.update(m.metric_name, m.value, new Date(m.ts).toISOString());
        const b = this.stateB.engine.detect(m.metric_name, m.value);

        const diff = this.compare(a, b, m);
        if (diff) {
            this.diffs.push(diff);
        }
    }

    applyIncidentEvent(e) {
        // Both state trees logically follow exact same system states generated externally (Ground Truth)
        this.stateA.applyIncidentEvent(e);
        this.stateB.applyIncidentEvent(e);
    }
}

async function runDiff(db, stream, runId) {
    const diffState = new DiffReplayState();

    let totalMetrics = 0;

    for await (const item of stream) {
        if (item.type === 'metric') {
            diffState.applyMetricDiff(item.payload);
            totalMetrics++;
        }
        if (item.type === 'event') {
            diffState.applyIncidentEvent(item.payload);
        }
    }

    const summary = {
        total_events: totalMetrics,
        matches: totalMetrics - diffState.diffs.length,
        drifts: diffState.diffs.filter(d => d.type === 'DRIFT').length,
        improvements: diffState.diffs.filter(d => d.type === 'IMPROVEMENT').length,
        regressions: diffState.diffs.filter(d => d.type === 'REGRESSION').length,
        avg_score_delta: 0,
        max_score_delta: 0,
    };

    if (diffState.diffs.length > 0) {
        const deltas = diffState.diffs.filter(d => d.delta).map(d => d.delta);
        if (deltas.length > 0) {
            summary.max_score_delta = Math.max(...deltas);
            summary.avg_score_delta = deltas.reduce((acc, v) => acc + v, 0) / deltas.length;
        }
    }

    // Persist diff outcomes
    await db.run('BEGIN');
    for (const d of diffState.diffs) {
        await db.run(
            `INSERT INTO replay_diff_results (run_id, ts, metric_name, diff_type, a_output, b_output, score_delta) VALUES ($1, to_timestamp($2 / 1000.0), $3, $4, $5, $6, $7)`,
            [runId, d.ts, d.metric, d.type, JSON.stringify(d.a), JSON.stringify(d.b), d.delta || 0]
        );
    }

    await db.run(
        `INSERT INTO replay_diff_summary (run_id, total_events, matches, drifts, regressions, improvements, avg_score_delta, max_score_delta) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
            runId,
            summary.total_events,
            summary.matches,
            summary.drifts,
            summary.regressions,
            summary.improvements,
            summary.avg_score_delta,
            summary.max_score_delta,
        ]
    );
    await db.run('COMMIT');

    return { diffState, summary };
}

module.exports = { DiffReplayState, runDiff };
