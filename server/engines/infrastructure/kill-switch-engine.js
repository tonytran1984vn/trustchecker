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
            side_effects: ['All pending settlements queued', 'No new transactions accepted', 'Validators enter standby mode'],
            escalation: 'If frozen >4h → automatic board notification. If >24h → regulatory notification.',
        },
        {
            id: 'KS-02',
            name: 'Tenant Freeze',
            scope: 'Individual tenant/organization account — all actions suspended',
            trigger_authority: {
                automatic: 'OFAC/SDN match OR fraud detection threshold OR compliance alert',
                manual: 'Risk Committee (single member with reason) OR Compliance Officer',
            },
            cannot_trigger: ['super_admin (can view but not freeze)', 'validator', 'other tenants'],
            duration: 'Until review completed (SLA: begin review within 24h)',
            reversibility: 'Reversible — Risk Committee OR Compliance can unfreeze',
            side_effects: ['Tenant transactions halted', 'Pending settlements frozen', 'Tenant notified within 1h'],
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
            side_effects: ['All trust scores frozen at T-1 values', 'New verifications queued', 'Clients notified if >4h'],
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
            side_effects: ['All pending settlements queued', 'Counterparties notified within 2h', 'Regulatory notification if >24h'],
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
            side_effects: ['Revenue impact during freeze', 'Transactions continue at zero-fee', 'Back-billing allowed post-freeze'],
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. CIRCUIT BREAKER FRAMEWORK
// ═══════════════════════════════════════════════════════════════════

const CIRCUIT_BREAKERS = {
    breakers: [
        { id: 'CB-01', metric: 'Validator online rate', threshold: '<70%', action: 'KS-01 Network Freeze', auto: true },
        { id: 'CB-02', metric: 'Settlement failure rate', threshold: '>5% in 1 hour', action: 'KS-05 Settlement Freeze', auto: true },
        { id: 'CB-03', metric: 'Trust score deviation', threshold: '>2σ from 30-day mean', action: 'KS-03 Scoring Freeze', auto: true },
        { id: 'CB-04', metric: 'Capital adequacy ratio', threshold: '<6%', action: 'KS-05 Settlement Freeze', auto: true },
        { id: 'CB-05', metric: 'Blockchain gas cost', threshold: '>10x 30-day average', action: 'KS-04 Anchoring Freeze', auto: true },
        { id: 'CB-06', metric: 'OFAC/SDN match', threshold: 'Any match', action: 'KS-02 Tenant Freeze', auto: true },
        { id: 'CB-07', metric: 'Daily transaction volume', threshold: '>500% of 30-day average', action: 'Alert + manual review', auto: false },
        { id: 'CB-08', metric: 'API error rate', threshold: '>10% of requests', action: 'Rate limit + engineering alert', auto: true },
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
        { level: 'L0 — Auto', description: 'Circuit breaker triggers automatically', response_time: 'Immediate (<1s)', authority: 'System', notification: 'On-call engineer + Risk Committee' },
        { level: 'L1 — Operational', description: 'On-call engineer assesses and responds', response_time: '<15 minutes', authority: 'Engineering lead', notification: 'CTO + Risk Committee' },
        { level: 'L2 — Management', description: 'CTO + Risk Committee evaluate', response_time: '<1 hour', authority: 'CTO + Risk Chair', notification: 'GGC Chair + CFO' },
        { level: 'L3 — Executive', description: 'Crisis Council convenes', response_time: '<4 hours', authority: 'Crisis Council (Risk + GGC + CTO)', notification: 'Full board + legal counsel' },
        { level: 'L4 — Board', description: 'Board-level decision required', response_time: '<24 hours', authority: 'Board of Directors', notification: 'Regulators + external auditor' },
        { level: 'L5 — Regulatory', description: 'Regulatory intervention or notification', response_time: '<48 hours', authority: 'Board + legal + regulator', notification: 'Public disclosure if required' },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class KillSwitchEngine {
    getKillSwitches() { return KILL_SWITCHES; }
    getCircuitBreakers() { return CIRCUIT_BREAKERS; }
    getEscalationLadder() { return ESCALATION_LADDER; }

    getSwitch(switch_id) {
        return KILL_SWITCHES.switches.find(s => s.id === switch_id) || null;
    }

    assessThreat(metrics) {
        const triggered = [];
        for (const cb of CIRCUIT_BREAKERS.breakers) {
            const metricValue = metrics?.[cb.metric];
            if (metricValue !== undefined) triggered.push({ ...cb, current_value: metricValue });
        }
        return { assessed_at: new Date().toISOString(), circuit_breakers_evaluated: CIRCUIT_BREAKERS.breakers.length, triggered };
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
}

module.exports = new KillSwitchEngine();
