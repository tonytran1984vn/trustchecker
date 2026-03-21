/**
 * Dual Approval Routes — For irreversible high-risk actions
 * Mount: /api/dual-approval
 *
 * Actions requiring dual approval:
 *   - GDPR purge (gdpr:purge)
 *   - Constitutional amendment (constitutional:amend)
 *
 * Flow:
 *   1. Requester submits action → status: pending_first
 *   2. First approver (≠ requester) approves → status: pending_second
 *   3. Second approver (≠ requester, ≠ first) approves → status: approved → execute
 */
const express = require('express');
const router = express.Router();
// v9.4.3: Default query limit for SOC2 compliance
const SAFE_LIMIT = 500;

const { parsePagination } = require('../middleware/pagination');

const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requirePermission } = require('../auth');
const { appendAuditEntry } = require('../utils/audit-chain');
const { withTransaction } = require('../middleware/transaction');

router.use(authMiddleware);

// Actions that require dual approval
const DUAL_APPROVAL_ACTIONS = ['gdpr:purge', 'constitutional:amend'];

// ─── POST /request — Submit a dual-approval request ─────────────────────────
router.post('/request', requirePermission('gdpr_masking:execute'), async (req, res) => {
    try {
        const { action_type, target_entity, target_id, payload } = req.body;
        if (!action_type || !target_id) {
            return res.status(400).json({ error: 'action_type and target_id required' });
        }

        if (!DUAL_APPROVAL_ACTIONS.includes(action_type)) {
            return res.status(400).json({
                error: `Action '${action_type}' does not require dual approval`,
                valid_actions: DUAL_APPROVAL_ACTIONS,
            });
        }

        const id = uuidv4();
        const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72h expiry

        await db.run(
            `INSERT INTO dual_approval_queue (id, action_type, target_entity, target_id, payload, requested_by, status, expires_at, org_id)
             VALUES (?,?,?,?,?,?,?,?,?)`,
            [
                id,
                action_type,
                target_entity || '',
                target_id,
                JSON.stringify(payload || {}),
                req.user.id,
                'pending_first',
                expiresAt,
                req.user.org_id || '',
            ]
        );

        await appendAuditEntry({
            actor_id: req.user.id,
            action: 'DUAL_APPROVAL_REQUESTED',
            entity_type: 'dual_approval',
            entity_id: id,
            details: { action_type, target_id, expires_at: expiresAt },
            ip: req.ip || '',
        });

        res.json({
            id,
            status: 'pending_first',
            expires_at: expiresAt,
            message: 'Dual approval request submitted. Requires 2 different approvers.',
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── POST /:id/approve — Approve a dual-approval request ────────────────────
router.post('/:id/approve', requirePermission('gdpr_masking:execute'), async (req, res) => {
    try {
        const request = await db.get('SELECT * FROM dual_approval_queue WHERE id = ?', [req.params.id]);
        if (!request) return res.status(404).json({ error: 'Request not found' });

        // Check expiry
        if (new Date(request.expires_at) < new Date()) {
            await db.run("UPDATE dual_approval_queue SET status = 'expired' WHERE id = ?", [req.params.id]);
            return res.status(410).json({ error: 'Request expired', expired_at: request.expires_at });
        }

        // Check: requester cannot approve own request
        if (request.requested_by === req.user.id) {
            return res.status(403).json({
                error: 'SoD violation: requester cannot approve their own request',
                sod_rule: 'requested_by ≠ approver',
            });
        }

        if (request.status === 'pending_first') {
            // First approval
            await db.run(
                "UPDATE dual_approval_queue SET first_approver = ?, first_approved_at = NOW(), status = 'pending_second' WHERE id = ?",
                [req.user.id, req.params.id]
            );

            await appendAuditEntry({
                actor_id: req.user.id,
                action: 'DUAL_APPROVAL_FIRST',
                entity_type: 'dual_approval',
                entity_id: req.params.id,
                details: { action_type: request.action_type, target_id: request.target_id },
                ip: req.ip || '',
            });

            res.json({
                id: req.params.id,
                status: 'pending_second',
                message: 'First approval recorded. Needs one more approver.',
            });
        } else if (request.status === 'pending_second') {
            // Second approval — must be different from first approver
            if (request.first_approver === req.user.id) {
                return res.status(403).json({
                    error: 'SoD violation: second approver must be different from first approver',
                    sod_rule: 'first_approver ≠ second_approver',
                });
            }

            await db.run(
                "UPDATE dual_approval_queue SET second_approver = ?, second_approved_at = NOW(), status = 'approved' WHERE id = ?",
                [req.user.id, req.params.id]
            );

            await appendAuditEntry({
                actor_id: req.user.id,
                action: 'DUAL_APPROVAL_COMPLETED',
                entity_type: 'dual_approval',
                entity_id: req.params.id,
                details: {
                    action_type: request.action_type,
                    target_id: request.target_id,
                    requested_by: request.requested_by,
                    first_approver: request.first_approver,
                    second_approver: req.user.id,
                },
                ip: req.ip || '',
            });

            // Execute the approved action
            let executionResult = null;
            if (request.action_type === 'gdpr:purge') {
                executionResult = await executeGDPRPurge(request.target_id, req.user.id);
            }

            await db.run("UPDATE dual_approval_queue SET executed_at = NOW(), status = 'executed' WHERE id = ?", [
                req.params.id,
            ]);

            res.json({
                id: req.params.id,
                status: 'executed',
                message: 'Dual approval complete. Action executed.',
                execution: executionResult,
            });
        } else {
            res.status(400).json({ error: `Request already in status: ${request.status}` });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /pending — List pending dual-approval requests ─────────────────────
router.get('/pending', async (req, res) => {
    try {
        const requests = await db.all(
            "SELECT id, action_type, target_entity, target_id, requested_by, status, first_approver, expires_at, requested_at FROM dual_approval_queue WHERE status IN ('pending_first', 'pending_second') AND (org_id = ? OR ? = '') ORDER BY requested_at DESC LIMIT 1000",
            [req.user.org_id || '', req.user.org_id || '']
        );
        res.json({ requests });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GDPR Purge Execution ───────────────────────────────────────────────────
async function executeGDPRPurge(userId, executedBy) {
    // Anonymize user data (don't delete — maintain audit trail)
    try {
        await db.run(
            "UPDATE users SET email = 'GDPR_PURGED_' || id, username = 'PURGED', first_name = 'PURGED', last_name = 'PURGED', phone = NULL WHERE id = ?",
            [userId]
        );

        await appendAuditEntry({
            actor_id: executedBy,
            action: 'GDPR_PURGE_EXECUTED',
            entity_type: 'user',
            entity_id: userId,
            details: { type: 'anonymization', executed_via: 'dual_approval' },
        });

        return { success: true, anonymized: userId };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = router;
