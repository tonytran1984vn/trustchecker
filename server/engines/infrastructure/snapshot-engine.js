const crypto = require('crypto');
const eventBus = require('./event-bus');

class SnapshotSerializer {
    serialize(state) {
        return JSON.stringify(state);
    }
    deserialize(payload) {
        return JSON.parse(payload);
    }
}

// Prepare interface for future upgrades:
// class CompressedSnapshotSerializer {
//     serialize(state) { return zlib.deflateSync(JSON.stringify(state)).toString('base64'); }
//     deserialize(payload) { return JSON.parse(zlib.inflateSync(Buffer.from(payload, 'base64')).toString('utf-8')); }
// }

class SnapshotEngine {
    constructor() {
        // Keeps track of the live state of each scenario run
        this.sessionStates = new Map();

        // O(log N) mapping: scenario_hash -> array of snapshot sequence_nos
        this.snapshotIndex = new Map();

        this.serializer = new SnapshotSerializer();

        eventBus.subscribe('*', payload => this.handleEvent(payload));
    }

    handleEvent(payload) {
        const { event_type, scenario_hash, sequence_no, data } = payload;
        if (!scenario_hash) return;

        // Build Index continuously
        if (event_type === 'STATE_SNAPSHOT_GENERATED') {
            if (!this.snapshotIndex.has(scenario_hash)) {
                this.snapshotIndex.set(scenario_hash, []);
            }
            const indexes = this.snapshotIndex.get(scenario_hash);
            if (!indexes.includes(sequence_no)) indexes.push(sequence_no);
            return;
        }

        let state = this.sessionStates.get(scenario_hash);

        if (event_type === 'SCENARIO_STARTED') {
            state = {
                scenario_id: data.scenario_id,
                metrics: data.initial_state,
                active_kill_switches: [],
                last_event_time: payload.occurred_at,
            };
            this.sessionStates.set(scenario_hash, state);
        }

        if (!state) return; // Ignore orphan events if SCENARIO_STARTED was missed

        let requiresSnapshot = false;

        // Apply state transitions
        if (event_type === 'METRIC_SNAPSHOT') {
            state.metrics = data.metrics;
            state.last_event_time = payload.occurred_at;

            // Incremental trigger: Every 50 events roughly, or we can just trigger on timeline markers
            // We use modulo on sequence_no.
            if (sequence_no > 0 && sequence_no % 50 === 0) {
                requiresSnapshot = true;
            }
        }

        if (event_type === 'KILL_SWITCH_EXECUTED') {
            if (data.result === 'success') {
                if (!state.active_kill_switches.includes(data.switch_id)) {
                    state.active_kill_switches.push(data.switch_id);
                }
            }
            requiresSnapshot = true; // Critical state change forces a snapshot
        }

        if (event_type === 'KILL_SWITCH_SKIPPED') {
            // Still a control plane interaction, good place to lock in state
            requiresSnapshot = true;
        }

        if (requiresSnapshot || event_type === 'SCENARIO_COMPLETED') {
            this.captureSnapshot(scenario_hash, sequence_no, state);
        }

        // Clean up memory after scenario completion/rollback completion
        if (event_type === 'SCENARIO_COMPLETED' || event_type === 'ROLLBACK_COMPLETED') {
            // Leave it in memory for a bit in case late events arrive, then purge
            setTimeout(() => this.sessionStates.delete(scenario_hash), 10000);
        }
    }

    captureSnapshot(scenario_hash, sequence_no, stateObj) {
        const stateString = this.serializer.serialize(stateObj);

        // Consistency Model
        const checksum = crypto
            .createHash('sha256')
            .update(stateString + sequence_no)
            .digest('hex');

        eventBus.publish('STATE_SNAPSHOT_GENERATED', {
            event_id: crypto.randomUUID(),
            scenario_hash,
            sequence_no, // Matches the sequence_no of the event that triggered this snapshot
            producer: 'snapshot-engine',
            occurred_at: new Date().toISOString(),
            data: {
                serialized_state: stateString,
                checksum,
                snapshot_reason: 'incremental_or_critical',
            },
        });
    }

    // Helper method for RollbackEngine or UI to restore a snapshot
    restoreSnapshot(serializedState, verifyChecksum, sequence_no) {
        if (verifyChecksum) {
            const checksum = crypto
                .createHash('sha256')
                .update(serializedState + sequence_no)
                .digest('hex');
            if (checksum !== verifyChecksum) {
                throw new Error('Snapshot consistency validation failed. Checksum mismatch!');
            }
        }

        return this.serializer.deserialize(serializedState);
    }

    getNearestSnapshotSequence(scenario_hash, target_seq) {
        const indexes = this.snapshotIndex.get(scenario_hash);
        if (!indexes || indexes.length === 0) return null;

        let nearest = null;
        for (const seq of indexes) {
            if (seq <= target_seq) {
                if (nearest === null || seq > nearest) nearest = seq;
            }
        }
        return nearest;
    }
}

module.exports = new SnapshotEngine();
