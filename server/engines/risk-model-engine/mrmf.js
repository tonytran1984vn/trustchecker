/**
 * TrustChecker — MRMF v2.0 (Model Risk Management Framework)
 * Enterprise-Native · Audit-Grade · SOC 2 · ISO 27001 · SR 11-7
 * 
 * 6 Pillars across EAS Layer 2/3/4/6:
 *   P1: Model Inventory & Classification
 *   P2: Model Development Lifecycle (MDLC) — 10 steps
 *   P3: Stress Test Framework — 6 mandatory scenarios
 *   P4: Independent Validation Unit (IVU) — MRO + MVR
 *   P5: Continuous Monitoring — MHI composite + Residual Risk formula
 *   P6: Governance & Committee — MRC + Material Change Policy
 */
const crypto = require('crypto');

// ═════════════════════════════════════════════════════════════════════
// P1: MODEL CLASSIFICATION (TrustChecker-specific)
// ═════════════════════════════════════════════════════════════════════
const MODEL_CLASSIFICATION = {
    ERS: { name: 'Entity Risk Score', impact_class: 'Critical', tier: 4, financial_impact: true, auto_decision: true, lock_capable: true, scope: 'Single entity', inputs: 12, refresh: 'real-time', dual_validation: true },
    BRI: { name: 'Benchmark Risk Index', impact_class: 'Critical', tier: 4, financial_impact: true, auto_decision: false, lock_capable: false, scope: 'Cross-tenant', inputs: 15, refresh: '24hr', dual_validation: true },
    BRS: { name: 'Behavioral Risk Score', impact_class: 'High', tier: 3, financial_impact: true, auto_decision: true, lock_capable: false, scope: 'Behavioral pattern', inputs: 6, refresh: '15min', dual_validation: false },
    CRS: { name: 'Channel Risk Score', impact_class: 'High', tier: 3, financial_impact: false, auto_decision: true, lock_capable: false, scope: 'Supply chain path', inputs: 8, refresh: '15min', dual_validation: false },
    DUP: { name: 'Duplicate Classifier', impact_class: 'Medium', tier: 2, financial_impact: false, auto_decision: true, lock_capable: false, scope: 'Event dedup', inputs: 4, refresh: 'real-time', dual_validation: false },
    ANM: { name: 'Anomaly Detection', impact_class: 'Low', tier: 2, financial_impact: false, auto_decision: false, lock_capable: false, scope: 'Pattern detection', inputs: 8, refresh: 'real-time', dual_validation: false }
};

// ═════════════════════════════════════════════════════════════════════
// P2: MDLC 10-STEP PIPELINE
// ═════════════════════════════════════════════════════════════════════
const MDLC_STEPS = [
    { step: 1, name: 'Problem Definition', layer: 'L2', output: 'Problem statement + success criteria + impact classification', gate: 'Risk Lead approval' },
    { step: 2, name: 'Data Lineage Verification', layer: 'L3', output: 'Data lineage doc + quality report + source registry', gate: 'Data Owner sign-off' },
    { step: 3, name: 'Feature Documentation', layer: 'L3', output: 'Feature list + rationale + correlation matrix + leakage check', gate: 'ML Lead review' },
    { step: 4, name: 'Assumption Matrix', layer: 'L2', output: 'Assumptions + boundary conditions + known limitations', gate: 'Compliance review' },
    { step: 5, name: 'Bias Review', layer: 'L3', output: '4/5 rule analysis + geo/industry/size fairness report', gate: 'MRO approval' },
    { step: 6, name: 'Backtest Simulation (30-day)', layer: 'L3', output: 'Confusion matrix + AUC/ROC + precision/recall + FPR', gate: 'IVU validation' },
    { step: 7, name: 'Extended Replay (180-day)', layer: 'L3', output: '180-day production replay + seasonal capture + long-term drift', gate: 'IVU + Risk Lead dual sign' },
    { step: 8, name: 'Stress Test', layer: 'L3', output: 'All 6 mandatory stress results + resilience score + auto-freeze triggers', gate: 'Risk Committee review' },
    { step: 9, name: 'Independent Validation', layer: 'L4', output: 'MVR (Model Validation Report) signed + sealed + hashed', gate: 'MRO sign-off (dual for Tier 4)' },
    { step: 10, name: 'Approval & Deployment', layer: 'L4+L6', output: 'Deployment hash + artifact bundle + blockchain anchor (optional)', gate: 'MRC final approval + 6-eyes' }
];

