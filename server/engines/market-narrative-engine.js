/**
 * TrustChecker — Public Market Narrative Engine v1.0
 * IPO-GRADE: Capital Market Positioning
 * 
 * Technical depth is strong. But capital market narrative needs formalization.
 * IPO investors need: TAM, network effects, moat, switching costs, defensibility.
 * 
 * This is not marketing — it's financial positioning for institutional investors.
 */

// ═══════════════════════════════════════════════════════════════════
// 1. TOTAL ADDRESSABLE MARKET (TAM)
// ═══════════════════════════════════════════════════════════════════

const TAM_MODEL = {
    title: 'Total Addressable Market — Bottom-Up Analysis',

    markets: [
        {
            segment: 'Supply Chain Verification & Traceability',
            tam_usd_bn: 7.2,
            cagr_pct: 12.5,
            source: 'Grand View Research 2024',
            tc_position: 'Blockchain-verified QR traceability — differentiated from legacy track-and-trace',
            penetration_pct: 0.01,
            sam_usd_mn: 720,
            som_usd_mn: 72,
            som_assumption: '10% of SAM in 5 years via trust-differentiated offering',
        },
        {
            segment: 'Voluntary Carbon Market',
            tam_usd_bn: 50.0,
            cagr_pct: 30.0,
            source: 'McKinsey — voluntary carbon by 2030',
            tc_position: 'Settlement rail + verification — not carbon producer',
            penetration_pct: 0.001,
            sam_usd_mn: 500,
            som_usd_mn: 50,
            som_assumption: '10% of addressable settlement volume',
        },
        {
            segment: 'ESG Compliance & Reporting',
            tam_usd_bn: 22.4,
            cagr_pct: 18.0,
            source: 'Allied Market Research 2024',
            tc_position: 'Automated ESG scoring + carbon certificate issuance',
            penetration_pct: 0.005,
            sam_usd_mn: 1120,
            som_usd_mn: 56,
            som_assumption: '5% of SAM via integrated supply chain + carbon',
        },
        {
            segment: 'Digital Trust Infrastructure',
            tam_usd_bn: 14.8,
            cagr_pct: 15.2,
            source: 'MarketsandMarkets 2024',
            tc_position: 'Trust Graph + blockchain anchoring = new category',
            penetration_pct: 0.002,
            sam_usd_mn: 296,
            som_usd_mn: 30,
            som_assumption: 'Category creation — early mover advantage',
        },
    ],

    combined: {
        total_tam_usd_bn: 94.4,
        total_sam_usd_mn: 2636,
        total_som_usd_mn: 208,
        blended_cagr_pct: 18.9,
        note: 'SOM assumes 5-year horizon with current go-to-market strategy',
    },
};

// ═══════════════════════════════════════════════════════════════════
// 2. NETWORK EFFECTS QUANTIFICATION
// ═══════════════════════════════════════════════════════════════════

