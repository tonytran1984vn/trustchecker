/**
 * Legitimacy Layer Routes v1.1
 * Economic Logic + Forensic Logic + Jurisdiction Logic
 * Mount: /api/economic-logic, /api/forensic, /api/jurisdiction-logic
 *
 * RBAC:
 *   /economic-logic   → L3+ admin (business/operational insight)
 *   /forensic         → L4+ risk_committee (investigation data, evidence chain)
 *   /jurisdiction-logic → L3+ admin (compliance visibility)
 *   POST actions       → L4+ risk_committee (analysis requires elevated access)
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole, requireOrgAdmin } = require('../auth');
const { asyncHandler: h } = require('../middleware/asyncHandler');

router.use(authMiddleware);

const econ = require('../engines/economics-engine').economicLogic;
const forensic = require('../engines/legal-entity-module').forensicLogic;
const jurisLogic = require('../engines/regulatory-engine').jurisdictionLogic;
const { withTransaction } = require('../middleware/transaction');

// ═══════════════════════════════════════════════════════════════════
// ECONOMIC LOGIC — /economic-logic [L3+ admin]
// ═══════════════════════════════════════════════════════════════════

router.get('/economic-logic/framework', requireOrgAdmin(), (req, res) => {
    res.json(econ.getFullFramework());
});
router.get('/economic-logic/mechanism-design', requireOrgAdmin(), (req, res) => {
    res.json(econ.getMechanismDesign());
});
router.get('/economic-logic/game-theory', requireOrgAdmin(), (req, res) => {
    res.json(econ.getGameTheory());
});
router.get('/economic-logic/sustainability', requireOrgAdmin(), (req, res) => {
    res.json(econ.getSustainability());
});
router.get('/economic-logic/value-fairness', requireOrgAdmin(), (req, res) => {
    res.json(econ.getValueFairness());
});

router.post('/economic-logic/analyze-incentive', requireRole('risk_committee'), (req, res) => {
    const { participant_type, stake_usd, detection_pct, cheat_gain_usd } = req.body;
    res.json(econ.analyzeIncentive(participant_type, stake_usd, detection_pct, cheat_gain_usd));
});

// ═══════════════════════════════════════════════════════════════════
// FORENSIC LOGIC — /forensic [L4+ risk_committee]
// ═══════════════════════════════════════════════════════════════════

router.get('/forensic/framework', requireRole('risk_committee'), (req, res) => {
    res.json(forensic.getFullFramework());
});
router.get('/forensic/evidence-chain', requireRole('risk_committee'), (req, res) => {
    res.json(forensic.getEvidenceChain());
});
router.get('/forensic/investigation', requireRole('risk_committee'), (req, res) => {
    res.json(forensic.getInvestigationProtocol());
});
router.get('/forensic/tamper-detection', requireRole('risk_committee'), (req, res) => {
    res.json(forensic.getTamperDetection());
});
router.get('/forensic/regulatory-evidence', requireRole('risk_committee'), (req, res) => {
    res.json(forensic.getRegulatoryEvidence());
});
router.get('/forensic/dispute', requireRole('risk_committee'), (req, res) => {
    res.json(forensic.getDisputeForensics());
});

router.post('/forensic/verify-chain', requireRole('super_admin'), (req, res) => {
    res.json(forensic.verifyChainIntegrity(req.body.records));
});

// ═══════════════════════════════════════════════════════════════════
// JURISDICTION LOGIC — /jurisdiction-logic [L3+ admin]
// ═══════════════════════════════════════════════════════════════════

router.get('/jurisdiction-logic/framework', requireOrgAdmin(), (req, res) => {
    res.json(jurisLogic.getFullFramework());
});
router.get('/jurisdiction-logic/conflicts', requireOrgAdmin(), (req, res) => {
    res.json(jurisLogic.getConflictResolution());
});
router.get('/jurisdiction-logic/arbitrage-prevention', requireOrgAdmin(), (req, res) => {
    res.json(jurisLogic.getArbitragePrevention());
});
router.get('/jurisdiction-logic/liability', requireOrgAdmin(), (req, res) => {
    res.json(jurisLogic.getLiabilityMap());
});
router.get('/jurisdiction-logic/governing-law', requireOrgAdmin(), (req, res) => {
    res.json(jurisLogic.getGoverningLaw());
});
router.get('/jurisdiction-logic/enforcement', requireOrgAdmin(), (req, res) => {
    res.json(jurisLogic.getCrossBorderEnforcement());
});

router.get('/jurisdiction-logic/conflict/:id', requireOrgAdmin(), (req, res) => {
    const conflict = jurisLogic.resolveConflict(req.params.id);
    if (conflict.error) return res.status(404).json(conflict);
    res.json(conflict);
});

module.exports = router;
