/**
 * RBAC Engine — Hierarchical Multi-Tenant Permission System
 *
 * Pure logic module (no routes). Provides:
 *   getUserPermissions(userId)           → Set<string>
 *   hasPermission(userId, perm)          → boolean
 *   hasAnyPermission(userId, perms[])    → boolean
 *   getPermissionsForRole(roleId)        → string[]
 *   checkPlanGuardrail(tenantId, perm)   → boolean
 *   checkSoD(userId, newPerm)            → { conflict, details }
 *
 * Permission format: "resource:action" (e.g. "product:create")
 * Levels: platform | tenant | business
 */

const db = require('../db');

// ─── SoD Conflict Matrix ─────────────────────────────────────────────────────
// Pairs of permissions that should NOT be held by the same user
const SOD_CONFLICTS = [
    ['fraud_case:create', 'fraud_case:approve'],
    ['payment:create', 'payment:approve'],
    ['user:create', 'user:approve'],
    ['role:create', 'role:approve'],
    // GOV-3: Risk model governance
    ['risk_model:create', 'risk_model:deploy'],
    ['risk_model:deploy', 'risk_model:approve'],
    // GOV-3: Evidence & compliance separation
    ['evidence:create', 'evidence:seal'],
    ['compliance:freeze', 'compliance:export'],
    // L-RGF: Logistics Risk Governance Flow
    ['threshold:configure', 'threshold:override'],
    ['event:ingest', 'event:delete'],
    ['case:assign', 'case:close'],
    // Trust Graph Governance
    ['graph_schema:approve', 'graph_schema:deploy'],
    ['graph_weight:propose', 'graph_weight:approve'],
    ['graph_override:request', 'graph_override:approve'],
    // Data Lineage Immutability
    ['lineage:record', 'lineage:modify'],
    ['lineage:replay', 'lineage:delete'],
    ['lineage:view_full', 'lineage:export_without_approval'],
    ['lineage:approve_export', 'lineage:perform_export'],
    // v2.0: Carbon Lifecycle SoD
    ['carbon_credit:request_mint', 'carbon_credit:approve_mint'],
    ['carbon_credit:approve_mint', 'carbon_credit:anchor'],
    // v2.0: Support & Security SoD
    ['support_session:initiate', 'support_session:approve'],
    ['incident:declare', 'incident:resolve'],
    // v2.0: Data Governance SoD
    ['data_classification:define', 'data_classification:approve'],
    ['lineage_export:approve', 'lineage_export:execute'],
];

// ─── Permission Cache (per-request) ──────────────────────────────────────────
// Attach to req._rbacPerms during first check, reuse for rest of request lifecycle

/**
 * Load all effective permissions for a user via RBAC tables:
 *   user → rbac_user_roles → rbac_role_permissions → rbac_permissions
 *
 * Falls back to legacy role column for backward compatibility.
 */
async function getUserPermissions(userId) {
    // Primary: Load from RBAC tables
    const rows = await db.all(`
    SELECT DISTINCT p.resource || ':' || p.action AS perm
    FROM rbac_user_roles ur
    JOIN rbac_role_permissions rp ON rp.role_id = ur.role_id
    JOIN rbac_permissions p ON p.id = rp.permission_id
    WHERE ur.user_id = ?
      AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))
  `, [userId]);

    const perms = new Set(rows.map(r => r.perm));
    return perms;
}

/**
 * Check if a user has a specific permission.
 * Uses req._rbacPerms cache if available.
 */
async function hasPermission(userId, permission, req) {
    // Use cached permissions if available (set by middleware)
    if (req && req._rbacPerms) {
        return req._rbacPerms.has(permission);
    }
    const perms = await getUserPermissions(userId);
    if (req) req._rbacPerms = perms; // cache for this request
    return perms.has(permission);
}

/**
 * Check if a user has ANY of the listed permissions.
 */