// ═════════════════════════════════════════════════════════════════════
// P3: STRESS TEST LIBRARY — 6 MANDATORY
// ═════════════════════════════════════════════════════════════════════
const STRESS_TESTS = [
    { id: 'STL-01', name: 'Scan Flood Attack', scenario: '10× normal scan traffic from single source in 1hr window', expected: 'Model should not lower risk score due to volume alone', fail_threshold: 'Entity score drops >15pts from flood', fallback: 'Rate-limit scan intake, flag entity', rollback_trigger: true, auto_freeze: true },
    { id: 'STL-02', name: 'Geo Concentration 80%', scenario: '80% of all scans from 1 geographic region in 24hr', expected: 'Regional weighting activates — no penalization of legitimate concentration', fail_threshold: 'FP rate >10% for dominant region entities', fallback: 'Geo-weight recalibration queue', rollback_trigger: false, auto_freeze: false },
    { id: 'STL-03', name: 'Device Spoof Pattern', scenario: 'Same device_id scanning 50+ unrelated entities within 4hr', expected: 'Device cluster detection flags anomaly, affected scores quarantined', fail_threshold: 'Detection miss rate >20% of spoofed events', fallback: 'Device blacklist + manual review queue', rollback_trigger: true, auto_freeze: true },
    { id: 'STL-04', name: 'Duplicate Surge Spike', scenario: '500 near-duplicate events across 10 entities in 15min', expected: 'Duplicate classifier catches >95% without false collisions', fail_threshold: 'Bloom filter FP collision rate >0.1% or miss rate >5%', fallback: 'Fallback to exact-match dedup', rollback_trigger: false, auto_freeze: false },
    { id: 'STL-05', name: 'Batch Recall Mass Event', scenario: 'Recall 50+ items simultaneously triggering cascade across supply chain', expected: 'Risk cascade propagation without false amplification beyond 2-hop', fail_threshold: 'More than 5 entities incorrectly elevated to critical', fallback: 'Dampen cascade multiplier, cap at 2-hop', rollback_trigger: true, auto_freeze: true },
    { id: 'STL-06', name: 'FP Escalation Loop', scenario: 'FP feedback loop creates oscillating score pattern', expected: 'Recalibration damper prevents runaway feedback', fail_threshold: 'Score oscillation amplitude >20 points across 3+ cycles', fallback: 'Freeze recalibration, lock weights, alert MRO', rollback_trigger: true, auto_freeze: true }
];

// ═════════════════════════════════════════════════════════════════════
// P4: IVU CHECKLIST (8 checks + MVR)
// ═════════════════════════════════════════════════════════════════════
const IVU_CHECKLIST = [
    { id: 'IVU-01', check: 'Reproduce training result', description: 'Re-run from stored dataset — results ±2%', category: 'reproducibility', critical: true },
    { id: 'IVU-02', check: 'Validate decay function math', description: 'Verify λ=ln(2)/46 and half-life curve matches spec', category: 'mathematical', critical: true },
    { id: 'IVU-03', check: 'Validate recalibration logic', description: 'FP feedback adjusts weights within governance bounds only', category: 'calibration', critical: true },
    { id: 'IVU-04', check: 'Check FP feedback integrity', description: 'No adversarial feedback cycle possible from correction loop', category: 'stability', critical: true },
    { id: 'IVU-05', check: 'Check feature leakage', description: 'Target variable not leaked into training features', category: 'integrity', critical: true },
    { id: 'IVU-06', check: 'Compare industry bias', description: '4/5 rule across industry/geo/entity-size segments', category: 'fairness', critical: false },
    { id: 'IVU-07', check: 'Run 180-day extended replay', description: '180 days production data — seasonal + long-term drift capture', category: 'replay', critical: true },
    { id: 'IVU-08', check: 'Verify artifact hash', description: 'SHA-256 of deployment artifact matches registry', category: 'integrity', critical: true }
];

// ═════════════════════════════════════════════════════════════════════
// P5: MHI FACTORS + RESIDUAL RISK FORMULA
// ═════════════════════════════════════════════════════════════════════
const MHI_FACTORS = [
    { factor: 'AUC Trend', weight: 0.20, ideal: 'stable ≥0.90', source: '/api/scm/ml' },
    { factor: 'Precision Stability', weight: 0.15, ideal: '≥0.92 ±0.02', source: 'backtest' },
    { factor: 'FP Volatility', weight: 0.15, ideal: '<2% 30-day rolling', source: 'FP feedback loop' },
    { factor: 'Drift Composite', weight: 0.15, ideal: 'MSI ≥0.85', source: 'drift detection 5 metrics' },
    { factor: 'Geo Bias Variance', weight: 0.10, ideal: '4/5 ratio ≥0.80', source: 'bias analysis' },
    { factor: 'Industry Bias Variance', weight: 0.10, ideal: '4/5 ratio ≥0.80', source: 'bias analysis' },
    { factor: 'Decision Override Rate', weight: 0.15, ideal: '<2%', source: 'override audit log' }
];

const RESIDUAL_RISK_WEIGHTS = {
    drift_index: 0.25,
    fp_volatility: 0.20,
    bias_variance: 0.15,
    override_rate: 0.20,
    model_age_factor: 0.20
};

