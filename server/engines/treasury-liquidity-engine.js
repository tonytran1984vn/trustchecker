/**
 * TrustChecker — Treasury & Liquidity Management Engine v1.0
 * IPO-GRADE: LCR + Cash Waterfall + Investment Policy
 * 
 * Market infra entity needs liquidity governance, not just capital adequacy.
 * Capital = "do we have enough?" | Liquidity = "can we pay NOW?"
 * 
 * Models: Basel III LCR, NSFR, ECB intraday liquidity
 */

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════
// 1. LIQUIDITY COVERAGE RATIO (LCR)
// ═══════════════════════════════════════════════════════════════════

const LCR_MODEL = {
    standard: 'Basel III Liquidity Coverage Ratio (adapted for infra)',
    formula: 'LCR = HQLA / Net Cash Outflows (30-day stress) × 100%',
    minimum_pct: 100,   // Must cover 100% of 30-day stress outflows

    hqla_categories: {
        level_1: {
            description: 'Highest quality liquid assets — no haircut',
            haircut_pct: 0,
            assets: ['Cash', 'Central bank deposits', 'Government bonds (AAA-AA)'],
            cap: null,
        },
        level_2a: {
            description: 'High quality — 15% haircut',
            haircut_pct: 15,
            assets: ['Government bonds (A+)', 'Corporate bonds (AA-)', 'Money market funds'],
            cap_pct_of_hqla: 40,
        },
        level_2b: {
            description: 'Other eligible — 50% haircut',
            haircut_pct: 50,
            assets: ['Corporate bonds (BBB+)', 'Equity (listed, major index)', 'Stablecoin reserves'],
            cap_pct_of_hqla: 15,
        },
    },

    outflow_assumptions: {
        settlement_obligations: { rate_pct: 100, description: 'All pending settlements must be covered' },
        validator_stake_returns: { rate_pct: 50, description: 'Assume 50% of exit-notice stakes due in 30d' },
        sla_credit_payouts: { rate_pct: 100, description: 'All provisioned SLA credits' },
        insurance_deductibles: { rate_pct: 100, description: 'Deductibles for any pending claims' },
        operational_costs: { rate_pct: 100, description: '30 days operating expenses' },
        regulatory_fines: { rate_pct: 50, description: 'Estimated pending regulatory exposure' },
    },

    thresholds: {
        green: { min_lcr_pct: 150, status: 'Highly Liquid' },
        yellow: { min_lcr_pct: 120, status: 'Adequate' },
        orange: { min_lcr_pct: 100, status: 'Minimum — restrict new commitments' },
        red: { min_lcr_pct: 80, status: 'Below minimum — emergency liquidity action' },
    },
};

// ═══════════════════════════════════════════════════════════════════
// 2. INTRADAY LIQUIDITY MODEL
// ═══════════════════════════════════════════════════════════════════

const INTRADAY_MODEL = {
    description: 'Real-time monitoring of intraday cash positions',

    monitoring_points: [
        { time: '00:00 UTC', checkpoint: 'Begin-of-day position', action: 'Reconcile previous day settlements' },
        { time: '06:00 UTC', checkpoint: 'Asia settlement window opens', action: 'Monitor AP-SE/AP-E settlements' },
        { time: '09:00 UTC', checkpoint: 'EU settlement window opens', action: 'Monitor EU settlements + regulatory payments' },
        { time: '14:00 UTC', checkpoint: 'US settlement window opens', action: 'Monitor US settlements' },
        { time: '18:00 UTC', checkpoint: 'Peak cross-settlement overlap', action: 'Maximum liquidity stress point' },
        { time: '23:00 UTC', checkpoint: 'End-of-day reconciliation', action: 'Final position + overnight planning' },
    ],

    alerts: {
        peak_usage_pct: 80,       // Alert if intraday usage > 80% of available
        unexpected_outflow: 50000, // Alert if unplanned outflow > $50K
        settlement_delay: 4,       // Alert if settlement delayed > 4 hours
    },

    reporting: 'Intraday position reported to treasury every 2 hours, to risk committee daily',
};

// ═══════════════════════════════════════════════════════════════════
// 3. CASH WATERFALL LOGIC
// ═══════════════════════════════════════════════════════════════════