async function hasAnyPermission(userId, permissions, req) {
    if (req && req._rbacPerms) {
        return permissions.some(p => req._rbacPerms.has(p));
    }
    const perms = await getUserPermissions(userId);
    if (req) req._rbacPerms = perms;
    return permissions.some(p => perms.has(p));
}

/**
 * Get all permission strings for a specific role.
 */
async function getPermissionsForRole(roleId) {
    const rows = await db.all(`
    SELECT p.resource || ':' || p.action AS perm
    FROM rbac_role_permissions rp
    JOIN rbac_permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = ?
  `, [roleId]);
    return rows.map(r => r.perm);
}

/**
 * Plan Guardrail: Check if a permission is allowed by the tenant's plan.
 *
 * feature_flags JSON in organizations table defines what's available:
 *   { "trustgraph": true, "consortium": false, "digital_twin": true }
 *
 * If a permission's resource is gated by a feature flag, check tenant's flags.
 */
async function checkPlanGuardrail(tenantId, permission) {
    if (!tenantId) return true; // Platform-level has no guardrails

    const [resource] = permission.split(':');

    // Load tenant
    const org = await db.get('SELECT plan, feature_flags FROM organizations WHERE id = ?', [tenantId]);
    if (!org) return false;

    let flags = {};
    try { flags = JSON.parse(org.feature_flags || '{}'); } catch (e) { /* ignore */ }

    // Feature flag gating — if a flag exists for this resource and is false, deny
    if (flags.hasOwnProperty(resource) && flags[resource] === false) {
        return false;
    }

    return true;
}

/**
 * Segregation of Duties: Check if granting a new permission would create a conflict.
 *
 * Returns: { conflict: boolean, details: string|null }
 */
async function checkSoD(userId, newPermission) {
    const existing = await getUserPermissions(userId);

    for (const [p1, p2] of SOD_CONFLICTS) {
        if (newPermission === p1 && existing.has(p2)) {
            return { conflict: true, details: `SoD conflict: "${p1}" cannot coexist with "${p2}"` };
        }
        if (newPermission === p2 && existing.has(p1)) {
            return { conflict: true, details: `SoD conflict: "${p2}" cannot coexist with "${p1}"` };
        }
    }

    return { conflict: false, details: null };
}

/**
 * Segregation of Duties with Waiver support.
 * For small organizations where one person may hold conflicting roles.
 *
 * Waiver config stored in organizations.sod_waivers JSON column:
 *   { "waivers": [{ "pair": ["fraud_case:create","fraud_case:approve"], "reason": "Small team", "approved_by": "admin@co.io", "expires_at": "2027-01-01" }] }
 *
 * All waiver usage is audit-logged.
 */
async function checkSoDWithWaiver(userId, newPermission, tenantId) {
    const base = await checkSoD(userId, newPermission);
    if (!base.conflict) return base;

    // Check if tenant has a waiver for this specific pair
    if (!tenantId) return base; // No waivers at platform level

    const org = await db.get('SELECT sod_waivers FROM organizations WHERE id = ?', [tenantId]);
    if (!org || !org.sod_waivers) return base;

    let waiverConfig;
    try { waiverConfig = JSON.parse(org.sod_waivers); } catch (_) { return base; }

    const waivers = waiverConfig.waivers || [];
    const existing = await getUserPermissions(userId);

    for (const [p1, p2] of SOD_CONFLICTS) {
        if ((newPermission === p1 && existing.has(p2)) || (newPermission === p2 && existing.has(p1))) {
            const matchedWaiver = waivers.find(w => {
                const pair = w.pair || [];
                return (pair.includes(p1) && pair.includes(p2))
                    && (!w.expires_at || new Date(w.expires_at) > new Date());
            });
            if (matchedWaiver) {
                // Log waiver usage for audit trail
                console.log(`[RBAC] SoD WAIVER used: user=${userId}, pair=[${p1},${p2}], reason="${matchedWaiver.reason}", approved_by=${matchedWaiver.approved_by}`);
                return {
                    conflict: false,
                    details: null,
                    waiver_applied: true,
                    waiver_reason: matchedWaiver.reason,
                    waiver_approved_by: matchedWaiver.approved_by,
                };
            }
        }
    }

    return base;
}

