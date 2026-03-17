/**
 * V1 RBAC Admin Controller (Phase 5)
 * Role and permission management for org admins.
 */
const express = require('express');
const router = express.Router();
const rbacService = require('../../services/rbac.service');
const { success, serviceError } = require('../../lib/response');

// GET /api/v1/rbac/roles
router.get('/roles', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const roles = await rbacService.getAllRoles(orgId);
        success(res, roles);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/rbac/roles/:id/permissions
router.get('/roles/:id/permissions', async (req, res) => {
    try {
        const perms = await rbacService.getRolePermissions(req.params.id);
        success(res, perms);
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/rbac/my-permissions
router.get('/my-permissions', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const perms = await rbacService.getUserPermissions(req.user.id, orgId);
        success(res, { roles: perms.roles, permissions: perms.permissions });
    } catch (e) { serviceError(res, e); }
});

// POST /api/v1/rbac/assign
router.post('/assign', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        await rbacService.assignRole(req.body.user_id, req.body.role_id, orgId);
        success(res, null, { message: 'Role assigned' });
    } catch (e) { serviceError(res, e); }
});

// DELETE /api/v1/rbac/revoke
router.delete('/revoke', async (req, res) => {
    try {
        await rbacService.revokeRole(req.body.user_id, req.body.role_id);
        success(res, null, { message: 'Role revoked' });
    } catch (e) { serviceError(res, e); }
});

// GET /api/v1/rbac/stats
router.get('/stats', async (req, res) => {
    try {
        const stats = await rbacService.getStats();
        success(res, stats);
    } catch (e) { serviceError(res, e); }
});

// POST /api/v1/rbac/cache/invalidate
router.post('/cache/invalidate', async (req, res) => {
    try {
        rbacService.invalidateAll();
        success(res, null, { message: 'RBAC cache cleared' });
    } catch (e) { serviceError(res, e); }
});

module.exports = router;
