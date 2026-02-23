/**
 * TrustChecker — Model Risk Tiering & Capital Impact Engine v1.0
 * CRITICAL: Infrastructure-level models need materiality classification
 * 
 * Not all models are equal. Revenue-impacting models need:
 *   - Higher validation frequency
 *   - Independent review
 *   - Capital impact assessment
 *   - Shutdown criteria
 */

// ═══════════════════════════════════════════════════════════════════
// 1. MODEL MATERIALITY TIERS
// ═══════════════════════════════════════════════════════════════════

const MODEL_TIERS = {
    tiers: [
        {
            tier: 1,
            name: 'Revenue-Impacting (Critical)',
            description: 'Models that directly affect revenue, pricing, or settlement',
            validation_frequency: 'Monthly backtesting + quarterly independent review',
            shutdown_authority: 'Risk Committee + CTO (emergency: CTO alone with 24h Risk notification)',
            capital_reserve_pct: 2,
            regulatory_disclosure: 'Required — model methodology + performance disclosed in annual report',
            models: [
                { name: 'Dynamic Pricing Algorithm', revenue_sensitivity: 'HIGH — directly sets transaction fees', shutdown_impact: '100% of variable pricing revenue', capital_at_risk_usd: 150000 },
                { name: 'Carbon Credit Valuation', revenue_sensitivity: 'HIGH — affects settlement value + fees', shutdown_impact: 'Carbon settlement revenue halted', capital_at_risk_usd: 100000 },
                { name: 'Counterparty Risk Scoring', revenue_sensitivity: 'MEDIUM — affects counterparty limits → volume', shutdown_impact: 'Conservative fallback limits applied', capital_at_risk_usd: 75000 },
                { name: 'Settlement Netting Engine', revenue_sensitivity: 'HIGH — optimizes settlement flows', shutdown_impact: 'Gross settlement (higher cost, same revenue)', capital_at_risk_usd: 50000 },
            ],
        },
        {
            tier: 2,
            name: 'Risk-Scoring (Material)',
            description: 'Models that affect trust scores, risk assessment, compliance decisions',
            validation_frequency: 'Quarterly backtesting + annual independent review',
            shutdown_authority: 'Risk Committee',
            capital_reserve_pct: 1,
            regulatory_disclosure: 'Summary methodology disclosed',
            models: [
                { name: 'Trust Score (IVU)', risk_sensitivity: 'HIGH — affects entity reputation + transaction eligibility', shutdown_impact: 'Scores frozen at T-1, manual review required', capital_at_risk_usd: 30000 },
                { name: 'Fraud Detection', risk_sensitivity: 'HIGH — missed fraud = settlement loss', shutdown_impact: 'All transactions flagged for manual review', capital_at_risk_usd: 50000 },
                { name: 'AML/KYC Scoring', risk_sensitivity: 'CRITICAL — regulatory compliance', shutdown_impact: 'New onboarding halted, existing accounts unaffected', capital_at_risk_usd: 25000 },
                { name: 'Supply Chain Integrity Score', risk_sensitivity: 'MEDIUM — affects verification confidence', shutdown_impact: 'Manual verification fallback', capital_at_risk_usd: 15000 },
                { name: 'Stress Test Models', risk_sensitivity: 'MEDIUM — affects capital planning', shutdown_impact: 'Use previous period results + conservative buffer', capital_at_risk_usd: 0 },
            ],
        },
        {
            tier: 3,
            name: 'Analytics-Only (Non-Material)',
            description: 'Models used for reporting, dashboards, forecasting — no operational impact',
            validation_frequency: 'Annual review',
            shutdown_authority: 'Engineering lead',
            capital_reserve_pct: 0,
            regulatory_disclosure: 'Not required',
            models: [
                { name: 'Network Topology Visualization', impact: 'Dashboard only', shutdown_impact: 'Dashboard shows static view' },
                { name: 'Revenue Forecasting', impact: 'Planning only', shutdown_impact: 'Use spreadsheet model' },
                { name: 'Validator Performance Analytics', impact: 'Reporting only', shutdown_impact: 'Reports delayed' },
                { name: 'Market TAM Estimation', impact: 'Investor narrative', shutdown_impact: 'Use last published figures' },
                { name: 'Carbon Market Trend Analysis', impact: 'Advisory only', shutdown_impact: 'No operational impact' },
            ],
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. REVENUE SENSITIVITY ANALYSIS
// ═══════════════════════════════════════════════════════════════════

const REVENUE_SENSITIVITY = {
    title: 'Model Revenue Sensitivity — What happens if this model is wrong?',

    scenarios: [
        { model: 'Dynamic Pricing', error_type: 'Overprices by 10%', revenue_impact: '-5% volume decline', customer_impact: 'Churn increase 2%', remediation: 'Immediate rollback + 30-day credit' },
        { model: 'Dynamic Pricing', error_type: 'Underprices by 10%', revenue_impact: '-10% fee revenue', customer_impact: 'None (benefit)', remediation: 'Correct pricing + absorb loss' },
        { model: 'Carbon Valuation', error_type: 'Overvalues by 15%', revenue_impact: '-15% settlement correction', customer_impact: 'Dispute increase', remediation: 'Settlement reserve covers gap' },
        { model: 'Counterparty Risk', error_type: 'Under-estimates risk', revenue_impact: 'Default loss not covered', customer_impact: 'Settlement failure', remediation: 'Insurance claim + reserve drawdown' },
        { model: 'Fraud Detection', error_type: 'False negative rate up 5%', revenue_impact: 'Potential fraud loss increase', customer_impact: 'Trust erosion', remediation: 'Model retrain + manual review backlog' },
        { model: 'Trust Score (IVU)', error_type: 'Score inflation detected', revenue_impact: 'Indirect — volume increase is artificial', customer_impact: 'Trust in platform eroded', remediation: 'Score freeze + recalibration + disclosure' },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 3. MODEL SHUTDOWN CRITERIA
// ═══════════════════════════════════════════════════════════════════

const SHUTDOWN_CRITERIA = {
    criteria: [
        { criterion: 'Accuracy degradation', threshold: '>10% decline from validation benchmark', action: 'Flag for review, shutdown if not resolved in 7 days' },
        { criterion: 'Bias detection', threshold: 'Statistical bias detected in protected classes', action: 'Immediate shutdown + investigation' },
        { criterion: 'Data quality failure', threshold: '>5% missing/corrupt input data', action: 'Fallback to conservative defaults' },
        { criterion: 'Adversarial manipulation', threshold: 'Any confirmed manipulation attempt', action: 'Immediate shutdown + forensic review' },
        { criterion: 'Regulatory non-compliance', threshold: 'Model output violates regulatory requirement', action: 'Immediate shutdown + compliance review' },
        { criterion: 'Operator override', threshold: 'Risk Committee formal decision', action: 'Shutdown with documented rationale' },
    ],

    fallback_procedures: {
        tier_1: 'Conservative static rules replace model. Revenue impact absorbed. Capital buffer provides cushion.',
        tier_2: 'Scores frozen at last valid state. Manual review for new decisions.',
        tier_3: 'Dashboard shows "Model Offline". No operational impact.',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 4. MODEL GOVERNANCE FRAMEWORK
// ═══════════════════════════════════════════════════════════════════

const MODEL_GOVERNANCE = {
    roles: {
        model_owner: 'Engineering team — develops and maintains the model',
        model_validator: 'Risk Committee — validates model performance (independent of owner)',
        model_auditor: 'External auditor — annual independent review of Tier 1-2 models',
        model_authority: 'GGC — approves model deployment for Tier 1 models',
    },

    lifecycle: [
        { phase: 'Development', gate: 'Technical review by engineering lead' },
        { phase: 'Validation', gate: 'Risk Committee backtesting + bias review' },
        { phase: 'Approval', gate: 'Tier 1: GGC approval. Tier 2: Risk Committee. Tier 3: Engineering lead.' },
        { phase: 'Deployment', gate: 'Canary deployment → A/B test → full rollout' },
        { phase: 'Monitoring', gate: 'Continuous performance monitoring + drift detection' },
        { phase: 'Retirement', gate: 'Same approval level as deployment + migration plan' },
    ],

    total_capital_at_risk: {
        tier_1_total_usd: 375000,
        tier_2_total_usd: 120000,
        tier_3_total_usd: 0,
        total_usd: 495000,
        reserve_required_pct: 'Tier 1: 2%, Tier 2: 1%, Tier 3: 0%',
    },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class ModelRiskTieringEngine {
    getModelTiers() { return MODEL_TIERS; }
    getRevenueSensitivity() { return REVENUE_SENSITIVITY; }
    getShutdownCriteria() { return SHUTDOWN_CRITERIA; }
    getModelGovernance() { return MODEL_GOVERNANCE; }

    getModelByName(name) {
        for (const tier of MODEL_TIERS.tiers) {
            const model = tier.models.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
            if (model) return { tier: tier.tier, tier_name: tier.name, ...model };
        }
        return null;
    }

    getFullFramework() {
        return {
            title: 'Model Risk Tiering & Capital Impact — Infrastructure-Grade',
            version: '1.0',
            tiers: MODEL_TIERS,
            sensitivity: REVENUE_SENSITIVITY,
            shutdown: SHUTDOWN_CRITERIA,
            governance: MODEL_GOVERNANCE,
        };
    }
}

module.exports = new ModelRiskTieringEngine();