const CASH_WATERFALL = {
    title: 'Priority-Based Cash Allocation — Waterfall Structure',
    description: 'When cash is limited, allocate in strict priority order',

    priority_tiers: [
        { priority: 1, category: 'Settlement Obligations', description: 'Cleared settlements must be honored', pct_reserved: 100 },
        { priority: 2, category: 'Regulatory Requirements', description: 'Capital adequacy + license fees', pct_reserved: 100 },
        { priority: 3, category: 'Operational Expenses', description: 'Payroll, cloud, critical vendors (30d buffer)', pct_reserved: 100 },
        { priority: 4, category: 'Insurance Premiums', description: 'Must maintain coverage', pct_reserved: 100 },
        { priority: 5, category: 'SLA Credit Payouts', description: 'Provisioned SLA credits to clients', pct_reserved: 100 },
        { priority: 6, category: 'Validator Rewards', description: 'Earned rewards — vested and claimable', pct_reserved: 90 },
        { priority: 7, category: 'Capital Buffer Replenishment', description: 'Restore buffer if depleted', pct_reserved: 80 },
        { priority: 8, category: 'Growth Investment', description: 'R&D, marketing, new features', pct_reserved: 0 },
        { priority: 9, category: 'Dividends / Distributions', description: 'Only if all above fully funded', pct_reserved: 0 },
    ],

    stress_mode: {
        trigger: 'LCR < 100% or CAR < 10%',
        action: 'Freeze priorities 7-9, concentrate on priorities 1-6',
        governance: 'Automated + CFO notification + Risk Committee review within 24h',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 4. INVESTMENT POLICY
// ═══════════════════════════════════════════════════════════════════

const INVESTMENT_POLICY = {
    title: 'Treasury Investment Policy — Capital Preservation Focus',
    philosophy: 'Preserve capital, maintain liquidity, earn modest return. Not a profit center.',

    eligible_investments: [
        { type: 'Bank Deposits (Term)', max_pct: 50, max_tenor_months: 12, min_rating: 'A-', purpose: 'Core liquidity' },
        { type: 'Government Bonds', max_pct: 40, max_tenor_months: 36, min_rating: 'AA-', purpose: 'HQLA Level 1' },
        { type: 'Money Market Funds', max_pct: 30, max_tenor_months: 3, min_rating: 'AAA', purpose: 'Overnight liquidity' },
        { type: 'Corporate Bonds', max_pct: 15, max_tenor_months: 24, min_rating: 'A-', purpose: 'Yield enhancement' },
    ],

    prohibited: [
        'Equities (except own treasury shares post-IPO)',
        'Derivatives (except FX hedging for operational needs)',
        'Cryptocurrency / digital assets (beyond staking for platform operations)',
        'Structured products',
        'Investments with related parties',
    ],

    limits: {
        single_issuer_max_pct: 20,       // No single issuer > 20% of portfolio
        single_country_max_pct: 40,       // No single country > 40%
        weighted_avg_maturity_months: 12, // WAM < 12 months
        min_overnight_liquidity_pct: 20,  // At least 20% available overnight
    },

    governance: {
        authority: 'CFO + Treasury committee (min 2 members)',
        review_frequency: 'Monthly portfolio review, quarterly policy review',
        board_reporting: 'Quarterly to Risk Committee',
        deviation: 'Any policy breach → immediate notification to CFO + Risk Committee',
    },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class TreasuryLiquidityEngine {

    calculateLCR(hqla, outflows) {
        const defaults = {
            level_1: 300000, level_2a: 100000, level_2b: 50000,
            settlements: 200000, stake_returns: 50000, sla_credits: 10000,
            deductibles: 25000, opex_30d: 150000, regulatory: 20000,
        };
        const h = hqla || defaults;
        const o = outflows || defaults;

        const adjustedHQLA = (h.level_1 || 0)
            + (h.level_2a || 0) * (1 - LCR_MODEL.hqla_categories.level_2a.haircut_pct / 100)
            + (h.level_2b || 0) * (1 - LCR_MODEL.hqla_categories.level_2b.haircut_pct / 100);

        const totalOutflows = (o.settlements || 0) + (o.stake_returns || 0) * 0.5
            + (o.sla_credits || 0) + (o.deductibles || 0) + (o.opex_30d || 0) + (o.regulatory || 0) * 0.5;

        const lcr_pct = totalOutflows > 0 ? (adjustedHQLA / totalOutflows) * 100 : 999;

        let status = 'UNKNOWN';
        for (const [_, threshold] of Object.entries(LCR_MODEL.thresholds)) {
            if (lcr_pct >= threshold.min_lcr_pct) { status = threshold.status; break; }
        }

        return {
            hqla_adjusted: Math.round(adjustedHQLA),
            net_outflows_30d: Math.round(totalOutflows),
            lcr_pct: parseFloat(lcr_pct.toFixed(1)),
            minimum_required: LCR_MODEL.minimum_pct,
            meets_minimum: lcr_pct >= LCR_MODEL.minimum_pct,
            status,
            surplus_deficit: Math.round(adjustedHQLA - totalOutflows),
        };
    }

    runCashWaterfall(available_cash, obligations) {
        const defaults = { settlements: 200000, regulatory: 50000, opex: 150000, insurance: 15000, sla: 10000, rewards: 40000, buffer: 30000, growth: 100000, dividends: 50000 };
        const ob = obligations || defaults;
        const tiers = CASH_WATERFALL.priority_tiers;
        const values = [ob.settlements, ob.regulatory, ob.opex, ob.insurance, ob.sla, ob.rewards, ob.buffer, ob.growth, ob.dividends];

        let remaining = available_cash || 500000;
        const allocation = [];

        for (let i = 0; i < tiers.length; i++) {
            const needed = values[i] || 0;
            const allocated = Math.min(remaining, needed);
            remaining -= allocated;
            allocation.push({
                priority: tiers[i].priority,
                category: tiers[i].category,
                needed,
                allocated: Math.round(allocated),
                fully_funded: allocated >= needed,
                shortfall: Math.max(0, needed - allocated),
            });
        }

        return {
            available_cash: available_cash || 500000,
            total_obligations: values.reduce((s, v) => s + (v || 0), 0),
            allocation,
            remaining_after_waterfall: Math.round(remaining),
            stress_mode: remaining <= 0,
        };
    }

    getLCRModel() { return LCR_MODEL; }
    getIntradayModel() { return INTRADAY_MODEL; }
    getCashWaterfall() { return CASH_WATERFALL; }
    getInvestmentPolicy() { return INVESTMENT_POLICY; }

    getFullFramework() {
        return {
            title: 'Treasury & Liquidity Management — IPO-Grade',
            version: '1.0',
            lcr: LCR_MODEL,
            intraday: INTRADAY_MODEL,
            waterfall: CASH_WATERFALL,
            investment: INVESTMENT_POLICY,
        };
    }
}

module.exports = new TreasuryLiquidityEngine();
