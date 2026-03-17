/**
 * V1 Verification Controller
 * Three lifecycles: QR Generation → Scan Processing → Verification Decision
 */
const express = require('express');
const router = express.Router();
const verificationService = require('../../services/verification.service');
const { success, paginated, serviceError } = require('../../lib/response');

// POST /api/v1/verification/qr/generate
router.post('/qr/generate', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const qr = await verificationService.generateQR(req.body.product_id, orgId, req.body);
        success(res, qr, {}, 201);
    } catch (e) { serviceError(res, e); }
});

// POST /api/v1/verification/scan
router.post('/scan', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const result = await verificationService.processScan(req.body.qr_data, {
            deviceFingerprint: req.body.device_fingerprint,
            ipAddress: req.ip,
            latitude: req.body.latitude,
            longitude: req.body.longitude,
            userAgent: req.headers['user-agent'],
            orgId,
        });
        success(res, result);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/verification/product/:id
router.get('/product/:id', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const result = await verificationService.verifyProduct(req.params.id, orgId);
        success(res, result);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/verification/history
router.get('/history', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { page = 1, limit = 20 } = req.query;
        const result = await verificationService.getScanHistory(orgId, { page: Number(page), limit: Number(limit) });
        paginated(res, result);
    } catch (e) { serviceError(res, e); }
});

module.exports = router;
