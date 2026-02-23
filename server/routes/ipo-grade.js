/**
 * IPO-Grade Routes v1.0
 * External Oversight + Real-Time CAR + Decentralization KPI + Legal Entity
 * Mount: /api/oversight, /api/car, /api/decentralization, /api/legal
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth');

router.use(authMiddleware);

const oversight = require('../engines/external-oversight-engine');
const car = require('../engines/realtime-car-engine');
const decentral = require('../engines/decentralization-kpi-engine');
const legal = require('../engines/legal-entity-engine');

// ═══════════════════════════════════════════════════════════════════
// EXTERNAL OVERSIGHT — /oversight
// ═══════════════════════════════════════════════════════════════════

router.get('/oversight/framework', (req, res) => { res.json(oversight.getFullFramework()); });
router.get('/oversight/observers', (req, res) => { res.json(oversight.getObserverRoles()); });
router.get('/oversight/audit-api', (req, res) => { res.json(oversight.getAuditAPI()); });
router.get('/oversight/transparency', (req, res) => { res.json(oversight.getTransparencyReports()); });

router.post('/oversight/generate-report', (req, res) => {
    const { period, metrics } = req.body;
    res.json(oversight.generateTransparencyReport(period || 'Q1-2026', metrics || {}));
});

// ═══════════════════════════════════════════════════════════════════
// REAL-TIME CAR — /car
// ═══════════════════════════════════════════════════════════════════

router.get('/car/dashboard', (req, res) => { res.json(car.getFullDashboard()); });
router.get('/car/live', (req, res) => { res.json(car.calculateLiveCAR()); });
router.get('/car/thresholds', (req, res) => { res.json(car.getCARThresholds()); });
router.get('/car/buffers', (req, res) => { res.json(car.getDynamicBuffers()); });
router.get('/car/capital-call', (req, res) => { res.json(car.getCapitalCallMechanism()); });
router.get('/car/exposure', (req, res) => { res.json(car.getExposureTracking()); });

router.post('/car/update-exposure', (req, res) => {
    res.json(car.updateExposure(req.body));
});

// ═══════════════════════════════════════════════════════════════════
// DECENTRALIZATION KPI — /decentralization
// ═══════════════════════════════════════════════════════════════════

router.get('/decentralization/dashboard', (req, res) => { res.json(decentral.getFullKPIDashboard()); });
router.get('/decentralization/phases', (req, res) => { res.json(decentral.getPhases()); });
router.get('/decentralization/metrics', (req, res) => { res.json(decentral.getMetrics()); });

router.post('/decentralization/nakamoto', (req, res) => {
    const { validators } = req.body;
    if (!validators) return res.status(400).json({ error: 'validators array required' });
    res.json(decentral.calculateNakamotoCoefficient(validators));
});

router.post('/decentralization/diversity', (req, res) => {
    const { validators } = req.body;
    if (!validators) return res.status(400).json({ error: 'validators array required' });
    res.json(decentral.calculateDiversityIndex(validators));
});

router.post('/decentralization/geographic', (req, res) => {
    const { validators } = req.body;
    if (!validators) return res.status(400).json({ error: 'validators array required' });
    res.json(decentral.calculateGeographicHHI(validators));
});

router.post('/decentralization/score', (req, res) => {
    const { validators } = req.body;
    if (!validators) return res.status(400).json({ error: 'validators array required' });
    res.json(decentral.calculateDecentralizationScore(validators));
});

router.post('/decentralization/phase-readiness', (req, res) => {
    const { validators, current_phase } = req.body;
    if (!validators) return res.status(400).json({ error: 'validators array required' });
    res.json(decentral.assessPhaseReadiness(validators, current_phase || 'permissioned'));
});

// ═══════════════════════════════════════════════════════════════════
// LEGAL ENTITY — /legal
// ═══════════════════════════════════════════════════════════════════

router.get('/legal/architecture', (req, res) => { res.json(legal.getFullArchitecture()); });
router.get('/legal/entities', (req, res) => { res.json(legal.getEntityMap()); });
router.get('/legal/relationships', (req, res) => { res.json(legal.getRelationships()); });
router.get('/legal/regulatory', (req, res) => { res.json(legal.getRegulatoryMap()); });
router.get('/legal/ring-fencing', (req, res) => { res.json(legal.getRingFencingAnalysis()); });
router.get('/legal/ipo-readiness', (req, res) => { res.json(legal.getIPORequirements()); });

router.get('/legal/entity/:name', (req, res) => {
    const entity = legal.getEntityByName(req.params.name);
    if (!entity) return res.status(404).json({ error: 'Entity not found' });
    res.json(entity);
});

// ═══════════════════════════════════════════════════════════════════
// FINANCIAL REPORTING — /finance
// ═══════════════════════════════════════════════════════════════════

const finance = require('../engines/financial-reporting-engine');

router.get('/finance/framework', (req, res) => { res.json(finance.getFullFramework()); });
router.get('/finance/revenue-streams', (req, res) => { res.json(finance.getRevenueStreams()); });
router.get('/finance/liabilities', (req, res) => { res.json(finance.getDeferredLiabilities()); });
router.get('/finance/ifrs-map', (req, res) => { res.json(finance.getIFRSMap()); });
router.get('/finance/statement-structure', (req, res) => { res.json(finance.getStatementStructure()); });

router.post('/finance/recognize-revenue', (req, res) => {
    const { stream_id, contract_value, period_months, months_elapsed } = req.body;
    res.json(finance.recognizeRevenue(stream_id || 'REV-01', contract_value || 60000, period_months || 12, months_elapsed || 6));
});

router.post('/finance/consolidated-pl', (req, res) => {
    const { period, data } = req.body;
    res.json(finance.generateConsolidatedPL(period || 'Q1-2026', data));
});

// ═══════════════════════════════════════════════════════════════════
// TREASURY & LIQUIDITY — /treasury
// ═══════════════════════════════════════════════════════════════════

const treasury = require('../engines/treasury-liquidity-engine');

router.get('/treasury/framework', (req, res) => { res.json(treasury.getFullFramework()); });
router.get('/treasury/lcr-model', (req, res) => { res.json(treasury.getLCRModel()); });
router.get('/treasury/intraday', (req, res) => { res.json(treasury.getIntradayModel()); });
router.get('/treasury/waterfall', (req, res) => { res.json(treasury.getCashWaterfall()); });
router.get('/treasury/investment-policy', (req, res) => { res.json(treasury.getInvestmentPolicy()); });

router.post('/treasury/calculate-lcr', (req, res) => {
    const { hqla, outflows } = req.body;
    res.json(treasury.calculateLCR(hqla, outflows));
});

router.post('/treasury/run-waterfall', (req, res) => {
    const { available_cash, obligations } = req.body;
    res.json(treasury.runCashWaterfall(available_cash, obligations));
});

// ═══════════════════════════════════════════════════════════════════
// REGULATORY SCENARIOS — /regscenario
// ═══════════════════════════════════════════════════════════════════

const regscenario = require('../engines/regulatory-scenario-engine');

router.get('/regscenario/framework', (req, res) => { res.json(regscenario.getFullFramework()); });
router.get('/regscenario/scenarios', (req, res) => { res.json(regscenario.getScenarios()); });
router.get('/regscenario/readiness', (req, res) => { res.json(regscenario.getReadinessScorecard()); });

router.post('/regscenario/simulate', (req, res) => {
    const { scenario_id, current_revenue } = req.body;
    res.json(regscenario.simulateScenario(scenario_id || 'REG-01', current_revenue));
});

// ═══════════════════════════════════════════════════════════════════
// MARKET NARRATIVE — /narrative
// ═══════════════════════════════════════════════════════════════════

const narrative = require('../engines/market-narrative-engine');

router.get('/narrative/full', (req, res) => { res.json(narrative.getFullNarrative()); });
router.get('/narrative/investor-summary', (req, res) => { res.json(narrative.getInvestorSummary()); });
router.get('/narrative/tam', (req, res) => { res.json(narrative.getTAM()); });
router.get('/narrative/network-effects', (req, res) => { res.json(narrative.getNetworkEffects()); });
router.get('/narrative/moat', (req, res) => { res.json(narrative.getMoat()); });
router.get('/narrative/switching-costs', (req, res) => { res.json(narrative.getSwitchingCosts()); });
router.get('/narrative/regulatory-defensibility', (req, res) => { res.json(narrative.getRegulatoryDefensibility()); });
router.get('/narrative/comparables', (req, res) => { res.json(narrative.getComparables()); });

module.exports = router;
