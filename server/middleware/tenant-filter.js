/**
 * Tenant Filter Middleware
 * Injects tenant context from JWT into request and provides
 * query helpers for multi-tenant data isolation.
 *
 * - Super admin bypasses tenant filtering (sees all data)
 * - Org admin/members only see data belonging to their org
 */

function tenantFilter(req, res, next) {
    if (!req.user) return next();

    // Extract org context from JWT token
    req.tenantId = req.user.orgId || null;
    req.isSuperAdmin = req.user.role === 'super_admin';

    // Helper: add tenant filter to SQL WHERE clause
    req.scopeQuery = function (baseSQL, params = []) {
        if (req.isSuperAdmin) {
            return { sql: baseSQL, params };
        }
        if (!req.tenantId) {
            // No org context — fail safe (return nothing)
            return { sql: baseSQL + ' AND 1=0', params };
        }
        return {
            sql: baseSQL + ' AND org_id = ?',
            params: [...params, req.tenantId]
        };
    };

    // Helper: get tenantId or null for super_admin
    req.getOrgFilter = function () {
        if (req.isSuperAdmin) return null;
        return req.tenantId;
    };

    next();
}

module.exports = tenantFilter;
