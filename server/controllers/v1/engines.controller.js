/**
 * V1 Engines Controller (Phase 7)
 * Admin-only endpoints for engine monitoring.
 */
const express = require('express');
const router = express.Router();
const registry = require('../../engines/registry');
const { success, serviceError } = require('../../lib/response');

// GET /api/v1/engines/health
router.get('/health', async (req, res) => {
    try {
        if (req.user?.role !== 'super_admin') {
            return res.status(403).json({ error: 'Super admin only' });
        }
        const health = registry.healthCheck();
        success(res, health);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/engines/groups
router.get('/groups', async (req, res) => {
    try {
        if (req.user?.role !== 'super_admin') {
            return res.status(403).json({ error: 'Super admin only' });
        }
        success(res, registry.listGroups());
    } catch (e) { serviceError(res, e); }
});

// POST /api/v1/engines/preload
router.post('/preload', async (req, res) => {
    try {
        if (req.user?.role !== 'super_admin') {
            return res.status(403).json({ error: 'Super admin only' });
        }
        const groups = req.body.groups || ['core', 'infrastructure'];
        registry.preload(groups);
        success(res, registry.healthCheck(), { message: 'Preloaded: ' + groups.join(', ') });
    } catch (e) { serviceError(res, e); }
});

module.exports = router;