/**
 * Get all available permissions filtered by level.
 */
async function getPermissionsByLevel(level) {
    const rows = await db.all(
        'SELECT id, resource, action, scope, level, description FROM rbac_permissions WHERE level = ?',
        [level]
    );
    return rows;
}

/**
 * Get all business-level permissions (for Company Admin UI).
 */
async function getBusinessPermissions() {
    return getPermissionsByLevel('business');
}

/**
 * Express middleware factory: require specific permission(s).
 *
 *   router.get('/products', requirePermission('product:view'), handler)
 *   router.post('/users', requirePermission('tenant:user:create'), handler)
 */
function requirePermission(...permissions) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // SuperAdmin (platform user_type with super_admin role) bypasses STANDARD RBAC checks
        // BUT constitutional constraints are enforced separately via requireConstitutional()
        if (req.user.user_type === 'platform' && (req.user.role === 'super_admin' || req.user.role === 'admin')) {
            return next();
        }

        try {
            const has = await hasAnyPermission(req.user.id, permissions, req);
            if (!has) {
                return res.status(403).json({
                    error: 'Insufficient permissions',
                    required: permissions,
                    code: 'RBAC_DENIED'
                });
            }
            next();
        } catch (err) {
            console.error('[RBAC] Permission check error:', err.message);
            return res.status(500).json({ error: 'Permission check failed' });
        }
    };
}

/**
 * Constitutional enforcement middleware.
 * Unlike requirePermission, this CANNOT be bypassed — not even by super_admin.
 * Uses the Constitutional RBAC Engine to check charter-defined power boundaries.
 * 
 * Usage:
 *   router.post('/reserve/withdraw', requireConstitutional('monetization.reserve.withdraw'), handler)
 */
function requireConstitutional(action) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const constitutionalRBAC = require('../engines/constitutional-rbac-engine');
        const role = req.user.role;
        const result = constitutionalRBAC.enforce(role, action);

        if (!result.allowed) {
            return res.status(403).json({
                error: 'Constitutional constraint violation',
                code: 'CONSTITUTIONAL_BLOCK',
                action,
                role,
                reason: result.reason,
                charter: result.charter,
                article: result.article,
                separation: result.separation || null,
                immutable: result.immutable || false,
            });
        }

        // Attach constitutional result to request for downstream use
        req._constitutional = result;
        next();
    };
}

/**
 * Express middleware: require platform admin (L5 roles: SuperAdmin, Security, DataGov).
 */
function requirePlatformAdmin() {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (req.user.user_type !== 'platform') {
            return res.status(403).json({ error: 'Platform admin access required', code: 'PLATFORM_ONLY' });
        }
        next();
    };
}

/**
 * Express middleware: require tenant admin (Company Admin).
 * Must have tenant:* permissions or role 'admin' within their org.
 */
function requireTenantAdmin() {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // Platform admin can act as tenant admin in support override
        if (req.user.user_type === 'platform') return next();

        // Check for tenant admin permissions
        const has = await hasAnyPermission(req.user.id, [
            'tenant:user:create',
            'tenant:role:create',
            'tenant:settings:update'
        ], req);

        if (!has && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Tenant admin access required', code: 'TENANT_ADMIN_ONLY' });
        }
        next();
    };
}

module.exports = {
    getUserPermissions,
    hasPermission,
    hasAnyPermission,
    getPermissionsForRole,
    checkPlanGuardrail,
    checkSoD,
    checkSoDWithWaiver,
    getPermissionsByLevel,
    getBusinessPermissions,
    requirePermission,
    requireConstitutional,
    requirePlatformAdmin,
    requireTenantAdmin,
    SOD_CONFLICTS,
};
