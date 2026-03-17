/**
 * V1 Risk Controller
 * Risk graph, anomalies, fraud alerts.
 */
const express = require('express');
const router = express.Router();
const riskService = require('../../services/risk.service');
const { success, paginated, serviceError } = require('../../lib/response');

// GET /api/v1/risk/graph
router.get('/graph', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const graph = await riskService.getRiskGraph(orgId);
        success(res, graph);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/risk/anomalies
router.get('/anomalies', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { page = 1, limit = 20 } = req.query;
        const result = await riskService.getAnomalies(orgId, { page: Number(page), limit: Number(limit) });
        paginated(res, result);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/risk/fraud-alerts
router.get('/fraud-alerts', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { page = 1, limit = 20 } = req.query;
        const result = await riskService.getFraudAlerts(orgId, { page: Number(page), limit: Number(limit) });
        paginated(res, result);
    } catch (e) { serviceError(res, e); }
});

module.exports = router;
