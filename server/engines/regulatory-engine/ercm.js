/**
 * TrustChecker — ERCM v1.0 (Enterprise Risk & Control Map)
 * COSO ERM + Three Lines Model + IPO-Grade Auditability
 *
 * Governance overlay across all 6 EAS layers:
 *   7 Risk Domains · 32 Risks · Three Lines · 4 Committees
 *   Risk Score = Likelihood × Impact × CE Modifier
 *   Board-level dashboard · Control testing · Gap to IPO
 */
const crypto = require('crypto');

// ═════════════════════════════════════════════════════════════════════
// THREE LINES MODEL
// ═════════════════════════════════════════════════════════════════════
const THREE_LINES = {
    line1: {
        name: 'Business Ownership', description: 'Risk owners who manage and control risks daily', roles: [
            { role: 'Ops', responsibility: 'Case workflow, SLA enforcement, operational execution' },
            { role: 'Risk', responsibility: 'Risk scoring, behavioral analysis, fraud detection' },
            { role: 'Compliance', responsibility: 'Regulatory adherence, policy enforcement, evidence review' },
            { role: 'IT', responsibility: 'Infrastructure security, API management, access control' },
            { role: 'SCM', responsibility: 'Supply chain operations, partner management, QR scanning' }
        ]
    },
    line2: {
        name: 'Oversight Functions', description: 'Provide expertise, challenge, and monitoring', roles: [
            { role: 'CRO', responsibility: 'Enterprise risk appetite, model oversight, board reporting' },
            { role: 'CISO', responsibility: 'Cybersecurity posture, encryption governance, incident response' },
            { role: 'Compliance Head', responsibility: 'Regulatory framework, GDPR, cross-border compliance' },
            { role: 'Model Risk Officer', responsibility: 'Model validation, MHI monitoring, IVU governance' }
        ]
    },
    line3: {
        name: 'Independent Assurance', description: 'Independent verification of risk and control effectiveness', roles: [
            { role: 'Internal Audit', responsibility: 'Control testing, process audit, compliance sampling' },
            { role: 'External Auditor', responsibility: 'Annual attestation, SOC 2 certification, opinion letter' }
        ]
    }
};

// ═════════════════════════════════════════════════════════════════════
// RISK GOVERNANCE BODIES
// ═════════════════════════════════════════════════════════════════════
const GOVERNANCE_BODIES = [
    { name: 'Risk Committee', cadence: 'Monthly', chair: 'CRO', members: 6, scope: 'Enterprise risk oversight, risk appetite, top risks', outputs: ['Risk heatmap', 'Residual risk trend', 'Appetite breach report'] },
    { name: 'Model Risk Committee', cadence: 'Monthly', chair: 'CRO', members: 6, scope: 'Model governance, drift, validation, MHI', outputs: ['Model heatmap', 'MVR status', 'Drift incidents'] },
    { name: 'IT Security Committee', cadence: 'Quarterly', chair: 'CISO', members: 5, scope: 'Cyber posture, access review, key management', outputs: ['Security posture report', 'Penetration test results', 'Access review'] },
    { name: 'ESG & Carbon Oversight', cadence: 'Quarterly', chair: 'CEO', members: 4, scope: 'Carbon integrity, MRV, regulatory readiness', outputs: ['Carbon exposure report', 'MRV reconciliation', 'Regulatory update'] }
];

