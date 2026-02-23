/**
 * Constitutional Charter Routes v1.0
 * 3 Charter Documents accessible via API
 * Mount: /api/charter
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth');

router.use(authMiddleware);

const economicCharter = require('../engines/economic-governance-charter');
const networkCharter = require('../engines/network-power-charter');
const crisisConstitution = require('../engines/crisis-constitution');

// ─── GET /all — All 3 charters ─────────────────────────────────
router.get('/all', (req, res) => {
    res.json({
        economic_governance: economicCharter.getCharter(),
        network_power: networkCharter.getCharter(),
        crisis_constitution: crisisConstitution.getConstitution(),
    });
});

// ─── Economic Governance Charter ────────────────────────────────
router.get('/economic', (req, res) => { res.json(economicCharter.getCharter()); });
router.get('/economic/article/:num', (req, res) => { res.json(economicCharter.getArticle(parseInt(req.params.num))); });

router.post('/economic/validate-pricing', (req, res) => {
    const { change_type, increase_pct, notice_days, grandfather_applied } = req.body;
    res.json(economicCharter.validatePricingChange(change_type, { increase_pct, notice_days, grandfather_applied }));
});

router.post('/economic/validate-withdrawal', (req, res) => {
    const { reserve_id, amount, approvers } = req.body;
    res.json(economicCharter.validateWithdrawal(reserve_id, amount, approvers || []));
});

// ─── Network Power Charter ──────────────────────────────────────
router.get('/network', (req, res) => { res.json(networkCharter.getCharter()); });
router.get('/network/article/:num', (req, res) => { res.json(networkCharter.getArticle(parseInt(req.params.num))); });

router.post('/network/validate-slashing', (req, res) => {
    const { offense, current_trust_score } = req.body;
    res.json(networkCharter.validateSlashing(offense, current_trust_score || 100));
});

router.get('/network/decentralization', (req, res) => {
    res.json({ roadmap: networkCharter.getDecentralizationStatus() });
});

// ─── Crisis Constitution ────────────────────────────────────────
router.get('/crisis', (req, res) => { res.json(crisisConstitution.getConstitution()); });
router.get('/crisis/article/:num', (req, res) => { res.json(crisisConstitution.getArticle(parseInt(req.params.num))); });

router.post('/crisis/validate-action', (req, res) => {
    const { level, action, actor } = req.body;
    res.json(crisisConstitution.validateCrisisAction(level, action, actor));
});

router.get('/crisis/drills', (req, res) => { res.json(crisisConstitution.getDrillSchedule()); });
router.get('/crisis/command', (req, res) => { res.json(crisisConstitution.getCommandStructure()); });

// ─── Constitutional RBAC Enforcement ────────────────────────────
const constitutionalRBAC = require('../engines/constitutional-rbac-engine');

// Full governance audit — answers 5 critical questions by code
router.get('/governance-audit', (req, res) => {
    res.json(constitutionalRBAC.runGovernanceAudit());
});

// Check what a role CAN and CANNOT do
router.get('/powers/:role', (req, res) => {
    res.json(constitutionalRBAC.getRolePowers(req.params.role));
});

// Test specific enforcement
router.post('/enforce', (req, res) => {
    const { role, action } = req.body;
    if (!role || !action) return res.status(400).json({ error: 'role and action required' });
    res.json(constitutionalRBAC.enforce(role, action));
});

// 6 critical separations
router.get('/separations', (req, res) => {
    res.json({ separations: constitutionalRBAC.getSeparations(), cross_mapping: constitutionalRBAC.getCrossMapping() });
});

// Domain-specific powers
router.get('/domain/:domain', (req, res) => {
    res.json(constitutionalRBAC.getDomainPowers(req.params.domain));
});

// ─── Governance Safeguards (Anti-Collusion) ─────────────────────
const safeguards = require('../engines/governance-safeguards-engine');

// Full safeguards overview
router.get('/safeguards', (req, res) => {
    res.json(safeguards.getFullSafeguards());
});

// Validate GGC composition
router.post('/safeguards/ggc-composition', (req, res) => {
    const { members } = req.body;
    if (!members || !Array.isArray(members)) return res.status(400).json({ error: 'members array required' });
    res.json(safeguards.validateGGCComposition(members));
});

// Validate GGC vote
router.post('/safeguards/ggc-vote', (req, res) => {
    const { vote_type, total_members, votes_cast, independent_votes, in_favor } = req.body;
    res.json(safeguards.validateGGCVote(vote_type, total_members, votes_cast, independent_votes, in_favor));
});

// Validate dual-key entity separation
router.post('/safeguards/dual-key-check', (req, res) => {
    const { signer1, signer2 } = req.body;
    if (!signer1 || !signer2) return res.status(400).json({ error: 'signer1 and signer2 required' });
    res.json(safeguards.validateDualKeyEntities(signer1, signer2));
});

// Hash-chained audit log
router.post('/safeguards/audit-entry', (req, res) => {
    const { action, actor, details } = req.body;
    res.json(safeguards.createAuditEntry(action, actor || req.user?.id, details || {}));
});

router.post('/safeguards/verify-chain', (req, res) => {
    const { entries } = req.body;
    if (!entries || !Array.isArray(entries)) return res.status(400).json({ error: 'entries array required' });
    res.json(safeguards.verifyAuditChain(entries));
});

// DB access policy
router.get('/safeguards/db-policy', (req, res) => {
    res.json(safeguards.getDBAccessPolicy());
});

module.exports = router;
