/**
 * Coherence Layer Routes v1.1
 * Architecture Coherence + Operational Playbook + Human Governance Stress
 * Mount: /api/coherence, /api/playbook, /api/human-gov
 * 
 * RBAC:
 *   /coherence   → L4+ risk_committee (architecture audit = sensitive system topology)
 *   /playbook    → L4+ risk_committee (drill scenarios, crisis operations)
 *   /human-gov   → L5 super_admin (insider collusion, GGC capture, founder roadmap = HIGHEST sensitivity)
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../auth');
const { asyncHandler: h } = require('../middleware/asyncHandler');

router.use(authMiddleware);

const coherence = require('../engines/architecture-coherence-engine');
const playbook = require('../engines/operational-playbook-engine');
const humanGov = require('../engines/human-governance-stress-engine');

// ═══════════════════════════════════════════════════════════════════
// ARCHITECTURE COHERENCE — /coherence [L4+ risk_committee]
// ═══════════════════════════════════════════════════════════════════

router.get('/coherence/audit', requireRole('risk_committee'), (req, res) => { res.json(coherence.getFullAudit()); });
router.get('/coherence/map', requireRole('risk_committee'), (req, res) => { res.json(coherence.getCoherenceMap()); });
router.get('/coherence/control-interactions', requireRole('risk_committee'), (req, res) => { res.json(coherence.getControlInteractions()); });
router.get('/coherence/dependency-risk', requireRole('risk_committee'), (req, res) => { res.json(coherence.getDependencyRisk()); });
router.get('/coherence/escalation', requireRole('risk_committee'), (req, res) => { res.json(coherence.getEscalationClarity()); });
router.get('/coherence/complexity', requireRole('risk_committee'), (req, res) => { res.json(coherence.getComplexityScore()); });

// ═══════════════════════════════════════════════════════════════════
// OPERATIONAL PLAYBOOK — /playbook [L4+ risk_committee read, L5 evaluate]
// ═══════════════════════════════════════════════════════════════════

router.get('/playbook/full', requireRole('risk_committee'), (req, res) => { res.json(playbook.getFullPlaybook()); });
router.get('/playbook/drills', requireRole('risk_committee'), (req, res) => { res.json(playbook.getDrillScenarios()); });
router.get('/playbook/schedule', requireRole('risk_committee'), (req, res) => { res.json(playbook.getDrillSchedule()); });
router.get('/playbook/post-mortem', requireRole('risk_committee'), (req, res) => { res.json(playbook.getPostMortem()); });

router.get('/playbook/drill/:id', requireRole('risk_committee'), (req, res) => {
    const drill = playbook.getDrill(req.params.id);
    if (!drill) return res.status(404).json({ error: 'Drill not found' });
    res.json(drill);
});

router.post('/playbook/evaluate', requireRole('super_admin'), (req, res) => {
    const { drill_id, results } = req.body;
    res.json(playbook.evaluateDrillResult(drill_id, results));
});

// ═══════════════════════════════════════════════════════════════════
// HUMAN GOVERNANCE STRESS — /human-gov [L5 super_admin ONLY]
// Highest sensitivity: insider collusion routes, GGC capture, founder roadmap
// ═══════════════════════════════════════════════════════════════════

router.get('/human-gov/framework', requireRole('super_admin'), (req, res) => { res.json(humanGov.getFullFramework()); });
router.get('/human-gov/insider-collusion', requireRole('super_admin'), (req, res) => { res.json(humanGov.getInsiderCollusion()); });
router.get('/human-gov/ggc-capture', requireRole('super_admin'), (req, res) => { res.json(humanGov.getGGCCapture()); });
router.get('/human-gov/board-management', requireRole('super_admin'), (req, res) => { res.json(humanGov.getBoardManagement()); });
router.get('/human-gov/founder-roadmap', requireRole('super_admin'), (req, res) => { res.json(humanGov.getFounderRoadmap()); });
router.get('/human-gov/compensation-coi', requireRole('super_admin'), (req, res) => { res.json(humanGov.getCompensationCOI()); });

router.post('/human-gov/assess-founder', requireRole('super_admin'), (req, res) => {
    res.json(humanGov.assessFounderPhase(req.body.current_roles));
});

module.exports = router;
