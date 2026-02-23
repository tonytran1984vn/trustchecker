/**
 * L3→L4 Hardening Routes — Risk Model Governance + SA Constraints + Observability
 * All 3 hardening modules exposed under /api/hardening
 * Endpoints: 15
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission } = require('../auth');
const riskGov = require('../engines/risk-model-governance');
const saConstraints = require('../engines/sa-constraints');
const observability = require('../engines/observability-engine');
router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════════
// RISK MODEL GOVERNANCE (5 endpoints)
// ═══════════════════════════════════════════════════════════════════

// GET /risk-model/active — Active model version
router.get('/risk-model/active', (req, res) => {
    res.json(riskGov.getActiveVersion());
});

// POST /risk-model/register — Register new model version (requires Compliance approval)
router.post('/risk-model/register', requirePermission('admin:manage'), (req, res) => {
    const result = riskGov.registerVersion({ ...req.body, registered_by: req.user?.id });
    if (result.error) return res.status(400).json(result);
    res.status(201).json(result);
});

// GET /risk-model/versions — Version history
router.get('/risk-model/versions', (req, res) => { res.json(riskGov.getVersionHistory()); });

// GET /risk-model/drift — Drift detection
router.get('/risk-model/drift', (req, res) => { res.json(riskGov.detectDrift()); });

// POST /risk-model/propose-change — Propose weight change
router.post('/risk-model/propose-change', requirePermission('risk:view'), (req, res) => {
    const result = riskGov.proposeWeightChange({ ...req.body, proposed_by: req.user?.id });
    if (result.error) return res.status(400).json(result);
    res.status(201).json(result);
});

// POST /risk-model/review-change — Review weight change
router.post('/risk-model/review-change', requirePermission('compliance:review'), (req, res) => {
    const result = riskGov.reviewWeightChange(req.body.change_id, { ...req.body, reviewer_id: req.user?.id });
    if (result.error) return res.status(400).json(result);
    res.json(result);
});

// GET /risk-model/pending — Pending weight changes
router.get('/risk-model/pending', (req, res) => { res.json(riskGov.getPendingChanges()); });

// GET /risk-model/overrides — Override audit trail
router.get('/risk-model/overrides', (req, res) => { res.json(riskGov.getOverrideLog()); });

// ═══════════════════════════════════════════════════════════════════
// SUPER ADMIN CONSTRAINTS (4 endpoints)
// ═══════════════════════════════════════════════════════════════════

// POST /sa/check — Check if SA action is allowed
router.post('/sa/check', requirePermission('admin:manage'), (req, res) => {
    res.json(saConstraints.checkAction(req.body.action, req.user?.id));
});

// POST /sa/request — Request approval for restricted action
router.post('/sa/request', requirePermission('admin:manage'), (req, res) => {
    const result = saConstraints.requestApproval({ ...req.body, sa_user_id: req.user?.id });
    if (result.error) return res.status(400).json(result);
    res.status(201).json(result);
});

// POST /sa/approve — Approve/reject SA action
router.post('/sa/approve', requirePermission('compliance:review'), (req, res) => {
    const result = saConstraints.processApproval(req.body.request_id, { ...req.body, approver_id: req.user?.id });
    if (result.error) return res.status(400).json(result);
    res.json(result);
});

// GET /sa/dashboard — SA constraint dashboard
router.get('/sa/dashboard', requirePermission('admin:manage'), (req, res) => {
    res.json(saConstraints.getConstraintDashboard());
});

// GET /sa/audit — SA audit trail
router.get('/sa/audit', (req, res) => { res.json(saConstraints.getAuditTrail()); });

// ═══════════════════════════════════════════════════════════════════
// OBSERVABILITY (4 endpoints)
// ═══════════════════════════════════════════════════════════════════

// GET /observability/health — Real system health
router.get('/observability/health', (req, res) => {
    res.json(observability.collectSystemHealth());
});

// GET /observability/alerts — Alert pipeline status
router.get('/observability/alerts', (req, res) => {
    res.json(observability.getAlertStatus());
});

// GET /observability/sla — Incident SLA performance
router.get('/observability/sla', (req, res) => {
    res.json(observability.getSLAPerformance());
});

// GET /observability/errors — Error breakdown
router.get('/observability/errors', (req, res) => {
    res.json(observability.getErrorBreakdown());
});

// ═══════════════════════════════════════════════════════════════════
// RISK INTELLIGENCE INFRASTRUCTURE (8 endpoints — core moat)
// ═══════════════════════════════════════════════════════════════════

const riskInfra = require('../engines/risk-intelligence-infra');

// GET /risk-intelligence/mrm — Model Risk Management inventory
router.get('/risk-intelligence/mrm', (req, res) => {
    res.json(riskInfra.getModelInventory());
});

// POST /risk-intelligence/challenger — Run challenger model
router.post('/risk-intelligence/challenger', requirePermission('risk:view'), async (req, res) => {
    try {
        const db = require('../db');
        const entities = req.body.entities || await db.prepare('SELECT * FROM partners LIMIT 50').all().catch(() => []);
        res.json(riskInfra.runChallengerModel(entities));
    } catch (err) { res.status(500).json({ error: 'Challenger model failed' }); }
});

// POST /risk-intelligence/backtest — Run back-testing
router.post('/risk-intelligence/backtest', requirePermission('risk:view'), (req, res) => {
    const result = riskInfra.runBackTest(req.body.predictions || []);
    res.json(result);
});

// GET /risk-intelligence/stress-scenarios — Stress test scenarios
router.get('/risk-intelligence/stress-scenarios', (req, res) => {
    res.json(riskInfra.generateStressScenarios());
});

// GET /risk-intelligence/sensitivity — Sensitivity analysis
router.get('/risk-intelligence/sensitivity', (req, res) => {
    const activeModel = riskGov.getActiveVersion();
    res.json(riskInfra.runSensitivityAnalysis(activeModel.weights || {}));
});

// GET /risk-intelligence/resilience — Model resilience assessment
router.get('/risk-intelligence/resilience', (req, res) => {
    res.json(riskInfra.assessResilience());
});

// POST /risk-intelligence/explain — Explain a risk decision
router.post('/risk-intelligence/explain', (req, res) => {
    res.json(riskInfra.explainDecision(req.body));
});

// POST /risk-intelligence/bias — Bias & fairness analysis
router.post('/risk-intelligence/bias', requirePermission('risk:view'), async (req, res) => {
    try {
        const db = require('../db');
        const entities = req.body.entities || await db.prepare('SELECT * FROM partners LIMIT 100').all().catch(() => []);
        res.json(riskInfra.analyzeBiasFairness(entities));
    } catch (err) { res.status(500).json({ error: 'Bias analysis failed' }); }
});

// ═══════════════════════════════════════════════════════════════════
// MRMF v2.0 — Enterprise-Native Model Risk Management (18 endpoints)
// ═══════════════════════════════════════════════════════════════════

const mrmf = require('../engines/mrmf-engine');

// P1: Model Inventory
router.get('/mrmf/inventory', (req, res) => { res.json(mrmf.getInventory()); });
router.post('/mrmf/register', requirePermission('admin:manage'), (req, res) => {
    const result = mrmf.registerModel(req.body);
    if (result.error) return res.status(400).json(result);
    res.status(201).json(result);
});

// P2: MDLC 10-step
router.get('/mrmf/mdlc', (req, res) => { res.json(mrmf.getMDLC()); });
router.post('/mrmf/mdlc/advance', requirePermission('risk:view'), (req, res) => {
    const result = mrmf.advanceMDLC(req.body.model_id, req.body.step, req.body.evidence);
    if (result.error) return res.status(400).json(result);
    res.json(result);
});

// P3: Stress Test Framework
router.get('/mrmf/stress-library', (req, res) => { res.json(mrmf.getStressLibrary()); });
router.post('/mrmf/stress-test', requirePermission('risk:view'), (req, res) => {
    const result = mrmf.runStressTest(req.body.test_id, req.body);
    if (result.error) return res.status(400).json(result);
    res.status(201).json(result);
});
router.get('/mrmf/stress-results', (req, res) => { res.json(mrmf.getStressResults()); });

// P4: IVU + MVR
router.get('/mrmf/ivu', (req, res) => { res.json(mrmf.getIVUChecklist()); });
router.post('/mrmf/validate', requirePermission('compliance:review'), (req, res) => {
    const result = mrmf.submitValidation({ ...req.body, validator_id: req.user?.id });
    if (result.error) return res.status(400).json(result);
    res.status(201).json(result);
});
router.get('/mrmf/mvr', (req, res) => { res.json(mrmf.generateMVR(req.query.model_id)); });

// P5: MHI + Residual Risk + Health
router.get('/mrmf/mhi', (req, res) => { res.json(mrmf.calculateMHI(req.query)); });
router.get('/mrmf/residual-risk', (req, res) => { res.json(mrmf.calculateResidualRisk(req.query)); });
router.get('/mrmf/health', (req, res) => { res.json(mrmf.generateModelHealth(req.query)); });

// P6: Material Change + Governance
router.get('/mrmf/material-change-policy', (req, res) => { res.json(mrmf.getMaterialChangePolicy()); });
router.post('/mrmf/material-change', requirePermission('risk:view'), (req, res) => {
    const result = mrmf.requestMaterialChange({ ...req.body, proposed_by: req.user?.id });
    if (result.error) return res.status(400).json(result);
    res.status(201).json(result);
});
router.post('/mrmf/approve-change', requirePermission('compliance:review'), (req, res) => {
    const result = mrmf.approveMaterialChange(req.body.change_id, { ...req.body, approver_id: req.user?.id });
    if (result.error) return res.status(400).json(result);
    res.json(result);
});
router.get('/mrmf/mrc', (req, res) => { res.json({ charter: mrmf.getMRCCharter(), agenda: mrmf.generateMRCAgenda() }); });
router.get('/mrmf/audit-package', (req, res) => { res.json(mrmf.generateAuditPackage(req.query.model_id)); });
router.get('/mrmf/maturity', (req, res) => { res.json(mrmf.assessMaturity()); });
router.get('/mrmf/decision-audit', (req, res) => { res.json(mrmf.getDecisionAudit(parseInt(req.query.limit) || 20)); });

// ═══════════════════════════════════════════════════════════════════
// ERCM v1.0 — Enterprise Risk & Control Map (11 endpoints)
// COSO ERM + Three Lines + IPO-Grade
// ═══════════════════════════════════════════════════════════════════

const ercm = require('../engines/ercm-engine');

router.get('/ercm/three-lines', (req, res) => { res.json(ercm.getThreeLines()); });
router.get('/ercm/governance-bodies', (req, res) => { res.json(ercm.getGovernanceBodies()); });
router.get('/ercm/risk-registry', (req, res) => { res.json(ercm.getRiskRegistry()); });
router.get('/ercm/heatmap', (req, res) => { res.json(ercm.generateHeatmap()); });
router.get('/ercm/control-matrix', (req, res) => { res.json(ercm.getControlMatrix()); });
router.get('/ercm/risk-appetite', (req, res) => { res.json(ercm.getRiskAppetite()); });
router.get('/ercm/board-dashboard', (req, res) => { res.json(ercm.getBoardDashboard()); });
router.get('/ercm/control-tests', (req, res) => { res.json(ercm.getControlTests()); });
router.post('/ercm/attestation', requirePermission('admin:manage'), (req, res) => {
    const result = ercm.submitAttestation({ ...req.body, attester_id: req.user?.id });
    if (result.error) return res.status(400).json(result);
    res.status(201).json(result);
});
router.get('/ercm/ipo-gap', (req, res) => { res.json(ercm.getIPOGapAnalysis()); });
router.get('/ercm/maturity', (req, res) => { res.json(ercm.assessMaturity()); });

// ═══════════════════════════════════════════════════════════════════
// Institutional Engine — 4 Pillars (10 endpoints)
// Risk Appetite + Board Dashboard + Internal Audit + Risk Capital
// ═══════════════════════════════════════════════════════════════════

const inst = require('../engines/institutional-engine');

// I. Risk Appetite
router.get('/institutional/risk-appetite', (req, res) => { res.json(inst.getRiskAppetite()); });
router.get('/institutional/appetite-breach', (req, res) => { res.json(inst.checkAppetiteBreach(req.query)); });

// II. Board Dashboard
router.get('/institutional/board-kpi-spec', (req, res) => { res.json(inst.getBoardKPISpec()); });
router.get('/institutional/board-dashboard', (req, res) => { res.json(inst.generateBoardDashboard(req.query)); });

// III. Internal Audit
router.get('/institutional/audit-charter', (req, res) => { res.json(inst.getAuditCharter()); });
router.get('/institutional/audit-plan', (req, res) => { res.json(inst.getAuditPlan()); });
router.post('/institutional/audit-finding', requirePermission('compliance:review'), (req, res) => {
    const result = inst.submitAuditFinding({ ...req.body, auditor_id: req.user?.id });
    if (result.error) return res.status(400).json(result);
    res.status(201).json(result);
});
router.get('/institutional/audit-findings', requirePermission('compliance:review'), (req, res) => { res.json(inst.getAuditFindings()); });

// IV. Risk Capital
// FIX #10: Input validation on financial calculation endpoints
router.get('/institutional/exposure', (req, res) => {
    const q = req.query;
    const safe = {};
    for (const [k, v] of Object.entries(q)) {
        const n = parseFloat(v);
        safe[k] = isNaN(n) ? v : Math.min(Math.max(n, 0), 1e9);
    }
    res.json(inst.calculateExposure(safe));
});
router.get('/institutional/economic-capital', (req, res) => {
    const q = req.query;
    const safe = {};
    for (const [k, v] of Object.entries(q)) {
        const n = parseFloat(v);
        safe[k] = isNaN(n) ? v : Math.min(Math.max(n, 0), 1e9);
    }
    res.json(inst.calculateEconomicCapital(safe));
});

// Maturity
router.get('/institutional/maturity', (req, res) => { res.json(inst.assessInstitutionalMaturity()); });

// ═══════════════════════════════════════════════════════════════════
// Platform Architecture — Simplification & Core Isolation (6 endpoints)
// ═══════════════════════════════════════════════════════════════════

const platArch = require('../engines/platform-architecture-engine');

// FIX #4: Restrict platform architecture to admin only (prevents internal architecture disclosure)
router.get('/platform/module-registry', requirePermission('admin:manage'), (req, res) => { res.json(platArch.getModuleRegistry()); });
router.get('/platform/dependency-graph', requirePermission('admin:manage'), (req, res) => { res.json(platArch.getDependencyGraph()); });
router.get('/platform/api-surface', requirePermission('admin:manage'), (req, res) => { res.json(platArch.getAPISurface()); });
router.get('/platform/critical-path', requirePermission('admin:manage'), (req, res) => { res.json(platArch.getCriticalPath()); });
router.get('/platform/complexity', requirePermission('admin:manage'), (req, res) => { res.json(platArch.getComplexityScorecard()); });
router.get('/platform/isolation', requirePermission('admin:manage'), (req, res) => { res.json(platArch.getIsolationSpec()); });

// ═══════════════════════════════════════════════════════════════════
// Carbon Registry — Cross-Jurisdiction Legitimacy (10 endpoints)
// ═══════════════════════════════════════════════════════════════════

const carbonReg = require('../engines/carbon-registry-engine');

router.get('/carbon-registry/jurisdictions', (req, res) => { res.json(carbonReg.getJurisdictions()); });
router.get('/carbon-registry/protocol', (req, res) => { res.json(carbonReg.getProtocol()); });
router.get('/carbon-registry/compliance-matrix', (req, res) => { res.json(carbonReg.getComplianceMatrix()); });
router.get('/carbon-registry/fee-model', (req, res) => { res.json(carbonReg.getFeeModel()); });
router.get('/carbon-registry/revenue-projection', (req, res) => { res.json(carbonReg.projectRevenue(req.query)); });
router.post('/carbon-registry/mint', requirePermission('admin:manage'), (req, res) => {
    const result = carbonReg.mintCredit(req.body);
    if (result.error) return res.status(400).json(result);
    res.status(201).json(result);
});
router.post('/carbon-registry/transfer', requirePermission('admin:manage'), (req, res) => {
    const result = carbonReg.transferCredit(req.body);
    if (result.error) return res.status(400).json(result);
    res.json(result);
});
router.post('/carbon-registry/retire', requirePermission('admin:manage'), (req, res) => {
    const result = carbonReg.retireCredit(req.body);
    if (result.error) return res.status(400).json(result);
    res.json(result);
});
router.get('/carbon-registry/defensibility', (req, res) => { res.json(carbonReg.getDefensibilityMetrics()); });
router.get('/carbon-registry/stats', (req, res) => { res.json(carbonReg.getRegistryStats()); });

module.exports = router;