// ═════════════════════════════════════════════════════════════════════
// RISK TAXONOMY — 7 DOMAINS, 32 RISKS
// ═════════════════════════════════════════════════════════════════════
const RISK_REGISTRY = [
    // 1. Strategic Risk
    { id: 'SR-01', domain: 'Strategic', description: 'Over-expansion of product scope', impact_desc: 'Strategic drift, resource dilution', impact: 4, likelihood: 3, control_effectiveness: 1.0, owner: 'CEO', control: 'Product roadmap governance', control_type: 'preventive', evidence: 'Board minutes', layer: 'L2' },
    { id: 'SR-02', domain: 'Strategic', description: 'Loss of enterprise positioning', impact_desc: 'Valuation compression, market confusion', impact: 5, likelihood: 2, control_effectiveness: 1.0, owner: 'CEO', control: 'Narrative governance pack', control_type: 'preventive', evidence: 'Investor deck review', layer: 'L2' },
    { id: 'SR-03', domain: 'Strategic', description: 'Dependency on single industry', impact_desc: 'Revenue volatility', impact: 3, likelihood: 3, control_effectiveness: 1.0, owner: 'CRO', control: 'Industry diversification KPI', control_type: 'detective', evidence: 'Revenue mix report', layer: 'L2' },

    // 2. Operational Risk
    { id: 'OR-01', domain: 'Operational', description: 'Case workflow SLA failure', impact_desc: 'Client SLA breach, reputational', impact: 3, likelihood: 2, control_effectiveness: 0.5, owner: 'Ops', control: 'Automated SLA monitoring', control_type: 'detective', evidence: 'SLA dashboard', layer: 'L3' },
    { id: 'OR-02', domain: 'Operational', description: 'Batch lock error — incorrect entity locked', impact_desc: 'Financial loss, operational disruption', impact: 4, likelihood: 2, control_effectiveness: 0.5, owner: 'Risk', control: '4-eyes SoD approval', control_type: 'preventive', evidence: 'Immutable audit trail', layer: 'L2' },
    { id: 'OR-03', domain: 'Operational', description: 'Code collision in governance layer', impact_desc: 'Duplicate code issuance, trust erosion', impact: 4, likelihood: 1, control_effectiveness: 0.5, owner: 'CA', control: 'HMAC + Bloom filter collision prevention', control_type: 'preventive', evidence: 'Code audit log', layer: 'L3' },
    { id: 'OR-04', domain: 'Operational', description: 'False positive surge', impact_desc: 'Operational overload, user friction', impact: 3, likelihood: 3, control_effectiveness: 0.5, owner: 'Risk', control: 'FP feedback loop + recalibration', control_type: 'corrective', evidence: 'FP dashboard', layer: 'L3' },
    { id: 'OR-05', domain: 'Operational', description: 'Integration failure (ERP/customs)', impact_desc: 'Data gaps, delayed processing', impact: 3, likelihood: 2, control_effectiveness: 1.0, owner: 'IT', control: 'Circuit breaker + DLQ', control_type: 'corrective', evidence: 'Integration log', layer: 'L5' },

    // 3. Technology & Cyber Risk
    { id: 'TR-01', domain: 'Technology', description: 'Unauthorized system access', impact_desc: 'Data breach, compliance violation', impact: 5, likelihood: 2, control_effectiveness: 0.5, owner: 'IT', control: 'RBAC + SoD + Zero-Trust', control_type: 'preventive', evidence: 'Access logs', layer: 'L6' },
    { id: 'TR-02', domain: 'Technology', description: 'Privileged account misuse (SA)', impact_desc: 'System integrity compromise', impact: 5, likelihood: 1, control_effectiveness: 0.5, owner: 'Compliance', control: '6-eyes + SA constraints + rate limiting', control_type: 'preventive', evidence: 'Privileged review report', layer: 'L6' },
    { id: 'TR-03', domain: 'Technology', description: 'Data breach via API', impact_desc: 'Data loss, regulatory fine', impact: 5, likelihood: 2, control_effectiveness: 0.5, owner: 'CISO', control: 'Encryption + KMS + WAF', control_type: 'preventive', evidence: 'Encryption audit', layer: 'L6' },
    { id: 'TR-04', domain: 'Technology', description: 'Crypto key compromise', impact_desc: 'Evidence integrity loss', impact: 5, likelihood: 1, control_effectiveness: 0.5, owner: 'SA', control: 'HSM + anchor policy + key rotation', control_type: 'preventive', evidence: 'Key management logs', layer: 'L4' },
    { id: 'TR-05', domain: 'Technology', description: 'API abuse / DDoS', impact_desc: 'Service degradation', impact: 3, likelihood: 3, control_effectiveness: 0.5, owner: 'IT', control: 'Rate limiting + API gateway + WAF', control_type: 'preventive', evidence: 'API monitoring', layer: 'L6' },
    { id: 'TR-06', domain: 'Technology', description: 'Cross-tenant data leakage', impact_desc: 'Trust failure, legal liability', impact: 5, likelihood: 1, control_effectiveness: 0.5, owner: 'SA', control: 'Tenant isolation + boundary enforcement', control_type: 'preventive', evidence: 'Isolation test results', layer: 'L6' },

    // 4. Model Risk
    { id: 'MR-01', domain: 'Model', description: 'Model drift — score distribution shift', impact_desc: 'Incorrect risk assessments', impact: 4, likelihood: 3, control_effectiveness: 0.5, owner: 'MRO', control: 'Drift detection (5 metrics + MSI)', control_type: 'detective', evidence: 'Drift report', layer: 'L3' },
    { id: 'MR-02', domain: 'Model', description: 'Bias in risk scoring', impact_desc: 'Unfair treatment, regulatory risk', impact: 4, likelihood: 2, control_effectiveness: 1.0, owner: 'Risk', control: 'Bias analysis + 4/5 rule + 180-day replay', control_type: 'detective', evidence: 'Bias analysis report', layer: 'L3' },
    { id: 'MR-03', domain: 'Model', description: 'Wrong threshold deployment', impact_desc: 'Mass incorrect lock/unlock', impact: 5, likelihood: 1, control_effectiveness: 0.5, owner: 'CRO', control: '6-eyes + MDLC 10-step + MRC approval', control_type: 'preventive', evidence: 'Version approval log', layer: 'L2' },
    { id: 'MR-04', domain: 'Model', description: 'Inadequate model validation', impact_desc: 'Undetected model weakness', impact: 4, likelihood: 2, control_effectiveness: 0.5, owner: 'MRO', control: 'IVU 8-check + MVR + dual Tier 4', control_type: 'preventive', evidence: 'Model Validation Report', layer: 'L4' },
    { id: 'MR-05', domain: 'Model', description: 'Auto-decision systemic error', impact_desc: 'Mass auto-lock cascade', impact: 5, likelihood: 1, control_effectiveness: 0.5, owner: 'Risk', control: 'Threshold guardrails + stress testing', control_type: 'preventive', evidence: 'Auto-decision log', layer: 'L3' },

    // 5. Legal & Regulatory
    { id: 'LR-01', domain: 'Legal', description: 'GDPR violation', impact_desc: 'Regulatory fine, reputational', impact: 5, likelihood: 2, control_effectiveness: 1.0, owner: 'Compliance', control: 'Privacy workflow + data minimization', control_type: 'preventive', evidence: 'GDPR compliance log', layer: 'L2' },
    { id: 'LR-02', domain: 'Legal', description: 'Data retention policy failure', impact_desc: 'Legal non-compliance', impact: 3, likelihood: 2, control_effectiveness: 0.5, owner: 'Compliance', control: 'Automated retention engine', control_type: 'preventive', evidence: 'Retention schedule', layer: 'L4' },
    { id: 'LR-03', domain: 'Legal', description: 'Evidence inadmissibility in legal', impact_desc: 'Case failure', impact: 4, likelihood: 2, control_effectiveness: 0.5, owner: 'Legal', control: 'SHA-256 + TSA timestamp + blockchain seal', control_type: 'preventive', evidence: 'Evidence export with chain', layer: 'L4' },
    { id: 'LR-04', domain: 'Legal', description: 'Cross-border data transfer risk', impact_desc: 'Regulatory intervention', impact: 4, likelihood: 2, control_effectiveness: 1.0, owner: 'SA', control: 'Public anchor policy + data residency', control_type: 'preventive', evidence: 'Anchor configuration', layer: 'L4' },
    { id: 'LR-05', domain: 'Legal', description: 'Carbon credit misreporting', impact_desc: 'Legal liability, carbon fraud', impact: 5, likelihood: 2, control_effectiveness: 1.5, owner: 'ESG Lead', control: 'MRV governance pipeline', control_type: 'detective', evidence: 'Carbon audit report', layer: 'L3' },

    // 6. Financial & Settlement
    { id: 'FR-01', domain: 'Financial', description: 'Billing miscalculation', impact_desc: 'Revenue leakage, client dispute', impact: 3, likelihood: 2, control_effectiveness: 0.5, owner: 'Finance', control: 'Usage audit + invoice reconciliation', control_type: 'detective', evidence: 'Invoice audit', layer: 'L5' },
    { id: 'FR-02', domain: 'Financial', description: 'Wallet/credit fraud', impact_desc: 'Direct financial loss', impact: 4, likelihood: 2, control_effectiveness: 0.5, owner: 'Finance', control: 'Ledger reconciliation + anomaly detection', control_type: 'detective', evidence: 'Wallet transaction log', layer: 'L5' },
    { id: 'FR-03', domain: 'Financial', description: 'Carbon credit double-mint', impact_desc: 'Registry integrity loss', impact: 5, likelihood: 1, control_effectiveness: 0.5, owner: 'Carbon Governance', control: 'Blockchain registry + uniqueness check', control_type: 'preventive', evidence: 'Minting log', layer: 'L4' },
    { id: 'FR-04', domain: 'Financial', description: 'Settlement dispute escalation', impact_desc: 'Legal cost, relationship damage', impact: 3, likelihood: 2, control_effectiveness: 1.0, owner: 'Legal', control: 'Evidence freeze + case workflow', control_type: 'corrective', evidence: 'Case archive', layer: 'L3' },

    // 7. ESG & Carbon
    { id: 'ER-01', domain: 'ESG', description: 'Incorrect emission data in MRV', impact_desc: 'Credit invalidity', impact: 4, likelihood: 3, control_effectiveness: 1.0, owner: 'ESG', control: 'MRV pipeline + data validation', control_type: 'detective', evidence: 'MRV audit trail', layer: 'L3' },
    { id: 'ER-02', domain: 'ESG', description: 'Greenwashing accusation', impact_desc: 'Reputational destruction', impact: 5, likelihood: 2, control_effectiveness: 1.0, owner: 'ESG', control: 'Blockchain seal + public verification', control_type: 'preventive', evidence: 'Public verification log', layer: 'L4' },
    { id: 'ER-03', domain: 'ESG', description: 'Carbon regulatory regime change', impact_desc: 'Business model disruption', impact: 5, likelihood: 3, control_effectiveness: 1.5, owner: 'CEO', control: 'Carbon oversight committee + horizon scan', control_type: 'detective', evidence: 'Regulatory review log', layer: 'L2' },
    { id: 'ER-04', domain: 'ESG', description: 'Credit liability exposure', impact_desc: 'Financial contingent liability', impact: 4, likelihood: 2, control_effectiveness: 1.0, owner: 'Carbon', control: 'Credit lifecycle governance + ring-fence', control_type: 'preventive', evidence: 'Credit ledger', layer: 'L5' }
];