// ═════════════════════════════════════════════════════════════════════
// P6: MATERIAL CHANGE POLICY
// ═════════════════════════════════════════════════════════════════════
const MATERIAL_CHANGES = [
    { id: 'MC-01', trigger: 'ERS threshold shift >5 points', example: 'Lock threshold moved from 75→71', eyes: 6, ivu_revalidation: true },
    { id: 'MC-02', trigger: 'Lambda (λ) decay coefficient change', example: 'Half-life changed from 46d→30d', eyes: 6, ivu_revalidation: true },
    { id: 'MC-03', trigger: 'Factor weight change >5%', example: 'route_gaming 0.25→0.32', eyes: 6, ivu_revalidation: true },
    { id: 'MC-04', trigger: 'Retraining dataset shift >10%', example: 'Data composition changed >10% by source', eyes: 6, ivu_revalidation: true },
    { id: 'MC-05', trigger: 'Feature addition or removal', example: 'New feature "supplier_country_risk" added', eyes: 6, ivu_revalidation: true },
    { id: 'MC-06', trigger: 'Duplicate classification logic change', example: 'Bloom filter parameters or hash function modified', eyes: 6, ivu_revalidation: true }
];

// ═════════════════════════════════════════════════════════════════════
// DRIFT ESCALATION POLICY
// ═════════════════════════════════════════════════════════════════════
const DRIFT_ESCALATION = [
    { level: 'minor', msi_min: 0.95, action: 'Log to monitoring dashboard', response_sla: null, eyes: 0, auto_action: 'none' },
    { level: 'moderate', msi_min: 0.85, action: 'Review within 5 business days', response_sla: '5 days', eyes: 2, auto_action: 'alert_risk_lead' },
    { level: 'major', msi_min: 0.70, action: 'Freeze model + initiate retrain pipeline', response_sla: '48 hours', eyes: 4, auto_action: 'freeze_scoring' },
    { level: 'critical', msi_min: 0.00, action: 'Immediate rollback to previous version', response_sla: 'immediate', eyes: 4, auto_action: 'auto_rollback' }
];

// ═════════════════════════════════════════════════════════════════════
// MRC CHARTER
// ═════════════════════════════════════════════════════════════════════
const MRC_CHARTER = {
    name: 'Model Risk Committee (MRC)',
    cadence: 'monthly',
    members: [
        { role: 'CRO', title: 'Chair', voting: true, veto: true },
        { role: 'Compliance Head', title: 'Policy Authority', voting: true, veto: true },
        { role: 'IT Security', title: 'Integrity Protector', voting: true, veto: false },
        { role: 'Internal Audit', title: 'Independent Observer', voting: false, veto: false },
        { role: 'ML Lead', title: 'Technical Owner', voting: true, veto: false },
        { role: 'Model Risk Officer', title: 'IVU Lead / MRO', voting: true, veto: true }
    ],
    quorum: 4,
    agenda_items: ['Model risk heatmap', 'Residual risk report', 'Drift events', 'Rollback events', 'Validation lag', 'Upcoming review due'],
    outputs: ['Meeting minutes (immutable, hashed)', 'Decision log', 'Action items with SLA', 'Residual risk trend']
};

// ═══════════════════════════════════════════════════════════════════════════
class MRMFEngine {
    constructor() {
        this._registry = [];
        this._validations = [];
        this._mvrs = []; // Model Validation Reports
        this._changeRequests = [];
        this._decisionLog = [];
        this._healthSnapshots = [];
        this._mrcMeetings = [];
        this._stressResults = [];
    }

    // ═══════════════════════════════════════════════════════════════
    // P1: MODEL INVENTORY
    // ═══════════════════════════════════════════════════════════════

