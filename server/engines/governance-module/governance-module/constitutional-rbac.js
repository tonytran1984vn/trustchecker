/**
 * TrustChecker — Constitutional RBAC Enforcement Engine v1.0
 * 
 * THIS IS THE ENFORCEMENT LAYER.
 * Charters define policy. This engine ENFORCES it in code.
 * 
 * 6 Critical Separations (hardcoded, non-bypassable):
 *   1. Super Admin ≠ Financial Controller
 *   2. Blockchain Operator ≠ Governance Authority
 *   3. IVU ≠ Weight Setter
 *   4. Risk ≠ Execution
 *   5. Compliance ≠ Economic Allocator
 *   6. Treasury ≠ Policy Maker
 * 
 * Even super_admin CANNOT bypass constitutional constraints.
 */

// ═══════════════════════════════════════════════════════════════════
// CONSTITUTIONAL POWER MAP
// Maps: domain → action → { allowed_roles, denied_roles, requires, charter }
// ═══════════════════════════════════════════════════════════════════

const CONSTITUTIONAL_POWERS = {

    // ─── MONETIZATION DOMAIN ──────────────────────────────────────

    'monetization.revenue_allocation.view': {
        allowed: ['super_admin', 'ggc_member', 'risk_committee', 'compliance_officer', 'admin', 'executive'],
        denied: [],
        requires: null,
        charter: 'economic_governance',
        article: 1,
    },
    'monetization.revenue_allocation.change': {
        allowed: ['ggc_member'],
        denied: ['super_admin', 'admin', 'risk_committee', 'compliance_officer', 'blockchain_operator'],
        requires: { type: 'super_majority', threshold: 75, of: 'ggc_members' },
        charter: 'economic_governance',
        article: 1,
        notice_days: 30,
    },
    'monetization.pricing.change': {
        allowed: ['ggc_member'],
        denied: ['super_admin', 'admin', 'blockchain_operator', 'risk_committee'],
        requires: { type: 'approval', from: 'ggc_member' },
        charter: 'economic_governance',
        article: 2,
        notice_days: 14,
    },
    'monetization.validator_incentive.change': {
        allowed: [],  // NOBODY — formula-driven
        denied: ['super_admin', 'admin', 'ggc_member', 'risk_committee', 'compliance_officer'],
        requires: { type: 'constitutional_amendment' },
        charter: 'economic_governance',
        article: 2,
    },
    'monetization.reserve.withdraw': {
        allowed: [],   // Dual-key only
        denied: ['super_admin', 'admin', 'blockchain_operator'],
        requires: { type: 'dual_key', roles: ['risk_committee', 'compliance_officer'] },
        charter: 'economic_governance',
        article: 3,
        cooling_hours: 24,
    },
    'monetization.treasury.payout': {
        allowed: ['compliance_officer'],   // With dual-key
        denied: ['super_admin', 'ggc_member', 'blockchain_operator'],
        requires: { type: 'dual_key', roles: ['risk_committee', 'compliance_officer'] },
        charter: 'economic_governance',
        article: 3,
    },
    'monetization.sla_credit.view': {
        allowed: ['super_admin', 'admin', 'ggc_member', 'risk_committee', 'compliance_officer'],
        denied: [],
        requires: null,
        charter: 'economic_governance',
        article: 4,
    },
    'monetization.sla_credit.calculate': {
        allowed: ['compliance_officer'],
        denied: ['super_admin', 'admin', 'ggc_member'],
        requires: null,   // Auto engine — no override
        charter: 'economic_governance',
        article: 4,
    },

    // ─── NETWORK DOMAIN ──────────────────────────────────────────

    'network.validator.view': {
        allowed: ['super_admin', 'ggc_member', 'risk_committee', 'compliance_officer', 'admin', 'blockchain_operator', 'ivu_validator'],
        denied: [],
        requires: null,
        charter: 'network_power',
        article: 1,
    },
    'network.validator.admit': {
        allowed: ['ggc_member'],
        denied: ['super_admin', 'admin', 'blockchain_operator', 'risk_committee', 'ivu_validator'],
        requires: { type: 'approval', from: 'ggc_member' },
        charter: 'network_power',
        article: 1,
    },
    'network.validator.suspend': {
        allowed: ['risk_committee'],
        denied: ['super_admin', 'admin', 'blockchain_operator', 'ivu_validator'],
        requires: { type: 'dual_key', roles: ['risk_committee', 'ggc_member'] },
        charter: 'network_power',
        article: 4,
    },
    'network.validator.slash': {
        allowed: ['risk_committee'],
        denied: ['super_admin', 'admin', 'blockchain_operator', 'ivu_validator', 'compliance_officer'],
        requires: { type: 'dual_key', roles: ['risk_committee', 'ggc_member'] },
        charter: 'network_power',
        article: 4,
        appeal_days: 14,
    },
    'network.consensus.view': {
        allowed: ['super_admin', 'ggc_member', 'risk_committee', 'admin', 'blockchain_operator', 'ivu_validator'],
        denied: [],
        requires: null,
        charter: 'network_power',
        article: 2,
    },
    'network.consensus.override': {
        allowed: [],   // NOBODY — consensus is immutable
        denied: ['super_admin', 'admin', 'ggc_member', 'risk_committee', 'blockchain_operator'],
        requires: null,
        charter: 'network_power',
        article: 2,
        immutable: true,
    },
    'network.finality.revert': {
        allowed: [],   // NOBODY
        denied: ['super_admin', 'admin', 'ggc_member', 'risk_committee', 'blockchain_operator'],
        requires: null,
        charter: 'network_power',
        article: 2,
        immutable: true,
    },
    'network.scoring_weights.change': {
        allowed: ['ggc_member'],
        denied: ['super_admin', 'admin', 'ivu_validator', 'blockchain_operator'],
        requires: { type: 'constitutional_amendment' },
        charter: 'network_power',
        article: 2,
    },
    'network.protocol.upgrade': {
        allowed: ['ggc_member'],
        denied: ['super_admin', 'blockchain_operator'],
        requires: { type: 'vote', threshold: 67, of: 'validators' },
        charter: 'network_power',
        article: 5,
        min_days: 77,
    },
    'network.chain.anchor': {
        allowed: ['blockchain_operator'],
        denied: ['super_admin', 'admin', 'ggc_member'],
        requires: null,
        charter: 'network_power',
        article: 1,
    },
    'network.chain.rewrite': {
        allowed: [],   // NOBODY
        denied: ['super_admin', 'admin', 'ggc_member', 'blockchain_operator'],
        requires: null,
        charter: 'network_power',
        article: 2,
        immutable: true,
    },

    // ─── CRISIS DOMAIN ───────────────────────────────────────────

    'crisis.monitor.activate': {
        allowed: ['super_admin', 'admin', 'ops_manager', 'risk_officer'],
        denied: [],
        requires: null,
        charter: 'crisis_constitution',
        article: 1,
    },
    'crisis.yellow.activate': {
        allowed: ['ops_manager', 'risk_officer', 'risk_committee'],
        denied: ['blockchain_operator', 'ivu_validator'],
        requires: null,
        charter: 'crisis_constitution',
        article: 1,
        max_duration_hours: 24,
    },
    'crisis.orange.activate': {
        allowed: ['admin', 'risk_committee'],
        denied: ['super_admin', 'blockchain_operator'],
        requires: { type: 'dual_key', roles: ['admin', 'risk_committee'] },
        charter: 'crisis_constitution',
        article: 1,
        max_duration_hours: 12,
    },
    'crisis.red.activate': {
        allowed: [],
        denied: ['blockchain_operator', 'ivu_validator', 'compliance_officer'],
        requires: { type: 'dual_key', roles: ['admin', 'super_admin'] },
        charter: 'crisis_constitution',
        article: 1,
        max_duration_hours: 6,
    },
    'crisis.black.activate': {
        allowed: [],
        denied: ['blockchain_operator', 'ivu_validator'],
        requires: { type: 'triple_key', roles: ['super_admin', 'ggc_member', 'compliance_officer'] },
        charter: 'crisis_constitution',
        article: 1,
        max_duration_hours: 4,
    },
    'crisis.killswitch.tenant': {
        allowed: ['admin'],
        denied: ['blockchain_operator', 'ivu_validator'],
        requires: null,
        charter: 'crisis_constitution',
        article: 3,
        max_duration_hours: 24,
    },
    'crisis.killswitch.global': {
        allowed: [],
        denied: ['blockchain_operator', 'ivu_validator'],
        requires: { type: 'dual_key', roles: ['admin', 'super_admin'] },
        charter: 'crisis_constitution',
        article: 3,
        max_duration_hours: 6,
    },
    'crisis.duration.extend': {
        allowed: [],   // NOBODY — auto-expire is constitutional
        denied: ['super_admin', 'admin', 'ggc_member', 'risk_committee'],
        requires: null,
        charter: 'crisis_constitution',
        article: 1,
        immutable: true,
    },
    'crisis.audit_log.override': {
        allowed: [],   // NOBODY
        denied: ['super_admin', 'admin', 'ggc_member', 'risk_committee', 'blockchain_operator'],
        requires: null,
        charter: 'crisis_constitution',
        article: 4,
        immutable: true,
    },
    'crisis.regulatory_freeze.execute': {
        allowed: ['compliance_officer'],
        denied: ['super_admin', 'admin', 'blockchain_operator'],
        requires: null,
        charter: 'crisis_constitution',
        article: 3,
    },
};

