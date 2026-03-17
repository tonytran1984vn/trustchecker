/**
 * Scope Engine — Resource-Level Access Control
 *
 * Provides fine-grained scope evaluation beyond org-level isolation.
 * Supports scope types: supply_chain, supplier, facility, product
 *
 * Authorization chain:
 *   1. RBAC → user has permission (e.g. supplier:edit)
 *   2. Org  → resource.org_id == user.org_id
 *   3. Scope → resource.id IN user.scoped_resources   ← THIS MODULE
 *
 * Usage:
 *   const { requireScope, scopeFilter } = require('./scope-engine');
 *   router.get('/:id', requireScope('supplier', 'id'), handler);
 *   router.get('/', scopeFilter('supplier'), handler);
 */

const db = require('../db');

// Roles that bypass scope restrictions (org-wide access)
const SCOPE_BYPASS_ROLES = new Set([
    'super_admin', 'platform_admin',
    'company_admin', 'org_owner', 'org_admin',
    'compliance_officer', 'risk_officer',
]);

// Cache: membershipId → scopes (TTL 60s)
const _scopeCache = new Map();
const CACHE_TTL = 60_000;

/**
 * Load all scopes for a membership.
 * Returns: [{ scope_type, scope_id, access_level }]
 */
async function getUserScopes(membershipId) {
    if (!membershipId) return [];

    // Check cache
    const cached = _scopeCache.get(membershipId);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

    const rows = await db.all(
        `SELECT scope_type, scope_id, access_level 
         FROM membership_scopes 
         WHERE membership_id = ?`,
        [membershipId]
    ).catch(() => []);

    _scopeCache.set(membershipId, { data: rows, ts: Date.now() });
    return rows;
}

/**
 * Check if user has access to a specific resource.
 *
 * Returns true if:
 *   - User is platform admin
 *   - User's role bypasses scopes (org admin, company admin, etc.)
 *   - User has NO scopes assigned (backward compatible: org-wide access)
 *   - User has explicit scope for this resource
 *   - User has supply_chain scope and resource belongs to that chain
 */
async function hasResourceAccess(req, resourceType, resourceId) {
    // Platform admin: always pass
    if (req.user?.user_type === 'platform') return true;

    // Check role bypass
    if (_shouldBypassScope(req)) return true;

    // Load scopes
    const scopes = req.scopes || await getUserScopes(req.membership?.id);

    // No scopes assigned → backward compatible (org-wide access)
    if (!scopes || scopes.length === 0) return true;

    // Direct scope match
    const directMatch = scopes.some(
        s => s.scope_type === resourceType && s.scope_id === resourceId
    );
    if (directMatch) return true;

    // Supply chain scope: check if resource belongs to a scoped chain
    const chainScopes = scopes.filter(s => s.scope_type === 'supply_chain');
    if (chainScopes.length > 0 && resourceType === 'supplier') {
        const chainIds = chainScopes.map(s => s.scope_id);
        const placeholders = chainIds.map(() => '?').join(',');
        const partner = await db.get(
            `SELECT id FROM partners WHERE id = ? AND supply_chain_id IN (${placeholders})`,
            [resourceId, ...chainIds]
        ).catch(() => null);
        if (partner) return true;
    }

    return false;
}

/**
 * Get all resource IDs user can access for a given scope type.
 * Used for list endpoints.
 *
 * Returns null if user has org-wide access (no filtering needed).
 * Returns string[] of IDs if user is scoped.
 */
async function scopedResourceIds(req, scopeType) {
    // Platform admin or bypassed role: no filtering
    if (req.user?.user_type === 'platform') return null;
    if (_shouldBypassScope(req)) return null;

    const scopes = req.scopes || await getUserScopes(req.membership?.id);

    // No scopes → org-wide access
    if (!scopes || scopes.length === 0) return null;

    // Direct scope IDs for the type
    const directIds = scopes
        .filter(s => s.scope_type === scopeType)
        .map(s => s.scope_id);

    // If scoped by supply_chain, expand to include related suppliers
    if (scopeType === 'supplier') {
        const chainScopes = scopes.filter(s => s.scope_type === 'supply_chain');
        if (chainScopes.length > 0) {
            const chainIds = chainScopes.map(s => s.scope_id);
            const placeholders = chainIds.map(() => '?').join(',');
            const partners = await db.all(
                `SELECT id FROM partners WHERE supply_chain_id IN (${placeholders})`,
                chainIds
            ).catch(() => []);
            partners.forEach(p => {
                if (!directIds.includes(p.id)) directIds.push(p.id);
            });
        }
    }

    return directIds.length > 0 ? directIds : [];
}