// ═════════════════════════════════════════════════════════════════════
// CONTROL TESTING FRAMEWORK
// ═════════════════════════════════════════════════════════════════════
const CONTROL_TESTS = {
    quarterly: [
        { id: 'CT-Q1', test: 'Access review sampling', domain: 'Technology', method: 'Sample 10% of RBAC assignments, verify SoD', pass_criteria: '0 SoD violations' },
        { id: 'CT-Q2', test: 'Model replay validation', domain: 'Model', method: 'Re-run 30-day production data, compare outputs', pass_criteria: '±2% score deviation tolerance' },
        { id: 'CT-Q3', test: 'Evidence export verification', domain: 'Legal', method: 'Export 5 sealed evidence packages, verify hash chain', pass_criteria: 'All hashes verified, TSA valid' },
        { id: 'CT-Q4', test: 'Cross-tenant isolation test', domain: 'Technology', method: 'Attempt cross-tenant data access via API', pass_criteria: '0 cross-tenant leaks' },
        { id: 'CT-Q5', test: 'Carbon MRV reconciliation', domain: 'ESG', method: 'Reconcile MRV data against minting log', pass_criteria: '0 unaccounted credits' },
        { id: 'CT-Q6', test: 'Billing reconciliation', domain: 'Financial', method: 'Compare usage meters vs invoices', pass_criteria: '±0.1% variance tolerance' }
    ],
    annual: [
        { id: 'CT-A1', test: 'Full enterprise risk re-assessment', domain: 'All', method: 'Review all 32 risks, update scores', pass_criteria: 'Board-approved risk register' },
        { id: 'CT-A2', test: 'Scenario stress simulation', domain: 'Model', method: 'Run all 6 stress scenarios, record results', pass_criteria: 'All pass or documented exceptions' },
        { id: 'CT-A3', test: 'External advisory review', domain: 'All', method: 'Big4 or equivalent review of control framework', pass_criteria: 'Unqualified opinion' }
    ]
};

