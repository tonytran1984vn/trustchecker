/**
 * V1 Compliance Controller
 * Evidence packs, KYC, compliance score.
 */
const express = require('express');
const router = express.Router();
const complianceService = require('../../services/compliance.service');
const { success, paginated, serviceError } = require('../../lib/response');

// GET /api/v1/compliance/evidence
router.get('/evidence', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { page = 1, limit = 20 } = req.query;
        const result = await complianceService.getEvidencePacks(orgId, { page: Number(page), limit: Number(limit) });
        paginated(res, result);
    } catch (e) { serviceError(res, e); }
});

// POST /api/v1/compliance/evidence
router.post('/evidence', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const pack = await complianceService.createEvidencePack(req.body, orgId);
        success(res, pack, {}, 201);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/compliance/kyc
router.get('/kyc', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const status = await complianceService.getKYCStatus(orgId);
        success(res, status);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/compliance/score
router.get('/score', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const score = await complianceService.getComplianceScore(orgId);
        success(res, score);
    } catch (e) { serviceError(res, e); }
});

module.exports = router;
