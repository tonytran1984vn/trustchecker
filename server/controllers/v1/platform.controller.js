/**
 * V1 Platform Controller
 * Feature flags, billing, platform stats (super_admin only).
 */
const express = require('express');
const router = express.Router();
const platformService = require('../../services/platform.service');
const { success, serviceError } = require('../../lib/response');

// GET /api/v1/platform/features
router.get('/features', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const flags = await platformService.getFeatureFlags(orgId);
        success(res, flags);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/platform/stats (super_admin only)
router.get('/stats', async (req, res) => {
    try {
        if (req.user?.role !== 'super_admin') {
            return res.status(403).json({ error: 'Super admin only' });
        }
        const stats = await platformService.getPlatformStats();
        success(res, stats);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/platform/billing
router.get('/billing', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const billing = await platformService.getBillingInfo(orgId);
        success(res, billing);
    } catch (e) { serviceError(res, e); }
});

module.exports = router;
