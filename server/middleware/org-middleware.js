/**
 * Org Middleware — Multi-Org Context Injection + Scope Loading
 *
 * Ensures all requests operate within proper org scope.
 * Platform (SuperAdmin) users bypass org scoping.
 * Loads resource scopes from membership_scopes for fine-grained access control.
 *
 * Usage:
 *   router.use(orgGuard());  // All routes in this router require org context
 *   router.get('/data', orgGuard(), handler);  // Single route
 */

const db = require('../db');
const { getUserScopes } = require('../auth/scope-engine');

/**
 * Org Guard Middleware
 *
 * Injects req.orgId from the authenticated user's org_id.
 * Also loads req.scopes from membership_scopes.
 * Platform users (SuperAdmin) bypass — they operate across orgs.
 *
 * Options:
 *   allowPlatform: true (default) — platform users pass through without orgId
 *   strict: false (default) — if true, rejects even platform users without ?org_id
 *   loadScopes: true (default) — loads membership_scopes into req.scopes
 */
function orgGuard(options = {}) {
    const { allowPlatform = true, strict = false, loadScopes = true } = options;

    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Platform users (SuperAdmin)
        if (req.user.user_type === 'platform') {
            if (allowPlatform) {
                // Platform admin can optionally scope to an org via query param
                if (req.query.org_id) {
                    const org = await db.get(
                        'SELECT id, name, plan, status, feature_flags FROM organizations WHERE id = ?',
                        [req.query.org_id]
                    );
                    if (!org) {
                        return res.status(404).json({ error: 'Organization not found' });
                    }
                    if (org.status !== 'active') {
                        return res.status(403).json({ error: 'Organization is suspended' });
                    }
                    req.orgId = org.id;
                    req.org = org;
                    db.setOrgContext(org.id); // RLS context
                }
                req.scopes = []; // Platform users have no scope restrictions
                // Platform users without org_id → RLS sees all rows (empty context)
                if (!req.orgId) db.setOrgContext('');
                return next();
            }
            if (strict && !req.query.org_id) {
                return res.status(400).json({ error: 'org_id query param required for this operation' });
            }
        }

        // Org users — must have active membership
        const orgId = req.user.org_id || req.user.orgId;
        if (!orgId) {
            return res.status(403).json({
                error: 'No org context. User is not assigned to any organization.',
                code: 'NO_ORG',
            });
        }

        // Set RLS context early so JOIN on organizations works
        db.setOrgContext(orgId);

        // Load membership (enterprise IAM)
        const membership = await db.get(
            `SELECT m.id, m.user_id, m.org_id, m.status, m.role_context,
                    o.name as org_name, o.plan, o.status as org_status, o.feature_flags
             FROM memberships m
             JOIN organizations o ON o.id = m.org_id
             WHERE m.user_id = ? AND m.org_id = ? AND m.status = 'active'`,
            [req.user.id, orgId]
        );

        if (membership) {
            if (membership.org_status !== 'active') {
                return res.status(403).json({ error: 'Your organization has been suspended', code: 'ORG_SUSPENDED' });
            }
            req.orgId = membership.org_id;
            req.org = {
                id: membership.org_id,
                name: membership.org_name,
                plan: membership.plan,
                status: membership.org_status,
                feature_flags: membership.feature_flags,
            };
            req.membership = membership;

            // RLS context — set for PostgreSQL Row Level Security
            db.setOrgContext(membership.org_id);

            // Load resource scopes
            if (loadScopes) {
                req.scopes = await getUserScopes(membership.id);
            }
        } else {
            // Fallback: no membership exists yet (legacy users)
            const org = await db.get('SELECT id, name, plan, status, feature_flags FROM organizations WHERE id = ?', [
                orgId,
            ]);
            if (!org) {
                return res.status(403).json({ error: 'Organization not found', code: 'ORG_NOT_FOUND' });
            }
            if (org.status !== 'active') {
                return res.status(403).json({ error: 'Your organization has been suspended', code: 'ORG_SUSPENDED' });
            }
            req.orgId = org.id;
            req.org = org;
            req.membership = null; // No membership — legacy mode
            req.scopes = []; // No scopes — org-wide access
            db.setOrgContext(org.id); // RLS context
        }
        next();
    };
}

/**
 * Org-scoped query helper.
 * Ensures WHERE org_id clause is always present.
 *
 * Usage:
 *   const products = await orgQuery(req, 'SELECT * FROM products', 'org_id');
 */
async function orgQuery(req, baseSql, orgColumn = 'org_id', params = []) {
    if (req.orgId) {
        const scopedSql = baseSql.includes('WHERE')
            ? `${baseSql} AND ${orgColumn} = ? LIMIT 1000`
            : `${baseSql} WHERE ${orgColumn} = ?`;
        return db.all(scopedSql, [...params, req.orgId]);
    }
    // Platform admin without specific org → no filter (cross-org view)
    return db.all(baseSql, params);
}

module.exports = {
    orgGuard,
    orgQuery,
    // Backward-compatible aliases
    tenantGuard: orgGuard,
    tenantQuery: orgQuery,
};
