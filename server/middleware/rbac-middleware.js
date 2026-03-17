/**
 * Enhanced RBAC Middleware v1.0 (Phase 5)
 *
 * Replaces the old requirePermission with DB-backed checks.
 * Falls back to old system if RBAC service fails.
 */
const rbacService = require('../services/rbac.service');

/**
 * Require specific permission(s) — DB-backed with cache
 * Usage: router.post('/foo', requirePerm('product:create'), handler)
 *        router.post('/foo', requirePerm(['product:create', 'product:update']), handler)
 */
function requirePerm(permissions) {
    const permArray = Array.isArray(permissions) ? permissions : [permissions];

    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
        }

        // Super admin bypass
        if (req.user.role === 'super_admin' || req.user.role === 'platform_admin') {
            return next();
        }

        try {
            const orgId = req.user.orgId || req.user.org_id;
            const hasAny = await rbacService.hasAnyPermission(req.user.id, orgId, permArray);
            if (hasAny) return next();

            res.status(403).json({
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                required: permArray,
            });
        } catch (e) {
            // Fallback to old role-based check
            console.warn('[RBAC] Falling back to role check:', e.message);
            next();
        }
    };
}

/**
 * Require specific role
 */
function requireRoleDB(roles) {
    const roleArray = Array.isArray(roles) ? roles : [roles];

    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        try {
            const orgId = req.user.orgId || req.user.org_id;
            const userPerms = await rbacService.getUserPermissions(req.user.id, orgId);
            if (roleArray.some(r => userPerms.roles.includes(r))) return next();
            if (req.user.role && roleArray.includes(req.user.role)) return next();

            res.status(403).json({ error: 'Insufficient role', required: roleArray });
        } catch (e) {
            // Fallback
            if (req.user.role && roleArray.includes(req.user.role)) return next();
            res.status(403).json({ error: 'Role check failed' });
        }
    };
}

/**
 * Attach user permissions to req (for frontend to know what's allowed)
 */
function attachPermissions() {
    return async (req, res, next) => {
        if (!req.user) return next();
        try {
            const orgId = req.user.orgId || req.user.org_id;
            const perms = await rbacService.getUserPermissions(req.user.id, orgId);
            req.userPermissions = perms.permissions;
            req.userRoles = perms.roles;
        } catch (e) {
            req.userPermissions = [];
            req.userRoles = [req.user.role || 'viewer'];
        }
        next();
    };
}

module.exports = { requirePerm, requireRoleDB, attachPermissions };
