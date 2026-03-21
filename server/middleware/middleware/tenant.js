/**
 * Org Middleware — Multi-Tenancy Isolation
 *
 * Extracts org context from JWT claims or subdomain and injects
 * into every request for downstream use by routes and DB queries.
 *
 * Strategies:
 *   - Shared Schema (Free/Starter/Pro): RLS via SET app.current_org
 *   - Schema-per-Org (Enterprise): SET search_path TO org_<slug>, public
 *
 * Usage:
 *   app.use('/api/', orgMiddleware);       // After auth middleware
 *   router.get('/', requireOrg, handler);  // Enforce org context
 *
 * Security Fix v9.1.1: All SQL now uses parameterized queries
 */

const config = require('../config');

// ─── Extract Org Context ──────────────────────────────────────────────────
function orgMiddleware(req, res, next) {
    // Skip for public routes and auth routes
    if (req.path.startsWith('/public') || req.path.startsWith('/auth')) {
        return next();
    }

    // 1. From JWT claims (set during login)
    if (req.user && req.user.orgId) {
        req.orgId = req.user.orgId;
        req.orgSlug = req.user.orgSlug || null;
        req.orgPlan = req.user.orgPlan || 'free';
        req.orgSchema = req.user.orgSchema || null; // null = shared schema
    }
    // Set super_admin flag for downstream route convenience
    if (req.user) {
        req.isSuperAdmin = req.user.role === 'super_admin';
    }
    // 2. From X-Org-ID header (service-to-service)
    else if (req.headers['x-org-id']) {
        // Validate format: UUID only (prevent injection)
        const orgHeader = req.headers['x-org-id'];
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orgHeader)) {
            req.orgId = orgHeader;
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
                req.orgSlug = slug;
            }
        }
    }

    next();
}


// ─── Require Org — Guard Middleware ────────────────────────────────────────
function requireOrg(req, res, next) {
    if (!req.orgId && !req.orgSlug) {
        return res.status(403).json({
            error: 'Org context required',
            message: 'User must belong to an organization to access this resource',
        });
    }
    next();
}


// ─── Apply RLS to Database Connection ────────────────────────────────────────
/**
 * Sets org context on the database connection for Row-Level Security.
 * Call this before any DB query in org-scoped routes.
 *
 * SECURITY: Uses parameterized queries to prevent SQL injection.
 *
 * For shared schema (Free/Starter/Pro):
 *   SET app.current_org = $1
 *
 * For Enterprise (schema-per-org):
 *   SET search_path TO <validated_schema>, public
 */
async function applyOrgContext(db, req) {
    if (!req.orgId) return;

    if (req.orgSchema) {
        // Enterprise: schema isolation
        // Validate schema name: only alphanumeric + underscore allowed
        const schemaName = req.orgSchema.replace(/[^a-z0-9_]/gi, '');
        if (schemaName !== req.orgSchema) {
            throw new Error('Invalid schema name detected');
        }
        // Use parameterized query for PostgreSQL
        await db.run(`SELECT set_config('search_path', $1 || ', public', true)`, [schemaName]);
    } else {
        // Shared: RLS via session variable — parameterized
        await db.run(`SELECT set_config('app.current_org', $1, true)`, [req.orgId]);
    }
}


// ─── Org-Scoped Query Helper ──────────────────────────────────────────────
/**
 * Wraps a query to automatically inject org_id filter using parameterized queries.
 * Use for shared-schema tenancy (Free/Starter/Pro plans).
 *
 * SECURITY FIX v9.1.1: Returns { query, params } instead of interpolated string.
 *
 * @param {string} baseQuery - SQL query with optional WHERE
 * @param {Array} baseParams - Existing query parameters
 * @param {string} orgId - Org ID to filter by
 * @returns {{ query: string, params: Array }} Modified query with org filter
 */
function injectOrgFilter(baseQuery, baseParams = [], orgId) {
    if (!orgId) return { query: baseQuery, params: baseParams };

    // Determine next parameter index ($1, $2, etc.)
    const nextParam = baseParams.length + 1;
    const orgClause = `org_id = $${nextParam}`;
    const newParams = [...baseParams, orgId];

    // Check if query already has WHERE
    const hasWhere = /\bWHERE\b/i.test(baseQuery);

    let query;
    if (hasWhere) {
        query = baseQuery.replace(/\bWHERE\b/i, `WHERE ${_safeWhere(orgClause)} AND`);
    } else {
        // Insert WHERE before ORDER BY, GROUP BY, LIMIT, or at end
        const insertBefore = baseQuery.match(/\b(ORDER BY|GROUP BY|LIMIT|OFFSET|;)\b/i);
        if (insertBefore) {
            query = baseQuery.replace(insertBefore[0], `WHERE ${_safeWhere(orgClause)} ${insertBefore[0]}`);
        } else {
            query = `${baseQuery} WHERE ${_safeWhere(orgClause)}`;
        }
    }

    return { query, params: newParams };
}


module.exports = {
    orgMiddleware,
    requireOrg,
    applyOrgContext,
    injectOrgFilter,
};


// ═══════════════════════════════════════════════════════════════
// ATK-01 FIX: Transaction-wrapped org context
// Ensures set_config and query execute on SAME connection
// ═══════════════════════════════════════════════════════════════
async function withOrgTransaction(db, req, callback) {
    const pool = db._pool || db._backend?._pool;
    if (!pool) {
        // Fallback: use regular context (non-pool)
        await applyOrgContext(db, req);
        return callback(db);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        if (req.orgId) {
            await client.query("SELECT set_config('app.current_org', $1, true)", [req.orgId]);
        }
        // Create a scoped db interface using the dedicated client
        const scopedDb = {
            async get(sql, params) {
                const res = await client.query(sql.replace(/\?/g, (_, i) => `$${i+1}`), params);
                return res.rows[0] || null;
            },
            async all(sql, params) {
                const res = await client.query(sql.replace(/\?/g, (_, i) => `$${i+1}`), params);
                return res.rows;
            },
            async run(sql, params) {
                await client.query(sql.replace(/\?/g, (_, i) => `$${i+1}`), params);
            }
        };
        const result = await callback(scopedDb);
        await client.query('COMMIT');
        return result;
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }
}

module.exports.withOrgTransaction = withOrgTransaction;