const NETWORK_EFFECTS = {
    title: 'Network Effects — Why Growth Compounds',

    effects: [
        {
            type: 'Direct Network Effect',
            mechanism: 'More supply chain participants → more verification touchpoints → more valuable data',
            strength: 'STRONG',
            measurement: 'Metcalfe\'s Law proxy: Network Value ∝ n² where n = active entities',
            current_stage: 'Early — building initial network density',
            flywheel: 'More Entities → More Scan Data → Better Trust Scores → More Entities Want to Join',
        },
        {
            type: 'Data Network Effect',
            mechanism: 'More verification data → better AI/ML models → more accurate trust scores',
            strength: 'VERY STRONG (compounding)',
            measurement: 'Model accuracy improvement per doubling of data points',
            current_stage: 'Seed — data infrastructure in place, models learning',
            flywheel: 'More Data → Better Models → More Accurate Scores → More Users Trust Scores → More Data',
        },
        {
            type: 'Cross-Side Network Effect (Platform)',
            mechanism: 'More verifiers attract more enterprises; more enterprises attract more verifiers',
            strength: 'STRONG',
            measurement: 'Supply-demand ratio in validator/enterprise marketplace',
            current_stage: 'Pre-launch — validator set being established',
            flywheel: 'More Validators → Faster Verification → Better SLA → More Enterprises → More Revenue → More Validators',
        },
        {
            type: 'Standard-Setting Network Effect',
            mechanism: 'As TrustChecker becomes verification standard, switching becomes harder',
            strength: 'POTENTIAL (long-term moat)',
            measurement: 'Industry adoption rate, regulatory reference count',
            current_stage: 'Aspirational — requires market share first',
            flywheel: 'Industry Adoption → Regulatory Alignment → De Facto Standard → Mandatory Usage → Deep Moat',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 3. COMPETITIVE MOAT ARTICULATION
// ═══════════════════════════════════════════════════════════════════

const MOAT = {
    title: 'Competitive Moat — 5 Layers of Defensibility',

    layers: [
        {
            layer: 'Technology Moat',
            description: 'Trust Graph + Constitutional RBAC + IVU = novel technology stack',
            depth: 'DEEP',
            time_to_replicate_years: 3,
            patents_pending: 'Trust Graph algorithm, IVU scoring methodology',
            note: 'Not just software — institutional-grade infrastructure design',
        },
        {
            layer: 'Data Moat',
            description: 'Historical verification data creates irreplaceable dataset for trust scoring',
            depth: 'VERY DEEP (compounding)',
            time_to_replicate_years: 5,
            data_asset: 'Verification history, trust score evolution, fraud patterns',
            note: 'Data moat deepens with every transaction — competitors start from zero',
        },
        {
            layer: 'Network Moat',
            description: 'Supply chain participants + validators create multi-sided network',
            depth: 'GROWING',
            time_to_replicate_years: 4,
            type: 'Multi-sided platform effects',
            note: 'Network effects create winner-takes-most dynamics',
        },
        {
            layer: 'Regulatory Moat',
            description: 'Pre-positioned for MiCA, GDPR, carbon regulations',
            depth: 'MODERATE',
            time_to_replicate_years: 2,
            licenses: 'MiCA CASP (planned), GDPR registration, carbon registry integrations',
            note: 'First-mover in regulatory compliance creates barrier for followers',
        },
        {
            layer: 'Switching Cost Moat',
            description: 'Integration depth + historical data + trust scores = high switching cost',
            depth: 'DEEP',
            time_to_replicate_years: 2,
            switching_costs: [
                'API integration + workflow embedding (3-6 months to switch)',
                'Historical trust score data loss (irreplaceable)',
                'Carbon certificate continuity (registry re-registration)',
                'Validator relationship migration (30-day exit notice)',
                'Compliance recertification with new provider',
            ],
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 4. SWITCHING COST QUANTIFICATION
// ═══════════════════════════════════════════════════════════════════

const SWITCHING_COSTS = {
    title: 'Switching Cost Analysis — Enterprise Client',

    cost_categories: [
        { category: 'Technical Migration', estimated_usd: 75000, timeline_months: 3, description: 'API re-integration, data migration, testing' },
        { category: 'Data Loss / History Gap', estimated_usd: 50000, timeline_months: 0, description: 'Lost trust scores, verification history (unrecoverable)' },
        { category: 'Process Disruption', estimated_usd: 30000, timeline_months: 2, description: 'Team retraining, workflow changes, productivity loss' },
        { category: 'Compliance Re-certification', estimated_usd: 25000, timeline_months: 3, description: 'Re-certify supply chain with new provider' },
        { category: 'Carbon Certificate Transition', estimated_usd: 20000, timeline_months: 4, description: 'Registry migration, offset continuity' },
        { category: 'Opportunity Cost', estimated_usd: 100000, timeline_months: 6, description: 'Features delayed, competitive position weakened during migration' },
    ],

    total_estimated_usd: 300000,
    total_timeline_months: 6,
    as_pct_of_annual_contract: 500,  // 5x annual contract value → very sticky
    churn_prediction: 'Net revenue retention > 120% expected with these switching costs',
};

// ═══════════════════════════════════════════════════════════════════
// 5. REGULATORY DEFENSIBILITY
// ═══════════════════════════════════════════════════════════════════

const REGULATORY_DEFENSIBILITY = {
    title: 'Regulatory Defensibility — Compliance as Moat',

    advantages: [
        {
            area: 'MiCA First-Mover',
            description: 'Pre-positioned for EU crypto-asset regulation',
            competitive_advantage: 'Competitors without MiCA license cannot operate in EU (Jan 2025+)',
            timeline: 'Licensing process takes 6-12 months — first movers have head start',
        },
        {
            area: 'GDPR Architecture',
            description: 'Data Compliance entity in Ireland with DPC oversight',
            competitive_advantage: 'Privacy-by-design architecture hard to retrofit',
            timeline: 'GDPR compliance from scratch = 12-24 months for enterprise software',
        },
        {
            area: 'Carbon Registry Integration',
            description: 'Direct integration with Verra, Gold Standard, EU ETS registries',
            competitive_advantage: 'Registry partnerships take 6-12 months to establish',
            timeline: 'Each registry requires separate audit and technical integration',
        },
        {
            area: 'Constitutional Governance',
            description: '3 charters, separation of powers, external oversight',
            competitive_advantage: 'Institutional-grade governance attracts regulated clients',
            timeline: 'Building governance framework from scratch = 12-18 months',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 6. COMPARABLE COMPANY FRAMEWORK
// ═══════════════════════════════════════════════════════════════════

const COMPARABLE_COMPANIES = {
    title: 'Public Market Comparable Companies',

    comparables: [
        { company: 'Intercontinental Exchange (ICE)', market_cap_usd_bn: 80, revenue_multiple: 15, description: 'Market infrastructure + clearing', relevance: 'Carbon exchange + settlement rail model' },
        { company: 'Moody\'s Corp', market_cap_usd_bn: 75, revenue_multiple: 14, description: 'Trust/credit rating authority', relevance: 'Trust scoring + verification authority' },
        { company: 'Nasdaq Inc', market_cap_usd_bn: 55, revenue_multiple: 8, description: 'Exchange + market technology', relevance: 'Technology platform for trading/settlement' },
        { company: 'Verra', market_cap_usd_bn: null, revenue_multiple: null, description: 'Carbon standard body (private)', relevance: 'Carbon verification standard' },
        { company: 'Chainlink (LINK)', market_cap_usd_bn: 8, revenue_multiple: null, description: 'Oracle network + staking', relevance: 'Validator network + staking economics' },
    ],

    implied_valuation: {
        method: 'Revenue multiple of comparable median (12x)',
        at_som_revenue: '$208M SOM × 12x = ~$2.5B implied',
        at_early_revenue: '$10M ARR × 15x (growth premium) = ~$150M',
        note: 'Infrastructure companies trade at premium multiples vs SaaS',
    },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class MarketNarrativeEngine {

    getTAM() { return TAM_MODEL; }
    getNetworkEffects() { return NETWORK_EFFECTS; }
    getMoat() { return MOAT; }
    getSwitchingCosts() { return SWITCHING_COSTS; }
    getRegulatoryDefensibility() { return REGULATORY_DEFENSIBILITY; }
    getComparables() { return COMPARABLE_COMPANIES; }

    getInvestorSummary() {
        return {
            headline: 'TrustChecker — Digital Trust Infrastructure for Global Supply Chains',
            positioning: 'Part ICE (settlement), part Moody\'s (trust scoring), part Chainlink (validator network)',
            tam: `$${TAM_MODEL.combined.total_tam_usd_bn}B across 4 segments, ${TAM_MODEL.combined.blended_cagr_pct}% CAGR`,
            som: `$${TAM_MODEL.combined.total_som_usd_mn}M 5-year SOM`,
            moat: `5-layer moat: technology (3yr), data (5yr), network (4yr), regulatory (2yr), switching ($300K/client)`,
            network_effects: '4 types: direct, data (compounding), cross-side, standard-setting',
            revenue_model: '6 streams: SaaS + transaction fees + settlement + staking + certification + API',
            governance: 'Constitutional: 3 charters, 60 engines, separation of powers, external oversight',
            comparable_valuation: COMPARABLE_COMPANIES.implied_valuation,
        };
    }

    getFullNarrative() {
        return {
            title: 'Public Market Narrative — IPO-Grade Positioning',
            version: '1.0',
            tam: TAM_MODEL,
            network_effects: NETWORK_EFFECTS,
            moat: MOAT,
            switching_costs: SWITCHING_COSTS,
            regulatory_defensibility: REGULATORY_DEFENSIBILITY,
            comparables: COMPARABLE_COMPANIES,
            investor_summary: this.getInvestorSummary(),
        };
    }
}

module.exports = new MarketNarrativeEngine();
