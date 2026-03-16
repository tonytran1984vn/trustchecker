/**
 * Tenant Middleware — Multi-Tenant Context Injection
 *
 * Ensures all requests operate within proper tenant scope.
 * Platform (SuperAdmin) users bypass tenant scoping.
 *
 * Usage:
 *   router.use(tenantGuard());  // All routes in this router require tenant context
 *   router.get('/data', tenantGuard(), handler);  // Single route
 */

const db = require('../db');

/**
 * Tenant Guard Middleware
 *
 * Injects req.tenantId from the authenticated user's org_id.
 * Platform users (SuperAdmin) bypass — they operate across tenants.
 *
 * Options:
 *   allowPlatform: true (default) — platform users pass through without tenantId
 *   strict: false (default) — if true, rejects even platform users without ?tenant_id
 */
function tenantGuard(options = {}) {
    const { allowPlatform = true, strict = false } = options;

    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Platform users (SuperAdmin)
        if (req.user.user_type === 'platform') {
            if (allowPlatform) {
                // Platform admin can optionally scope to a tenant via query param
                if (req.query.tenant_id) {
                    const tenant = await db.get(
                        'SELECT id, name, plan, status, feature_flags FROM organizations WHERE id = ?',
                        [req.query.tenant_id]
                    );
                    if (!tenant) {
                        return res.status(404).json({ error: 'Tenant not found' });
                    }
                    if (tenant.status !== 'active') {
                        return res.status(403).json({ error: 'Tenant is suspended' });
                    }
                    req.tenantId = tenant.id;
                    req.tenant = tenant;
                }
                // Platform users without tenant_id see cross-tenant data
                return next();
            }
            if (strict && !req.query.tenant_id) {
                return res.status(400).json({ error: 'tenant_id query param required for this operation' });
            }
        }

        // Tenant users — must have org_id
        const orgId = req.user.org_id || req.user.orgId;
        if (!orgId) {
            return res.status(403).json({
                error: 'No tenant context. User is not assigned to any organization.',
                code: 'NO_TENANT'
            });
        }

        // Verify tenant is active
        const tenant = await db.get(
            'SELECT id, name, plan, status, feature_flags FROM organizations WHERE id = ?',
            [orgId]
        );
        if (!tenant) {
            return res.status(403).json({ error: 'Tenant not found', code: 'TENANT_NOT_FOUND' });
        }
        if (tenant.status !== 'active') {
            return res.status(403).json({ error: 'Your organization has been suspended', code: 'TENANT_SUSPENDED' });
        }

        req.tenantId = tenant.id;
        req.tenant = tenant;
        next();
    };
}

/**
 * Tenant-scoped query helper.
 * Ensures WHERE tenant_id/org_id clause is always present.
 *
 * Usage:
 *   const products = await tenantQuery(req, 'SELECT * FROM products', 'org_id');
 */
async function tenantQuery(req, baseSql, tenantColumn = 'org_id', params = []) {
    if (req.tenantId) {
        const scopedSql = baseSql.includes('WHERE')
            ? `${baseSql} AND ${tenantColumn} = ?`
            : `${baseSql} WHERE ${tenantColumn} = ?`;
        return db.all(scopedSql, [...params, req.tenantId]);
    }
    // Platform admin without specific tenant → no filter (cross-tenant view)
    return db.all(baseSql, params);
}

module.exports = {
    tenantGuard,
    tenantQuery,
};
