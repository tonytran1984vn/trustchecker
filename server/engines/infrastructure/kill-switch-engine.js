/**
 * TrustChecker — Kill-Switch Architecture Engine v1.0
 * CRITICAL: Emergency freeze authority for infrastructure network
 *
 * Every infrastructure network MUST have:
 *   - Circuit breakers (auto-trigger)
 *   - Emergency governance overrides (human-trigger)
 *   - Escalation ladder (tiered response)
 *   - Clear authority: WHO can freeze WHAT
 */

// ═══════════════════════════════════════════════════════════════════
// 1. KILL-SWITCH REGISTRY
// ═══════════════════════════════════════════════════════════════════

const KILL_SWITCHES = {
    switches: [
        {
            id: 'KS-01',
            name: 'Network Freeze',
            scope: 'Entire validator network — all settlements, verifications, anchoring halt',
            trigger_authority: {
                automatic: 'Circuit breaker: >30% validators offline OR consensus failure OR Byzantine detection',
                manual: 'Crisis Council (2 of 3: Risk Chair + GGC Chair + CTO)',
            },
            cannot_trigger: ['super_admin alone', 'single GGC member', 'treasury_role', 'compliance_officer alone'],
            duration: 'Until explicit unfreeze by same authority + post-mortem completed',
            reversibility: 'Reversible — requires same authority level to unfreeze',
            side_effects: [
                'All pending settlements queued',
                'No new transactions accepted',
                'Validators enter standby mode',
            ],
            escalation: 'If frozen >4h → automatic board notification. If >24h → regulatory notification.',
        },
        {
            id: 'KS-02',
            name: 'Org Freeze',
            scope: 'Individual org/organization account — all actions suspended',
            trigger_authority: {
                automatic: 'OFAC/SDN match OR fraud detection threshold OR compliance alert',
                manual: 'Risk Committee (single member with reason) OR Compliance Officer',
            },
            cannot_trigger: ['super_admin (can view but not freeze)', 'validator', 'other orgs'],
            duration: 'Until review completed (SLA: begin review within 24h)',
            reversibility: 'Reversible — Risk Committee OR Compliance can unfreeze',
            side_effects: ['Org transactions halted', 'Pending settlements frozen', 'Org notified within 1h'],
            escalation: 'If not reviewed within 24h → auto-escalate to GGC.',
        },
        {
            id: 'KS-03',
            name: 'Scoring Freeze',
            scope: 'Trust scoring engine halted — all scores frozen at last known value',
            trigger_authority: {
                automatic: 'Model drift detected (>2σ deviation) OR data poisoning suspected',
                manual: 'Risk Committee + CTO jointly',
            },
            cannot_trigger: ['super_admin', 'ivu_validator', 'blockchain_operator'],
            duration: 'Until model validation completed + independent review',
            reversibility: 'Reversible — requires model validation report + Risk Committee sign-off',
            side_effects: [
                'All trust scores frozen at T-1 values',
                'New verifications queued',
                'Clients notified if >4h',
            ],
            escalation: 'If not resolved within 48h → external model auditor engaged.',
        },
        {
            id: 'KS-04',
            name: 'Anchoring Freeze',
            scope: 'Blockchain anchoring halted — no new hashes written to chain',
            trigger_authority: {
                automatic: 'Chain integrity failure OR gas cost spike >10x OR smart contract vulnerability detected',
                manual: 'CTO OR Blockchain Operator (with Risk Committee notification)',
            },
            cannot_trigger: ['super_admin', 'treasury_role', 'compliance_officer'],
            duration: 'Until chain integrity verified + cost normalized',
            reversibility: 'Reversible — CTO can resume with Risk notification',
            side_effects: ['Verifications continue off-chain', 'Anchoring queue builds', 'Batch anchor when resumed'],
            escalation: 'If >24h → GGC notification. If >72h → consider alternative chain.',
        },
        {
            id: 'KS-05',
            name: 'Settlement Freeze',
            scope: 'All carbon credit settlements halted',
            trigger_authority: {
                automatic: 'CAR < 6% (critical) OR insurance lapse OR regulatory order',
                manual: 'Risk Committee + Compliance jointly',
            },
            cannot_trigger: ['super_admin', 'treasury_role alone', 'GGC alone without Risk'],
            duration: 'Until capital restored above 8% + regulatory clearance',
            reversibility: 'Reversible — requires CAR verification + dual-key approval',
            side_effects: [
                'All pending settlements queued',
                'Counterparties notified within 2h',
                'Regulatory notification if >24h',
            ],
            escalation: 'If >24h → board + regulator notification. If >7d → orderly wind-down initiated.',
        },
        {
            id: 'KS-06',
            name: 'Fee Collection Freeze',
            scope: 'Fee collection halted — transactions continue but fees not charged',
            trigger_authority: {
                automatic: 'Billing system error detected OR regulatory fee investigation',
                manual: 'CFO + GGC Chair',
            },
            cannot_trigger: ['super_admin', 'engineering team alone'],
            duration: 'Until billing system validated + regulatory clearance',
            reversibility: 'Reversible — CFO can resume with backfill of missed fees',
            side_effects: [
                'Revenue impact during freeze',
                'Transactions continue at zero-fee',
                'Back-billing allowed post-freeze',
            ],
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. CIRCUIT BREAKER FRAMEWORK
// ═══════════════════════════════════════════════════════════════════

const CIRCUIT_BREAKERS = {
    breakers: [
        { id: 'CB-01', metric: 'Validator online rate', threshold: '<70%', action: 'KS-01 Network Freeze', auto: true },
        {
            id: 'CB-02',
            metric: 'Settlement failure rate',
            threshold: '>5% in 1 hour',
            action: 'KS-05 Settlement Freeze',
            auto: true,
        },
        {
            id: 'CB-03',
            metric: 'Trust score deviation',
            threshold: '>2σ from 30-day mean',
            action: 'KS-03 Scoring Freeze',
            auto: true,
        },
        {
            id: 'CB-04',
            metric: 'Capital adequacy ratio',
            threshold: '<6%',
            action: 'KS-05 Settlement Freeze',
            auto: true,
        },
        {
            id: 'CB-05',
            metric: 'Blockchain gas cost',
            threshold: '>10x 30-day average',
            action: 'KS-04 Anchoring Freeze',
            auto: true,
        },
        { id: 'CB-06', metric: 'OFAC/SDN match', threshold: 'Any match', action: 'KS-02 Org Freeze', auto: true },
        {
            id: 'CB-07',
            metric: 'Daily transaction volume',
            threshold: '>500% of 30-day average',
            action: 'Alert + manual review',
            auto: false,
        },
        {
            id: 'CB-08',
            metric: 'API error rate',
            threshold: '>10% of requests',
            action: 'Rate limit + engineering alert',
            auto: true,
        },
    ],

    recovery: {
        auto_recovery: false,
        manual_recovery_required: true,
        post_mortem_required: true,
        post_mortem_deadline: '72 hours',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 3. ESCALATION LADDER
// ═══════════════════════════════════════════════════════════════════

const ESCALATION_LADDER = {
    levels: [
        {
            level: 'L0 — Auto',
            description: 'Circuit breaker triggers automatically',
            response_time: 'Immediate (<1s)',
            authority: 'System',
            notification: 'On-call engineer + Risk Committee',
        },
        {
            level: 'L1 — Operational',
            description: 'On-call engineer assesses and responds',
            response_time: '<15 minutes',
            authority: 'Engineering lead',
            notification: 'CTO + Risk Committee',
        },
        {
            level: 'L2 — Management',
            description: 'CTO + Risk Committee evaluate',
            response_time: '<1 hour',
            authority: 'CTO + Risk Chair',
            notification: 'GGC Chair + CFO',
        },
        {
            level: 'L3 — Executive',
            description: 'Crisis Council convenes',
            response_time: '<4 hours',
            authority: 'Crisis Council (Risk + GGC + CTO)',
            notification: 'Full board + legal counsel',
        },
        {
            level: 'L4 — Board',
            description: 'Board-level decision required',
            response_time: '<24 hours',
            authority: 'Board of Directors',
            notification: 'Regulators + external auditor',
        },
        {
            level: 'L5 — Regulatory',
            description: 'Regulatory intervention or notification',
            response_time: '<48 hours',
            authority: 'Board + legal + regulator',
            notification: 'Public disclosure if required',
        },
    ],
};

const crypto = require('crypto');
const riskMemoryEngine = require('../crisis-module/risk-memory');
const eventBus = require('./event-bus');

// ═══════════════════════════════════════════════════════════════════
// 4. CONTROL PLANE ABSTRACTION & ACTION REGISTRY
// ═══════════════════════════════════════════════════════════════════
const CONTROL_PLANE = {
    network: { haltAllSettlements: () => 'Call: networkControl.haltAllSettlements(force=true)' },
    policy: { disableMutations: () => 'Call: policyEngine.disableMutations(scope=GLOBAL_ADMIN)' },
    scoring: { fallbackToSnapshot: () => 'Call: scoringModel.fallbackToSnapshot(target="T-1")' },
    gateway: { pauseAnchoring: () => 'Call: blockchainGateway.pauseAnchoring()' },
    settlement: { isolate: () => 'Call: settlementEngine.isolate()' },
    treasury: { haltTransfers: () => 'Call: treasuryBridge.haltTransfers()' },
    billing: { pauseFeeCollection: () => 'Call: billingGateway.pauseFeeCollection()' },
};

const KILL_SWITCH_REGISTRY = {
    'KS-01': [
        {
            domain: 'network',
            action: 'haltAllSettlements',
            mutation: 'System Governance frozen globally',
            criticality: 'high',
            reversible: false,
        },
    ],
    'KS-02': [
        {
            domain: 'policy',
            action: 'disableMutations',
            mutation: 'Org governance suspended. Escalating to GGC.',
            criticality: 'high',
            reversible: true,
        },
    ],
    'KS-03': [
        {
            domain: 'scoring',
            action: 'fallbackToSnapshot',
            mutation: 'ERQF Model locked.',
            criticality: 'medium',
            reversible: true,
        },
    ],
    'KS-04': [
        { domain: 'gateway', action: 'pauseAnchoring', fallbackToSnapshot: true, criticality: 'low', reversible: true },
    ],
    'KS-05': [
        { domain: 'settlement', action: 'isolate', criticality: 'critical', reversible: false },
        {
            domain: 'treasury',
            action: 'haltTransfers',
            mutation: 'Settlement suspended. Capital Reserve activated.',
            criticality: 'critical',
            reversible: false,
        },
    ],
    'KS-06': [{ domain: 'billing', action: 'pauseFeeCollection', criticality: 'low', reversible: true }],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class KillSwitchEngine {
    constructor() {
        this.inFlightLocks = new Set();
        eventBus.subscribe('KILL_SWITCH_TRIGGERED', event => this.handleKillSwitchTrigger(event));
    }

    getKillSwitches() {
        return KILL_SWITCHES;
    }
    getCircuitBreakers() {
        return CIRCUIT_BREAKERS;
    }
    getEscalationLadder() {
        return ESCALATION_LADDER;
    }

    getSwitch(switch_id) {
        return KILL_SWITCHES.switches.find(s => s.id === switch_id) || null;
    }

    assessThreat(metrics) {
        const triggered = [];
        for (const cb of CIRCUIT_BREAKERS.breakers) {
            const metricValue = metrics?.[cb.metric];
            if (metricValue !== undefined) triggered.push({ ...cb, current_value: metricValue });
        }
        return {
            assessed_at: new Date().toISOString(),
            circuit_breakers_evaluated: CIRCUIT_BREAKERS.breakers.length,
            triggered,
        };
    }

    getFullArchitecture() {
        return {
            title: 'Kill-Switch Architecture — Infrastructure-Grade',
            version: '1.0',
            principle: 'Every critical function has a kill-switch. No single person can freeze the network.',
            switches: KILL_SWITCHES,
            circuit_breakers: CIRCUIT_BREAKERS,
            escalation: ESCALATION_LADDER,
        };
    }

    handleKillSwitchTrigger(event) {
        const { switch_id, mode } = event.data;
        const scenario_hash = event.scenario_hash;
        const actor = event.data.actor || { user_id: 'system', role: 'system_admin', org_id: 'GLOBAL' };

        const ks = this.getSwitch(switch_id);
        if (!ks) return;

        const policyEngine = require('./policy-engine');
        if (mode !== 'dry-run' && mode !== 'multi-sig-committed') {
            const decision = policyEngine.evaluateKillSwitch(actor, switch_id);
            if (decision.status === 'denied') {
                eventBus.publish('ACTION_DENIED_DUE_TO_POLICY', {
                    event_id: crypto.randomUUID(),
                    scenario_hash,
                    sequence_no: event.sequence_no + 1,
                    producer: 'kill-switch-engine',
                    occurred_at: new Date().toISOString(),
                    data: { actor, action: 'KILL_SWITCH', switch_id, reason: decision.reason },
                });
                return;
            }
            if (decision.status === 'requires_approval') {
                const reqId = crypto.randomUUID();
                eventBus.publish('APPROVAL_REQUESTED', {
                    event_id: crypto.randomUUID(),
                    scenario_hash,
                    sequence_no: event.sequence_no + 1,
                    producer: 'kill-switch-engine',
                    occurred_at: new Date().toISOString(),
                    data: {
                        request_id: reqId,
                        required_signatures: decision.required,
                        target_action: 'KILL_SWITCH',
                        target_params: { switch_id, scenario_hash, options: { actor } },
                    },
                });
                return;
            }
        }

        const lockKey = `${switch_id}_${scenario_hash}_${mode}`;
        if (scenario_hash && mode === 'commit') {
            if (
                this.inFlightLocks.has(lockKey) ||
                (typeof riskMemoryEngine.hasExecuted === 'function' &&
                    riskMemoryEngine.hasExecuted(scenario_hash, switch_id, mode))
            ) {
                eventBus.publish('KILL_SWITCH_SKIPPED', {
                    event_id: crypto.randomUUID(),
                    scenario_hash,
                    root_scenario_id: event.root_scenario_id,
                    sequence_no: event.sequence_no + 1, // Hack for PoC ordering
                    producer: 'kill-switch',
                    occurred_at: new Date().toISOString(),
                    data: {
                        switch_id,
                        reason: 'already_executed',
                    },
                });
                return;
            }
            this.inFlightLocks.add(lockKey);
        }

        const actions = KILL_SWITCH_REGISTRY[switch_id] || [];
        const affectedSystems = [];
        const notes = [];
        const latency_ms = Math.floor(Math.random() * 200) + 50;

        actions.forEach(a => {
            const result =
                CONTROL_PLANE[a.domain] && CONTROL_PLANE[a.domain][a.action]
                    ? CONTROL_PLANE[a.domain][a.action]()
                    : 'UNKNOWN ACTION';
            affectedSystems.push(a.domain);
            notes.push(`[${result}] ${a.mutation || 'No text mutation defined.'}`);
        });

        eventBus.publish('KILL_SWITCH_EXECUTED', {
            event_id: crypto.randomUUID(),
            scenario_hash,
            root_scenario_id: event.root_scenario_id,
            sequence_no: event.sequence_no + 1,
            producer: 'kill-switch',
            occurred_at: new Date().toISOString(),
            data: {
                switch_id,
                mode,
                result: 'success',
                latency_ms,
                domain: actions[0]?.domain || 'unknown',
                action: actions[0]?.action || 'unknown',
                reversible: event.data.reversible || false,
                impact: {
                    affected_systems: affectedSystems,
                    notes: notes,
                },
            },
        });

        if (scenario_hash && mode === 'commit') {
            setTimeout(() => this.inFlightLocks.delete(lockKey), 5000);
        }
    }
    getRegistry() {
        return KILL_SWITCH_REGISTRY;
    }
}

module.exports = new KillSwitchEngine();
