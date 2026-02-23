/**
 * TrustChecker — Institutional Engine v1.0
 * 4 Pillars for Trust & Carbon Infrastructure Operator
 *
 *   I.  Risk Appetite Statement (Board-Level)
 *   II. Board Risk Dashboard (12 KPIs × 4 Layers)
 *   III.Internal Audit Charter (IPO-Grade)
 *   IV. Risk Capital Allocation Framework
 *
 * This is the layer that separates a SaaS vendor from
 * an infrastructure operator. Architecture → Institution.
 */
const crypto = require('crypto');

// ═════════════════════════════════════════════════════════════════════
// PILLAR I — RISK APPETITE STATEMENT
// ═════════════════════════════════════════════════════════════════════

const ZERO_TOLERANCE = [
    { id: 'ZT-01', item: 'Data integrity compromise', description: 'Any tampering with immutable audit trail, hash chain, or evidence store', enforcement: 'Hash chain verification, TSA timestamp, blockchain seal', consequence: 'Immediate system freeze + Board notification + External audit trigger' },
    { id: 'ZT-02', item: 'Evidence tampering', description: 'Modification or deletion of sealed evidence packages', enforcement: 'SHA-256 + RSA-2048 + RFC 3161 TSA + blockchain anchor', consequence: 'Criminal referral + Legal hold + Regulatory notification' },
    { id: 'ZT-03', item: 'Carbon credit double issuance', description: 'Minting same carbon credit more than once in registry', enforcement: 'Blockchain registry + uniqueness check + dual validation', consequence: 'Registry freeze + MRV re-audit + Credit recall' },
    { id: 'ZT-04', item: 'Privileged access abuse', description: 'SA actions without proper logging, approval, or justification', enforcement: '6-eyes + SA constraints + rate limiting + hash-linked action log', consequence: 'Immediate revocation + Forensic investigation + Board report' },
    { id: 'ZT-05', item: 'Settlement manipulation', description: 'Alteration of financial settlement records or wallet balances', enforcement: 'Ledger reconciliation + anomaly detection + evidence freeze', consequence: 'Account freeze + Legal referral + Regulatory report' }
];

const DOMAIN_APPETITE = [
    { domain: 'Strategic', appetite: 'Moderate', threshold: 'Max 30% revenue dependency on single industry', metric: 'Revenue concentration ratio', alert_trigger: '>30% single industry', board_action: 'Quarterly review — diversification plan if breached' },
    { domain: 'Operational', appetite: 'Low', threshold: 'SLA breach < 1% of total cases', metric: 'SLA breach rate', alert_trigger: '>1% SLA breach', board_action: 'Board alert + root cause + remediation within 5 days' },
    { domain: 'Technology & Cyber', appetite: 'Very Low', threshold: 'Zero privileged override without log', metric: 'Unlogged privileged events', alert_trigger: 'Any single event = 0', board_action: 'Immediate Board notification + access suspension' },
    { domain: 'Model Risk', appetite: 'Controlled Medium', threshold: 'Auto-decision cap < 60% until model validated', metric: 'Auto-decision ratio pre-validation', alert_trigger: '>60% auto-decision on unvalidated model', board_action: 'Model freeze + MRC emergency session' },
    { domain: 'Legal & Regulatory', appetite: 'Very Low', threshold: 'No unreviewed jurisdiction entry', metric: 'Jurisdiction compliance coverage', alert_trigger: 'Any market entry without compliance review', board_action: 'Halt expansion + compliance assessment' },
    { domain: 'Carbon & ESG', appetite: 'Conservative', threshold: 'Credit issuance requires dual validation + registry anchor', metric: 'Unanchored credit issuance rate', alert_trigger: 'Any credit without anchor', board_action: 'Issuance freeze + MRV reconciliation' }
];

const APPETITE_PRINCIPLES = {
    accept: [
        { category: 'Innovation risk', level: 'Medium-High', rationale: 'Product innovation required for market positioning' },
        { category: 'Model experimentation risk', level: 'Medium', rationale: 'Controlled sandbox environment with gated deployment' },
        { category: 'Market expansion risk', level: 'Medium', rationale: 'Diversification necessary but must follow compliance review' }
    ],
    refuse: ZERO_TOLERANCE.map(z => z.item)
};

