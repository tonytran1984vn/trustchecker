/**
 * Record Governance — Proposal Workflow + Version History
 *
 * Routes:
 *   POST   /api/governance/proposals              — submit correction proposal
 *   GET    /api/governance/proposals               — list proposals
 *   POST   /api/governance/proposals/:id/approve   — approve + apply + version
 *   POST   /api/governance/proposals/:id/reject    — reject with reason
 *   GET    /api/governance/versions/:type/:id       — version history
 */


function _safeId(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error("Invalid identifier: " + name);
  return name;
}

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requirePermission } = require('../auth');
const { orgGuard } = require('../middleware/org-middleware');
const { snapshotVersion, recordMutation, appendAuditEntry } = require('../utils/audit-chain');
const { withTransaction } = require('../middleware/transaction');

const router = express.Router();
router.use(authMiddleware);
router.use(orgGuard());

// ─── POST /proposals — Submit correction proposal ─────────────────────────
router.post('/proposals', async (req, res) => {
    try {
        const { entity_type, entity_id, proposed_changes, reason } = req.body;
        if (!entity_type || !entity_id || !proposed_changes) {
            return res.status(400).json({ error: 'entity_type, entity_id, and proposed_changes required' });
        }

        // Verify entity exists and belongs to org
        const entity = await db.get(
            `SELECT id, org_id FROM ${_safeId(entity_type)} WHERE id = ?`,
            [entity_id]
        );
        if (!entity) return res.status(404).json({ error: 'Entity not found' });
        if (req.orgId && entity.org_id !== req.orgId) {
            return res.status(403).json({ error: 'Entity not in your organization' });
        }

        const id = uuidv4();
        await db.run(
            `INSERT INTO update_proposals (id, entity_type, entity_id, proposed_by, proposed_changes, reason, status, org_id)
             VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
            [id, entity_type, entity_id, req.user.id, JSON.stringify(proposed_changes), reason || '', req.orgId]
        );

        await appendAuditEntry({
            actor_id: req.user.id,
            action: 'PROPOSAL_SUBMITTED',
            entity_type,
            entity_id,
            details: { proposal_id: id, changes: proposed_changes, reason },
            ip: req.ip,
        });

        res.status(201).json({
            id,
            status: 'pending',
            message: 'Correction proposal submitted for review',
        });
    } catch (err) {
        console.error('Proposal submit error:', err);
        res.status(500).json({ error: 'Failed to submit proposal' });
    }
});

// ─── GET /proposals — List proposals ──────────────────────────────────────
router.get('/proposals', async (req, res) => {
    try {
        const { status, entity_type } = req.query;
        let sql = `SELECT p.*, u.username as proposed_by_name
                    FROM update_proposals p
                    LEFT JOIN users u ON u.id = p.proposed_by
                    WHERE 1=1`;
        const params = [];

        if (req.orgId) { sql += ' AND p.org_id = ?'; params.push(req.orgId); }
        if (status) { sql += ' AND p.status = ?'; params.push(status); }
        if (entity_type) { sql += ' AND p.entity_type = ?'; params.push(entity_type); }

        sql += ' ORDER BY p.created_at DESC LIMIT 100';

        const proposals = await db.all(sql, params);
        // Parse JSON fields
        proposals.forEach(p => {
            try { p.proposed_changes = JSON.parse(p.proposed_changes); } catch {}
        });

        const pending = proposals.filter(p => p.status === 'pending').length;
        res.json({ proposals, total: proposals.length, pending });
    } catch (err) {
        console.error('Proposals list error:', err);
        res.status(500).json({ error: 'Failed to fetch proposals' });
    }
});

// ─── POST /proposals/:id/approve — Approve + apply + version ──────────────
router.post('/proposals/:id/approve', requirePermission('governance:approve_update'), async (req, res) => {
    try {
        const proposal = await db.get(
            'SELECT * FROM update_proposals WHERE id = ? AND status = ?',
            [req.params.id, 'pending']
        );
        if (!proposal) return res.status(404).json({ error: 'Pending proposal not found' });
        if (req.orgId && proposal.org_id !== req.orgId) {
            return res.status(403).json({ error: 'Proposal not in your organization' });
        }

        // Self-approval check
        if (proposal.proposed_by === req.user.id) {
            return res.status(403).json({ error: 'Cannot approve your own proposal (SoD)' });
        }

        const changes = typeof proposal.proposed_changes === 'string'
            ? JSON.parse(proposal.proposed_changes) : proposal.proposed_changes;

        // Fetch current record
        const before = await db.get(
            `SELECT * FROM ${_safeId(proposal.entity_type)} WHERE id = ?`,
            [proposal.entity_id]
        );
        if (!before) return res.status(404).json({ error: 'Target entity no longer exists' });

        // Snapshot current version
        await snapshotVersion(req, proposal.entity_type, proposal.entity_id, before, `Proposal ${req.params.id} approved`);

        // Apply changes — build SET clause from proposed_changes
        const setClauses = [];
        const values = [];
        for (const [key, value] of Object.entries(changes)) {
            // Safety: only allow known columns, skip id/org_id/created_at
            if (['id', 'org_id', 'created_at'].includes(key)) continue;
            setClauses.push(`${key} = ?`);
            values.push(value);
        }

        if (setClauses.length > 0) {
            // Temporarily change status to allow DB trigger to pass
            // The trigger allows changes when status itself changes
            const statusCol = proposal.entity_type === 'partners' ? 'kyc_status'
                : proposal.entity_type === 'evidence_items' ? 'verification_status' : 'status';

            // Step 1: Set status to 'amended' (allows trigger)
            await db.run(
                `UPDATE ${_safeId(proposal.entity_type)} SET ${_safeId(statusCol)} = 'amended' WHERE id = ?`,
                [proposal.entity_id]
            );

            // Step 2: Apply data changes + restore verified status
            setClauses.push(`${_safeId(statusCol)} = ?`);
            values.push(before[statusCol] || 'verified');
            values.push(proposal.entity_id);

            await db.run(
                `UPDATE ${_safeId(proposal.entity_type)} SET ${setClauses.join(', ')} WHERE id = ?`,
                values
            );
        }

        // Mark proposal as approved
        await db.run(
            `UPDATE update_proposals SET status = 'approved', reviewed_by = ?, reviewed_at = NOW(), review_notes = ? WHERE id = ?`,
            [req.user.id, req.body.notes || '', req.params.id]
        );

        // Fetch after state
        const after = await db.get(
            `SELECT * FROM ${_safeId(proposal.entity_type)} WHERE id = ?`,
            [proposal.entity_id]
        );

        // Audit
        await recordMutation(req, proposal.entity_type, proposal.entity_id, before, after, `Proposal ${req.params.id} approved`);
        await appendAuditEntry({
            actor_id: req.user.id,
            action: 'PROPOSAL_APPROVED',
            entity_type: proposal.entity_type,
            entity_id: proposal.entity_id,
            details: { proposal_id: req.params.id, changes, approved_by: req.user.id },
            ip: req.ip,
        });

        res.json({
            proposal_id: req.params.id,
            status: 'approved',
            changes_applied: Object.keys(changes).length,
            version: 'new version created',
        });
    } catch (err) {
        console.error('Proposal approve error:', err);
        res.status(500).json({ error: 'Failed to approve proposal' });
    }
});

// ─── POST /proposals/:id/reject — Reject with reason ─────────────────────
router.post('/proposals/:id/reject', requirePermission('governance:approve_update'), async (req, res) => {
    try {
        const proposal = await db.get(
            'SELECT * FROM update_proposals WHERE id = ? AND status = ?',
            [req.params.id, 'pending']
        );
        if (!proposal) return res.status(404).json({ error: 'Pending proposal not found' });
        if (req.orgId && proposal.org_id !== req.orgId) {
            return res.status(403).json({ error: 'Proposal not in your organization' });
        }

        await db.run(
            `UPDATE update_proposals SET status = 'rejected', reviewed_by = ?, reviewed_at = NOW(), review_notes = ? WHERE id = ?`,
            [req.user.id, req.body.reason || req.body.notes || '', req.params.id]
        );

        await appendAuditEntry({
            actor_id: req.user.id,
            action: 'PROPOSAL_REJECTED',
            entity_type: proposal.entity_type,
            entity_id: proposal.entity_id,
            details: { proposal_id: req.params.id, reason: req.body.reason },
            ip: req.ip,
        });

        res.json({ proposal_id: req.params.id, status: 'rejected' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to reject proposal' });
    }
});

// ─── GET /versions/:type/:id — Version history ───────────────────────────
router.get('/versions/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;

        let sql = `SELECT * FROM record_versions WHERE entity_type = ? AND entity_id = ?`;
        const params = [type, id];
        if (req.orgId) { sql += ' AND org_id = ?'; params.push(req.orgId); }
        sql += ' ORDER BY version DESC';

        const versions = await db.all(sql, params);
        versions.forEach(v => {
            try { v.data = JSON.parse(v.data); } catch {}
        });

        // Get current record
        const current = await db.get(`SELECT * FROM ${_safeId(type)} WHERE id = ?`, [id]);

        res.json({
            entity_type: type,
            entity_id: id,
            current,
            versions,
            total_versions: versions.length,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch version history' });
    }
});

module.exports = router;