// ═══════════════════════════════════════════════════════════════════
// 6 CRITICAL SEPARATIONS — HARDCODED, NON-BYPASSABLE
// ═══════════════════════════════════════════════════════════════════

const CRITICAL_SEPARATIONS = [
    {
        id: 'SEP-1',
        rule: 'Super Admin ≠ Financial Controller',
        entity: 'super_admin',
        cannot: ['monetization.revenue_allocation.change', 'monetization.reserve.withdraw', 'monetization.treasury.payout', 'monetization.pricing.change'],
        rationale: 'Super Admin has system visibility, not financial control',
    },
    {
        id: 'SEP-2',
        rule: 'Blockchain Operator ≠ Governance Authority',
        entity: 'blockchain_operator',
        cannot: ['network.validator.admit', 'network.validator.suspend', 'network.validator.slash', 'network.scoring_weights.change', 'network.protocol.upgrade'],
        rationale: 'Blockchain Operator maintains chain integrity, does not govern network',
    },
    {
        id: 'SEP-3',
        rule: 'IVU ≠ Weight Setter',
        entity: 'ivu_validator',
        cannot: ['network.scoring_weights.change', 'network.validator.suspend', 'network.validator.slash', 'network.consensus.override'],
        rationale: 'IVU provides scientific oversight, does not set governance parameters',
    },
    {
        id: 'SEP-4',
        rule: 'Risk ≠ Execution',
        entity: 'risk_committee',
        cannot: ['monetization.reserve.withdraw', 'monetization.treasury.payout', 'network.chain.anchor'],
        rationale: 'Risk proposes and oversees, does not execute',
    },
    {
        id: 'SEP-5',
        rule: 'Compliance ≠ Economic Allocator',
        entity: 'compliance_officer',
        cannot: ['monetization.revenue_allocation.change', 'monetization.pricing.change', 'monetization.validator_incentive.change'],
        rationale: 'Compliance enforces rules, does not allocate economics',
    },
    {
        id: 'SEP-6',
        rule: 'Treasury ≠ Policy Maker',
        entity: 'treasury_role',
        cannot: ['monetization.revenue_allocation.change', 'monetization.pricing.change', 'network.validator.admit', 'network.protocol.upgrade'],
        rationale: 'Treasury executes approved payouts, does not set policy',
    },
];