// ═════════════════════════════════════════════════════════════════════
// PILLAR II — BOARD RISK DASHBOARD (12 KPIs × 4 LAYERS)
// ═════════════════════════════════════════════════════════════════════

const BOARD_KPI_SPEC = {
    integrity: {
        name: 'Integrity Layer',
        kpis: [
            { id: 'BD-I1', name: 'Evidence Tamper Alerts', unit: 'count', target: 0, red: '>0', amber: null, green: '0', source: 'Hash chain verification engine' },
            { id: 'BD-I2', name: 'Privileged Access Events', unit: 'count/month', target: '<5', red: '>10', amber: '5-10', green: '<5', source: 'SA constraints log' },
            { id: 'BD-I3', name: 'Cross-Tenant Anomaly', unit: 'count', target: 0, red: '>0', amber: null, green: '0', source: 'Tenant isolation engine' },
            { id: 'BD-I4', name: 'Public Anchor Failure', unit: 'count', target: 0, red: '>2', amber: '1-2', green: '0', source: 'Blockchain anchor service' }
        ]
    },
    model: {
        name: 'Model Layer',
        kpis: [
            { id: 'BD-M1', name: 'Drift Index (MSI)', unit: 'index', target: '≥0.85', red: '<0.70', amber: '0.70-0.85', green: '≥0.85', source: 'MRMF drift detection' },
            { id: 'BD-M2', name: 'False Positive Rate', unit: '%', target: '<5%', red: '>10%', amber: '5-10%', green: '<5%', source: 'FP feedback loop' },
            { id: 'BD-M3', name: 'Auto-Decision Ratio', unit: '%', target: '>95%', red: '<90%', amber: '90-95%', green: '>95%', source: 'Decision engine' },
            { id: 'BD-M4', name: 'Threshold Override Count', unit: 'count/month', target: '<3', red: '>5', amber: '3-5', green: '<3', source: 'Override audit log' }
        ]
    },
    carbon: {
        name: 'Carbon Layer',
        kpis: [
            { id: 'BD-C1', name: 'Credits Minted', unit: 'tCO₂e', target: 'tracked', red: null, amber: null, green: 'tracked', source: 'CCME minting engine' },
            { id: 'BD-C2', name: 'Credits Retired', unit: 'tCO₂e', target: 'tracked', red: null, amber: null, green: 'tracked', source: 'CCME retirement engine' },
            { id: 'BD-C3', name: 'MRV Validation Ratio', unit: '%', target: '100%', red: '<90%', amber: '90-99%', green: '100%', source: 'MRV pipeline' },
            { id: 'BD-C4', name: 'Exposure by Jurisdiction', unit: 'tCO₂e/region', target: 'diversified', red: '>50% single', amber: '30-50% single', green: '<30%', source: 'Carbon registry' }
        ]
    },
    financial: {
        name: 'Financial Layer',
        kpis: [
            { id: 'BD-F1', name: 'Settlement Dispute Rate', unit: '%', target: '<1%', red: '>3%', amber: '1-3%', green: '<1%', source: 'Case workflow' },
            { id: 'BD-F2', name: 'Wallet Reconciliation Mismatch', unit: '%', target: '<0.1%', red: '>0.5%', amber: '0.1-0.5%', green: '<0.1%', source: 'Wallet ledger' },
            { id: 'BD-F3', name: 'Revenue Concentration', unit: '%', target: '<30% single', red: '>40% single', amber: '30-40%', green: '<30%', source: 'Revenue analytics' },
            { id: 'BD-F4', name: 'Usage Volatility', unit: 'CV%', target: '<20%', red: '>35%', amber: '20-35%', green: '<20%', source: 'Usage metering' }
        ]
    }
};

// ═════════════════════════════════════════════════════════════════════
// PILLAR III — INTERNAL AUDIT CHARTER
// ═════════════════════════════════════════════════════════════════════

