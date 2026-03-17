/**
 * V1 Supply Chain Controller
 * Tracking, inventory, partners, EPCIS.
 */
const express = require('express');
const router = express.Router();
const scmService = require('../../services/supply-chain.service');
const { success, paginated, serviceError } = require('../../lib/response');

// GET /api/v1/supply-chain/shipments
router.get('/shipments', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { page = 1, limit = 20, status } = req.query;
        const result = await scmService.getShipments(orgId, { page: Number(page), limit: Number(limit), status });
        paginated(res, result);
    } catch (e) { serviceError(res, e); }
});

// POST /api/v1/supply-chain/shipments
router.post('/shipments', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const shipment = await scmService.createShipment(req.body, orgId);
        success(res, shipment, {}, 201);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/supply-chain/inventory
router.get('/inventory', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { page = 1, limit = 20 } = req.query;
        const result = await scmService.getInventory(orgId, { page: Number(page), limit: Number(limit) });
        paginated(res, result);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/supply-chain/partners
router.get('/partners', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { page = 1, limit = 20 } = req.query;
        const result = await scmService.getPartners(orgId, { page: Number(page), limit: Number(limit) });
        paginated(res, result);
    } catch (e) { serviceError(res, e); }
});

// POST /api/v1/supply-chain/partners
router.post('/partners', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const partner = await scmService.addPartner(req.body, orgId);
        success(res, partner, {}, 201);
    } catch (e) { serviceError(res, e); }
});

// POST /api/v1/supply-chain/epcis
router.post('/epcis', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const results = await scmService.ingestEPCIS(req.body.events || [], orgId);
        success(res, results, { count: results.length }, 201);
    } catch (e) { serviceError(res, e); }
});

module.exports = router;
