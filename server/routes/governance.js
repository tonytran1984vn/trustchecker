/**
 * Governance Routes — DAO Advisory, Proposals, Multi-Sig
 * Endpoints: 6 | Mount: /api/governance
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requirePermission } = require('../auth');
const governance = require('../engines/governance-engine');
const { v4: uuidv4 } = require('uuid');
router.use(authMiddleware);

const init = async () => {
    try {
        await db.exec(`
    CREATE TABLE IF NOT EXISTS governance_proposals (id TEXT PRIMARY KEY, proposal_id TEXT UNIQUE NOT NULL, type TEXT, title TEXT, description TEXT, proposed_by TEXT, status TEXT DEFAULT 'open', voting TEXT DEFAULT '{}', evidence TEXT DEFAULT '[]', hash TEXT, created_at DATETIME DEFAULT (datetime('now')));
`);
    } catch (e) { }
};
init();

// POST /proposals — Create governance proposal
router.post('/proposals', requirePermission('admin:manage'), async (req, res) => {
    try {
        const result = governance.createProposal({ ...req.body, proposed_by: req.user?.id || 'system' });
        if (result.error) return res.status(400).json(result);
        await db.prepare('INSERT INTO governance_proposals (id,proposal_id,type,title,description,proposed_by,voting,hash) VALUES (?,?,?,?,?,?,?,?)')
            .run(uuidv4(), result.proposal_id, req.body.type, result.title, result.description, req.user?.id, JSON.stringify(result.voting), result.hash);
        res.status(201).json(result);
    } catch (err) { res.status(500).json({ error: 'Proposal creation failed' }); }
});

// POST /proposals/:id/vote — Cast vote
router.post('/proposals/:id/vote', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM governance_proposals WHERE proposal_id = ?').get(req.params.id);
        if (!row) return res.status(404).json({ error: 'Proposal not found' });
        const proposal = { ...row, voting: JSON.parse(row.voting || '{}'), type: { key: row.type, ...governance.getProposalTypes()[row.type] } };
        const result = governance.castVote(proposal, { voter_id: req.user?.id, role: req.body.role || 'platform_admin', vote: req.body.vote, reason: req.body.reason });
        if (result.error) return res.status(400).json(result);
        await db.prepare('UPDATE governance_proposals SET status = ?, voting = ? WHERE proposal_id = ?')
            .run(result.status, JSON.stringify(result.voting), req.params.id);
        res.json(result);
    } catch (err) { res.status(500).json({ error: 'Voting failed' }); }
});

// GET /proposals — List proposals
router.get('/proposals', async (req, res) => {
    try {
        const rows = await db.prepare('SELECT * FROM governance_proposals ORDER BY created_at DESC LIMIT 20').all();
        const proposals = rows.map(r => ({ ...r, voting: JSON.parse(r.voting || '{}') }));
        res.json(governance.getGovernanceState(proposals));
    } catch (err) { res.status(500).json({ error: 'Proposals query failed' }); }
});

// POST /multi-sig/verify — Verify multi-sig
router.post('/multi-sig/verify', (req, res) => {
    try { res.json(governance.verifyMultiSig(req.body.signatures || [], req.body.required || 3)); }
    catch (err) { res.status(500).json({ error: 'Multi-sig verification failed' }); }
});

// GET /roles — Governance roles + proposal types
router.get('/roles', (req, res) => { res.json({ roles: governance.getRoles(), proposal_types: governance.getProposalTypes() }); });

// GET /dashboard — Governance overview
router.get('/dashboard', async (req, res) => {
    try {
        const rows = await db.prepare('SELECT * FROM governance_proposals ORDER BY created_at DESC LIMIT 20').all();
        const proposals = rows.map(r => ({ ...r, voting: JSON.parse(r.voting || '{}') }));
        res.json(governance.getGovernanceState(proposals));
    } catch (err) { res.status(500).json({ error: 'Dashboard failed' }); }
});

module.exports = router;
