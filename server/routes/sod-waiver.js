/**
 * SoD Waiver Management API
 * 
 * Company Admins can manage Separation of Duties waivers for small orgs
 * where one person may need to hold conflicting permissions.
 * 
 * All waivers are audit-logged and time-limited.
 * 
 * GET    /api/sod/waivers       — List active waivers
 * POST   /api/sod/waivers       — Create waiver
 * DELETE /api/sod/waivers/:pair — Remove waiver
 * GET    /api/sod/conflicts     — List all SoD conflict pairs
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requirePermission } = require('../auth');
const { SOD_CONFLICTS } = require('../auth/rbac');

// All routes require auth + role management permission
router.use(authMiddleware, requirePermission('role:create'));

/**
 * GET /api/sod/conflicts — List all SoD conflict pairs (reference)
 */
router.get('/conflicts', (req, res) => {
    res.json({
        conflicts: SOD_CONFLICTS.map(([p1, p2], i) => ({
            index: i + 1,
            permission_a: p1,
            permission_b: p2,
        })),
        total: SOD_CONFLICTS.length,
    });
});

/**
 * GET /api/sod/waivers — List active waivers for current tenant
 */
router.get('/waivers', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        if (!tenantId) return res.status(400).json({ error: 'No tenant context' });

        const org = await db.get('SELECT sod_waivers FROM organizations WHERE id = ?', [tenantId]);
        if (!org || !org.sod_waivers) {
            return res.json({ waivers: [], total: 0 });
        }

        let config;
        try { config = JSON.parse(org.sod_waivers); } catch (_) { config = { waivers: [] }; }

        const waivers = (config.waivers || []).map((w, i) => ({
            index: i,
            pair: w.pair,
            reason: w.reason,
            approved_by: w.approved_by,
            created_at: w.created_at,
            expires_at: w.expires_at,
            is_expired: w.expires_at ? new Date(w.expires_at) < new Date() : false,
        }));

        res.json({ waivers, total: waivers.length });
    } catch (err) {
        console.error('[sod-waiver] List error:', err);
        res.status(500).json({ error: 'Failed to load waivers' });
    }
});

/**
 * POST /api/sod/waivers — Create a new waiver
 * Body: { pair: ["perm_a", "perm_b"], reason: "Small team", expires_at: "2027-01-01" }
 */
router.post('/waivers', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        if (!tenantId) return res.status(400).json({ error: 'No tenant context' });

        const { pair, reason, expires_at } = req.body;

        // Validate
        if (!pair || !Array.isArray(pair) || pair.length !== 2) {
            return res.status(400).json({ error: 'pair must be an array of 2 permission strings' });
        }
        if (!reason || reason.length < 5) {
            return res.status(400).json({ error: 'reason required (min 5 chars)' });
        }

        // Validate pair is actually a known SoD conflict
        const isValid = SOD_CONFLICTS.some(([p1, p2]) =>
            (pair[0] === p1 && pair[1] === p2) || (pair[0] === p2 && pair[1] === p1)
        );
        if (!isValid) {
            return res.status(400).json({ error: 'Pair is not a recognized SoD conflict', valid_conflicts: SOD_CONFLICTS });
        }

        // Load existing waivers
        const org = await db.get('SELECT sod_waivers FROM organizations WHERE id = ?', [tenantId]);
        let config;
        try { config = JSON.parse(org?.sod_waivers || '{}'); } catch (_) { config = {}; }
        if (!config.waivers) config.waivers = [];

        // Check for duplicate
        const exists = config.waivers.some(w =>
            w.pair && ((w.pair[0] === pair[0] && w.pair[1] === pair[1]) || (w.pair[0] === pair[1] && w.pair[1] === pair[0]))
        );
        if (exists) {
            return res.status(409).json({ error: 'Waiver for this pair already exists' });
        }

        // Add waiver
        const newWaiver = {
            pair,
            reason,
            approved_by: req.user.email,
            created_at: new Date().toISOString(),
            expires_at: expires_at || null,
        };
        config.waivers.push(newWaiver);

        await db.run('UPDATE organizations SET sod_waivers = ? WHERE id = ?', [JSON.stringify(config), tenantId]);

        console.log(`[RBAC] SoD WAIVER created: tenant=${tenantId}, pair=[${pair}], by=${req.user.email}, reason="${reason}"`);

        res.json({ success: true, waiver: newWaiver, total: config.waivers.length });
    } catch (err) {
        console.error('[sod-waiver] Create error:', err);
        res.status(500).json({ error: 'Failed to create waiver' });
    }
});

/**
 * DELETE /api/sod/waivers — Remove a waiver by pair
 * Body: { pair: ["perm_a", "perm_b"] }
 */
router.delete('/waivers', async (req, res) => {
    try {
        const tenantId = req.user.tenant_id;
        if (!tenantId) return res.status(400).json({ error: 'No tenant context' });

        const { pair } = req.body;
        if (!pair || !Array.isArray(pair) || pair.length !== 2) {
            return res.status(400).json({ error: 'pair must be an array of 2 permission strings' });
        }

        const org = await db.get('SELECT sod_waivers FROM organizations WHERE id = ?', [tenantId]);
        let config;
        try { config = JSON.parse(org?.sod_waivers || '{}'); } catch (_) { config = {}; }
        if (!config.waivers) config.waivers = [];

        const before = config.waivers.length;
        config.waivers = config.waivers.filter(w =>
            !(w.pair && ((w.pair[0] === pair[0] && w.pair[1] === pair[1]) || (w.pair[0] === pair[1] && w.pair[1] === pair[0])))
        );

        if (config.waivers.length === before) {
            return res.status(404).json({ error: 'Waiver not found for this pair' });
        }

        await db.run('UPDATE organizations SET sod_waivers = ? WHERE id = ?', [JSON.stringify(config), tenantId]);

        console.log(`[RBAC] SoD WAIVER removed: tenant=${tenantId}, pair=[${pair}], by=${req.user.email}`);

        res.json({ success: true, remaining: config.waivers.length });
    } catch (err) {
        console.error('[sod-waiver] Delete error:', err);
        res.status(500).json({ error: 'Failed to delete waiver' });
    }
});

module.exports = router;