const AUDIT_CHARTER = {
    title: 'Internal Audit Charter — IPO-Grade',
    reporting_line: 'Audit Committee (Board sub-committee)',
    independence: [
        'Reports DIRECTLY to Audit Committee — NOT to CEO',
        'Has unrestricted access to all systems, data, and personnel',
        'Has authority to audit Super Admin activities',
        'Cannot be overridden by management on audit scope',
        'Budget approved by Audit Committee, not management'
    ],
    scope: [
        { id: 'AS-01', area: 'Access Control Review', description: 'RBAC assignment sampling, SoD violation check, privileged access review', frequency: 'Quarterly', method: 'Sample 10% assignments' },
        { id: 'AS-02', area: 'Model Version Control', description: 'MDLC gate evidence, deployment hash verification, rollback audit', frequency: 'Quarterly', method: 'Full version chain validation' },
        { id: 'AS-03', area: 'Carbon Minting Process', description: 'MRV data integrity, dual validation check, registry anchor verification', frequency: 'Quarterly', method: 'Full trace from MRV → mint → anchor' },
        { id: 'AS-04', area: 'Billing Reconciliation', description: 'Usage meters vs invoices, wallet balance integrity', frequency: 'Quarterly', method: 'Full reconciliation ±0.1% tolerance' },
        { id: 'AS-05', area: 'Cross-Tenant Isolation', description: 'API boundary testing, data leakage attempt, tenant separation', frequency: 'Quarterly', method: 'Penetration-style isolation test' },
        { id: 'AS-06', area: 'SoD Enforcement', description: 'Role conflict detection, approval chain integrity, dual-control verification', frequency: 'Quarterly', method: 'Full SoD matrix validation' }
    ],
    cycles: [
        { type: 'Quarterly Focused Audit', scope: '2 areas rotated per quarter', deliverable: 'Focused audit report + findings + remediation SLA', sla: '15 business days' },
        { type: 'Annual Full System Audit', scope: 'All 6 areas + control effectiveness', deliverable: 'Annual audit report + management letter + control attestation', sla: '30 business days' },
        { type: 'Surprise Privileged Audit', scope: 'SA actions, emergency access, override events', deliverable: 'Privileged access report (classified)', sla: '5 business days', trigger: 'Random or risk-triggered' }
    ],
    authority: {
        full_access: ['All databases', 'All audit logs', 'All configuration', 'SA action log', 'Encryption key usage logs'],
        can_audit: ['Super Admin', 'CRO', 'CISO', 'Any role'],
        cannot_be_blocked_by: ['CEO', 'CTO', 'Any executive']
    }
};

// ═════════════════════════════════════════════════════════════════════
// PILLAR IV — RISK CAPITAL ALLOCATION
// ═════════════════════════════════════════════════════════════════════

const EXPOSURE_MODELS = [
    {
        id: 'EXP-01', domain: 'Carbon', risk: 'Double-mint exposure',
        formula: 'avg_credit_price × monthly_mint_volume × failure_probability',
        default_params: { avg_credit_price: 25, monthly_mint_volume: 10000, failure_probability: 0.001 },
        buffer_ratio: '3-5%',
        buffer_pool: 'Carbon Reserve Pool'
    },
    {
        id: 'EXP-02', domain: 'Settlement', risk: 'Dispute exposure',
        formula: 'avg_case_value × dispute_rate × recovery_uncertainty',
        default_params: { avg_case_value: 50000, dispute_rate: 0.01, recovery_uncertainty: 0.3 },
        buffer_ratio: '2-3%',
        buffer_pool: 'Settlement Reserve'
    },
    {
        id: 'EXP-03', domain: 'Operational', risk: 'SLA penalty exposure',
        formula: 'contract_value × sla_penalty_clause × breach_probability',
        default_params: { contract_value: 100000, sla_penalty_clause: 0.05, breach_probability: 0.02 },
        buffer_ratio: 'Insurance coverage',
        buffer_pool: 'Operational Insurance'
    },
    {
        id: 'EXP-04', domain: 'Model', risk: 'Auto-decision error cascade',
        formula: 'affected_entities × avg_remediation_cost × cascade_probability',
        default_params: { affected_entities: 500, avg_remediation_cost: 1000, cascade_probability: 0.005 },
        buffer_ratio: '1-2%',
        buffer_pool: 'Model Risk Reserve'
    },
    {
        id: 'EXP-05', domain: 'Technology', risk: 'Data breach liability',
        formula: 'records_at_risk × avg_notification_cost × regulatory_fine_factor',
        default_params: { records_at_risk: 100000, avg_notification_cost: 150, regulatory_fine_factor: 2.0 },
        buffer_ratio: 'Cyber insurance',
        buffer_pool: 'Cyber Liability Reserve'
    }
];

