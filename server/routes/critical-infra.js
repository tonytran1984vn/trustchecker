/**
 * Critical Infrastructure Routes v1.1
 * Revenue Governance + Jurisdictional Risk + Kill-Switch + Super Admin + Model Risk
 * + Integration Locking + Stress Testing + Economic Risk + Contagion
 * 
 * RBAC v1.1: Role-gated per sensitivity level.
 *   L3 (admin):           Revenue, jurisdiction, econrisk, contagion — operational visibility
 *   L4 (risk_committee):  Kill-switch, model-risk, stress, integration — risk governance
 *   L5 (super_admin):     Super admin boundaries, kill-switch trigger, stress run — platform control
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole, requireConstitutional } = require('../auth');
const { asyncHandler: h } = require('../middleware/asyncHandler');

router.use(authMiddleware);

const revGov = require('../engines/revenue-governance-engine');
const jurisdiction = require('../engines/jurisdictional-risk-engine');
const killSwitch = require('../engines/kill-switch-engine');
const superAdmin = require('../engines/super-admin-boundaries-engine');
const modelRisk = require('../engines/model-risk-tiering-engine');

// ═══════════════════════════════════════════════════════════════════
// REVENUE GOVERNANCE — /revenue-gov [L3+ admin]
// ═══════════════════════════════════════════════════════════════════

router.get('/revenue-gov/map', requireRole('admin'), (req, res) => { res.json(revGov.getFullMap()); });
router.get('/revenue-gov/pricing', requireRole('admin'), (req, res) => { res.json(revGov.getPricingAuthority()); });
router.get('/revenue-gov/ai-impact', requireRole('admin'), (req, res) => { res.json(revGov.getAIRevenueMap()); });
router.get('/revenue-gov/settlement', requireRole('admin'), (req, res) => { res.json(revGov.getSettlementControl()); });
router.get('/revenue-gov/fees', requireRole('admin'), (req, res) => { res.json(revGov.getFeeGovernance()); });

// ═══════════════════════════════════════════════════════════════════
// JURISDICTIONAL RISK — /jurisdiction [L3+ admin]
// ═══════════════════════════════════════════════════════════════════

router.get('/jurisdiction/map', requireRole('admin'), (req, res) => { res.json(jurisdiction.getFullMap()); });
router.get('/jurisdiction/deployment', requireRole('admin'), (req, res) => { res.json(jurisdiction.getDeploymentMap()); });
router.get('/jurisdiction/data-isolation', requireRole('admin'), (req, res) => { res.json(jurisdiction.getDataIsolation()); });
router.get('/jurisdiction/geo-routing', requireRole('admin'), (req, res) => { res.json(jurisdiction.getGeoRouting()); });
router.get('/jurisdiction/carbon-registries', requireRole('admin'), (req, res) => { res.json(jurisdiction.getCarbonRegistryMap()); });

router.get('/jurisdiction/assess/:region_id', requireRole('admin'), (req, res) => {
    res.json(jurisdiction.assessJurisdiction(req.params.region_id));
});

// ═══════════════════════════════════════════════════════════════════
// KILL-SWITCH — /killswitch [L4+ risk_committee read, L5 trigger]
// ═══════════════════════════════════════════════════════════════════

router.get('/killswitch/architecture', requireRole('risk_committee'), (req, res) => { res.json(killSwitch.getFullArchitecture()); });
router.get('/killswitch/switches', requireRole('risk_committee'), (req, res) => { res.json(killSwitch.getKillSwitches()); });
router.get('/killswitch/circuit-breakers', requireRole('risk_committee'), (req, res) => { res.json(killSwitch.getCircuitBreakers()); });
router.get('/killswitch/escalation', requireRole('risk_committee'), (req, res) => { res.json(killSwitch.getEscalationLadder()); });

router.get('/killswitch/switch/:id', requireRole('risk_committee'), (req, res) => {
    const sw = killSwitch.getSwitch(req.params.id);
    if (!sw) return res.status(404).json({ error: 'Switch not found' });
    res.json(sw);
});

router.post('/killswitch/assess-threat', requireRole('super_admin'), (req, res) => {
    res.json(killSwitch.assessThreat(req.body.metrics || {}));
});

// ═══════════════════════════════════════════════════════════════════
// SUPER ADMIN BOUNDARIES — /superadmin [L5 super_admin only]
// ═══════════════════════════════════════════════════════════════════

router.get('/superadmin/framework', requireRole('super_admin'), (req, res) => { res.json(superAdmin.getFullFramework()); });
router.get('/superadmin/summary', requireRole('super_admin'), (req, res) => { res.json(superAdmin.getSummary()); });
router.get('/superadmin/permitted', requireRole('super_admin'), (req, res) => { res.json(superAdmin.getPermitted()); });
router.get('/superadmin/prohibited', requireRole('super_admin'), (req, res) => { res.json(superAdmin.getProhibited()); });
router.get('/superadmin/accountability', requireRole('super_admin'), (req, res) => { res.json(superAdmin.getAccountability()); });

// ═══════════════════════════════════════════════════════════════════
// MODEL RISK TIERING — /model-risk [L4+ risk_committee]
// ═══════════════════════════════════════════════════════════════════

router.get('/model-risk/framework', requireRole('risk_committee'), (req, res) => { res.json(modelRisk.getFullFramework()); });
router.get('/model-risk/tiers', requireRole('risk_committee'), (req, res) => { res.json(modelRisk.getModelTiers()); });
router.get('/model-risk/sensitivity', requireRole('risk_committee'), (req, res) => { res.json(modelRisk.getRevenueSensitivity()); });
router.get('/model-risk/shutdown', requireRole('risk_committee'), (req, res) => { res.json(modelRisk.getShutdownCriteria()); });
router.get('/model-risk/governance', requireRole('risk_committee'), (req, res) => { res.json(modelRisk.getModelGovernance()); });

router.get('/model-risk/model/:name', requireRole('risk_committee'), (req, res) => {
    const model = modelRisk.getModelByName(req.params.name);
    if (!model) return res.status(404).json({ error: 'Model not found' });
    res.json(model);
});

// ═══════════════════════════════════════════════════════════════════
// INTEGRATION LOCKING LAYER — /integration [L4+ risk_committee]
// ═══════════════════════════════════════════════════════════════════

const integration = require('../engines/integration-locking-engine');

router.get('/integration/architecture', requireRole('risk_committee'), (req, res) => { res.json(integration.getFullArchitecture()); });
router.get('/integration/capital-triggers', requireRole('risk_committee'), (req, res) => { res.json(integration.getCapitalTriggers()); });
router.get('/integration/risklab-bindings', requireRole('risk_committee'), (req, res) => { res.json(integration.getRiskLabBindings()); });
router.get('/integration/revenue-stabilizer', requireRole('risk_committee'), (req, res) => { res.json(integration.getRevenueStabilizer()); });
router.get('/integration/charter-amendment', requireRole('risk_committee'), (req, res) => { res.json(integration.getCharterAmendment()); });
router.get('/integration/coherence-map', requireRole('risk_committee'), (req, res) => { res.json(integration.getCoherenceMap()); });

router.post('/integration/evaluate', requireRole('super_admin'), (req, res) => {
    res.json(integration.evaluateSystemState(req.body));
});

// ═══════════════════════════════════════════════════════════════════
// SYSTEMIC STRESS & SIMULATION — /stress [L4+ risk_committee read, L5 run]
// ═══════════════════════════════════════════════════════════════════

const stress = require('../engines/systemic-stress-engine');

router.get('/stress/framework', requireRole('risk_committee'), (req, res) => { res.json(stress.getFullFramework()); });
router.get('/stress/scenarios', requireRole('risk_committee'), (req, res) => { res.json(stress.getScenarios()); });
router.get('/stress/decision-latency', requireRole('risk_committee'), (req, res) => { res.json(stress.getDecisionLatency()); });
router.get('/stress/network-collapse', requireRole('risk_committee'), (req, res) => { res.json(stress.getNetworkCollapse()); });

router.post('/stress/run', requireRole('super_admin'), (req, res) => {
    const { scenario_id, car_pct, revenue_usd } = req.body;
    res.json(stress.runStressTest(scenario_id || 'ES-01', car_pct, revenue_usd));
});

// ═══════════════════════════════════════════════════════════════════
// ECONOMIC & CAPITAL RISK — /econrisk [L3+ admin]
// ═══════════════════════════════════════════════════════════════════

const econRisk = require('../engines/economic-risk-engine');

router.get('/econrisk/framework', requireRole('admin'), (req, res) => { res.json(econRisk.getFullFramework()); });
router.get('/econrisk/revenue-risk', requireRole('admin'), (req, res) => { res.json(econRisk.getRevenueRisk()); });
router.get('/econrisk/tenant-credit', requireRole('admin'), (req, res) => { res.json(econRisk.getTenantCredit()); });
router.get('/econrisk/cost-allocation', requireRole('admin'), (req, res) => { res.json(econRisk.getCostAllocation()); });
router.get('/econrisk/token-economics', requireRole('admin'), (req, res) => { res.json(econRisk.getTokenEconomics()); });
router.get('/econrisk/trust-feedback', requireRole('admin'), (req, res) => { res.json(econRisk.getFinancialTrustFeedback()); });

router.post('/econrisk/score-tenant', requireRole('risk_committee'), (req, res) => {
    const { trust_score, payment_pct, settlement_pct, years, external_credit, engagement } = req.body;
    res.json(econRisk.scoreTenant(trust_score, payment_pct, settlement_pct, years, external_credit, engagement));
});

// ═══════════════════════════════════════════════════════════════════
// CROSS-TENANT CONTAGION — /contagion [L4+ risk_committee]
// ═══════════════════════════════════════════════════════════════════

const contagion = require('../engines/cross-tenant-contagion-engine');

router.get('/contagion/framework', requireRole('risk_committee'), (req, res) => { res.json(contagion.getFullFramework()); });
router.get('/contagion/trust-model', requireRole('risk_committee'), (req, res) => { res.json(contagion.getTrustContagion()); });
router.get('/contagion/route-risk', requireRole('risk_committee'), (req, res) => { res.json(contagion.getSharedRouteRisk()); });
router.get('/contagion/anchoring-impact', requireRole('risk_committee'), (req, res) => { res.json(contagion.getAnchoringCrossImpact()); });
router.get('/contagion/circuit-breakers', requireRole('risk_committee'), (req, res) => { res.json(contagion.getContagionBreakers()); });

router.post('/contagion/simulate', requireRole('super_admin'), (req, res) => {
    const { source_trust_drop, connections } = req.body;
    res.json(contagion.simulateContagion(source_trust_drop, connections));
});

module.exports = router;