// ═════════════════════════════════════════════════════════════════════
// IPO GAP ITEMS
// ═════════════════════════════════════════════════════════════════════
const IPO_GAPS = [
    { id: 'GAP-01', item: 'Formal Risk Appetite Statement', status: 'implemented', description: 'Board-approved tolerance thresholds per domain', evidence: 'Risk appetite document' },
    { id: 'GAP-02', item: 'Residual Risk Heatmap auto-generated', status: 'implemented', description: 'Auto-calculated from 32 risks with scoring formula', evidence: 'ERCM heatmap endpoint' },
    { id: 'GAP-03', item: 'Risk Capital Allocation model', status: 'planned', description: 'Capital buffer per risk domain based on residual score', evidence: 'Pending finance integration' },
    { id: 'GAP-04', item: 'Internal Control Attestation (CEO/CFO sign-off)', status: 'implemented', description: 'Attestation workflow with hash-sealed sign-off', evidence: 'Attestation log' },
    { id: 'GAP-05', item: 'Independent Internal Audit charter', status: 'implemented', description: 'Line 3 charter with quarterly testing schedule', evidence: 'Audit charter document' },
    { id: 'GAP-06', item: 'Regulatory engagement program', status: 'planned', description: 'Structured engagement with relevant regulators', evidence: 'Pending regulatory mapping' }
];

