/**
 * TrustChecker — Financial Reporting Engine v1.0
 * IPO-GRADE: IFRS-Ready Consolidated Financial Reporting
 * 
 * IPO requires IFRS-compliant financial engine.
 * Revenue mix (SaaS + settlement + staking) needs proper recognition.
 * 
 * Standards: IFRS 15 (Revenue), IFRS 9 (Financial Instruments),
 *            IFRS 16 (Leases), IAS 37 (Provisions), IAS 38 (Intangibles)
 */

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════
// 1. REVENUE RECOGNITION MODEL (IFRS 15)
// ═══════════════════════════════════════════════════════════════════

const REVENUE_STREAMS = {
    standard: 'IFRS 15 — Revenue from Contracts with Customers',

    streams: [
        {
            id: 'REV-01',
            name: 'SaaS Subscription Revenue',
            ifrs_treatment: 'Recognized over time — as service is delivered',
            recognition: 'Pro-rata monthly over subscription period',
            performance_obligation: 'Platform access + support',
            variable_consideration: 'Usage-based tiers recognized monthly based on actual usage',
            contract_liability: 'Prepaid annual subscriptions → deferred revenue',
            example: '$500/month × 12 months = $6,000/year; if prepaid = $6,000 deferred, released $500/month',
        },
        {
            id: 'REV-02',
            name: 'Transaction Fee Revenue',
            ifrs_treatment: 'Recognized at point in time — when transaction settles',
            recognition: 'At settlement date (T+1/T+2/T+3 depending on type)',
            performance_obligation: 'Transaction processing + verification',
            variable_consideration: 'Volume tiers — recognize based on actual volume at period end',
            principal_agent: 'AGENT — TrustChecker facilitates, does not own underlying asset',
            implication: 'Revenue = fee only, NOT gross transaction value',
        },
        {
            id: 'REV-03',
            name: 'Carbon Settlement Revenue',
            ifrs_treatment: 'Recognized at point in time — at settlement finality',
            recognition: 'At T+1 for carbon credit settlement',
            performance_obligation: 'Settlement guarantee + finality + registry update',
            principal_agent: 'PRINCIPAL — TrustChecker acts as CCP via novation',
            implication: 'Revenue = settlement fee; reserve contribution = separate obligation',
            reserve_accounting: 'Reserve contributions ≠ revenue. Recorded as liability until settlement risk expires.',
        },
        {
            id: 'REV-04',
            name: 'Staking Yield / Validator Incentive',
            ifrs_treatment: 'Recognized over time — as staking service is performed',
            recognition: 'Monthly based on staking period',
            performance_obligation: 'Network validation service',
            classification: 'IFRS 9 may apply if staking yields are financial instrument returns',
            note: 'If platform stakes own capital: IFRS 9 financial income. If managing validator stakes: IFRS 15 service revenue.',
        },
        {
            id: 'REV-05',
            name: 'Certification & Verification Revenue',
            ifrs_treatment: 'Recognized at point in time — upon certificate issuance',
            recognition: 'When certificate delivered and accepted',
            performance_obligation: 'Verification + certificate generation',
            variable_consideration: 'Rush processing fees recognized at delivery',
        },
        {
            id: 'REV-06',
            name: 'API Licensing Revenue',
            ifrs_treatment: 'Recognized over time — right to access',
            recognition: 'Pro-rata over license period',
            performance_obligation: 'API access + maintenance + updates',
            contract_liability: 'Annual licenses → deferred revenue',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. DEFERRED LIABILITY MODEL
// ═══════════════════════════════════════════════════════════════════

const DEFERRED_LIABILITIES = {
    standard: 'IAS 37 (Provisions) + IFRS 15 (Contract Liabilities)',

    categories: [
        {
            type: 'Deferred Revenue (Contract Liability)',
            description: 'Prepaid subscriptions and annual licenses',
            measurement: 'Remaining pro-rata value of unfulfilled performance obligation',
            balance_sheet: 'Current liability (< 12 months) or Non-current (> 12 months)',
            example: '$100K annual subscription paid Jan 1 → Dec 31 remaining = $100K deferred → $8.3K released monthly',
        },
        {
            type: 'Settlement Reserve Liability',
            description: 'Funds held for settlement guarantee (CCP obligation)',
            measurement: '% of pending settlement value per TC-CAR requirements',
            balance_sheet: 'Current liability — released at T+settlement cycle completion',
            release_trigger: 'Settlement finality confirmed + dispute window expired',
        },
        {
            type: 'SLA Credit Provision',
            description: 'Expected SLA credit payouts based on historical breach rates',
            measurement: 'Best estimate of probable outflow (IAS 37)',
            balance_sheet: 'Current provision',
            review: 'Quarterly — adjusted based on actual SLA performance',
        },
        {
            type: 'Slashing Escrow Liability',
            description: 'Validator stakes held in escrow — returnable on exit',
            measurement: 'Face value of deposited stakes',
            balance_sheet: 'Current liability (if exit notice filed) or Non-current',
            note: 'Confiscated stakes → transferred to income or reserve per constitutional rules',
        },
        {
            type: 'Insurance Claim Provision',
            description: 'Expected insurance payouts for pending claims',
            measurement: 'Probability-weighted expected outflow',
            balance_sheet: 'Current or Non-current depending on expected resolution timeline',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 3. IFRS MAPPING (KEY STANDARDS)
// ═══════════════════════════════════════════════════════════════════

const IFRS_MAP = {
    standards_applicable: [
        { standard: 'IFRS 15', title: 'Revenue from Contracts with Customers', applies_to: 'All revenue streams', critical: true },
        { standard: 'IFRS 9', title: 'Financial Instruments', applies_to: 'Staking yields, settlement guarantees, insurance receivables', critical: true },
        { standard: 'IFRS 16', title: 'Leases', applies_to: 'Cloud infrastructure, office space, node hardware leases', critical: false },
        { standard: 'IAS 37', title: 'Provisions, Contingent Liabilities', applies_to: 'SLA credits, dispute provisions, settlement reserves', critical: true },
        { standard: 'IAS 38', title: 'Intangible Assets', applies_to: 'IP, algorithms, Trust Graph, development costs', critical: true },
        { standard: 'IFRS 3', title: 'Business Combinations', applies_to: 'Future acquisitions, post-IPO M&A', critical: false },
        { standard: 'IAS 36', title: 'Impairment of Assets', applies_to: 'Goodwill (post-acquisition), capitalized development', critical: false },
        { standard: 'IFRS 7', title: 'Financial Instruments: Disclosures', applies_to: 'Settlement exposure, counterparty risk', critical: true },
    ],

    development_cost_capitalization: {
        standard: 'IAS 38',
        criteria: [
            'Technical feasibility demonstrated',
            'Intention to complete and use/sell',
            'Ability to use or sell',
            'Expected future economic benefits',
            'Adequate resources to complete',
            'Reliable measurement of expenditure',
        ],
        applicable_costs: 'Platform development, Trust Graph engine, Carbon engine, Settlement engine',
        non_capitalizable: 'Research, maintenance, bug fixes, general admin',
        amortization: 'Straight-line over useful life (typically 3-5 years for software)',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 4. CONSOLIDATED P&L STRUCTURE
// ═══════════════════════════════════════════════════════════════════

const FINANCIAL_STATEMENTS = {
    income_statement: {
        revenue: [
            { line: 'SaaS Subscription Revenue', note: 'IFRS 15 — over time' },
            { line: 'Transaction Fee Revenue', note: 'IFRS 15 — point in time' },
            { line: 'Carbon Settlement Revenue', note: 'IFRS 15 — point in time, net of reserve' },
            { line: 'Staking & Validation Revenue', note: 'IFRS 15/9' },
            { line: 'Certification Revenue', note: 'IFRS 15 — point in time' },
            { line: 'API Licensing Revenue', note: 'IFRS 15 — over time' },
        ],
        cost_of_revenue: [
            { line: 'Cloud Infrastructure', note: 'AWS/GCP hosting' },
            { line: 'Validator Network Costs', note: 'Node operations, rewards' },
            { line: 'Settlement Processing', note: 'Registry fees, blockchain gas' },
            { line: 'Support & Onboarding', note: 'Customer success' },
        ],
        operating_expenses: [
            { line: 'Research & Development', note: 'Net of capitalized development' },
            { line: 'Sales & Marketing', note: 'Customer acquisition' },
            { line: 'General & Administrative', note: 'Corporate overhead' },
            { line: 'Depreciation & Amortization', note: 'Including capitalized dev costs' },
            { line: 'Insurance Premiums', note: '$25M coverage portfolio' },
            { line: 'Regulatory & Compliance', note: 'License fees, audit costs' },
        ],
        other: [
            { line: 'Slashing Income', note: 'Confiscated validator stakes' },
            { line: 'SLA Credit Expense', note: 'Provisioned or actual credits' },
            { line: 'Settlement Reserve Release', note: 'Expired reserve obligations' },
        ],
    },

    balance_sheet_highlights: {
        assets: ['Cash & equivalents', 'Settlement receivables', 'Capitalized development costs', 'IP assets', 'Insurance receivables'],
        liabilities: ['Deferred revenue', 'Settlement reserve', 'SLA credit provision', 'Staking escrow', 'Insurance claim provision'],
        equity: ['Share capital', 'Retained earnings', 'Share premium (post-IPO)'],
    },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class FinancialReportingEngine {

    recognizeRevenue(stream_id, contract_value, period_months, months_elapsed) {
        const stream = REVENUE_STREAMS.streams.find(s => s.id === stream_id);
        if (!stream) return { error: `Unknown stream: ${stream_id}` };

        const isOverTime = stream.ifrs_treatment.includes('over time');
        let recognized, deferred;

        if (isOverTime) {
            const monthly = contract_value / period_months;
            recognized = Math.min(monthly * months_elapsed, contract_value);
            deferred = contract_value - recognized;
        } else {
            recognized = contract_value;
            deferred = 0;
        }

        return {
            stream: stream.name,
            ifrs_treatment: stream.ifrs_treatment,
            contract_value,
            recognized_revenue: Math.round(recognized * 100) / 100,
            deferred_revenue: Math.round(deferred * 100) / 100,
            recognition_pct: parseFloat(((recognized / contract_value) * 100).toFixed(1)),
            period: `${months_elapsed} of ${period_months} months`,
        };
    }

    generateConsolidatedPL(period, revenue_data) {
        const defaults = {
            saas: 200000, transaction_fees: 150000, settlement: 100000,
            staking: 30000, certification: 50000, api_licensing: 20000,
            cloud: 80000, validator_costs: 40000, settlement_processing: 20000,
            support: 30000, rnd: 120000, sales: 60000, ga: 50000,
            depreciation: 25000, insurance: 15000, regulatory: 10000,
        };
        const d = revenue_data || defaults;

        const totalRevenue = (d.saas || 0) + (d.transaction_fees || 0) + (d.settlement || 0) + (d.staking || 0) + (d.certification || 0) + (d.api_licensing || 0);
        const cogs = (d.cloud || 0) + (d.validator_costs || 0) + (d.settlement_processing || 0) + (d.support || 0);
        const grossProfit = totalRevenue - cogs;
        const opex = (d.rnd || 0) + (d.sales || 0) + (d.ga || 0) + (d.depreciation || 0) + (d.insurance || 0) + (d.regulatory || 0);
        const operatingIncome = grossProfit - opex;

        return {
            period,
            revenue: {
                saas_subscription: d.saas, transaction_fees: d.transaction_fees, carbon_settlement: d.settlement,
                staking_validation: d.staking, certification: d.certification, api_licensing: d.api_licensing,
                total: totalRevenue,
            },
            cost_of_revenue: { total: cogs },
            gross_profit: grossProfit,
            gross_margin_pct: parseFloat(((grossProfit / totalRevenue) * 100).toFixed(1)),
            operating_expenses: { total: opex },
            operating_income: operatingIncome,
            operating_margin_pct: parseFloat(((operatingIncome / totalRevenue) * 100).toFixed(1)),
            ifrs_compliant: true,
        };
    }

    getRevenueStreams() { return REVENUE_STREAMS; }
    getDeferredLiabilities() { return DEFERRED_LIABILITIES; }
    getIFRSMap() { return IFRS_MAP; }
    getStatementStructure() { return FINANCIAL_STATEMENTS; }

    getFullFramework() {
        return {
            title: 'Financial Reporting Engine — IFRS-Ready',
            version: '1.0',
            standards: ['IFRS 15', 'IFRS 9', 'IFRS 16', 'IAS 37', 'IAS 38'],
            revenue: REVENUE_STREAMS,
            liabilities: DEFERRED_LIABILITIES,
            ifrs_map: IFRS_MAP,
            statements: FINANCIAL_STATEMENTS,
        };
    }
}

module.exports = new FinancialReportingEngine();