/**
 * Get the access level for a resource.
 * Returns: 'full' | 'read' | 'contribute' | null
 */
async function getAccessLevel(req, resourceType, resourceId) {
    if (req.user?.user_type === 'platform') return 'full';
    if (_shouldBypassScope(req)) return 'full';

    const scopes = req.scopes || await getUserScopes(req.membership?.id);
    if (!scopes || scopes.length === 0) return 'full'; // No scopes = org-wide

    const match = scopes.find(
        s => s.scope_type === resourceType && s.scope_id === resourceId
    );
    return match ? match.access_level : null;
}

// ─── Middleware ──────────────────────────────────────────────────────────────

/**
 * requireScope(scopeType, paramName) — Middleware for detail endpoints
 *
 * Checks that the authenticated user has scope access to the resource
 * identified by req.params[paramName].
 *
 * Usage:
 *   router.get('/:id', requireScope('supplier', 'id'), handler);
 *   router.put('/partners/:partnerId', requireScope('supplier', 'partnerId'), handler);
 */
function requireScope(scopeType, paramName = 'id') {
    return async (req, res, next) => {
        try {
            const resourceId = req.params[paramName];
            if (!resourceId) return next(); // No ID in params → skip

            const allowed = await hasResourceAccess(req, scopeType, resourceId);
            if (!allowed) {
                return res.status(403).json({
                    error: 'Access denied: resource not in your scope',
                    code: 'SCOPE_DENIED',
                    scope_type: scopeType,
                });
            }
            next();
        } catch (err) {
            console.error('Scope check error:', err);
            next(); // Fail open for now — log and continue
        }
    };
}

/**
 * scopeFilter(scopeType) — Middleware for list endpoints
 *
 * Loads scoped resource IDs and attaches to req.scopedIds[scopeType].
 * null = no filtering needed (org-wide access).
 * [] = no access to any resources of this type.
 * [...ids] = filter to these specific IDs.
 *
 * Usage:
 *   router.get('/', scopeFilter('supplier'), async (req, res) => {
 *     const ids = req.scopedIds?.supplier;
 *     // ids is null → no filter needed
 *     // ids is [] → return empty
 *     // ids is ['a','b'] → WHERE id IN ('a','b')
 *   });
 */
function scopeFilter(scopeType) {
    return async (req, res, next) => {
        try {
            const ids = await scopedResourceIds(req, scopeType);
            if (!req.scopedIds) req.scopedIds = {};
            req.scopedIds[scopeType] = ids;
            next();
        } catch (err) {
            console.error('Scope filter error:', err);
            if (!req.scopedIds) req.scopedIds = {};
            req.scopedIds[scopeType] = null; // Fail open
            next();
        }
    };
}

// ─── Internal ───────────────────────────────────────────────────────────────

function _shouldBypassScope(req) {
    // Check via role context in membership
    const roleContext = req.membership?.role_context;
    if (roleContext && ['owner', 'admin'].includes(roleContext)) return true;

    // Check via RBAC role names
    const userRoles = req.user?.roles || [];
    if (Array.isArray(userRoles)) {
        return userRoles.some(r => SCOPE_BYPASS_ROLES.has(r));
    }
    if (typeof userRoles === 'string') {
        return SCOPE_BYPASS_ROLES.has(userRoles);
    }

    // Check user_type
    if (req.user?.user_type === 'platform') return true;
    if (req.user?.role === 'super_admin') return true;

    return false;
}

/**
 * Clear scope cache for a membership (call after scope changes)
 */
function clearScopeCache(membershipId) {
    if (membershipId) _scopeCache.delete(membershipId);
    else _scopeCache.clear();
}

module.exports = {
    getUserScopes,
    hasResourceAccess,
    scopedResourceIds,
    getAccessLevel,
    requireScope,
    scopeFilter,
    clearScopeCache,
    // Internal for testing
    _shouldBypassScope,
    SCOPE_BYPASS_ROLES,
};