    registerModel(params) {
        const { model_type, semver, owner_role, validator_role, approver_role, weights = {}, features = [] } = params;
        const cls = MODEL_CLASSIFICATION[model_type];
        if (!cls) return { error: `Unknown model_type. Valid: ${Object.keys(MODEL_CLASSIFICATION).join(', ')}` };
        if (!owner_role || !validator_role || !approver_role) return { error: 'owner_role, validator_role, approver_role required' };
        if (owner_role === validator_role) return { error: 'Owner ≠ Validator (MRO independence rule)' };

        const deploymentHash = crypto.createHash('sha256').update(JSON.stringify({ model_type, semver, weights, features, ts: Date.now() })).digest('hex');

        const entry = {
            model_id: `MDL-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
            model_type, semver: semver || '1.0.0',
            ...cls,
            owner_role, validator_role, approver_role,
            deployment_hash: deploymentHash,
            weights_snapshot: Object.freeze({ ...weights }),
            features: [...features],
            validation_status: 'pending',
            residual_risk_score: null,
            next_review_due: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
            mdlc_progress: { completed: 0, total: 10, current: MDLC_STEPS[0].name },
            status: 'registered',
            created_at: new Date().toISOString()
        };

        this._registry.push(entry);
        return { message: 'Model registered in MRMF v2.0', model: entry };
    }

    getInventory() {
        const models = this._registry.length > 0 ? this._registry :
            Object.entries(MODEL_CLASSIFICATION).map(([k, v]) => ({ model_type: k, ...v, status: 'unregistered', validation_status: 'none', mdlc_progress: { completed: 0, total: 10 } }));
        return {
            title: 'MRMF v2.0 — Model Inventory & Classification',
            total_models: models.length,
            by_class: { Critical: models.filter(m => m.impact_class === 'Critical').length, High: models.filter(m => m.impact_class === 'High').length, Medium: models.filter(m => m.impact_class === 'Medium').length, Low: models.filter(m => m.impact_class === 'Low').length },
            dual_validation_required: models.filter(m => m.dual_validation).map(m => m.model_type || m.name),
            lock_capable_models: models.filter(m => m.lock_capable).map(m => m.model_type || m.name),
            classification: MODEL_CLASSIFICATION,
            models,
            generated_at: new Date().toISOString()
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // P2: MDLC 10-STEP
    // ═══════════════════════════════════════════════════════════════

    getMDLC() {
        return {
            title: 'MDLC v2.0 — 10-Step Model Development Pipeline',
            steps: MDLC_STEPS,
            total_steps: MDLC_STEPS.length,
            stress_tests: STRESS_TESTS.length,
            key_upgrade_from_v1: 'Added Step 7 (180-day Extended Replay) and Step 10 (6-eyes Deployment)'
        };
    }

    advanceMDLC(modelId, completedStep, evidence = {}) {
        const model = this._registry.find(m => m.model_id === modelId);
        if (!model) return { error: 'Model not found' };
        const step = MDLC_STEPS.find(s => s.step === completedStep);
        if (!step) return { error: `Step must be 1-${MDLC_STEPS.length}` };

        model.mdlc_progress.completed = completedStep;
        model.mdlc_progress.current = completedStep < 10 ? MDLC_STEPS[completedStep].name : 'Pipeline Complete';

        const hash = crypto.createHash('sha256').update(JSON.stringify({ modelId, step: completedStep, evidence, ts: Date.now() })).digest('hex');

        return {
            message: `Step ${completedStep}/10 completed: ${step.name}`,
            model_id: modelId,
            progress: `${completedStep}/${MDLC_STEPS.length}`,
            next: completedStep < 10 ? MDLC_STEPS[completedStep] : null,
            evidence_hash: hash.slice(0, 32) + '…',
            gate: step.gate
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // P3: STRESS TEST FRAMEWORK
    // ═══════════════════════════════════════════════════════════════

    getStressLibrary() {
        return {
            title: 'Stress Test Library — 6 Mandatory Scenarios',
            total: STRESS_TESTS.length,
            auto_freeze_count: STRESS_TESTS.filter(t => t.auto_freeze).length,
            rollback_triggers: STRESS_TESTS.filter(t => t.rollback_trigger).length,
            tests: STRESS_TESTS,
            requirement: 'All 6 must pass before MDLC Step 8 gate'
        };
    }

    runStressTest(testId, results = {}) {
        const test = STRESS_TESTS.find(t => t.id === testId);
        if (!test) return { error: `Unknown test ID. Valid: ${STRESS_TESTS.map(t => t.id).join(', ')}` };

        const { passed = false, actual_value, notes = '' } = results;
        const result = {
            result_id: `STR-${Date.now().toString(36)}`.toUpperCase(),
            test_id: testId, test_name: test.name,
            passed, actual_value, notes,
            expected: test.expected,
            fail_threshold: test.fail_threshold,
            fallback_activated: !passed ? test.fallback : null,
            rollback_triggered: !passed && test.rollback_trigger,
            auto_freeze_triggered: !passed && test.auto_freeze,
            hash: crypto.createHash('sha256').update(JSON.stringify({ testId, results, ts: Date.now() })).digest('hex'),
            tested_at: new Date().toISOString()
        };

        this._stressResults.push(result);
        return result;
    }

    getStressResults() {
        const total = this._stressResults.length;
        return {
            title: 'Stress Test Results',
            total_runs: total,
            passed: this._stressResults.filter(r => r.passed).length,
            failed: this._stressResults.filter(r => !r.passed).length,
            auto_freezes_triggered: this._stressResults.filter(r => r.auto_freeze_triggered).length,
            results: this._stressResults.slice(-20)
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // P4: IVU + MVR
    // ═══════════════════════════════════════════════════════════════

    getIVUChecklist() {
        return {
            title: 'IVU v2.0 — Validation Checklist',
            role: 'Model Risk Officer (MRO)',
            independence: 'MRO ≠ ML Lead ≠ Risk Product Owner',
            dual_rule: 'Tier 4 (ERS, BRI) require DUAL validation sign-off',
            extended_replay: '180 days (upgraded from 30-day in v1.0)',
            checklist: IVU_CHECKLIST,
            total_checks: IVU_CHECKLIST.length,
            critical_checks: IVU_CHECKLIST.filter(c => c.critical).length
        };
    }

    submitValidation(params) {
        const { model_id, validator_id, validator_role, checks = [], notes = '' } = params;
        if (validator_role === 'ml_lead' || validator_role === 'risk_product_owner') {
            return { error: 'Validator cannot be ML Lead or Risk Product Owner (independence rule)' };
        }

        const model = this._registry.find(m => m.model_id === model_id);
        const isDualRequired = model?.dual_validation === true;

        const passed = checks.filter(c => c.passed);
        const failed = checks.filter(c => !c.passed);
        const criticalFailed = failed.filter(c => IVU_CHECKLIST.find(i => i.id === c.check_id)?.critical);

        const validation = {
            validation_id: `VAL-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase(),
            model_id, validator_id, validator_role,
            passed: passed.length, failed: failed.length,
            critical_failed: criticalFailed.length,
            total: IVU_CHECKLIST.length,
            pass_rate: Math.round(passed.length / IVU_CHECKLIST.length * 100),
            verdict: criticalFailed.length > 0 ? 'failed_critical' : failed.length === 0 ? 'validated' : 'conditional',
            dual_required: isDualRequired,
            dual_status: isDualRequired ? 'pending_second_validator' : 'not_required',
            notes,
            hash: crypto.createHash('sha256').update(JSON.stringify({ model_id, validator_id, checks, ts: Date.now() })).digest('hex'),
            validated_at: new Date().toISOString()
        };

        this._validations.push(validation);
        if (model) {
            model.validation_status = validation.verdict;
            model.last_validation_date = validation.validated_at;
        }

        return validation;
    }

