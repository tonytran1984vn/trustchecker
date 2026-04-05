/**
 * Sovereign Risk Operating System — L5 Risk Memory Layer
 * Captures historical run-states of systemic stress testing to fuel Predictive Intelligence.
 */
const crypto = require('crypto');
const eventBus = require('../infrastructure/event-bus');

class RiskMemoryEngine {
    constructor() {
        this.memoryBank = new Map();
        this.eventStream = []; // Dedicated generic event stream
        this.writeMode = 'append-only';

        eventBus.subscribe('*', event => {
            this.appendToEventStream(event);
        });
    }

    appendToEventStream(event) {
        const entry = {
            ...event,
            committed_at: new Date().toISOString(),
        };
        const { checksum, ...dataToHash } = entry;
        entry.checksum = crypto.createHash('sha256').update(JSON.stringify(dataToHash)).digest('hex');
        this.eventStream.push(Object.freeze(entry));
    }

    commitMemory(
        scenario_id,
        temporal_state,
        active_killswitches,
        fragility_index,
        execution_logs,
        scenario_hash = null
    ) {
        let memId = `MEM-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        if (scenario_hash) memId = `MEM-${scenario_hash}`;

        if (this.memoryBank.has(memId)) {
            throw new Error(`Risk Memory Immutable: Cannot overwrite existing simulation log (ID: ${memId})`);
        }

        const memoryEntry = {
            memory_id: memId,
            schema_version: 'v3.2.1',
            scenario_hash: scenario_hash,
            run_timestamp: new Date().toISOString(),
            scenario_id,
            temporal_state,
            triggered_switches: active_killswitches,
            fragility_index,
            outcome: fragility_index >= 85 ? 'collapsed' : 'survived',
            execution_audit: execution_logs,
        };

        const { checksum, ...dataToHash } = memoryEntry;
        memoryEntry.checksum = crypto.createHash('sha256').update(JSON.stringify(dataToHash)).digest('hex');

        // Append-Only Guardrail: Deep Freeze
        this.memoryBank.set(memId, Object.freeze(memoryEntry));

        return memoryEntry;
    }

    hasExecuted(scenario_hash, switch_id, mode = 'commit') {
        const events = this.eventStream.filter(
            e =>
                e.scenario_hash === scenario_hash &&
                e.event_type === 'KILL_SWITCH_EXECUTED' &&
                e.data?.switch_id === switch_id &&
                e.data?.mode === mode &&
                e.data?.result === 'success'
        );
        return events.length > 0;
    }

    getCurrentSequence(scenario_hash) {
        let maxSeq = 0;
        for (let i = this.eventStream.length - 1; i >= 0; i--) {
            if (this.eventStream[i].scenario_hash === scenario_hash) {
                if (this.eventStream[i].sequence_no > maxSeq) {
                    maxSeq = this.eventStream[i].sequence_no;
                }
            }
        }
        return maxSeq;
    }

    getHistory() {
        return Array.from(this.memoryBank.values());
    }
}

module.exports = new RiskMemoryEngine();
