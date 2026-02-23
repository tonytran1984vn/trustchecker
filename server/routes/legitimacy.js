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
const { authMiddleware, requireRole } = require('../auth');
const { asyncHandler: h } = require('../middleware/asyncHandler');

router.use(authMiddleware);

const econ = require('../engines/economic-logic-engine');
const forensic = require('../engines/forensic-logic-engine');
const jurisLogic = require('../engines/jurisdiction-logic-engine');

// ═══════════════════════════════════════════════════════════════════
// ECONOMIC LOGIC — /economic-logic [L3+ admin]
// ═══════════════════════════════════════════════════════════════════

router.get('/economic-logic/framework', requireRole('admin'), (req, res) => { res.json(econ.getFullFramework()); });
router.get('/economic-logic/mechanism-design', requireRole('admin'), (req, res) => { res.json(econ.getMechanismDesign()); });
router.get('/economic-logic/game-theory', requireRole('admin'), (req, res) => { res.json(econ.getGameTheory()); });
router.get('/economic-logic/sustainability', requireRole('admin'), (req, res) => { res.json(econ.getSustainability()); });
router.get('/economic-logic/value-fairness', requireRole('admin'), (req, res) => { res.json(econ.getValueFairness()); });

router.post('/economic-logic/analyze-incentive', requireRole('risk_committee'), (req, res) => {
    const { participant_type, stake_usd, detection_pct, cheat_gain_usd } = req.body;
    res.json(econ.analyzeIncentive(participant_type, stake_usd, detection_pct, cheat_gain_usd));
});

// ═══════════════════════════════════════════════════════════════════
// FORENSIC LOGIC — /forensic [L4+ risk_committee]
// ═══════════════════════════════════════════════════════════════════

router.get('/forensic/framework', requireRole('risk_committee'), (req, res) => { res.json(forensic.getFullFramework()); });
router.get('/forensic/evidence-chain', requireRole('risk_committee'), (req, res) => { res.json(forensic.getEvidenceChain()); });
router.get('/forensic/investigation', requireRole('risk_committee'), (req, res) => { res.json(forensic.getInvestigationProtocol()); });
router.get('/forensic/tamper-detection', requireRole('risk_committee'), (req, res) => { res.json(forensic.getTamperDetection()); });
router.get('/forensic/regulatory-evidence', requireRole('risk_committee'), (req, res) => { res.json(forensic.getRegulatoryEvidence()); });
router.get('/forensic/dispute', requireRole('risk_committee'), (req, res) => { res.json(forensic.getDisputeForensics()); });

router.post('/forensic/verify-chain', requireRole('super_admin'), (req, res) => {
    res.json(forensic.verifyChainIntegrity(req.body.records));
});

// ═══════════════════════════════════════════════════════════════════
// JURISDICTION LOGIC — /jurisdiction-logic [L3+ admin]
// ═══════════════════════════════════════════════════════════════════

router.get('/jurisdiction-logic/framework', requireRole('admin'), (req, res) => { res.json(jurisLogic.getFullFramework()); });
router.get('/jurisdiction-logic/conflicts', requireRole('admin'), (req, res) => { res.json(jurisLogic.getConflictResolution()); });
router.get('/jurisdiction-logic/arbitrage-prevention', requireRole('admin'), (req, res) => { res.json(jurisLogic.getArbitragePrevention()); });
router.get('/jurisdiction-logic/liability', requireRole('admin'), (req, res) => { res.json(jurisLogic.getLiabilityMap()); });
router.get('/jurisdiction-logic/governing-law', requireRole('admin'), (req, res) => { res.json(jurisLogic.getGoverningLaw()); });
router.get('/jurisdiction-logic/enforcement', requireRole('admin'), (req, res) => { res.json(jurisLogic.getCrossBorderEnforcement()); });

router.get('/jurisdiction-logic/conflict/:id', requireRole('admin'), (req, res) => {
    const conflict = jurisLogic.resolveConflict(req.params.id);
    if (conflict.error) return res.status(404).json(conflict);
    res.json(conflict);
});

module.exports = router;