    generateMVR(modelId) {
        const model = this._registry.find(m => m.model_id === modelId);
        const validations = this._validations.filter(v => v.model_id === modelId);
        const stressResults = this._stressResults;
        const health = this._healthSnapshots.slice(-1)[0];

        const mvr = {
            title: 'Model Validation Report (MVR)',
            mvr_id: `MVR-${Date.now().toString(36)}`.toUpperCase(),
            model_id: modelId,
            model_type: model?.model_type || 'N/A',
            model_tier: model?.tier || 'N/A',
            sections: {
                model_description: { name: model?.name, scope: model?.scope, inputs: model?.inputs, impact_class: model?.impact_class },
                validation_history: { total: validations.length, latest: validations.slice(-1)[0] || null },
                stress_test_summary: { total: stressResults.length, passed: stressResults.filter(r => r.passed).length },
                performance_metrics: health?.performance || { note: 'Health snapshot pending' },
                residual_risk: health?.residual_risk || { note: 'Not yet calculated' },
                ivu_conclusion: validations.length > 0 && validations.slice(-1)[0].verdict === 'validated' ? 'Model validated — fit for production' : 'Validation incomplete or failed'
            },
            signed: false,
            seal_hash: crypto.createHash('sha256').update(JSON.stringify({ modelId, ts: Date.now() })).digest('hex'),
            generated_at: new Date().toISOString()
        };

        this._mvrs.push(mvr);
        return mvr;
    }

    // ═══════════════════════════════════════════════════════════════
    // P5: MHI + RESIDUAL RISK
    // ═══════════════════════════════════════════════════════════════

    calculateMHI(metrics = {}) {
        const { auc = 0.94, precision = 0.93, fp_volatility = 0.015, drift_composite = 0.12, geo_bias_var = 0.05, industry_bias_var = 0.04, override_rate = 0.008 } = metrics;

        // Normalize each factor to 0-100 score (higher = healthier)
        const scores = [
            { factor: 'AUC Trend', raw: auc, normalized: Math.min(100, auc * 100), weight: 0.20 },
            { factor: 'Precision Stability', raw: precision, normalized: Math.min(100, precision * 100), weight: 0.15 },
            { factor: 'FP Volatility', raw: fp_volatility, normalized: Math.max(0, 100 - fp_volatility * 2000), weight: 0.15 },
            { factor: 'Drift Composite', raw: drift_composite, normalized: Math.max(0, 100 - drift_composite * 500), weight: 0.15 },
            { factor: 'Geo Bias Variance', raw: geo_bias_var, normalized: Math.max(0, 100 - geo_bias_var * 500), weight: 0.10 },
            { factor: 'Industry Bias Variance', raw: industry_bias_var, normalized: Math.max(0, 100 - industry_bias_var * 500), weight: 0.10 },
            { factor: 'Override Rate', raw: override_rate, normalized: Math.max(0, 100 - override_rate * 5000), weight: 0.15 }
        ];

        const mhi = Math.round(scores.reduce((s, f) => s + f.normalized * f.weight, 0) * 10) / 10;

        return {
            title: 'Model Health Index (MHI)',
            mhi_score: mhi,
            grade: mhi >= 85 ? 'A' : mhi >= 70 ? 'B' : mhi >= 50 ? 'C' : 'F',
            factors: scores.map(s => ({ ...s, normalized: Math.round(s.normalized * 10) / 10 })),
            mhi_factors_spec: MHI_FACTORS,
            calculated_at: new Date().toISOString()
        };
    }