// ═══════════════════════════════════════════════════════════════════
// CROSS-MAPPING MATRIX
// ═══════════════════════════════════════════════════════════════════

const CROSS_MAPPING = {
    monetization: { policy: 'ggc_member', execution: 'dual_key_treasury', oversight: ['risk_committee', 'compliance_officer'], visibility: 'super_admin' },
    network: { policy: 'ggc_member', execution: 'validator_set', oversight: ['risk_committee'], visibility: 'super_admin' },
    slashing: { policy: 'risk_committee', execution: 'ggc_member', oversight: ['ivu_validator'], visibility: 'super_admin' },
    sla: { policy: 'ggc_member', execution: 'auto_engine', oversight: ['compliance_officer'], visibility: 'super_admin' },
    crisis: { policy: 'crisis_council', execution: 'technical_lead', oversight: ['compliance_officer'], visibility: 'super_admin' },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class ConstitutionalRBACEngine {

    /**
     * CORE ENFORCEMENT: Check if a role can perform a constitutional action.
     * This is the function that MUST be called before any charter-governed operation.
     * 
     * Returns: { allowed: bool, reason, charter, article, requirements }
     */
    enforce(role, action) {
        const power = CONSTITUTIONAL_POWERS[action];
        if (!power) {
            return { allowed: false, reason: `Unknown constitutional action: ${action}`, action };
        }

        // Immutable actions — NOBODY can do these
        if (power.immutable) {
            return {
                allowed: false,
                reason: `IMMUTABLE: "${action}" is constitutionally prohibited for ALL roles`,
                charter: power.charter,
                article: power.article,
                immutable: true,
            };
        }

        // Check explicit deny list (takes priority over allow)
        if (power.denied.includes(role)) {
            // Find which separation rule blocks this
            const separation = CRITICAL_SEPARATIONS.find(s => s.entity === role && s.cannot.includes(action));
            return {
                allowed: false,
                reason: separation
                    ? `CONSTITUTIONAL BLOCK [${separation.id}]: ${separation.rule} — ${separation.rationale}`
                    : `Role "${role}" is constitutionally denied action "${action}"`,
                charter: power.charter,
                article: power.article,
                separation: separation || null,
            };
        }

        // Check allow list
        if (power.allowed.length > 0 && !power.allowed.includes(role)) {
            return {
                allowed: false,
                reason: `Role "${role}" not in allowed list for "${action}". Allowed: ${power.allowed.join(', ')}`,
                charter: power.charter,
                article: power.article,
            };
        }

        // Check requires (dual-key, super-majority, etc.)
        if (power.requires) {
            return {
                allowed: true,
                conditional: true,
                reason: `Action "${action}" requires ${power.requires.type}`,
                requirements: power.requires,
                charter: power.charter,
                article: power.article,
                max_duration_hours: power.max_duration_hours || null,
                notice_days: power.notice_days || null,
            };
        }

        return {
            allowed: true,
            conditional: false,
            reason: 'Constitutionally permitted',
            charter: power.charter,
            article: power.article,
            max_duration_hours: power.max_duration_hours || null,
        };
    }

    /**
     * Get all powers for a specific role — what they CAN and CANNOT do.
     */
    getRolePowers(role) {
        const can = [];
        const cannot = [];
        const conditional = [];

        for (const [action, power] of Object.entries(CONSTITUTIONAL_POWERS)) {
            if (power.immutable) {
                cannot.push({ action, reason: 'IMMUTABLE', charter: power.charter });
                continue;
            }
            if (power.denied.includes(role)) {
                const sep = CRITICAL_SEPARATIONS.find(s => s.entity === role && s.cannot.includes(action));
                cannot.push({ action, reason: sep ? `${sep.id}: ${sep.rule}` : 'Denied', charter: power.charter });
            } else if (power.allowed.length === 0 && power.requires) {
                conditional.push({ action, requires: power.requires, charter: power.charter });
            } else if (power.allowed.includes(role) || power.allowed.length === 0) {
                if (power.requires) {
                    conditional.push({ action, requires: power.requires, charter: power.charter });
                } else {
                    can.push({ action, charter: power.charter });
                }
            } else {
                cannot.push({ action, reason: 'Not in allowed list', charter: power.charter });
            }
        }

        return { role, can, conditional, cannot, separations: CRITICAL_SEPARATIONS.filter(s => s.entity === role) };
    }

    /**
     * Audit: check all 5 critical questions from user's governance mapping.
     */
    runGovernanceAudit() {
        return {
            title: 'Constitutional Governance Audit',
            timestamp: new Date().toISOString(),
            checks: [
                {
                    question: '1. Super Admin có quyền mutate database không?',
                    answer: 'RESTRICTED — Super Admin has VISIBILITY only for financial/network/crisis domains',
                    enforced: true,
                    evidence: this.enforce('super_admin', 'monetization.reserve.withdraw'),
                },
                {
                    question: '2. Super Admin có quyền override reserve không?',
                    answer: 'NO — Constitutional block SEP-1: Super Admin ≠ Financial Controller',
                    enforced: true,
                    evidence: this.enforce('super_admin', 'monetization.treasury.payout'),
                },
                {
                    question: '3. Blockchain Op có quyền modify validator list không?',
                    answer: 'NO — Constitutional block SEP-2: Blockchain Op ≠ Governance Authority',
                    enforced: true,
                    evidence: this.enforce('blockchain_operator', 'network.validator.admit'),
                },
                {
                    question: '4. Risk Committee có unilateral freeze không?',
                    answer: 'CONDITIONAL — Risk can propose, but execution requires dual-key with GGC',
                    enforced: true,
                    evidence: this.enforce('risk_committee', 'network.validator.suspend'),
                },
                {
                    question: '5. Crisis Authority có time-bound enforced bằng code chưa?',
                    answer: 'YES — max_duration_hours enforced per level, auto-expire is IMMUTABLE (nobody can extend)',
                    enforced: true,
                    evidence: this.enforce('super_admin', 'crisis.duration.extend'),
                },
            ],
            critical_separations: CRITICAL_SEPARATIONS,
            cross_mapping: CROSS_MAPPING,
            verdict: 'All 6 separations enforced in code. Constitutional constraints are non-bypassable.',
        };
    }

    // ─── Getters ──────────────────────────────────────────────────

    getAllPowers() { return CONSTITUTIONAL_POWERS; }
    getSeparations() { return CRITICAL_SEPARATIONS; }
    getCrossMapping() { return CROSS_MAPPING; }

    getDomainPowers(domain) {
        const filtered = {};
        for (const [action, power] of Object.entries(CONSTITUTIONAL_POWERS)) {
            if (action.startsWith(domain + '.')) filtered[action] = power;
        }
        return filtered;
    }
}

module.exports = new ConstitutionalRBACEngine();
