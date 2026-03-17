/**
 * V1 Organization Controller
 * Org info, members, invitations, stats.
 */
const express = require('express');
const router = express.Router();
const orgService = require('../../services/org.service');
const { success, paginated, serviceError } = require('../../lib/response');

// GET /api/v1/org
router.get('/', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const org = await orgService.getOrg(orgId);
        success(res, org);
    } catch (e) { serviceError(res, e); }
});

// PUT /api/v1/org
router.put('/', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const org = await orgService.updateOrg(orgId, req.body);
        success(res, org);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/org/members
router.get('/members', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { page = 1, limit = 20 } = req.query;
        const result = await orgService.getMembers(orgId, { page: Number(page), limit: Number(limit) });
        paginated(res, result);
    } catch (e) { serviceError(res, e); }
});

// POST /api/v1/org/invite
router.post('/invite', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const invitation = await orgService.inviteMember(orgId, req.body.email, req.body.role);
        success(res, invitation, {}, 201);
    } catch (e) { serviceError(res, e); }
});

// DELETE /api/v1/org/members/:userId
router.delete('/members/:userId', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        await orgService.removeMember(orgId, req.params.userId);
        success(res, null, { message: 'Member removed' });
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/org/stats
router.get('/stats', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const stats = await orgService.getOrgStats(orgId);
        success(res, stats);
    } catch (e) { serviceError(res, e); }
});

module.exports = router;
