/**
 * TrustChecker — Economic Governance Charter v1.0
 * CONSTITUTIONAL DOCUMENT: Who controls money, how fees change, where revenue goes
 * 
 * This is NOT an engine — it is a constitution.
 * It defines the RULES that all economic engines must follow.
 * 
 * Principles:
 *   1. No single role can change pricing, allocation, or payouts alone
 *   2. Every financial decision is auditable and reversible within 72h
 *   3. Revenue allocation ratios require super-majority (75%) to change
 *   4. Treasury operations require dual-key authorization
 *   5. Validator/partner payouts are formula-driven, not discretionary
 */

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════
// ARTICLE 1 — REVENUE ALLOCATION CONSTITUTION
// ═══════════════════════════════════════════════════════════════════

const ARTICLE_1_REVENUE = {
    title: 'Revenue Allocation Framework',
    ratified: '2026-02-20',
    amendment_requires: 'super_majority_75pct',

    allocation: {
        platform_operations: { pct: 70, authority: 'CFO + Board', description: 'Platform operating costs, R&D, growth' },
        validator_pool: { pct: 20, authority: 'formula_driven', description: 'Distributed to validators by Proof-of-Trust score' },
        reserve_fund: { pct: 10, authority: 'treasury_committee', description: 'Risk reserves, insurance, regulatory buffer' },
    },

    reserve_sub_allocation: {
        fraud_reserve: { pct: 3, of: 'total_tx_revenue' },
        carbon_reversal: { pct: 5, of: 'carbon_tx_revenue' },
        chargeback: { pct: 2, of: 'total_tx_revenue' },
        regulatory: { pct: 1, of: 'total_tx_revenue' },
        insurance: { pct: 2, of: 'total_tx_revenue' },
    },

    constraints: [
        'platform_operations CANNOT exceed 75% without Board approval',
        'validator_pool CANNOT drop below 15% — validator rights are constitutional',
        'reserve_fund CANNOT be raided — withdrawals require dual-key + compliance sign-off',
        'Any allocation change > 5% requires 30-day public notice period',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ARTICLE 2 — PRICING AUTHORITY
// ═══════════════════════════════════════════════════════════════════

const ARTICLE_2_PRICING = {
    title: 'Pricing Authority & Fee Governance',

    authority_matrix: {
        subscription_pricing: {
            who_can_change: ['CFO', 'CEO'],
            approval_required: 'Board',
            notice_period_days: 30,
            max_increase_pct: 20, // per year
            grandfather_clause: true, // existing customers keep old price for 12 months
        },
        transaction_fees: {
            who_can_change: ['CFO'],
            approval_required: 'pricing_committee',
            notice_period_days: 14,
            max_increase_pct: 15,
            grandfather_clause: false,
        },
        validator_incentives: {
            who_can_change: 'NOBODY — formula-driven',
            formula: 'trust_score * 0.40 + rounds * 0.35 + uptime * 0.15 + region_scarcity * 0.10',
            override_requires: 'constitutional_amendment',
        },
        partner_revenue_share: {
            who_can_change: ['CFO', 'Partnerships VP'],
            approval_required: 'Board',
            notice_period_days: 60,
            max_decrease_pct: 5,
        },
    },

    prohibited_actions: [
        'Retroactive fee increases',
        'Discriminatory pricing between same-tier tenants',
        'Fee changes during active crisis (RED/BLACK level)',
        'Reducing validator incentives below 15% without constitutional amendment',
        'Charging for regulatory compliance features (must be included in all plans)',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ARTICLE 3 — TREASURY CONTROLS
// ═══════════════════════════════════════════════════════════════════

const ARTICLE_3_TREASURY = {
    title: 'Treasury Operations & Controls',

    authorization_matrix: {
        routine_payout: { max_amount: 10000, approvers: 1, roles: ['finance_manager'] },
        standard_payout: { max_amount: 50000, approvers: 2, roles: ['finance_manager', 'CFO'] },
        large_payout: { max_amount: 500000, approvers: 3, roles: ['finance_manager', 'CFO', 'CEO'] },
        extraordinary: { max_amount: null, approvers: 4, roles: ['finance_manager', 'CFO', 'CEO', 'Board_chair'] },
    },

    reserve_withdrawal: {
        fraud_reserve: { approvers: ['risk_officer', 'CFO'], max_single: '50% of balance', cooling_period_hours: 24 },
        carbon_reversal: { approvers: ['compliance_officer', 'CFO'], max_single: '30% of balance', cooling_period_hours: 48 },
        regulatory_reserve: { approvers: ['legal_counsel', 'CFO', 'CEO'], max_single: '25% of balance', cooling_period_hours: 72 },
        insurance_pool: { approvers: ['CFO', 'CEO', 'Board_chair'], max_single: '10% of balance', cooling_period_hours: 168 },
    },

    audit_requirements: [
        'All payouts > $1,000 logged to immutable audit trail',
        'Monthly treasury reconciliation (automated)',
        'Quarterly external audit of reserve balances',
        'Annual SOC 2 Type II covering treasury operations',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ARTICLE 4 — ECONOMIC RIGHTS
// ═══════════════════════════════════════════════════════════════════

const ARTICLE_4_RIGHTS = {
    title: 'Economic Rights of Participants',

    tenant_rights: [
        'Right to transparent pricing — all fees visible before commitment',
        'Right to 30-day notice before any price increase',
        'Right to data portability — export all data at no charge',
        'Right to pro-rated refund on annual plans upon cancellation',
        'Right to SLA financial credits as per contract tier',
        'Right to audit their own billing records',
    ],

    validator_rights: [
        'Right to formula-based compensation — no discretionary cuts',
        'Right to 90-day notice before incentive model changes',
        'Right to transparent trust score calculation',
        'Right to appeal suspension within 14 days',
        'Right to withdraw earned balance within 30 days',
        'Right to region scarcity bonus without cap manipulation',
    ],

    partner_rights: [
        'Right to tier upgrade when referral thresholds are met',
        'Right to 60-day notice before revenue share changes',
        'Right to transparent referral tracking',
        'Right to quarterly revenue report',
    ],

    platform_obligations: [
        'Maintain minimum 30-day operating reserve',
        'Publish annual transparency report (revenue, costs, reserves)',
        'Maintain independent audit of reserve funds',
        'Never use reserve funds for platform operations without constitutional amendment',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ARTICLE 5 — AMENDMENT PROCESS
// ═══════════════════════════════════════════════════════════════════

const ARTICLE_5_AMENDMENTS = {
    title: 'Constitutional Amendment Process',

    process: [
        { step: 1, action: 'Proposal submitted by authorized role (CFO/CEO/Board)', notice: '0 days' },
        { step: 2, action: 'Public comment period for affected stakeholders', notice: '30 days' },
        { step: 3, action: 'Impact assessment published (economic, validator, tenant)', notice: '14 days' },
        { step: 4, action: 'Board vote — requires 75% super-majority', notice: '7 days' },
        { step: 5, action: 'Cooling period — objections can be filed', notice: '14 days' },
        { step: 6, action: 'Ratification and implementation', notice: '0 days' },
    ],

    total_minimum_days: 65,

    emergency_amendment: {
        conditions: ['Active RED/BLACK crisis', 'Regulatory mandate', 'Court order'],
        approvers: ['CEO', 'General Counsel', 'Board Chair'],
        post_hoc_ratification: '30 days — must be ratified or reversed',
    },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class EconomicGovernanceCharter {
    getCharter() {
        return {
            title: 'Economic Governance Charter — TrustChecker Platform',
            type: 'constitutional_document',
            version: '1.0',
            ratified: '2026-02-20',
            articles: {
                article_1: ARTICLE_1_REVENUE,
                article_2: ARTICLE_2_PRICING,
                article_3: ARTICLE_3_TREASURY,
                article_4: ARTICLE_4_RIGHTS,
                article_5: ARTICLE_5_AMENDMENTS,
            },
            total_articles: 5,
            binding: true,
            jurisdiction: 'Platform-wide',
        };
    }

    getArticle(number) {
        const map = { 1: ARTICLE_1_REVENUE, 2: ARTICLE_2_PRICING, 3: ARTICLE_3_TREASURY, 4: ARTICLE_4_RIGHTS, 5: ARTICLE_5_AMENDMENTS };
        return map[number] || { error: `Invalid article number. Valid: 1-5` };
    }

    // Validate a proposed pricing change against the charter
    validatePricingChange(changeType, params) {
        const rules = ARTICLE_2_PRICING.authority_matrix[changeType];
        if (!rules) return { valid: false, error: `Unknown pricing type: ${changeType}` };

        const violations = [];
        if (params.increase_pct > rules.max_increase_pct) {
            violations.push(`Increase ${params.increase_pct}% exceeds max ${rules.max_increase_pct}%`);
        }
        if (rules.grandfather_clause && !params.grandfather_applied) {
            violations.push('Grandfather clause not applied — existing customers must keep old price for 12 months');
        }
        if (params.notice_days < rules.notice_period_days) {
            violations.push(`Notice period ${params.notice_days}d below required ${rules.notice_period_days}d`);
        }

        return {
            change_type: changeType,
            valid: violations.length === 0,
            violations,
            required_approvals: rules.approval_required,
            authorized_roles: rules.who_can_change,
        };
    }

    // Validate a treasury withdrawal
    validateWithdrawal(reserveId, amount, approvers) {
        const rules = ARTICLE_3_TREASURY.reserve_withdrawal[reserveId];
        if (!rules) return { valid: false, error: `Unknown reserve: ${reserveId}` };

        const violations = [];
        if (approvers.length < rules.approvers.length) {
            violations.push(`Need ${rules.approvers.length} approvers, got ${approvers.length}`);
        }
        const missingRoles = rules.approvers.filter(r => !approvers.includes(r));
        if (missingRoles.length > 0) {
            violations.push(`Missing required approvers: ${missingRoles.join(', ')}`);
        }

        return { valid: violations.length === 0, violations, cooling_period_hours: rules.cooling_period_hours };
    }
}

module.exports = new EconomicGovernanceCharter();