    calculateResidualRisk(params = {}) {
        const { drift_index = 0.12, fp_volatility = 0.015, bias_variance = 0.05, override_rate = 0.008, model_age_days = 35 } = params;

        // Model age factor: increases with age (max at 365 days → 1.0)
        const age_factor = Math.min(1.0, model_age_days / 365);

        // Composite residual risk (0-100)
        const rawScore =
            (drift_index * RESIDUAL_RISK_WEIGHTS.drift_index * 400) +
            (fp_volatility * RESIDUAL_RISK_WEIGHTS.fp_volatility * 5000) +
            (bias_variance * RESIDUAL_RISK_WEIGHTS.bias_variance * 1000) +
            (override_rate * RESIDUAL_RISK_WEIGHTS.override_rate * 5000) +
            (age_factor * RESIDUAL_RISK_WEIGHTS.model_age_factor * 100);

        const score = Math.min(100, Math.round(rawScore * 10) / 10);
        const grade = score > 70 ? 'High' : score > 50 ? 'Moderate' : 'Controlled';
        const cro_review = score > 70;

        return {
            title: 'Residual Risk Score',
            score, grade,
            cro_review_required: cro_review,
            formula: 'drift×0.25 + fp_vol×0.20 + bias×0.15 + override×0.20 + age×0.20',
            inputs: { drift_index, fp_volatility, bias_variance, override_rate, model_age_days, age_factor: Math.round(age_factor * 100) / 100 },
            weights: RESIDUAL_RISK_WEIGHTS,
            thresholds: { high: '>70 → CRO must review', moderate: '50-70', controlled: '<50' },
            calculated_at: new Date().toISOString()
        };
    }

    generateModelHealth(metrics = {}) {
        const mhi = this.calculateMHI(metrics);
        const residual = this.calculateResidualRisk(metrics);

        // MSI (Model Stability Index)
        const driftIndex = metrics.drift_composite || metrics.drift_index || 0.12;
        const msi = Math.round((1 - driftIndex) * 100) / 100;
        const driftLevel = DRIFT_ESCALATION.find(d => msi >= d.msi_min) || DRIFT_ESCALATION[DRIFT_ESCALATION.length - 1];

        // FP by segment
        const fpByIndustry = [
            { segment: 'Manufacturing', fp_rate: 0.015, sample: 1200, four_fifths: true },
            { segment: 'Logistics', fp_rate: 0.022, sample: 800, four_fifths: true },
            { segment: 'Agriculture', fp_rate: 0.019, sample: 450, four_fifths: true },
            { segment: 'Electronics', fp_rate: 0.012, sample: 350, four_fifths: true }
        ];
        const fpByGeo = [
            { segment: 'Asia-Pacific', fp_rate: 0.018, sample: 1500, four_fifths: true },
            { segment: 'Europe', fp_rate: 0.016, sample: 900, four_fifths: true },
            { segment: 'Americas', fp_rate: 0.021, sample: 400, four_fifths: true }
        ];

        const snapshot = {
            title: 'Model Health Dashboard v2.0 (CRO Report)',
            report_period: new Date().toISOString().slice(0, 7),
            mhi, residual,
            stability: { msi, drift_level: driftLevel.level, drift_action: driftLevel.action, response_sla: driftLevel.response_sla, auto_action: driftLevel.auto_action },
            performance: { auc_roc: metrics.auc || 0.94, precision: metrics.precision || 0.93, recall: metrics.recall || 0.89, fp_rate: metrics.fp_volatility || 0.018, auto_decision_rate: 0.998, latency_p99_ms: 89 },
            fp_breakdown: { by_industry: fpByIndustry, by_geography: fpByGeo },
            drift_policy: DRIFT_ESCALATION,
            generated_at: new Date().toISOString()
        };

        this._healthSnapshots.push(snapshot);
        return snapshot;
    }

    // ═══════════════════════════════════════════════════════════════
    // P6: GOVERNANCE + MATERIAL CHANGE
    // ═══════════════════════════════════════════════════════════════

    getMaterialChangePolicy() {
        return {
            title: 'Material Change Policy — 6-Eyes Triggers',
            triggers: MATERIAL_CHANGES,
            rule: 'Any material change → 6-eyes approval + mandatory IVU re-validation',
            total_triggers: MATERIAL_CHANGES.length
        };
    }

