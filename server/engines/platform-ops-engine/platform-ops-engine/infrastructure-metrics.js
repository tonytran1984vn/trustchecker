/**
 * TrustChecker — Infrastructure Metrics Engine v1.0
 * The KPIs that define "infrastructure" — IPO story needs numbers.
 * 
 * Not technical metrics (those exist in monitoring).
 * This is INFRASTRUCTURE QUALITY metrics that regulators, investors,
 * and participants use to assess system health.
 */

// ═══════════════════════════════════════════════════════════════════
// 1. NETWORK INTEGRITY METRICS
// ═══════════════════════════════════════════════════════════════════

const NETWORK_METRICS = {
    metrics: [
        {
            id: 'NIM-01', name: 'Network Integrity Index',
            formula: '(Valid verifications / Total verifications) × (1 - dispute_rate) × uptime_pct',
            target: '> 98%',
            frequency: 'Real-time (rolling 30-day)',
            alert_thresholds: { green: 98, yellow: 95, red: 90, black: 80 },
            impact: 'Below 95% → Risk Committee alert. Below 90% → public disclosure required.',
        },
        {
            id: 'NIM-02', name: 'Trust Density Score',
            formula: 'Avg trust connections per entity × avg trust score / max possible',
            target: '> 0.65',
            frequency: 'Daily',
            interpretation: 'Higher = more interconnected, healthier trust network. Low = sparse, fragile network.',
            alert_thresholds: { green: 0.65, yellow: 0.50, red: 0.35 },
        },
        {
            id: 'NIM-03', name: 'Nakamoto Coefficient',
            formula: 'Minimum number of validators needed to control 51% of verification power',
            target: '≥ 5 (Governed phase), ≥ 10 (Autonomous phase)',
            frequency: 'Real-time',
            impact: 'Below target → decentralization risk alert → phase regression possible.',
        },
        {
            id: 'NIM-04', name: 'Validator Uptime SLA',
            formula: 'Avg validator uptime across network (weighted by stake)',
            target: '> 99.5%',
            frequency: 'Real-time (rolling 30-day)',
            alert_thresholds: { green: 99.5, yellow: 99.0, red: 98.0 },
            impact: 'Below 99% → validator incentive adjustment triggered.',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 2. OPERATIONAL QUALITY METRICS
// ═══════════════════════════════════════════════════════════════════

const OPERATIONAL_METRICS = {
    metrics: [
        {
            id: 'OQM-01', name: 'Dispute Ratio',
            formula: 'Disputes filed / Total verifications (rolling 90 days)',
            target: '< 0.5%',
            frequency: 'Weekly',
            alert_thresholds: { green: 0.5, yellow: 1.0, red: 2.0 },
            impact: 'Above 2% → IVU model review triggered.',
        },
        {
            id: 'OQM-02', name: 'False Positive Rate (Trust Scoring)',
            formula: 'Entities flagged incorrectly / Total entities flagged',
            target: '< 3%',
            frequency: 'Monthly (requires outcome validation)',
            impact: 'Above 5% → model risk tier review. Above 10% → KS-03 Scoring Freeze evaluation.',
        },
        {
            id: 'OQM-03', name: 'Settlement Success Rate',
            formula: 'Successful settlements / Total settlement attempts',
            target: '> 99.8%',
            frequency: 'Real-time',
            alert_thresholds: { green: 99.8, yellow: 99.5, red: 99.0 },
            impact: 'Below 99% → KS-05 evaluation. Circuit breaker CB-02 at 95%.',
        },
        {
            id: 'OQM-04', name: 'Carbon Audit Pass Rate',
            formula: 'Carbon verifications passing external audit / Total carbon verifications audited',
            target: '> 97%',
            frequency: 'Quarterly (external audit cycle)',
            impact: 'Below 95% → carbon verification methodology review.',
        },
        {
            id: 'OQM-05', name: 'Governance Latency',
            formula: 'Avg time from event → decision across all governance events',
            target: 'Auto: <10s, T1: <4h, T2: <48h',
            frequency: 'Per-event (real-time tracking)',
            impact: 'SLA breach → auto-escalation (already implemented in decision latency governance).',
        },
        {
            id: 'OQM-06', name: 'Tamper Detection Lag',
            formula: 'Time between tamper event and detection',
            target: '< 60 seconds',
            frequency: 'Per-event',
            alert_thresholds: { green: 60, yellow: 300, red: 3600 },
            impact: 'Above 5 minutes → hash-chain daemon review.',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 3. FINANCIAL HEALTH METRICS
// ═══════════════════════════════════════════════════════════════════

const FINANCIAL_METRICS = {
    metrics: [
        {
            id: 'FHM-01', name: 'Capital Adequacy Ratio (CAR)',
            formula: 'Available capital / Risk-weighted assets',
            target: '> 12%',
            frequency: 'Real-time (60-second refresh)',
            regulatory: 'Basel III-inspired. Maps to integration-locking-engine thresholds.',
            kill_switch: '<6% → KS-05 auto-trigger',
        },
        {
            id: 'FHM-02', name: 'Liquidity Coverage Ratio (LCR)',
            formula: 'High-quality liquid assets / Net cash outflows (30-day stress)',
            target: '> 100%',
            frequency: 'Daily',
            kill_switch: '<80% → KS-05 auto-trigger',
        },
        {
            id: 'FHM-03', name: 'Revenue Concentration Index',
            formula: 'HHI of revenue by client (top 10 share)',
            target: 'HHI < 2500 (no single client > 15%)',
            frequency: 'Monthly',
            impact: 'HHI > 2500 → diversification initiative.',
        },
        {
            id: 'FHM-04', name: 'Reserve Adequacy',
            formula: 'Capital Reserve / (Avg monthly settlement volume × default rate)',
            target: '> 6 months coverage',
            frequency: 'Monthly',
            impact: 'Below 3 months → capital call.',
        },
        {
            id: 'FHM-05', name: 'Unit Economics (LTV:CAC)',
            formula: 'Lifetime value / Customer acquisition cost',
            target: '> 5:1',
            frequency: 'Quarterly',
            impact: 'Below 3:1 → pricing/product review.',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// 4. COMPOSITE INFRASTRUCTURE SCORE
// ═══════════════════════════════════════════════════════════════════

const COMPOSITE_SCORE = {
    title: 'Infrastructure Health Score — Single Number for Board/Investors',

    formula: 'Weighted: Network (25%) + Operational (25%) + Financial (20%) + Governance Surveillance (15%) + Governance Compliance (15%)',

    components: {
        network: { weight: 0.25, inputs: ['NIM-01', 'NIM-02', 'NIM-03', 'NIM-04'] },
        operational: { weight: 0.25, inputs: ['OQM-01', 'OQM-02', 'OQM-03', 'OQM-04', 'OQM-05', 'OQM-06'] },
        financial: { weight: 0.20, inputs: ['FHM-01', 'FHM-02', 'FHM-03', 'FHM-04', 'FHM-05'] },
        governance_surveillance: { weight: 0.15, inputs: ['GSM-01', 'GSM-02', 'GSM-03', 'GSM-04', 'GSM-05', 'GSM-06'] },
        governance_compliance: { weight: 0.15, inputs: ['Constitutional compliance rate', 'Audit findings resolved', 'Drill pass rate'] },
    },

    interpretation: {
        above_90: 'Excellent — investor/regulator confidence high',
        above_80: 'Good — minor improvements needed',
        above_70: 'Adequate — active improvement plan required',
        above_60: 'Warning — board-level attention required',
        below_60: 'Critical — immediate action plan to board',
    },

    reporting: 'Monthly to management. Quarterly to board. Annually in public report.',
};

// ═══════════════════════════════════════════════════════════════════
// 5. GOVERNANCE SURVEILLANCE METRICS — Silent Decay Detection
// ═══════════════════════════════════════════════════════════════════

const GOVERNANCE_SURVEILLANCE = {
    title: 'Governance Surveillance — Detect Decay Before Collapse',

    metrics: [
        {
            id: 'GSM-01', name: 'Data Drift Velocity',
            formula: 'Schema deviation events + unexpected data pattern changes / week',
            target: '< 2 events/week',
            frequency: 'Real-time (rolling 7-day)',
            interpretation: 'Measures how fast data characteristics are changing. High drift = model inputs becoming unreliable.',
            alert_thresholds: { green: 2, yellow: 5, red: 10 },
            impact: 'Above 5/week → model recalibration review. Above 10/week → KS-03 evaluation.',
        },
        {
            id: 'GSM-02', name: 'Network Centralization Index',
            formula: 'Gini coefficient of verification power across validators',
            target: '< 0.4 (moderate inequality)',
            frequency: 'Daily',
            interpretation: '0 = perfect equality (all validators equal). 1 = total centralization (1 validator controls all). Target: < 0.4 for healthy decentralization.',
            alert_thresholds: { green: 0.4, yellow: 0.6, red: 0.8 },
            impact: 'Above 0.6 → decentralization initiative. Above 0.8 → network integrity risk → GGC review.',
            related: 'Complements NIM-03 (Nakamoto Coefficient). Gini measures inequality, Nakamoto measures minimum coalition.',
        },
        {
            id: 'GSM-03', name: 'Role Override Frequency',
            formula: 'Manual overrides requiring elevated privilege / Total governance decisions',
            target: '< 1% of decisions',
            frequency: 'Weekly',
            interpretation: 'How often does the system need human override? High = system rules may be poorly designed or being gamed.',
            alert_thresholds: { green: 1, yellow: 3, red: 5 },
            impact: 'Above 3% → rule review (are rules too restrictive or are people bypassing?). Above 5% → systemic governance issue.',
            watched_by: ['Super Admin', 'Risk Committee', 'GGC'],
        },
        {
            id: 'GSM-04', name: 'Kill-Switch Trigger Density',
            formula: 'Kill-switch activations (auto + manual) / 90-day rolling period',
            target: '< 1 activation / quarter',
            frequency: 'Real-time',
            interpretation: '0 = stable system. Frequent triggers = underlying instability OR overly sensitive thresholds.',
            alert_thresholds: { green: 1, yellow: 3, red: 5 },
            impact: 'Above 3/quarter → threshold recalibration review. Above 5/quarter → systemic stability concern → board alert.',
        },
        {
            id: 'GSM-05', name: 'Anchor Latency',
            formula: 'Avg time from data creation → blockchain anchor confirmation',
            target: '< 30 minutes',
            frequency: 'Real-time',
            interpretation: 'How fast are proofs being committed to blockchain. High latency = growing backlog or infrastructure issue.',
            alert_thresholds: { green: 30, yellow: 60, red: 120 },
            impact: 'Above 60 min → Node Operations review. Above 120 min → CB-04 Anchor Backlog breaker.',
        },
        {
            id: 'GSM-06', name: 'Silent Governance Drift Score',
            formula: '(Override frequency trend × 0.3) + (Role concentration change × 0.3) + (Policy exception trend × 0.2) + (Audit finding recurrence × 0.2)',
            target: '< 15 (0-100 scale)',
            frequency: 'Monthly',
            interpretation: 'Composite measure of whether governance is slowly weakening without explicit events. The most dangerous metric — catches what no single metric can.',
            alert_thresholds: { green: 15, yellow: 30, red: 50 },
            impact: 'Above 30 → detailed governance review commissioned. Above 50 → external governance audit mandated.',
            unique: 'This metric specifically detects "capture by a thousand cuts" — gradual weakening of controls.',
        },
    ],
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class InfrastructureMetricsEngine {
    getNetworkMetrics() { return NETWORK_METRICS; }
    getOperationalMetrics() { return OPERATIONAL_METRICS; }
    getFinancialMetrics() { return FINANCIAL_METRICS; }
    getGovernanceSurveillance() { return GOVERNANCE_SURVEILLANCE; }
    getCompositeScore() { return COMPOSITE_SCORE; }

    calculateComposite(network_pct, operational_pct, financial_pct, gov_surveillance_pct, gov_compliance_pct) {
        const n = network_pct || 95;
        const o = operational_pct || 97;
        const f = financial_pct || 90;
        const gs = gov_surveillance_pct || 93;
        const gc = gov_compliance_pct || 92;
        const composite = (n * 0.25) + (o * 0.25) + (f * 0.20) + (gs * 0.15) + (gc * 0.15);
        const rounded = parseFloat(composite.toFixed(1));
        let interpretation;
        if (rounded >= 90) interpretation = 'Excellent';
        else if (rounded >= 80) interpretation = 'Good';
        else if (rounded >= 70) interpretation = 'Adequate';
        else if (rounded >= 60) interpretation = 'Warning';
        else interpretation = 'Critical';
        return { composite_score: rounded, interpretation, breakdown: { network: n, operational: o, financial: f, governance_surveillance: gs, governance_compliance: gc }, weights: '25/25/20/15/15' };
    }

    getFullFramework() {
        return { title: 'Infrastructure Metrics — IPO-Ready KPIs', version: '2.0', network: NETWORK_METRICS, operational: OPERATIONAL_METRICS, financial: FINANCIAL_METRICS, governance_surveillance: GOVERNANCE_SURVEILLANCE, composite: COMPOSITE_SCORE };
    }
}

module.exports = new InfrastructureMetricsEngine();
