/**
 * Audit Routes — Audit chain verification endpoint
 * Mount: /api/audit
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requireOrgAdmin } = require('../auth');
const { verifyChain, appendAuditEntry } = require('../utils/audit-chain');
const db = require('../db');

router.use(authMiddleware);

// ─── GET /verify-chain — Verify audit log hash chain integrity ──────────────
// Only org admins (or platform admins) can verify
router.get('/verify-chain', requireOrgAdmin(), async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 1000);
        const result = await verifyChain(limit);

        // Log the verification itself
        await appendAuditEntry({
            actor_id: req.user.id,
            action: 'AUDIT_CHAIN_VERIFIED',
            entity_type: 'system',
            entity_id: 'audit_chain',
            details: { entries_checked: result.entries_checked, valid: result.valid },
            ip: req.ip || '',
        });

        res.json({
            ...result,
            verified_by: req.user.email,
            verified_at: new Date().toISOString(),
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /stats — Audit log statistics ──────────────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const orgId = req.user?.org_id || req.user?.orgId;
        const orgWhere = orgId ? ' WHERE org_id = ?' : '';
        const orgAnd = orgId ? ' AND org_id = ?' : '';
        const orgParams = orgId ? [orgId] : [];
        const total = await db.get(`SELECT COUNT(*) as count FROM audit_log${orgWhere}`, orgParams);
        let hashed = { count: 0 };
        try {
            hashed = await db.get(
                `SELECT COUNT(*) as count FROM audit_log WHERE entry_hash IS NOT NULL${orgAnd}`,
                orgParams
            );
        } catch (_) {
            /* entry_hash column may not exist */
        }
        const recent = await db.all(
            `SELECT action, COUNT(*) as count FROM audit_log${orgWhere} GROUP BY action ORDER BY count DESC LIMIT 20`,
            orgParams
        );

        res.json({
            total_entries: total?.count || 0,
            total: total?.count || 0,
            hashed_entries: hashed?.count || 0,
            hash_coverage: total?.count > 0 ? Math.round((hashed?.count / total?.count) * 100) : 0,
            top_actions: recent,
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
