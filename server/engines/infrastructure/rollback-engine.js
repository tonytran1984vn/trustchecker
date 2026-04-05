const crypto = require('crypto');
const eventBus = require('./event-bus');
const riskMemoryEngine = require('../crisis-module/risk-memory');

// MOCK INVERSE CONTROL PLANE
const CONTROL_PLANE_INVERSE = {
    network: { haltAllSettlements: 'Call: networkCore.resumeAllSettlements()' },
    policy: { disableMutations: 'Call: policyEngine.enableMutations()' },
    scoring: { fallbackToSnapshot: 'Call: scoringModel.revertToLive(target="T-0")' },
    gateway: { pauseAnchoring: 'Call: blockchainGateway.resumeAnchoring()' },
    settlement: { isolate: 'Call: settlementEngine.reconnect()' },
    treasury: { haltTransfers: 'Call: treasuryBridge.resumeTransfers()' },
    billing: { pauseFeeCollection: 'Call: billingGateway.resumeFeeCollection()' },
};

const killSwitchEngine = require('./kill-switch-engine');
const snapshotEngine = require('./snapshot-engine');

const INVERSE_REGISTRY = {
    KILL_SWITCH_EXECUTED: (event, mode) => {
        const switchId = event.data.switch_id;
        const registry = killSwitchEngine.getRegistry();
        const ksInfoArr = registry[switchId] || [];
        // Extract the action that matches event's recorded action
        const actionInfo = ksInfoArr.find(a => a.action === event.data.action) || ksInfoArr[0];

        if (!actionInfo || !actionInfo.reversible) {
            return { status: 'skipped_irreversible' };
        }

        if (mode === 'dry-run') {
            return {
                status: 'rolled_back',
                reverseCallResult: `Dry-run mode: inverse of ${event.data.domain}.${event.data.action} successfully validated but not executed.`,
            };
        }

        const domain = event.data.domain;
        const action = event.data.action;

        // Execute inverse action logic here
        const reverseCallResult =
            CONTROL_PLANE_INVERSE[domain] && CONTROL_PLANE_INVERSE[domain][action]
                ? CONTROL_PLANE_INVERSE[domain][action]
                : `UNKNOWN INVERSE ACTION FOR ${domain}.${action}`;

        return { status: 'rolled_back', reverseCallResult };
    },
};

class RollbackEngine {
    constructor() {
        this.rollbackLocks = new Set();
    }

