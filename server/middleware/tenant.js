/**
 * Tenant Middleware — Multi-Tenancy Isolation
 *
 * Extracts tenant context from JWT claims or subdomain and injects
 * into every request for downstream use by routes and DB queries.
 *
 * Strategies:
 *   - Shared Schema (Free/Starter/Pro): RLS via SET app.current_tenant
 *   - Schema-per-Tenant (Enterprise): SET search_path TO tenant_<slug>, public
 *
 * Usage:
 *   app.use('/api/', tenantMiddleware);       // After auth middleware
 *   router.get('/', requireTenant, handler);  // Enforce tenant context
 *
 * Security Fix v9.1.1: All SQL now uses parameterized queries
 */

const config = require('../config');

// ─── Extract Tenant Context ──────────────────────────────────────────────────
function tenantMiddleware(req, res, next) {
    // Skip for public routes and auth routes
    if (req.path.startsWith('/public') || req.path.startsWith('/auth')) {
        return next();
    }

    // 1. From JWT claims (set during login)
    if (req.user && req.user.orgId) {
        req.tenantId = req.user.orgId;
        req.tenantSlug = req.user.orgSlug || null;
        req.tenantPlan = req.user.orgPlan || 'free';
        req.tenantSchema = req.user.orgSchema || null; // null = shared schema
    }
    // Set super_admin flag for downstream route convenience
    if (req.user) {
        req.isSuperAdmin = req.user.role === 'super_admin';
    }
    // 2. From X-Tenant-ID header (service-to-service)
    else if (req.headers['x-tenant-id']) {
        // Validate format: UUID only (prevent injection)
        const tenantHeader = req.headers['x-tenant-id'];
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantHeader)) {
            req.tenantId = tenantHeader;
        }
    }
    // 3. From subdomain (acme.trustchecker.com)
    else {
        const host = req.headers.host || '';
        const parts = host.split('.');
        if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'api') {
            // Validate slug format: alphanumeric + hyphens only
            const slug = parts[0];
            if (/^[a-z0-9][a-z0-9-]{0,62}[a-z0-9]$/i.test(slug)) {
                req.tenantSlug = slug;
            }
        }
    }

    next();
}


// ─── Require Tenant — Guard Middleware ────────────────────────────────────────
function requireTenant(req, res, next) {
    if (!req.tenantId && !req.tenantSlug) {
        return res.status(403).json({
            error: 'Tenant context required',
            message: 'User must belong to an organization to access this resource',
        });
    }
    next();
}


// ─── Apply RLS to Database Connection ────────────────────────────────────────
/**
 * Sets tenant context on the database connection for Row-Level Security.
 * Call this before any DB query in tenant-scoped routes.
 *
 * SECURITY: Uses parameterized queries to prevent SQL injection.
 *
 * For shared schema (Free/Starter/Pro):
 *   SET app.current_tenant = $1
 *
 * For Enterprise (schema-per-tenant):
 *   SET search_path TO <validated_schema>, public
 */
async function applyTenantContext(db, req) {
    if (!req.tenantId) return;

    if (req.tenantSchema) {
        // Enterprise: schema isolation
        // Validate schema name: only alphanumeric + underscore allowed
        const schemaName = req.tenantSchema.replace(/[^a-z0-9_]/gi, '');
        if (schemaName !== req.tenantSchema) {
            throw new Error('Invalid schema name detected');
        }
        // Use parameterized query for PostgreSQL
        await db.run(`SELECT set_config('search_path', $1 || ', public', true)`, [schemaName]);
    } else {
        // Shared: RLS via session variable — parameterized
        await db.run(`SELECT set_config('app.current_tenant', $1, true)`, [req.tenantId]);
    }
}


// ─── Tenant-Scoped Query Helper ──────────────────────────────────────────────
/**
 * Wraps a query to automatically inject tenant_id filter using parameterized queries.
 * Use for shared-schema tenancy (Free/Starter/Pro plans).
 *
 * SECURITY FIX v9.1.1: Returns { query, params } instead of interpolated string.
 *
 * @param {string} baseQuery - SQL query with optional WHERE
 * @param {Array} baseParams - Existing query parameters
 * @param {string} tenantId - Tenant ID to filter by
 * @returns {{ query: string, params: Array }} Modified query with tenant filter
 */
function injectTenantFilter(baseQuery, baseParams = [], tenantId) {
    if (!tenantId) return { query: baseQuery, params: baseParams };

    // Determine next parameter index ($1, $2, etc.)
    const nextParam = baseParams.length + 1;
    const tenantClause = `org_id = $${nextParam}`;
    const newParams = [...baseParams, tenantId];

    // Check if query already has WHERE
    const hasWhere = /\bWHERE\b/i.test(baseQuery);

    let query;
    if (hasWhere) {
        query = baseQuery.replace(/\bWHERE\b/i, `WHERE ${tenantClause} AND`);
    } else {
        // Insert WHERE before ORDER BY, GROUP BY, LIMIT, or at end
        const insertBefore = baseQuery.match(/\b(ORDER BY|GROUP BY|LIMIT|OFFSET|;)\b/i);
        if (insertBefore) {
            query = baseQuery.replace(insertBefore[0], `WHERE ${tenantClause} ${insertBefore[0]}`);
        } else {
            query = `${baseQuery} WHERE ${tenantClause}`;
        }
    }

    return { query, params: newParams };
}


module.exports = {
    tenantMiddleware,
    requireTenant,
    applyTenantContext,
    injectTenantFilter,
};
