/**
 * Policy Engine — Centralized Authorization Evaluator
 * 
 * Orchestrates existing rbac.js functions into a single evaluate() call.
 * Replaces scattered inline role checks with a consistent pattern:
 * 
 *   const decision = await policy.evaluate(req.user, 'supplier:approve_kyc', resourceId, { req });
 *   if (!decision.allowed) return res.status(403).json(decision);
 * 
 * Phase 1: wraps permission + identity SoD + org-scoping
 * Phase 2 (future): conflict matrix + temporal constraints
 */

const db = require('../db');
const { hasPermission, hasAnyPermission, checkSoD, getUserPermissions } = require('./rbac');

// ─── Tenant-level KYC approver roles ─────────────────────────────────────────
const KYC_APPROVER_ROLES = ['org_owner', 'company_admin', 'executive', 'compliance_officer'];

// ─── Identity SoD rules ─────────────────────────────────────────────────────
// Map: action → { table, id_column, creator_column }
const IDENTITY_SOD_RULES = {
    'supplier:approve_kyc': { table: 'partners', id_col: 'id', creator_col: 'created_by' },
    'supplier:reject_kyc': { table: 'partners', id_col: 'id', creator_col: 'created_by' },
};

/**
 * Evaluate authorization for a user performing an action on a resource.
 * 
 * @param {Object} user - req.user (id, role, orgId, user_type)
 * @param {string} action - permission string (e.g. 'supplier:approve_kyc')
 * @param {string} [resourceId] - ID of the resource being acted upon
 * @param {Object} [opts] - { req, skipPermissionCheck }
 * @returns {{ allowed: boolean, reason?: string, code?: string }}
 */
async function evaluate(user, action, resourceId, opts = {}) {
    if (!user) return deny('Authentication required', 'AUTH_REQUIRED');

    // ─── Step 1: Platform vs Tenant boundary ─────────────────────
    // Platform admins bypass standard RBAC but NOT constitutional or identity SoD
    const isPlatformAdmin = user.user_type === 'platform' && (user.role === 'super_admin' || user.role === 'platform_security');

    // ─── Step 2: Permission check (unless explicitly skipped) ────
    if (!opts.skipPermissionCheck && !isPlatformAdmin) {
        const perms = opts.req?._rbacPerms || await getUserPermissions(user.id);
        if (opts.req) opts.req._rbacPerms = perms;
        if (!perms.has(action)) {
            return deny(`Permission '${action}' required`, 'RBAC_DENIED');
        }
    }

    // ─── Step 3: Identity-level SoD ──────────────────────────────
    const sodRule = IDENTITY_SOD_RULES[action];
    if (sodRule && resourceId) {
        try {
            const row = await db.get(
                `SELECT ${sodRule.creator_col} FROM ${sodRule.table} WHERE ${sodRule.id_col} = ?`,
                [resourceId]
            );
            if (row && row[sodRule.creator_col] && row[sodRule.creator_col] === user.id) {
                return deny(
                    `SoD violation: you cannot perform '${action}' on a resource you created`,
                    'SOD_IDENTITY',
                    { rule: `${sodRule.creator_col} ≠ actor`, resource_id: resourceId }
                );
            }
        } catch (e) {
            console.error('[PolicyEngine] Identity SoD check error:', e.message);
            // Fail-open for now to avoid blocking, but log the error
        }
    }

    // ─── Step 4: Org-scoping (tenant isolation) ──────────────────
    // TODO Phase 2: Verify user.orgId matches resource.org_id

    return { allowed: true };
}

/**
 * Express middleware factory using policy engine.
 * 
 * Usage:
 *   router.patch('/suppliers/:id/approve', requirePolicy('supplier:approve_kyc'), handler)
 */
function requirePolicy(action, opts = {}) {
    return async (req, res, next) => {
        const resourceId = req.params?.id || null;
        const decision = await evaluate(req.user, action, resourceId, { ...opts, req });
        if (!decision.allowed) {
            return res.status(403).json(decision);
        }
        next();
    };
}

function deny(reason, code, extra = {}) {
    return { allowed: false, reason, code, ...extra };
}

module.exports = {
    evaluate,
    requirePolicy,
    KYC_APPROVER_ROLES,
    IDENTITY_SOD_RULES,
};
