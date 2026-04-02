const crypto = require('crypto');
const { PredictiveOpsEngine } = require('./predictive-intelligence');
const db = require('../../db');

// L3.5: Deterministic Streaming
async function* streamTimeline({ events, metrics }) {
    let i = 0,
        j = 0;
    let seq = 0;

    while (i < events.length || j < metrics.length) {
        const e = events[i];
        const m = metrics[j];

        if (
            !m ||
            (e &&
                (new Date(e.ts).getTime() < new Date(m.ts).getTime() ||
                    new Date(e.ts).getTime() === new Date(m.ts).getTime()))
        ) {
            yield {
                ts: new Date(e.ts).getTime(),
                type: 'event',
                payload: e,
                seq: seq++,
            };
            i++;
        } else {
            yield {
                ts: new Date(m.ts).getTime(),
                type: 'metric',
                payload: m,
                seq: seq++,
            };
            j++;
        }
    }
}

class ReplayState {
    constructor() {
        this.incidents = new Map();
        this.engine = new PredictiveOpsEngine();
        this.timeline = []; // debug/UI audit trail
        this.lastTs = 0;
    }

    clone() {
        // Deterministic memory clone
        const cloned = new ReplayState();
        cloned.hydrate(this.serialize());
        return cloned;
    }

    serialize() {
        // Must be deterministic! Sorted Maps.
        const incArray = Array.from(this.incidents.entries()).sort((a, b) => a[0].localeCompare(b[0]));
        return {
            incidents: incArray,
            metrics: this.engine.exportState(),
            lastTs: this.lastTs,
        };
    }

    hydrate(snapshot) {
        this.incidents = new Map(snapshot.incidents);
        this.engine.importState(snapshot.metrics);
        this.lastTs = snapshot.lastTs;
    }

    applyIncidentEvent(e) {
        const { incident_id, event_type, payload } = e;
        let state = this.incidents.get(incident_id) || {};

        switch (event_type) {
            case 'CREATED':
                state = { ...payload, status: 'open' };
                break;
            case 'ACK':
                state.status = 'acknowledged';
                break;
            case 'ESCALATED':
                state.severity = payload.severity;
                break;
            case 'RESOLVED':
                state.status = 'resolved';
                break;
        }
        this.incidents.set(incident_id, state);
    }

    applyMetric(m) {
        this.engine.update(m.metric_name, m.value, new Date(m.ts).toISOString());
        const result = this.engine.detect(m.metric_name, m.value);

        if (result.anomaly) {
            this.timeline.push({
                ts: m.ts,
                type: 'anomaly',
                metric: m.metric_name,
                z: result.z,
            });
        }
        return result;
    }
}

async function replayUntil(stream, state, targetTs) {
    for await (const item of stream) {
        if (item.ts > targetTs) break;

        if (item.type === 'event') {
            state.applyIncidentEvent(item.payload);
        }

        if (item.type === 'metric') {
            state.applyMetric(item.payload);
        }

        state.lastTs = item.ts;
    }
    return state;
}

const SNAPSHOT_INTERVAL_MS = 60000; // Snapshot every 60s of virtual time

class TimeScrubber {
    constructor(dbAdapter) {
        this.db = dbAdapter;
    }

    hash(serialized) {
        return crypto.createHash('sha256').update(JSON.stringify(serialized)).digest('hex');
    }

    async saveSnapshot(state) {
        const serialized = state.serialize();
        const checksum = this.hash(serialized);

        await this.db.run(
            `INSERT INTO replay_snapshots (ts, state, checksum)
           VALUES (to_timestamp($1 / 1000.0), $2, $3)
           ON CONFLICT (ts) DO NOTHING`,
            [state.lastTs, JSON.stringify(serialized), checksum]
        );
    }

    async restoreTo(targetTs) {
        const sql = `
          SELECT extract(epoch from ts)*1000 as ts_ms, state, checksum 
          FROM replay_snapshots
          WHERE extract(epoch from ts)*1000 <= $1
          ORDER BY ts DESC
          LIMIT 1
        `;
        const snaps = await this.db.all(sql, [targetTs]);
        const state = new ReplayState();

        if (snaps && snaps.length) {
            const raw = typeof snaps[0].state === 'string' ? JSON.parse(snaps[0].state) : snaps[0].state;
            const computedCheck = this.hash(raw);
            if (computedCheck !== snaps[0].checksum) {
                throw new Error('Snapshot Corruption! Checksum mismatch detected.');
            }
            state.hydrate(raw);
            return {
                state,
                replayFrom: Math.floor(snaps[0].ts_ms),
            };
        }
        return { state, replayFrom: 0 };
    }

    async extractHistoricalData(startTs, endTs) {
        // Fetch ordered stream data from DB
        const eventsSql = `SELECT extract(epoch from created_at)*1000 as ts, incident_id, event_type, payload FROM incident_events WHERE extract(epoch from created_at)*1000 BETWEEN $1 AND $2 ORDER BY created_at ASC`;
        const metricsSql = `SELECT extract(epoch from ts)*1000 as ts, metric_name, value FROM ops_metrics_telemetry WHERE extract(epoch from ts)*1000 BETWEEN $1 AND $2 ORDER BY ts ASC`;

        const [events, metrics] = await Promise.all([
            this.db.all(eventsSql, [startTs, endTs]),
            this.db.all(metricsSql, [startTs, endTs]),
        ]);
        return { events: events || [], metrics: metrics || [] };
    }

    async seek(targetTs) {
        const { state, replayFrom } = await restoreTo(targetTs);
        const data = await this.extractHistoricalData(replayFrom, targetTs);
        const stream = streamTimeline(data);
        const endState = await replayUntil(stream, state, targetTs);

        // Auto-checkpoint check
        if (endState.lastTs - replayFrom >= SNAPSHOT_INTERVAL_MS) {
            await this.saveSnapshot(endState);
        }
        return endState;
    }

    // In a test environment, allows direct injection of pre-fetched dataset to bypass DB reads
    async seekOffline(data, targetTs) {
        const state = new ReplayState();
        const stream = streamTimeline(data);
        return replayUntil(stream, state, targetTs);
    }
}

module.exports = { ReplayState, TimeScrubber, streamTimeline, replayUntil };
