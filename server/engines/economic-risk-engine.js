/**
 * TrustChecker — Economic & Capital Risk Integration Engine v1.0
 * FINAL PILLAR 2: Financial risk integration with Trust Graph
 * 
 * Has monetization. But doesn't connect:
 *   - Revenue risk exposure to Trust Graph health
 *   - Tenant creditworthiness to settlement limits
 *   - Infrastructure costs to actual usage/allocation
 *   - Blockchain fees (token economics) to cost model
 *   - Financial risk ↔ Trust Graph bidirectional feedback
 */

// ═══════════════════════════════════════════════════════════════════
// 1. REVENUE RISK EXPOSURE MODEL
// ═══════════════════════════════════════════════════════════════════

const REVENUE_RISK = {
    title: 'Revenue Risk Exposure — Where is revenue vulnerable?',

    exposures: [
        {
            stream: 'SaaS Subscription',
            risk_type: 'Concentration + Churn',
            metrics: {
                top_10_client_pct: 45,       // % of SaaS revenue from top 10 clients
                concentration_threshold: 30, // Alert if single client > 30%
                annual_churn_rate_pct: 8,
                net_revenue_retention_pct: 115,
            },
            trust_graph_link: 'High-trust tenants correlate with lower churn (r = 0.72)',
            risk_actions: [
                'If single client > 30% → diversification initiative + insurance for key-man risk',
                'If churn > 12% → product review + customer success escalation',
                'If NRR < 100% → pricing review + value-add features',
            ],
        },
        {
            stream: 'Settlement Fees',
            risk_type: 'Volume + Counterparty',
            metrics: {
                volume_volatility_30d_pct: 25,
                counterparty_default_rate_pct: 0.5,
                settlement_failure_rate_pct: 0.2,
            },
            trust_graph_link: 'Trust score < 60 → counterparty limit reduced 50% → volume impact',
            risk_actions: [
                'Volume decline > 20% → review settlement rail competitiveness',
                'Default rate > 1% → tighten counterparty scoring + increase reserve',
                'Failure rate > 1% → KS-05 Settlement Freeze evaluation',
            ],
        },
        {
            stream: 'Carbon Settlement',
            risk_type: 'Regulatory + Price',
            metrics: {
                carbon_price_sensitivity: 'Revenue ∝ carbon price × volume',
                regulatory_dependency: 'EU ETS/MiCA framework — single regulatory change can halt',
                geographic_concentration_pct: 65, // % from EU
            },
            trust_graph_link: 'Carbon verification score affects certificate acceptance → affects settlement volume',
            risk_actions: [
                'If EU concentration > 60% → accelerate APAC/US market entry',
                'If carbon price drops > 30% → reserve contribution increase + stress test',
                'If regulatory freeze → auto KS-05 + geographic diversification activation',
            ],
        },
        {
            stream: 'Staking Yield',
            risk_type: 'Network Health',
            metrics: {
                validator_participation_rate_pct: 85,
                staking_yield_annual_pct: 8,
                yield_sustainability: 'Funded by transaction fees — sustainable only with volume',
            },
            trust_graph_link: 'Validator trust score affects staking reward multiplier',
            risk_actions: [
                'If participation < 70% → increase rewards (auto-stabilizer)',
                'If yield unsustainable → GGC review of reward rate',
            ],
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. TENANT CREDIT SCORING
// ═══════════════════════════════════════════════════════════════════

const TENANT_CREDIT = {
    title: 'Tenant Credit Scoring — Creditworthiness assessment for settlement limits',

    scoring_model: {
        factors: [
            { factor: 'Trust Graph Score', weight_pct: 25, source: 'IVU engine', description: 'Platform-computed trust score based on verification history' },
            { factor: 'Payment History', weight_pct: 20, source: 'Billing system', description: 'On-time payment rate, overdue frequency, average days-to-pay' },
            { factor: 'Settlement Track Record', weight_pct: 20, source: 'Settlement engine', description: 'Settlement success rate, dispute rate, default history' },
            { factor: 'Business Maturity', weight_pct: 15, source: 'Onboarding data', description: 'Years in operation, employee count, revenue tier, industry' },
            { factor: 'External Credit Signal', weight_pct: 10, source: 'External API (D&B, Experian)', description: 'External credit rating if available' },
            { factor: 'Verification Engagement', weight_pct: 10, source: 'Usage analytics', description: 'Active verification frequency, API utilization, feature adoption' },
        ],
        total_weight: 100,
        output: 'Tenant Credit Score: 0-100',
    },

    tiers: [
        { tier: 'Platinum', score_min: 85, settlement_limit_multiplier: 3.0, payment_terms_days: 45, unsecured_limit_usd: 500000 },
        { tier: 'Gold', score_min: 70, settlement_limit_multiplier: 2.0, payment_terms_days: 30, unsecured_limit_usd: 200000 },
        { tier: 'Silver', score_min: 50, settlement_limit_multiplier: 1.0, payment_terms_days: 14, unsecured_limit_usd: 50000 },
        { tier: 'Bronze', score_min: 30, settlement_limit_multiplier: 0.5, payment_terms_days: 7, unsecured_limit_usd: 10000 },
        { tier: 'Restricted', score_min: 0, settlement_limit_multiplier: 0.1, payment_terms_days: 0, unsecured_limit_usd: 0 },
    ],

    review_cycle: 'Monthly auto-recalculation. Quarterly manual review for Platinum/Gold.',
    trust_graph_feedback: 'Credit score changes feed back into Trust Graph as a factor (10% weight in composite score)',
};

// ═══════════════════════════════════════════════════════════════════
// 3. INFRASTRUCTURE COST ALLOCATION
// ═══════════════════════════════════════════════════════════════════

const COST_ALLOCATION = {
    title: 'Infrastructure Cost Allocation — Who pays for what complexity',

    categories: [
        {
            category: 'Compute & Cloud',
            allocation_method: 'Usage-based per tenant + shared platform overhead',
            tenant_allocation: '70% usage-proportional (API calls, storage, compute time)',
            platform_allocation: '30% shared (monitoring infrastructure, security, DR)',
            scaling: 'Linear with tenant count + logarithmic with complexity',
        },
        {
            category: 'Validator Network',
            allocation_method: 'Transaction-proportional',
            tenant_allocation: '100% proportional to verification volume',
            platform_allocation: 'Base validator set maintained by platform',
            scaling: 'Step function: each additional validator = $X/month fixed + variable',
        },
        {
            category: 'Blockchain Anchoring',
            allocation_method: 'Transaction-based (gas cost + batch efficiency)',
            tenant_allocation: 'Per-anchor cost allocated to originating tenant',
            platform_allocation: 'Batch optimization savings shared (platform retains 20%)',
            scaling: 'Batch size ↑ → cost per anchor ↓ (logarithmic efficiency)',
        },
        {
            category: 'Compliance & Regulatory',
            allocation_method: 'Jurisdiction-based + fixed platform cost',
            tenant_allocation: 'Jurisdiction-specific costs allocated to tenants in that jurisdiction',
            platform_allocation: 'Base compliance infrastructure shared across all tenants',
            scaling: 'Step function per new jurisdiction entry',
        },
        {
            category: 'Insurance',
            allocation_method: 'Risk-weighted allocation',
            tenant_allocation: 'Higher-risk tenants (lower credit score) → higher insurance allocation',
            platform_allocation: 'Base premium shared; excess premium risk-weighted',
            scaling: 'Non-linear: risk ↑ → insurance cost ↑↑ (convex)',
        },
    ],

    margin_targets: {
        gross_margin_target_pct: 65,
        contribution_margin_target_pct: 45,
        operating_margin_target_pct: 20,
        break_even_tenants: 50,
        unit_economics: 'LTV:CAC target > 5:1',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 4. TOKEN ECONOMICS (BLOCKCHAIN FEE MODEL)
// ═══════════════════════════════════════════════════════════════════

const TOKEN_ECONOMICS = {
    title: 'Blockchain Fee Model — Token Economics for Infrastructure',
    note: 'TrustChecker does NOT have a native token. This models fee flows through the validator network.',

    fee_structure: {
        verification_anchor_fee: {
            model: 'Base fee + gas cost + batch discount',
            base_fee_usd: 0.10,
            gas_cost: 'Variable — current chain gas × complexity multiplier',
            batch_discount: 'Up to 60% for batches > 100 anchors',
            who_pays: 'Originating tenant (included in transaction fee)',
        },
        validator_reward: {
            model: 'Pool share — proportional to work done',
            pool_source: '20% of all platform revenue (constitutional minimum 15%)',
            distribution: 'Proportional to verified transactions × uptime factor × trust score multiplier',
            vesting: 'Daily distribution, 7-day settlement cycle',
            slashing_offset: 'Slashed stakes redistributed to remaining validators (50%) and reserve (50%)',
        },
        staking_requirement: {
            minimum_stake_usd: 10000,
            maximum_stake_usd: 500000,
            staking_yield_target_pct: 8,
            lockup_period_days: 14,
            exit_notice_days: 14,
            slash_risk: 'Up to 100% of stake for Byzantine behavior, 10% for SLA breach',
        },
    },

    economic_sustainability: {
        breakeven_daily_transactions: 1000,
        target_daily_transactions: 10000,
        revenue_per_transaction_usd: 0.50,
        cost_per_transaction_usd: 0.15,
        gross_profit_per_tx_usd: 0.35,
        note: 'Sustainable when daily volume > 1000 transactions',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 5. FINANCIAL RISK ↔ TRUST GRAPH FEEDBACK LOOP
// ═══════════════════════════════════════════════════════════════════

const FINANCIAL_TRUST_FEEDBACK = {
    title: 'Bidirectional: Financial Risk ↔ Trust Graph',

    trust_to_financial: [
        { signal: 'Trust score decline (entity)', financial_impact: 'Settlement limit reduced proportionally', mechanism: 'Tenant credit tier recalculation' },
        { signal: 'Trust score < 40 (entity)', financial_impact: 'Counterparty removed from unsecured settlement', mechanism: 'Auto-restrict via credit tier "Restricted"' },
        { signal: 'Network average trust decline > 5%', financial_impact: 'Platform-wide counterparty concentration review', mechanism: 'Risk Committee notification' },
        { signal: 'Verification dispute rate > 2%', financial_impact: 'SLA credit provisioning increase', mechanism: 'Auto-adjust provision in deferred liabilities' },
    ],

    financial_to_trust: [
        { signal: 'Payment default (tenant)', trust_impact: 'Trust score reduced by 10 points', mechanism: 'Payment history factor (20% weight)' },
        { signal: 'Settlement failure (counterparty)', trust_impact: 'Trust score reduced by 15 points + flag', mechanism: 'Settlement track record factor (20% weight)' },
        { signal: 'Insurance claim filed against entity', trust_impact: 'Trust score reduced by 5 points (temporary)', mechanism: 'Risk signal integration' },
        { signal: 'Regulatory violation (entity)', trust_impact: 'Trust score reduced by 20 points + compliance review required', mechanism: 'External signal factor (10% weight)' },
    ],

    anti_manipulation: [
        'Financial signals are INPUT to trust model — but trust MODEL ITSELF is independently validated',
        'No financial role can directly modify trust scores (SEP-3)',
        'Financial signal integration weight capped at 30% of composite score',
        'All financial signal changes logged to audit trail',
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class EconomicRiskEngine {

    scoreTenant(trust_score, payment_on_time_pct, settlement_success_pct, years_in_business, external_credit, engagement_score) {
        const ts = trust_score || 70;
        const pay = payment_on_time_pct || 90;
        const settle = settlement_success_pct || 95;
        const years = Math.min(years_in_business || 3, 20);
        const ext = external_credit || 60;
        const engage = engagement_score || 50;

        const score = (ts * 0.25) + (pay * 0.20) + (settle * 0.20) + (Math.min(years * 5, 100) * 0.15) + (ext * 0.10) + (engage * 0.10);
        const rounded = parseFloat(Math.min(score, 100).toFixed(1));
        const tier = TENANT_CREDIT.tiers.find(t => rounded >= t.score_min) || TENANT_CREDIT.tiers[TENANT_CREDIT.tiers.length - 1];

        return { tenant_credit_score: rounded, tier: tier.tier, settlement_limit_multiplier: tier.settlement_limit_multiplier, payment_terms_days: tier.payment_terms_days, unsecured_limit_usd: tier.unsecured_limit_usd };
    }

    getRevenueRisk() { return REVENUE_RISK; }
    getTenantCredit() { return TENANT_CREDIT; }
    getCostAllocation() { return COST_ALLOCATION; }
    getTokenEconomics() { return TOKEN_ECONOMICS; }
    getFinancialTrustFeedback() { return FINANCIAL_TRUST_FEEDBACK; }

    getFullFramework() {
        return {
            title: 'Economic & Capital Risk Integration — Critical Infrastructure-Grade',
            version: '1.0',
            revenue_risk: REVENUE_RISK,
            tenant_credit: TENANT_CREDIT,
            cost_allocation: COST_ALLOCATION,
            token_economics: TOKEN_ECONOMICS,
            feedback_loop: FINANCIAL_TRUST_FEEDBACK,
        };
    }
}

module.exports = new EconomicRiskEngine();