    rollback(scenario_hash, mode = 'dry-run', options = {}) {
        const policyEngine = require('./policy-engine');
        const rollback_id = crypto.randomUUID();
        const until_sequence_no = options.until_sequence_no || 0;
        const actor = options.actor || { user_id: 'system', role: 'system_admin', org_id: 'GLOBAL' };

        if (mode !== 'dry-run' && mode !== 'multi-sig-committed') {
            const current_seq = riskMemoryEngine.getCurrentSequence(scenario_hash);
            const event_count = current_seq - until_sequence_no;

            if (event_count < 0) {
                return { success: false, reason: 'invalid_target_sequence' };
            }

            const decision = policyEngine.evaluateRollback(actor, event_count);
            if (decision.status === 'denied') {
                eventBus.publish('ACTION_DENIED_DUE_TO_POLICY', {
                    event_id: crypto.randomUUID(),
                    scenario_hash,
                    sequence_no: current_seq,
                    producer: 'rollback-engine',
                    occurred_at: new Date().toISOString(),
                    data: { actor, action: 'ROLLBACK', reason: decision.reason },
                });
                return { success: false, reason: decision.reason, requires_approval: false };
            }
            if (decision.status === 'requires_approval') {
                const reqId = crypto.randomUUID();
                eventBus.publish('APPROVAL_REQUESTED', {
                    event_id: crypto.randomUUID(),
                    scenario_hash,
                    sequence_no: current_seq,
                    producer: 'rollback-engine',
                    occurred_at: new Date().toISOString(),
                    data: {
                        request_id: reqId,
                        required_signatures: decision.required,
                        target_action: 'ROLLBACK',
                        target_params: { scenario_hash, until_sequence_no },
                    },
                });
                return { success: false, status: 'pending_approval', request_id: reqId, requires_approval: true };
            }
        }

        // Bắt đầu Event Lớn
        eventBus.publish('ROLLBACK_STARTED', {
            event_id: rollback_id,
            scenario_hash,
            sequence_no: 0,
            producer: 'control-plane',
            occurred_at: new Date().toISOString(),
            data: { target_scenario: scenario_hash, initiated_by: 'system_admin', mode, until_sequence_no },
        });

        try {
            const allLogs = riskMemoryEngine.eventStream || [];
            const events = allLogs
                .filter(
                    e =>
                        e.scenario_hash === scenario_hash &&
                        e.event_type !== 'ROLLBACK_STARTED' &&
                        e.event_type !== 'ROLLBACK_COMPLETED' &&
                        e.event_type !== 'ROLLBACK_FAILED'
                )
                .sort((a, b) => a.sequence_no - b.sequence_no);

            if (events.length === 0) {
                eventBus.publish('ROLLBACK_COMPLETED', {
                    event_id: crypto.randomUUID(),
                    scenario_hash,
                    sequence_no: 999999, // end block
                    producer: 'control-plane',
                    occurred_at: new Date().toISOString(),
                    data: { success: false, reason: 'scenario_not_found', rolled_back_events: 0 },
                });
                return { success: false, reason: 'scenario_not_found' };
            }

            const eventsToRollback = events.filter(e => e.sequence_no >= until_sequence_no);
            const reversed = [...eventsToRollback].reverse();

            const total_events_scanned = events.length;
            let total_actions_attempted = 0;
            let total_rolled_back = 0;
            let total_skipped = 0;
            let total_failed = 0;
            const rollbackTrace = [];

            for (const event of reversed) {
                if (event.event_type !== 'KILL_SWITCH_EXECUTED') continue; // Only process actionable logic

                total_actions_attempted++;
                const result = this.processInverse(event, mode);
                if (result && result.status !== 'no_op') {
                    if (result.status === 'rolled_back') total_rolled_back++;
                    else if (result.status === 'failed') total_failed++;
                    else total_skipped++;

                    rollbackTrace.push({
                        rollback_trace_id: rollback_id,
                        original_event_id: event.event_id,
                        type: event.event_type,
                        result,
                    });
                }
            }

            // O(log N) State Restoration using Snapshot Engine Index
            const nearestSeq = snapshotEngine.getNearestSnapshotSequence(scenario_hash, until_sequence_no);
            let restoredState = null;
            if (nearestSeq !== null) {
                const nearest = allLogs.find(
                    e =>
                        e.scenario_hash === scenario_hash &&
                        e.event_type === 'STATE_SNAPSHOT_GENERATED' &&
                        e.sequence_no === nearestSeq
                );

                if (nearest) {
                    restoredState = snapshotEngine.restoreSnapshot(
                        nearest.data.serialized_state,
                        nearest.data.checksum,
                        nearest.sequence_no
                    );

                    // Fast-forward replay from snapshot to target sequence
                    const forwardEvents = events.filter(
                        e => e.sequence_no > nearest.sequence_no && e.sequence_no <= until_sequence_no
                    );
                    forwardEvents.forEach(e => {
                        if (e.event_type === 'METRIC_SNAPSHOT') restoredState.metrics = e.data.metrics;
                        if (e.event_type === 'KILL_SWITCH_EXECUTED' && e.data.result === 'success') {
                            if (!restoredState.active_kill_switches.includes(e.data.switch_id))
                                restoredState.active_kill_switches.push(e.data.switch_id);
                        }
                    });
                }
            }

            if (!restoredState) {
                // Replay from raw scratch if no snapshot exists
                restoredState = { metrics: {}, active_kill_switches: [] };
                events
                    .filter(e => e.sequence_no <= until_sequence_no)
                    .forEach(e => {
                        if (e.event_type === 'METRIC_SNAPSHOT') restoredState.metrics = e.data.metrics;
                        if (e.event_type === 'KILL_SWITCH_EXECUTED' && e.data.result === 'success') {
                            if (!restoredState.active_kill_switches.includes(e.data.switch_id))
                                restoredState.active_kill_switches.push(e.data.switch_id);
                        }
                    });
            }

            const rollback_summary = {
                total_events_scanned,
                total_actions_attempted,
                total_rolled_back,
                total_skipped,
                total_failed,
            };

            const completeEv = eventBus.publish('ROLLBACK_COMPLETED', {
                event_id: crypto.randomUUID(),
                scenario_hash,
                sequence_no: 999999,
                producer: 'control-plane',
                occurred_at: new Date().toISOString(),
                data: { success: true, rollback_summary, trace: rollbackTrace, restored_state: restoredState, mode },
            });

            return completeEv;
        } catch (error) {
            const failEv = eventBus.publish('ROLLBACK_FAILED', {
                event_id: crypto.randomUUID(),
                scenario_hash,
                sequence_no: 999999,
                producer: 'control-plane',
                occurred_at: new Date().toISOString(),
                data: { success: false, partial_rollback: true, reason: error.message, mode },
            });
            return failEv;
        }
    }

    processInverse(event, mode) {
        // Idempotency: Kiểm tra nếu Event đã được Rollback.
        // Bằng cách sweep Risk Memory xem có ROLLBACK_COMPLETED trace nào chứa original_event_id không.
        const allLogs = riskMemoryEngine.eventStream || [];
        const isPreviouslyRolledBack = allLogs.some(
            e =>
                e.event_type === 'ROLLBACK_COMPLETED' &&
                e.data.success &&
                e.data.mode === 'commit' &&
                e.data.trace?.some(t => t.original_event_id === event.event_id && t.result.status === 'rolled_back')
        );
        if (isPreviouslyRolledBack) {
            return { status: 'skipped_idempotent' };
        }

        // Thêm layer lock session
        const rollbackKey = crypto.createHash('sha256').update(`${event.event_id}_rollback`).digest('hex');
        if (this.rollbackLocks.has(rollbackKey)) {
            return { status: 'skipped_idempotent' };
        }

        const handler = INVERSE_REGISTRY[event.event_type];
        if (!handler) return null;

        try {
            const res = handler(event, mode);

            // Lock this event forever from future rollback attempts if it was successful or irreversably skipped
            if (mode === 'commit' && res && res.status !== 'no_op') {
                this.rollbackLocks.add(rollbackKey);
            }

            return res;
        } catch (error) {
            return { status: 'failed', reason: error.message };
        }
    }
}

module.exports = new RollbackEngine();
