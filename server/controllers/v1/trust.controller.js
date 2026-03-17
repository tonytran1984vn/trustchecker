/**
 * V1 Trust Controller
 * Trust score calculation, dashboard, and history.
 */
const express = require('express');
const router = express.Router();
const trustService = require('../../services/trust.service');
const { success, serviceError } = require('../../lib/response');

// GET /api/v1/trust/dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const dashboard = await trustService.getDashboard(orgId);
        success(res, dashboard);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/trust/score/:productId
router.get('/score/:productId', async (req, res) => {
    try {
        const score = await trustService.calculateScore(req.params.productId);
        success(res, score);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/trust/org
router.get('/org', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const score = await trustService.getOrgTrustScore(orgId);
        success(res, score);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/trust/history/:productId
router.get('/history/:productId', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const history = await trustService.getHistory(req.params.productId, orgId);
        success(res, history);
    } catch (e) { serviceError(res, e); }
});

module.exports = router;