const STRESS_FACTORS = {
    normal: 1.0,
    elevated: 1.5,
    stressed: 2.5,
    severe: 4.0
};

// ═══════════════════════════════════════════════════════════════════════════
// FIX #6b: Bounded arrays to prevent memory exhaustion
const MAX_INST_RECORDS = 1000;

class InstitutionalEngine {
    constructor() {
        this._boardSnapshots = [];
        this._auditReports = [];
        this._capitalSnapshots = [];
    }

    _boundedPush(arr, item) {
        arr.push(item);
        if (arr.length > MAX_INST_RECORDS) arr.splice(0, arr.length - MAX_INST_RECORDS);
    }

    // ═══════════════════════════════════════════════════════════════
    // I. RISK APPETITE
    // ═══════════════════════════════════════════════════════════════

    getRiskAppetite() {
        return {
            title: 'Risk Appetite Statement (Board-Approved)',
            effective_date: '2026-01-01',
            approved_by: 'Board of Directors',
            principles: APPETITE_PRINCIPLES,
            zero_tolerance: ZERO_TOLERANCE,
            domain_appetite: DOMAIN_APPETITE,
            review_frequency: 'Annual (or upon material change)',
            next_review: '2027-01-01'
        };
    }

    checkAppetiteBreach(metrics = {}) {
        const { revenue_top_industry_pct = 22, sla_breach_pct = 0.3, unlogged_privileged = 0, auto_decision_unvalidated_pct = 15, unreviewed_jurisdiction = 0, unanchored_credits = 0 } = metrics;

        const checks = [
            { domain: 'Strategic', metric: revenue_top_industry_pct, threshold: 30, unit: '%', breached: revenue_top_industry_pct > 30 },
            { domain: 'Operational', metric: sla_breach_pct, threshold: 1, unit: '%', breached: sla_breach_pct > 1 },
            { domain: 'Technology', metric: unlogged_privileged, threshold: 0, unit: 'events', breached: unlogged_privileged > 0 },
            { domain: 'Model', metric: auto_decision_unvalidated_pct, threshold: 60, unit: '%', breached: auto_decision_unvalidated_pct > 60 },
            { domain: 'Legal', metric: unreviewed_jurisdiction, threshold: 0, unit: 'entries', breached: unreviewed_jurisdiction > 0 },
            { domain: 'Carbon', metric: unanchored_credits, threshold: 0, unit: 'credits', breached: unanchored_credits > 0 }
        ];

        const breaches = checks.filter(c => c.breached);
        return {
            title: 'Risk Appetite Breach Check',
            total_domains: checks.length,
            breaches: breaches.length,
            all_clear: breaches.length === 0,
            details: checks,
            board_action_required: breaches.length > 0,
            checked_at: new Date().toISOString()
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // II. BOARD RISK DASHBOARD (12 KPIs)
    // ═══════════════════════════════════════════════════════════════

    getBoardKPISpec() {
        const allKpis = [];
        Object.values(BOARD_KPI_SPEC).forEach(layer => layer.kpis.forEach(k => allKpis.push({ ...k, layer: layer.name })));
        return { title: 'Board Risk Dashboard — 16 KPI Spec (4 Layers)', total_kpis: allKpis.length, layers: BOARD_KPI_SPEC, flat: allKpis };
    }

    generateBoardDashboard(actuals = {}) {
        const {
            tamper_alerts = 0, privileged_events = 3, cross_tenant_anomaly = 0, anchor_failure = 0,
            drift_msi = 0.88, fp_rate = 4.2, auto_decision_pct = 99.8, threshold_overrides = 1,
            credits_minted = 8500, credits_retired = 3200, mrv_validation_pct = 100, carbon_top_jurisdiction_pct = 28,
            dispute_rate = 0.6, wallet_mismatch = 0.02, revenue_top_pct = 22, usage_cv = 14
        } = actuals;

        const rag = (val, spec) => {
            if (spec.red && this._evalThreshold(val, spec.red)) return 'red';
            if (spec.amber && this._evalThreshold(val, spec.amber)) return 'amber';
            return 'green';
        };

        const values = {
            'BD-I1': tamper_alerts, 'BD-I2': privileged_events, 'BD-I3': cross_tenant_anomaly, 'BD-I4': anchor_failure,
            'BD-M1': drift_msi, 'BD-M2': fp_rate, 'BD-M3': auto_decision_pct, 'BD-M4': threshold_overrides,
            'BD-C1': credits_minted, 'BD-C2': credits_retired, 'BD-C3': mrv_validation_pct, 'BD-C4': carbon_top_jurisdiction_pct,
            'BD-F1': dispute_rate, 'BD-F2': wallet_mismatch, 'BD-F3': revenue_top_pct, 'BD-F4': usage_cv
        };

        const layers = {};
        Object.entries(BOARD_KPI_SPEC).forEach(([key, layer]) => {
            layers[key] = {
                name: layer.name,
                kpis: layer.kpis.map(k => ({
                    ...k,
                    actual: values[k.id],
                    rag: rag(values[k.id], k),
                    trend: this._generateTrend(k.id, values[k.id])
                }))
            };
        });

        // Aggregate
        const allKpis = Object.values(layers).flatMap(l => l.kpis);
        const redCount = allKpis.filter(k => k.rag === 'red').length;
        const amberCount = allKpis.filter(k => k.rag === 'amber').length;
        const greenCount = allKpis.filter(k => k.rag === 'green').length;

        const snapshot = {
            title: 'Board Risk Dashboard',
            report_date: new Date().toISOString().slice(0, 10),
            period: new Date().toISOString().slice(0, 7),
            summary: { total_kpis: allKpis.length, red: redCount, amber: amberCount, green: greenCount, overall: redCount > 0 ? 'ACTION REQUIRED' : amberCount > 2 ? 'MONITOR' : 'SATISFACTORY' },
            layers,
            appetite_breaches: this.checkAppetiteBreach(actuals).breaches,
            generated_at: new Date().toISOString()
        };

        this._boundedPush(this._boardSnapshots, snapshot);
        return snapshot;
    }

    _evalThreshold(val, expr) {
        if (!expr || expr === 'tracked' || expr === 'diversified') return false;
        const match = expr.match(/^([<>])(\d+\.?\d*)/);
        if (match) return match[1] === '>' ? val > parseFloat(match[2]) : val < parseFloat(match[2]);
        const rangeMatch = expr.match(/^(\d+\.?\d*)-(\d+\.?\d*)/);
        if (rangeMatch) return val >= parseFloat(rangeMatch[1]) && val <= parseFloat(rangeMatch[2]);
        return false;
    }

    _generateTrend(kpiId, current) {
        // Simulate 4-quarter trend (producton: from DB)
        const variance = (Math.random() - 0.5) * 0.2;
        return {
            q_minus_3: Math.round((current * (1 + variance * 3)) * 100) / 100,
            q_minus_2: Math.round((current * (1 + variance * 2)) * 100) / 100,
            q_minus_1: Math.round((current * (1 + variance)) * 100) / 100,
            current: current,
            direction: variance > 0.05 ? 'improving' : variance < -0.05 ? 'deteriorating' : 'stable'
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // III. INTERNAL AUDIT CHARTER
    // ═══════════════════════════════════════════════════════════════

    getAuditCharter() {
        return { ...AUDIT_CHARTER };
    }

    getAuditPlan() {
        const year = new Date().getFullYear();
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        const areas = AUDIT_CHARTER.scope;
        const plan = quarters.map((q, i) => ({
            quarter: `${year}-${q}`,
            focused_areas: [areas[i % areas.length], areas[(i + 3) % areas.length]].map(a => a.area),
            surprise_audit: i === 1 || i === 3 ? 'Scheduled' : 'Risk-triggered only',
            deliverable: AUDIT_CHARTER.cycles[0].deliverable
        }));

        return {
            title: `Internal Audit Plan — ${year}`,
            year,
            plan,
            annual_audit: { ...AUDIT_CHARTER.cycles[1], scheduled: `${year}-Q4` },
            total_focused: 8,
            total_surprise: 2,
            total_annual: 1
        };
    }

    submitAuditFinding(params = {}) {
        const { finding_id, area, severity = 'medium', description, recommendation, remediation_sla_days = 30, auditor_id } = params;
        if (!area || !description) return { error: 'area and description required' };

        const finding = {
            finding_id: finding_id || `AUF-${Date.now().toString(36)}`.toUpperCase(),
            area, severity, description, recommendation,
            remediation_sla_days,
            status: 'open',
            auditor_id,
            hash: crypto.createHash('sha256').update(JSON.stringify({ area, severity, description, ts: Date.now() })).digest('hex'),
            reported_at: new Date().toISOString(),
            remediation_due: new Date(Date.now() + remediation_sla_days * 86400000).toISOString().slice(0, 10)
        };

        this._boundedPush(this._auditReports, finding);
        return finding;
    }

    getAuditFindings() {
        return {
            title: 'Audit Findings Register',
            total: this._auditReports.length,
            open: this._auditReports.filter(f => f.status === 'open').length,
            by_severity: {
                critical: this._auditReports.filter(f => f.severity === 'critical').length,
                high: this._auditReports.filter(f => f.severity === 'high').length,
                medium: this._auditReports.filter(f => f.severity === 'medium').length,
                low: this._auditReports.filter(f => f.severity === 'low').length
            },
            findings: this._auditReports
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // IV. RISK CAPITAL ALLOCATION
    // ═══════════════════════════════════════════════════════════════

    getExposureModels() {
        return { title: 'Risk Exposure Models', models: EXPOSURE_MODELS, stress_factors: STRESS_FACTORS, total_domains: EXPOSURE_MODELS.length };
    }

    calculateExposure(params = {}) {
        const { stress_scenario = 'normal' } = params;
        const factor = STRESS_FACTORS[stress_scenario] || 1.0;

        const exposures = EXPOSURE_MODELS.map(m => {
            const p = { ...m.default_params, ...(params[m.domain.toLowerCase()] || {}) };
            const values = Object.values(p);
            const baseExposure = values.reduce((a, b) => a * b, 1);
            const stressedExposure = Math.round(baseExposure * factor);

            return {
                id: m.id, domain: m.domain, risk: m.risk,
                base_exposure: Math.round(baseExposure),
                stress_factor: factor,
                stressed_exposure: stressedExposure,
                buffer_ratio: m.buffer_ratio,
                buffer_pool: m.buffer_pool,
                params_used: p
            };
        });

        const totalBase = exposures.reduce((s, e) => s + e.base_exposure, 0);
        const totalStressed = exposures.reduce((s, e) => s + e.stressed_exposure, 0);

        return {
            title: `Risk Exposure Analysis — ${stress_scenario} scenario`,
            scenario: stress_scenario,
            stress_factor: factor,
            total_base_exposure: totalBase,
            total_stressed_exposure: totalStressed,
            exposures,
            calculated_at: new Date().toISOString()
        };
    }

    calculateEconomicCapital(params = {}) {
        const normal = this.calculateExposure({ ...params, stress_scenario: 'normal' });
        const stressed = this.calculateExposure({ ...params, stress_scenario: 'stressed' });
        const severe = this.calculateExposure({ ...params, stress_scenario: 'severe' });

        // Required = stressed scenario exposure
        const required = stressed.total_stressed_exposure;
        // Current = assumed as input or default
        const current = params.current_capital || Math.round(required * 1.2);
        const coverage = Math.round(current / required * 100);

        const capital = {
            title: 'Economic Capital Model',
            scenarios: {
                normal: { exposure: normal.total_base_exposure, factor: 1.0 },
                stressed: { exposure: stressed.total_stressed_exposure, factor: 2.5 },
                severe: { exposure: severe.total_stressed_exposure, factor: 4.0 }
            },
            required_capital: required,
            current_capital: current,
            coverage_ratio: coverage,
            coverage_grade: coverage >= 150 ? 'Strong' : coverage >= 100 ? 'Adequate' : coverage >= 75 ? 'Watch' : 'Deficient',
            by_domain: stressed.exposures.map(e => ({ domain: e.domain, exposure: e.stressed_exposure, buffer: e.buffer_ratio, pool: e.buffer_pool })),
            board_view: {
                current_risk_capital: `$${(current / 1000).toFixed(0)}K`,
                required_risk_capital: `$${(required / 1000).toFixed(0)}K`,
                coverage: `${coverage}%`,
                grade: coverage >= 150 ? '🟢 Strong' : coverage >= 100 ? '🟡 Adequate' : '🔴 Below'
            },
            calculated_at: new Date().toISOString()
        };

        this._boundedPush(this._capitalSnapshots, capital);
        return capital;
    }

    // ═══════════════════════════════════════════════════════════════
    // MATURITY ASSESSMENT (INSTITUTIONAL)
    // ═══════════════════════════════════════════════════════════════

    assessInstitutionalMaturity() {
        return {
            title: 'Institutional Maturity Assessment',
            dimensions: [
                { dimension: 'Operational Maturity', score: 4.2, max: 5, evidence: 'Case workflow SLA, auto-decision 99.8%, FP feedback loop' },
                { dimension: 'Governance Formalization', score: 4.0, max: 5, evidence: 'MRMF v2.0 (6 Pillars), ERCM (COSO ERM), Three Lines, MRC charter' },
                { dimension: 'Risk Quantification', score: 3.5, max: 5, evidence: 'Economic Capital Model, 5 exposure formulas, stress scenarios' },
                { dimension: 'Capital Structuring', score: 3.0, max: 5, evidence: 'Buffer ratios defined, coverage ratio tracked, not yet externally validated' },
                { dimension: 'Institutional Readiness', score: 3.8, max: 5, evidence: 'Board dashboard 16 KPIs, Risk Appetite Statement, Internal Audit Charter' },
                { dimension: 'Audit & Assurance', score: 4.0, max: 5, evidence: 'Audit charter IPO-grade, 6 audit scopes, surprise privileged audit' },
                { dimension: 'Regulatory Positioning', score: 2.5, max: 5, evidence: 'Architecture ready but no formal regulatory engagement program yet' }
            ],
            overall: null,
            label: null,
            gap_to_infra: null,
            assessed_at: new Date().toISOString()
        };
    }
}

// Post-construct: calculate overall
const _engine = new InstitutionalEngine();
const _mat = _engine.assessInstitutionalMaturity;
const _origMat = _engine.assessInstitutionalMaturity.bind(_engine);
_engine.assessInstitutionalMaturity = function () {
    const result = _origMat();
    const avg = Math.round(result.dimensions.reduce((s, d) => s + d.score, 0) / result.dimensions.length * 10) / 10;
    result.overall = `${avg}/5`;
    result.overall_score = avg;
    result.label = avg >= 4.0 ? 'Infrastructure Operator' : avg >= 3.5 ? 'Pre-Infrastructure' : avg >= 3.0 ? 'Institutional SaaS' : 'SaaS Vendor';
    result.gap_to_infra = avg >= 4.0 ? 'Achieved' : `${Math.round((4.0 - avg) * 10) / 10} points to Infrastructure grade`;
    return result;
};

module.exports = _engine;
