/**
 * TrustChecker — Revenue Governance Map Engine v1.0
 * CRITICAL: Who controls pricing, fees, AI weights, settlement rails
 * 
 * Infrastructure monetization WITHOUT revenue governance = risk manipulation.
 * Every revenue-touching decision must have:
 *   - Clear authority (who can change)
 *   - Separation of powers (who cannot)
 *   - Audit trail (when changed)
 *   - Constitutional limits (hard caps)
 */

// ═══════════════════════════════════════════════════════════════════
// 1. PRICING AUTHORITY MAP
// ═══════════════════════════════════════════════════════════════════

const PRICING_AUTHORITY = {
    decisions: [
        {
            action: 'SaaS subscription pricing change',
            authority: 'GGC (super-majority 75%)',
            cannot_approve: ['super_admin', 'treasury_role', 'blockchain_operator'],
            constitutional_limit: 'Max increase 20% per year. > 20% requires charter amendment.',
            notice_period_days: 30,
            audit: 'All pricing changes logged to constitutional audit trail',
        },
        {
            action: 'Transaction fee rate change',
            authority: 'GGC (simple majority 51%) + Risk Committee sign-off',
            cannot_approve: ['super_admin', 'compliance_officer'],
            constitutional_limit: 'Fee cannot exceed 3% of transaction value. Floor: 0.1%',
            notice_period_days: 14,
            audit: 'Rate change + impact analysis logged',
        },
        {
            action: 'Carbon settlement fee change',
            authority: 'GGC (super-majority 75%) + Compliance sign-off',
            cannot_approve: ['super_admin', 'blockchain_operator', 'ivu_validator'],
            constitutional_limit: 'Fee change requires regulatory impact assessment per jurisdiction',
            notice_period_days: 30,
            audit: 'Settlement fee change + regulatory assessment logged',
        },
        {
            action: 'Validator staking reward rate',
            authority: 'GGC (simple majority) + Risk Committee',
            cannot_approve: ['ivu_validator', 'blockchain_operator'],
            constitutional_limit: 'Reward pool capped at 25% of platform revenue. Min 15%.',
            notice_period_days: 14,
            audit: 'Reward rate change + validator notification logged',
        },
        {
            action: 'New revenue stream introduction',
            authority: 'GGC (super-majority 75%) + Board approval',
            cannot_approve: ['super_admin alone'],
            constitutional_limit: 'Must include IFRS revenue recognition mapping + regulatory assessment',
            notice_period_days: 60,
            audit: 'Full business case + charter compliance check',
        },
        {
            action: 'Client-specific discount > 20%',
            authority: 'CFO + Risk Committee',
            cannot_approve: ['sales team alone', 'super_admin'],
            constitutional_limit: 'Max discount 50%. > 50% requires GGC approval.',
            audit: 'Discount justification + revenue impact logged',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. AI WEIGHT → REVENUE IMPACT MAP
// ═══════════════════════════════════════════════════════════════════

const AI_REVENUE_MAP = {
    title: 'AI/ML Weight Impact on Revenue — Conflict of Interest Guard',

    weight_categories: [
        {
            model: 'Trust Score (IVU)',
            revenue_impact: 'DIRECT — higher trust = more transaction volume = more fees',
            risk: 'Inflating trust scores to increase settlement volume',
            control: 'IVU validator CANNOT set scoring weights. Weights set by GGC + external audit.',
            separation: 'SEP-3: IVU ≠ Weight Setter',
            audit_frequency: 'Quarterly independent model validation',
        },
        {
            model: 'Carbon Credit Verification Score',
            revenue_impact: 'DIRECT — verification drives settlement revenue',
            risk: 'Lowering verification threshold to increase volume',
            control: 'Threshold changes require GGC + Compliance + Registry alignment',
            separation: 'Verifier ≠ Fee Beneficiary. Platform fee is fixed regardless of verification outcome.',
            audit_frequency: 'Monthly accuracy review + annual external audit',
        },
        {
            model: 'Risk Scoring (Counterparty)',
            revenue_impact: 'INDIRECT — risk scores affect counterparty limits → affect settlement volume',
            risk: 'Relaxing risk scores to allow more counterparties → more revenue but more risk',
            control: 'Risk scoring model owned by Risk Committee. Changes require stress test validation.',
            separation: 'SEP-4: Risk ≠ Execution',
            audit_frequency: 'Quarterly backtesting + annual model validation',
        },
        {
            model: 'Dynamic Pricing Algorithm',
            revenue_impact: 'DIRECT — algorithm sets transaction-level pricing',
            risk: 'Algorithm optimizing for revenue extraction vs fair pricing',
            control: 'Pricing bounds hardcoded (floor + cap). Algorithm parameters require GGC approval.',
            separation: 'Algorithm team ≠ Revenue team. Independent model risk review.',
            audit_frequency: 'Monthly fairness audit + quarterly parameter review',
        },
    ],

    governance_principle: 'No role that benefits from revenue should control AI weights that affect revenue',
};

// ═══════════════════════════════════════════════════════════════════
// 3. SETTLEMENT RAIL CONTROL
// ═══════════════════════════════════════════════════════════════════

const SETTLEMENT_CONTROL = {
    rail_authority: {
        activate_new_rail: { authority: 'GGC + Compliance + Risk', cannot: ['super_admin', 'treasury_role'] },
        suspend_rail: { authority: 'Risk Committee (unilateral in emergency) OR GGC', cannot: ['treasury_role'] },
        modify_rail_parameters: { authority: 'GGC + Risk', cannot: ['super_admin', 'blockchain_operator'] },
        set_settlement_cycle: { authority: 'GGC + Compliance', cannot: ['super_admin'] },
    },

    rails: [
        { rail: 'Carbon Credit Settlement', cycle: 'T+1', jurisdiction: 'EU (MiCA)', controlled_by: 'Settlement GmbH' },
        { rail: 'Cross-Border Transfer', cycle: 'T+3', jurisdiction: 'Multi', controlled_by: 'Settlement GmbH + Local Entity' },
        { rail: 'QR Verification Settlement', cycle: 'Instant', jurisdiction: 'All', controlled_by: 'Technology Pte Ltd' },
        { rail: 'Carbon Certificate Issuance', cycle: 'T+2', jurisdiction: 'Registry-specific', controlled_by: 'Settlement GmbH' },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 4. FEE EXTRACTION GOVERNANCE
// ═══════════════════════════════════════════════════════════════════

const FEE_GOVERNANCE = {
    fee_flow: {
        collection: 'Platform collects all fees at transaction level',
        segregation: 'Fees segregated from settlement funds at T+0',
        allocation: {
            validator_reward_pool_pct: 20,
            capital_reserve_pct: 10,
            insurance_fund_pct: 5,
            operating_entity_pct: 55,
            governance_fund_pct: 5,
            community_fund_pct: 5,
        },
        change_authority: 'GGC super-majority (75%)',
        constitutional_lock: 'Validator pool cannot go below 15%. Reserve cannot go below 8%.',
    },

    extraction_controls: [
        { control: 'No fee extraction outside allocation formula', enforced_by: 'Smart contract / constitutional RBAC' },
        { control: 'Operating entity cannot access reserve funds', enforced_by: 'Capital Reserve Trust (bankruptcy-remote)' },
        { control: 'Fee allocation changes require 30-day notice', enforced_by: 'Constitutional amendment process' },
        { control: 'All fee flows auditable in real-time', enforced_by: 'Hash-chained audit log + external audit API' },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class RevenueGovernanceEngine {
    getPricingAuthority() { return PRICING_AUTHORITY; }
    getAIRevenueMap() { return AI_REVENUE_MAP; }
    getSettlementControl() { return SETTLEMENT_CONTROL; }
    getFeeGovernance() { return FEE_GOVERNANCE; }

    getFullMap() {
        return {
            title: 'Revenue Governance Map — Infrastructure-Grade',
            version: '1.0',
            principle: 'Revenue-touching decisions require separation of powers + constitutional limits + audit trail',
            pricing: PRICING_AUTHORITY,
            ai_impact: AI_REVENUE_MAP,
            settlement: SETTLEMENT_CONTROL,
            fees: FEE_GOVERNANCE,
        };
    }
}

module.exports = new RevenueGovernanceEngine();