// FIX #6b: Bounded arrays to prevent memory exhaustion
const MAX_ERCM_RECORDS = 1000;

class ERCMEngine {
    constructor() {
        this._assessments = [];
        this._testResults = [];
        this._attestations = [];
    }

    _boundedPush(arr, item) {
        arr.push(item);
        if (arr.length > MAX_ERCM_RECORDS) arr.splice(0, arr.length - MAX_ERCM_RECORDS);
    }

    // ═══════════════════════════════════════════════════════════════
    // THREE LINES MODEL
    // ═══════════════════════════════════════════════════════════════
    getThreeLines() {
        return { title: 'Three Lines of Defense Model', ...THREE_LINES, total_roles: THREE_LINES.line1.roles.length + THREE_LINES.line2.roles.length + THREE_LINES.line3.roles.length };
    }

    getGovernanceBodies() {
        return { title: 'Risk Governance Bodies', bodies: GOVERNANCE_BODIES, total: GOVERNANCE_BODIES.length };
    }

    // ═══════════════════════════════════════════════════════════════
    // RISK REGISTRY + SCORING
    // ═══════════════════════════════════════════════════════════════
    getRiskRegistry() {
        const scored = RISK_REGISTRY.map(r => ({ ...r, risk_score: Math.round(r.likelihood * r.impact * r.control_effectiveness * 10) / 10 }));
        const domains = [...new Set(scored.map(r => r.domain))];
        const byDomain = {};
        domains.forEach(d => {
            const risks = scored.filter(r => r.domain === d);
            const avgScore = Math.round(risks.reduce((s, r) => s + r.risk_score, 0) / risks.length * 10) / 10;
            byDomain[d] = { risks: risks.length, avg_score: avgScore, residual: avgScore > 12 ? 'High' : avgScore > 7 ? 'Medium' : 'Low' };
        });
        return {
            title: 'Enterprise Risk Registry — 7 Domains',
            total_risks: RISK_REGISTRY.length,
            domains: byDomain,
            scoring_formula: 'Risk Score = Likelihood (1-5) × Impact (1-5) × Control Effectiveness Modifier (0.5=Strong, 1.0=Moderate, 1.5=Weak)',
            risks: scored.sort((a, b) => b.risk_score - a.risk_score),
            generated_at: new Date().toISOString()
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // RISK HEATMAP (auto-generated)
    // ═══════════════════════════════════════════════════════════════
    generateHeatmap() {
        const scored = RISK_REGISTRY.map(r => ({ id: r.id, domain: r.domain, description: r.description, likelihood: r.likelihood, impact: r.impact, ce: r.control_effectiveness, score: Math.round(r.likelihood * r.impact * r.control_effectiveness * 10) / 10 }));

        // 5×5 grid
        const grid = [];
        for (let imp = 5; imp >= 1; imp--) {
            for (let lik = 1; lik <= 5; lik++) {
                const cell = scored.filter(r => r.likelihood === lik && r.impact === imp);
                grid.push({ impact: imp, likelihood: lik, inherent_zone: imp * lik >= 15 ? 'critical' : imp * lik >= 8 ? 'high' : imp * lik >= 4 ? 'medium' : 'low', risks: cell.map(r => r.id) });
            }
        }

        const topRisks = scored.sort((a, b) => b.score - a.score).slice(0, 10);

        return {
            title: 'Enterprise Risk Heatmap (Auto-Generated)',
            total_risks: scored.length,
            top_10_residual: topRisks,
            zones: { critical: scored.filter(r => r.score >= 15).length, high: scored.filter(r => r.score >= 8 && r.score < 15).length, medium: scored.filter(r => r.score >= 4 && r.score < 8).length, low: scored.filter(r => r.score < 4).length },
            grid,
            generated_at: new Date().toISOString()
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // CONTROL CLASSIFICATION
    // ═══════════════════════════════════════════════════════════════
    getControlMatrix() {
        const total = RISK_REGISTRY.length;
        const preventive = RISK_REGISTRY.filter(r => r.control_type === 'preventive').length;
        const detective = RISK_REGISTRY.filter(r => r.control_type === 'detective').length;
        const corrective = RISK_REGISTRY.filter(r => r.control_type === 'corrective').length;

        return {
            title: 'Control Classification Matrix',
            total_controls: total,
            breakdown: {
                preventive: { count: preventive, pct: Math.round(preventive / total * 100), target: '≥60%' },
                detective: { count: detective, pct: Math.round(detective / total * 100), target: '≥25%' },
                corrective: { count: corrective, pct: Math.round(corrective / total * 100), target: '≤15%' }
            },
            ipo_ready: preventive / total >= 0.60 && detective / total >= 0.25 && corrective / total <= 0.15,
            by_domain: [...new Set(RISK_REGISTRY.map(r => r.domain))].map(d => {
                const dr = RISK_REGISTRY.filter(r => r.domain === d);
                return { domain: d, preventive: dr.filter(r => r.control_type === 'preventive').length, detective: dr.filter(r => r.control_type === 'detective').length, corrective: dr.filter(r => r.control_type === 'corrective').length };
            })
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // RISK APPETITE STATEMENT
    // ═══════════════════════════════════════════════════════════════
    getRiskAppetite() {
        return {
            title: 'Formal Risk Appetite Statement',
            approved_by: 'Board of Directors',
            effective_date: '2026-01-01',
            appetite: [
                { domain: 'Strategic', tolerance: 'Medium', statement: 'Accept measured strategic risk in pursuit of market positioning, with quarterly board review', max_residual: 12 },
                { domain: 'Operational', tolerance: 'Low', statement: 'Minimal tolerance for operational failure; all critical processes must have automated controls', max_residual: 8 },
                { domain: 'Technology', tolerance: 'Very Low', statement: 'Zero tolerance for data breach or unauthorized access; preventive controls mandatory', max_residual: 5 },
                { domain: 'Model', tolerance: 'Low-Medium', statement: 'Accept model risk within validated bounds; all Tier 4 models require dual validation', max_residual: 10 },
                { domain: 'Legal', tolerance: 'Very Low', statement: 'Zero tolerance for regulatory violation; full compliance framework required', max_residual: 6 },
                { domain: 'Financial', tolerance: 'Low', statement: 'Minimal tolerance for financial loss from controls; reconciliation mandatory', max_residual: 7 },
                { domain: 'ESG', tolerance: 'Medium-High', statement: 'Higher tolerance accepted given emerging nature; active monitoring required', max_residual: 15 }
            ]
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // BOARD DASHBOARD
    // ═══════════════════════════════════════════════════════════════
    getBoardDashboard() {
        const scored = RISK_REGISTRY.map(r => ({ ...r, risk_score: Math.round(r.likelihood * r.impact * r.control_effectiveness * 10) / 10 }));
        const topRisks = scored.sort((a, b) => b.risk_score - a.risk_score).slice(0, 10);
        const appetites = this.getRiskAppetite().appetite;
        const controlMatrix = this.getControlMatrix();

        // Appetite breach detection
        const domains = [...new Set(scored.map(r => r.domain))];
        const domainScores = domains.map(d => {
            const risks = scored.filter(r => r.domain === d);
            const avg = Math.round(risks.reduce((s, r) => s + r.risk_score, 0) / risks.length * 10) / 10;
            const appetite = appetites.find(a => a.domain === d);
            return { domain: d, avg_score: avg, appetite_max: appetite?.max_residual || 10, breached: avg > (appetite?.max_residual || 10), tolerance: appetite?.tolerance || 'N/A' };
        });

        return {
            title: 'Board-Level Risk Dashboard',
            report_date: new Date().toISOString().slice(0, 10),
            top_10_residual_risks: topRisks.map(r => ({ id: r.id, domain: r.domain, description: r.description, score: r.risk_score, owner: r.owner })),
            domain_scores: domainScores,
            appetite_breaches: domainScores.filter(d => d.breached),
            control_effectiveness: controlMatrix.breakdown,
            control_ipo_ready: controlMatrix.ipo_ready,
            risk_count: { total: scored.length, critical: scored.filter(r => r.risk_score >= 15).length, high: scored.filter(r => r.risk_score >= 8 && r.risk_score < 15).length, medium: scored.filter(r => r.risk_score >= 4 && r.risk_score < 8).length, low: scored.filter(r => r.risk_score < 4).length },
            generated_at: new Date().toISOString()
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // CONTROL TESTING
    // ═══════════════════════════════════════════════════════════════
    getControlTests() {
        return { title: 'Control Testing Framework', ...CONTROL_TESTS, total_quarterly: CONTROL_TESTS.quarterly.length, total_annual: CONTROL_TESTS.annual.length };
    }

    recordTestResult(params) {
        const { test_id, passed, findings = '', tester_id } = params;
        const allTests = [...CONTROL_TESTS.quarterly, ...CONTROL_TESTS.annual];
        const test = allTests.find(t => t.id === test_id);
        if (!test) return { error: 'Unknown test ID' };

        const result = {
            result_id: `CTR-${Date.now().toString(36)}`.toUpperCase(),
            test_id, test_name: test.test, domain: test.domain,
            passed, findings, tester_id,
            hash: crypto.createHash('sha256').update(JSON.stringify({ test_id, passed, findings, ts: Date.now() })).digest('hex'),
            tested_at: new Date().toISOString()
        };
        this._boundedPush(this._testResults, result);
        return result;
    }

    // ═══════════════════════════════════════════════════════════════
    // ATTESTATION (CEO/CFO sign-off)
    // ═══════════════════════════════════════════════════════════════
    submitAttestation(params) {
        const { attester_id, role, scope = 'enterprise', statement = '' } = params;
        if (!['CEO', 'CFO', 'CRO'].includes(role)) return { error: 'Attestation requires CEO, CFO, or CRO role' };

        const attestation = {
            attestation_id: `ATT-${Date.now().toString(36)}`.toUpperCase(),
            attester_id, role, scope,
            statement: statement || `I attest that the internal controls over ${scope} risk management are effective and operating as designed.`,
            hash: crypto.createHash('sha256').update(JSON.stringify({ attester_id, role, scope, ts: Date.now() })).digest('hex'),
            attested_at: new Date().toISOString()
        };
        this._boundedPush(this._attestations, attestation);
        return attestation;
    }

    // ═══════════════════════════════════════════════════════════════
    // IPO GAP + MATURITY
    // ═══════════════════════════════════════════════════════════════
    getIPOGapAnalysis() {
        return {
            title: 'Gap to IPO-Grade Risk Framework',
            gaps: IPO_GAPS,
            closed: IPO_GAPS.filter(g => g.status === 'implemented').length,
            open: IPO_GAPS.filter(g => g.status !== 'implemented').length,
            completeness_pct: Math.round(IPO_GAPS.filter(g => g.status === 'implemented').length / IPO_GAPS.length * 100)
        };
    }

    assessMaturity() {
        const domains = {
            'Operational & Technology': { maturity: 'Mature', score: 4.2 },
            'Model Risk': { maturity: 'Advanced', score: 4.0 },
            'Carbon & ESG': { maturity: 'Emerging', score: 2.5 },
            'Financial Controls': { maturity: 'Moderate-Advanced', score: 3.5 },
            'Governance & Committee': { maturity: 'Institutional', score: 4.0 },
            'Legal & Regulatory': { maturity: 'Advanced', score: 3.8 },
            'Strategic Risk': { maturity: 'Board-level', score: 3.5 }
        };
        const avg = Math.round(Object.values(domains).reduce((s, d) => s + d.score, 0) / Object.keys(domains).length * 10) / 10;

        return {
            title: 'ERCM Maturity Assessment',
            overall: `L${avg}/5`,
            overall_score: avg,
            label: avg >= 4.0 ? 'Institutional' : avg >= 3.5 ? 'Pre-Institutional' : 'Developing',
            domains,
            target: 'L4.5/5 (IPO-Ready)',
            generated_at: new Date().toISOString()
        };
    }
}

module.exports = new ERCMEngine();