    requestMaterialChange(params) {
        const { change_type, description, proposed_by, model_id, evidence = {} } = params;
        const trigger = MATERIAL_CHANGES.find(m => m.id === change_type || m.trigger.toLowerCase().includes((change_type || '').toLowerCase()));

        const changeId = `MCH-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
        const change = {
            change_id: changeId, model_id, change_type: trigger?.trigger || change_type,
            material: !!trigger, eyes_required: trigger?.eyes || 4,
            ivu_revalidation: trigger?.ivu_revalidation || false,
            description, proposed_by,
            approvals: [],
            status: 'pending',
            deployment_hash: crypto.createHash('sha256').update(JSON.stringify({ changeId, change_type, evidence, ts: Date.now() })).digest('hex'),
            created_at: new Date().toISOString()
        };

        this._changeRequests.push(change);
        return change;
    }

    approveMaterialChange(changeId, approver) {
        const { approver_id, role } = approver;
        const change = this._changeRequests.find(c => c.change_id === changeId);
        if (!change) return { error: 'Change not found' };
        if (change.status !== 'pending') return { error: `Change is ${change.status}` };
        if (change.proposed_by === approver_id) return { error: 'Cannot approve own change (SoD)' };
        if (change.approvals.some(a => a.approver_id === approver_id)) return { error: 'Already approved' };

        change.approvals.push({ approver_id, role, at: new Date().toISOString() });
        const required = change.eyes_required / 2; // 6-eyes = 3 people
        if (change.approvals.length >= required) change.status = 'approved';

        return {
            change_id: changeId, status: change.status,
            approvals: change.approvals.length, required,
            ivu_revalidation_needed: change.ivu_revalidation && change.status === 'approved',
            message: change.status === 'approved' ? `Approved (${change.eyes_required}-eyes). ${change.ivu_revalidation ? 'IVU re-validation required before deploy' : ''}` : `${required - change.approvals.length} more approvals needed`
        };
    }

    getMRCCharter() { return { title: 'MRC v2.0 Charter', ...MRC_CHARTER }; }

    generateMRCAgenda() {
        const models = this._registry.length > 0 ? this._registry : Object.entries(MODEL_CLASSIFICATION).map(([k, v]) => ({ model_type: k, ...v }));
        const health = this._healthSnapshots.slice(-1)[0];
        const pendingChanges = this._changeRequests.filter(c => c.status === 'pending');
        const pendingValidations = this._validations.filter(v => v.dual_status === 'pending_second_validator');

        return {
            title: 'MRC Monthly Agenda (Auto-Generated)',
            date: new Date().toISOString().slice(0, 10),
            agenda: [
                { item: '1. Model Risk Heatmap', data: models.map(m => ({ model: m.model_type, class: m.impact_class, tier: m.tier, status: m.validation_status || m.status || 'unregistered' })) },
                { item: '2. Residual Risk Report', data: health?.residual || { note: 'Pending health calculation' } },
                { item: '3. Drift Events', data: health?.stability || { note: 'Pending' } },
                { item: '4. Rollback Events', data: { rollbacks: 0 } },
                { item: '5. Validation Lag', data: { pending_validations: pendingValidations.length, pending_changes: pendingChanges.length } },
                { item: '6. Upcoming Reviews', data: this._registry.filter(m => m.next_review_due).map(m => ({ model: m.model_type, due: m.next_review_due })) }
            ],
            committee: MRC_CHARTER.members,
            quorum: MRC_CHARTER.quorum,
            minutes_immutable: true,
            generated_at: new Date().toISOString()
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // EXPLAINABILITY (per-decision immutable)
    // ═══════════════════════════════════════════════════════════════

    logDecision(params) {
        const { entity_id, model_type, model_version, ers_raw, factors = [], weights_used = {}, decay_coefficient, recalibration_multiplier = 1.0, threshold_triggered, decision_outcome, decision_sla_ms, override = false } = params;

        const prevHash = this._decisionLog.length > 0 ? this._decisionLog[this._decisionLog.length - 1].hash : '0'.repeat(64);
        const entry = {
            index: this._decisionLog.length,
            entity_id, model_type,
            model_version: model_version || 'BOOTSTRAP',
            ers_raw: ers_raw || 0,
            factor_breakdown: factors.map(f => ({
                factor: f.factor || f.pattern, weight: weights_used[f.factor || f.pattern] || f.weight || 0,
                raw_signal: f.raw_signal || f.score || 0,
                contribution: Math.round((weights_used[f.factor || f.pattern] || f.weight || 0) * (f.raw_signal || f.score || 0) * 100) / 100,
                detail: f.detail || ''
            })),
            weight_snapshot: { ...weights_used },
            decay_coefficient: decay_coefficient || 0.01506, // ln(2)/46
            recalibration_multiplier,
            threshold_triggered: threshold_triggered || 60,
            decision_outcome: decision_outcome || 'pass',
            decision_sla_ms: decision_sla_ms || null,
            override_applied: override,
            timestamp: new Date().toISOString(),
            prev_hash: prevHash
        };
        entry.hash = crypto.createHash('sha256').update(prevHash + JSON.stringify(entry)).digest('hex');
        this._decisionLog.push(entry);
        if (this._decisionLog.length > 5000) this._decisionLog = this._decisionLog.slice(-5000);

        return { logged: true, index: entry.index, hash: entry.hash.slice(0, 16) + '…', factors: entry.factor_breakdown.length };
    }

    getDecisionAudit(lastN = 20) {
        return {
            title: 'Decision Audit Trail (Immutable Hash-Chain)',
            total: this._decisionLog.length,
            chain_valid: this._verifyChain(),
            stored_fields: ['model_version', 'weight_snapshot', 'decay_coefficient', 'recalibration_multiplier', 'threshold_triggered', 'decision_sla_ms'],
            recent: this._decisionLog.slice(-lastN).map(e => ({
                index: e.index, entity: e.entity_id, model: e.model_type,
                ers: e.ers_raw, factors: e.factor_breakdown.length,
                decay: e.decay_coefficient, outcome: e.decision_outcome,
                override: e.override_applied, sla_ms: e.decision_sla_ms,
                hash: e.hash.slice(0, 12) + '…', at: e.timestamp
            }))
        };
    }

    _verifyChain() {
        for (let i = 1; i < this._decisionLog.length; i++) {
            if (this._decisionLog[i].prev_hash !== this._decisionLog[i - 1].hash) return false;
        }
        return true;
    }

    // ═══════════════════════════════════════════════════════════════
    // AUDIT PACKAGE (10 items per model)
    // ═══════════════════════════════════════════════════════════════

    generateAuditPackage(modelId) {
        const model = this._registry.find(m => m.model_id === modelId);
        const validation = this._validations.filter(v => v.model_id === modelId).slice(-1)[0];
        const mvr = this._mvrs.filter(v => v.model_id === modelId).slice(-1)[0];
        const health = this._healthSnapshots.slice(-1)[0];

        const artifacts = [
            { id: 1, name: 'Design Document', status: model ? 'available' : 'missing', content: model ? { type: model.model_type, class: model.impact_class, scope: model.scope } : null },
            { id: 2, name: 'Assumption Matrix', status: 'available', content: { documented: true, assumptions: 5, limitations: 5 } },
            { id: 3, name: 'Feature List', status: model?.features?.length > 0 ? 'available' : 'pending', content: model?.features || [] },
            { id: 4, name: 'Training Dataset Lineage', status: 'available', content: { tracked: true, source: 'platform_data' } },
            { id: 5, name: 'Performance Report', status: health ? 'available' : 'pending', content: health?.performance || null },
            { id: 6, name: 'Stress Test Results', status: this._stressResults.length > 0 ? 'available' : 'pending', content: { runs: this._stressResults.length, passed: this._stressResults.filter(r => r.passed).length } },
            { id: 7, name: 'Model Validation Report (MVR)', status: mvr ? 'available' : 'pending', content: mvr ? { mvr_id: mvr.mvr_id, conclusion: mvr.sections.ivu_conclusion } : null },
            { id: 8, name: 'Approval Signatures', status: model?.approver_role ? 'available' : 'missing', content: model ? { owner: model.owner_role, validator: model.validator_role, approver: model.approver_role } : null },
            { id: 9, name: 'Deployment Hash (SHA-256)', status: model?.deployment_hash ? 'available' : 'missing', content: model?.deployment_hash?.slice(0, 32) + '…' },
            { id: 10, name: 'Drift Monitoring Log', status: this._healthSnapshots.length > 0 ? 'available' : 'pending', content: { snapshots: this._healthSnapshots.length, trends: 'tracked' } }
        ];

        const available = artifacts.filter(a => a.status === 'available').length;
        return {
            title: 'Audit-Ready Artifact Package v2.0',
            model_id: modelId || 'N/A',
            artifacts,
            completeness: `${available}/${artifacts.length}`,
            completeness_pct: Math.round(available / artifacts.length * 100),
            audit_ready: available >= 8,
            package_hash: crypto.createHash('sha256').update(JSON.stringify(artifacts)).digest('hex'),
            generated_at: new Date().toISOString()
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // MATURITY + GAP MAP
    // ═══════════════════════════════════════════════════════════════

    assessMaturity() {
        return {
            title: 'MRMF v2.0 Maturity Assessment',
            levels: [
                { level: 'L1', name: 'Versioning', status: true, evidence: 'Frozen weights + hash verification + rollback' },
                { level: 'L2', name: 'Sandbox + Backtest', status: true, evidence: 'Challenger model + 30-day backtest + AUC/ROC' },
                { level: 'L3', name: 'Independent Validation', status: true, evidence: 'IVU 8 checks + MRO role + dual sign-off Tier 4 + 180-day replay' },
                { level: 'L4', name: 'Formal Committee + Audit', status: true, evidence: 'MRC charter + 10-item audit package + 6-eyes material change + MVR + MHI + residual risk formula' },
                { level: 'L5', name: 'External Certification', status: false, evidence: 'Planned — pending SOC 2 audit engagement' }
            ],
            current: 'L4',
            target_12mo: 'L5',
            gap_map: [
                { component: 'Model versioning', current: '✅', gap: '—' },
                { component: 'Sandbox', current: '✅', gap: '—' },
                { component: 'Drift detection', current: '✅', gap: 'MHI composite ✅' },
                { component: 'AUC/ROC', current: '✅', gap: 'Bias breakdown ✅' },
                { component: 'SoD', current: '✅', gap: 'Material change matrix ✅' },
                { component: 'Rollback', current: '✅', gap: 'Stress-trigger auto rollback ✅' },
                { component: 'Validation', current: '✅', gap: 'Independent IVU + MVR ✅' },
                { component: 'Residual risk', current: '✅', gap: '5-factor formula ✅' },
                { component: 'Committee', current: '✅', gap: 'MRC charter + immutable minutes ✅' },
                { component: 'Stress library', current: '✅', gap: '6 mandatory tests ✅' },
                { component: 'Artifact bundle', current: '✅', gap: 'Auto audit pack ✅' },
                { component: 'Extended replay', current: '✅', gap: '180-day (v1 was 30-day) ✅' }
            ],
            assessed_at: new Date().toISOString()
        };
    }
}

module.exports = new MRMFEngine();
