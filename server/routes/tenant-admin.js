/**
 * Tenant Admin Routes — Company Admin Only
 *
 * Manages roles, users, and permissions within a single tenant.
 * All routes are scoped to req.tenantId via tenantGuard.
 *
 * Base path: /api/tenant
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware } = require('../auth/core');
const { requireTenantAdmin, checkPlanGuardrail, checkSoD, getPermissionsForRole, isCAForbidden, isHighRiskRole } = require('../auth/rbac');
const { tenantGuard } = require('../middleware/tenant-middleware');

// All routes require auth + tenant context + tenant admin
router.use(authMiddleware);
router.use(tenantGuard());
router.use(requireTenantAdmin());

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /roles — List roles for this tenant ─────────────────────────────────
router.get('/roles', async (req, res) => {
    try {
        const roles = await db.all(
            `SELECT r.*, 
        (SELECT COUNT(*) FROM rbac_user_roles ur WHERE ur.role_id = r.id) as user_count
       FROM rbac_roles r 
       WHERE r.tenant_id = ?
       ORDER BY r.is_system DESC, r.name`,
            [req.tenantId]
        );

        // Enrich with permission list
        for (const role of roles) {
            role.permissions = await getPermissionsForRole(role.id);
        }

        res.json({ roles });
    } catch (err) {
        console.error('[TenantAdmin] List roles error:', err);
        res.status(500).json({ error: 'Failed to list roles' });
    }
});

// ─── POST /roles — Create custom role ────────────────────────────────────────
router.post('/roles', async (req, res) => {
    try {
        const { name, display_name, description = '', permissions = [] } = req.body;

        if (!name || !display_name) {
            return res.status(400).json({ error: 'name and display_name are required' });
        }

        // Check name uniqueness within tenant
        const existing = await db.get(
            'SELECT id FROM rbac_roles WHERE tenant_id = ? AND name = ?',
            [req.tenantId, name]
        );
        if (existing) {
            return res.status(409).json({ error: `Role "${name}" already exists in this tenant` });
        }

        // Validate permissions against plan guardrails
        for (const perm of permissions) {
            const allowed = await checkPlanGuardrail(req.tenantId, perm);
            if (!allowed) {
                return res.status(403).json({
                    error: `Permission "${perm}" is not available in your plan`,
                    code: 'PLAN_GUARDRAIL'
                });
            }
        }

        // GOV: Permission ceiling — CA cannot create roles with governance permissions
        if (req.user.role === 'company_admin' || req.user.role === 'admin') {
            const forbidden = permissions.filter(p => isCAForbidden(p));
            if (forbidden.length > 0) {
                await db.run(
                    `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'PERMISSION_CEILING_BLOCKED', 'rbac_role', ?, ?)`,
                    [uuidv4(), req.user.id, 'new_role', JSON.stringify({ attempted_permissions: forbidden, role_name: name })]
                );
                return res.status(403).json({
                    error: 'Permission ceiling: Company Admin cannot grant governance permissions',
                    code: 'PERMISSION_CEILING',
                    forbidden_permissions: forbidden
                });
            }
        }

        const roleId = uuidv4();
        await db.run(
            `INSERT INTO rbac_roles (id, tenant_id, name, display_name, type, is_system, description) VALUES (?, ?, ?, ?, 'tenant', 0, ?)`,
            [roleId, req.tenantId, name, display_name, description]
        );

        // Map permissions
        let mapped = 0;
        for (const permKey of permissions) {
            const [resource, action] = permKey.split(':');
            const perm = await db.get(
                'SELECT id FROM rbac_permissions WHERE resource = ? AND action = ?',
                [resource, action]
            );
            if (perm) {
                await db.run('INSERT OR IGNORE INTO rbac_role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, perm.id]);
                mapped++;
            }
        }

        // Audit
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'ROLE_CREATED', 'rbac_role', ?, ?)`,
            [uuidv4(), req.user.id, roleId, JSON.stringify({ name, permissions: mapped, tenant_id: req.tenantId })]
        );

        if (typeof db.save === 'function') await db.save();
        res.status(201).json({ id: roleId, name, display_name, permissions_mapped: mapped, message: 'Role created' });
    } catch (err) {
        console.error('[TenantAdmin] Create role error:', err);
        res.status(500).json({ error: 'Failed to create role' });
    }
});

// ─── PUT /roles/:id — Update role permissions ────────────────────────────────
router.put('/roles/:id', async (req, res) => {
    try {
        const role = await db.get(
            'SELECT * FROM rbac_roles WHERE id = ? AND tenant_id = ?',
            [req.params.id, req.tenantId]
        );
        if (!role) return res.status(404).json({ error: 'Role not found' });
        if (role.is_system) return res.status(403).json({ error: 'Cannot modify system roles' });

        const { display_name, description, permissions } = req.body;

        // Update metadata
        if (display_name || description) {
            const updates = [];
            const params = [];
            if (display_name) { updates.push('display_name = ?'); params.push(display_name); }
            if (description !== undefined) { updates.push('description = ?'); params.push(description); }
            params.push(req.params.id);
            await db.run(`UPDATE rbac_roles SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        // Update permissions (full replace)
        if (Array.isArray(permissions)) {
            // Validate guardrails
            for (const perm of permissions) {
                const allowed = await checkPlanGuardrail(req.tenantId, perm);
                if (!allowed) {
                    return res.status(403).json({ error: `Permission "${perm}" is not available in your plan`, code: 'PLAN_GUARDRAIL' });
                }
            }

            // GOV: Permission ceiling enforcement on update
            if (req.user.role === 'company_admin' || req.user.role === 'admin') {
                const forbidden = permissions.filter(p => isCAForbidden(p));
                if (forbidden.length > 0) {
                    await db.run(
                        `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'PERMISSION_CEILING_BLOCKED', 'rbac_role', ?, ?)`,
                        [uuidv4(), req.user.id, req.params.id, JSON.stringify({ attempted_permissions: forbidden })]
                    );
                    return res.status(403).json({
                        error: 'Permission ceiling: Company Admin cannot grant governance permissions',
                        code: 'PERMISSION_CEILING',
                        forbidden_permissions: forbidden
                    });
                }
            }

            // Clear existing and re-map
            await db.run('DELETE FROM rbac_role_permissions WHERE role_id = ?', [req.params.id]);
            let mapped = 0;
            for (const permKey of permissions) {
                const [resource, action] = permKey.split(':');
                const perm = await db.get('SELECT id FROM rbac_permissions WHERE resource = ? AND action = ?', [resource, action]);
                if (perm) {
                    await db.run('INSERT OR IGNORE INTO rbac_role_permissions (role_id, permission_id) VALUES (?, ?)', [req.params.id, perm.id]);
                    mapped++;
                }
            }

            // Audit
            await db.run(
                `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'ROLE_UPDATED', 'rbac_role', ?, ?)`,
                [uuidv4(), req.user.id, req.params.id, JSON.stringify({ permissions_updated: mapped })]
            );
        }

        if (typeof db.save === 'function') await db.save();
        res.json({ message: 'Role updated', id: req.params.id });
    } catch (err) {
        console.error('[TenantAdmin] Update role error:', err);
        res.status(500).json({ error: 'Failed to update role' });
    }
});

// ─── DELETE /roles/:id — Delete role ─────────────────────────────────────────
router.delete('/roles/:id', async (req, res) => {
    try {
        const role = await db.get(
            'SELECT * FROM rbac_roles WHERE id = ? AND tenant_id = ?',
            [req.params.id, req.tenantId]
        );
        if (!role) return res.status(404).json({ error: 'Role not found' });
        if (role.is_system) return res.status(403).json({ error: 'Cannot delete system roles' });

        // Check if users are assigned
        const count = await db.get('SELECT COUNT(*) as c FROM rbac_user_roles WHERE role_id = ?', [req.params.id]);
        if (count?.c > 0) {
            return res.status(409).json({ error: `Cannot delete role: ${count.c} user(s) still assigned`, code: 'ROLE_IN_USE' });
        }

        await db.run('DELETE FROM rbac_role_permissions WHERE role_id = ?', [req.params.id]);
        await db.run('DELETE FROM rbac_roles WHERE id = ?', [req.params.id]);

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'ROLE_DELETED', 'rbac_role', ?, ?)`,
            [uuidv4(), req.user.id, req.params.id, JSON.stringify({ name: role.name })]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: 'Role deleted', id: req.params.id });
    } catch (err) {
        console.error('[TenantAdmin] Delete role error:', err);
        res.status(500).json({ error: 'Failed to delete role' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PERMISSION LISTING
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /permissions — List available business permissions ──────────────────
router.get('/permissions', async (req, res) => {
    try {
        // Company Admin can see tenant + business permissions (NOT platform)
        const permissions = await db.all(
            `SELECT id, resource, action, scope, level, description 
       FROM rbac_permissions 
       WHERE level IN ('tenant', 'business')
       ORDER BY level, resource, action`
        );

        // Group by resource for matrix UI
        const matrix = {};
        for (const p of permissions) {
            if (!matrix[p.resource]) {
                matrix[p.resource] = { resource: p.resource, level: p.level, actions: [] };
            }
            matrix[p.resource].actions.push({ action: p.action, id: p.id, description: p.description });
        }

        res.json({ permissions, matrix: Object.values(matrix) });
    } catch (err) {
        console.error('[TenantAdmin] List permissions error:', err);
        res.status(500).json({ error: 'Failed to list permissions' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /users — List tenant users with roles ───────────────────────────────
router.get('/users', async (req, res) => {
    try {
        const users = await db.all(
            `SELECT id, username, email, role, user_type, company, created_at, last_login
       FROM users 
       WHERE org_id = ? 
       ORDER BY created_at`,
            [req.tenantId]
        );

        // Enrich with RBAC roles
        for (const user of users) {
            const roles = await db.all(
                `SELECT r.id, r.name, r.display_name 
         FROM rbac_user_roles ur 
         JOIN rbac_roles r ON r.id = ur.role_id
         WHERE ur.user_id = ? AND (ur.expires_at IS NULL OR ur.expires_at > datetime('now'))`,
                [user.id]
            );
            user.rbac_roles = roles;
        }

        res.json({ users });
    } catch (err) {
        console.error('[TenantAdmin] List users error:', err);
        res.status(500).json({ error: 'Failed to list users' });
    }
});

// ─── POST /users — Create user within tenant ─────────────────────────────────
router.post('/users', async (req, res) => {
    try {
        const { username, email, password, role = 'operator', company = '' } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'username, email, and password are required' });
        }

        // Check email uniqueness globally
        const existing = await db.get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existing) {
            return res.status(409).json({ error: 'Username or email already taken' });
        }

        const userId = uuidv4();
        const hash = await bcrypt.hash(password, 12);
        const companyName = company || (req.tenant?.name || '');

        await db.run(
            `INSERT INTO users (id, username, email, password_hash, role, user_type, company, org_id) VALUES (?, ?, ?, ?, ?, 'tenant', ?, ?)`,
            [userId, username, email, hash, role, companyName, req.tenantId]
        );

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'USER_CREATED', 'user', ?, ?)`,
            [uuidv4(), req.user.id, userId, JSON.stringify({ username, role, tenant_id: req.tenantId })]
        );

        if (typeof db.save === 'function') await db.save();
        res.status(201).json({ id: userId, username, email, role, message: 'User created' });
    } catch (err) {
        console.error('[TenantAdmin] Create user error:', err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// ─── PUT /users/:id/roles — Assign roles to user ────────────────────────────
router.put('/users/:id/roles', async (req, res) => {
    try {
        const { role_ids = [], expires_at = null } = req.body;

        // GOV: Block self-role elevation
        if (req.params.id === req.user.id) {
            await db.run(
                `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'SELF_ELEVATION_BLOCKED', 'user', ?, ?)`,
                [uuidv4(), req.user.id, req.user.id, JSON.stringify({ attempted_roles: role_ids, reason: 'Self-role elevation is prohibited' })]
            );
            return res.status(403).json({
                error: 'Self-role elevation prohibited: You cannot assign roles to yourself',
                code: 'SELF_ELEVATION_BLOCKED'
            });
        }

        // Verify user belongs to this tenant
        const user = await db.get(
            'SELECT id, username FROM users WHERE id = ? AND org_id = ?',
            [req.params.id, req.tenantId]
        );
        if (!user) return res.status(404).json({ error: 'User not found in this tenant' });

        // GOV: Check if CA is trying to assign high-risk roles — require dual-control
        for (const roleId of role_ids) {
            const roleInfo = await db.get('SELECT name, display_name FROM rbac_roles WHERE id = ?', [roleId]);
            if (roleInfo && isHighRiskRole(roleInfo.name) && (req.user.role === 'company_admin' || req.user.role === 'admin')) {
                // Ensure pending_role_approvals table exists
                await db.run(`CREATE TABLE IF NOT EXISTS pending_role_approvals (
                    id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    role_id TEXT NOT NULL,
                    role_name TEXT NOT NULL,
                    requested_by TEXT NOT NULL,
                    tenant_id TEXT NOT NULL,
                    status TEXT DEFAULT 'pending',
                    approved_by TEXT,
                    expires_at TEXT,
                    reason TEXT,
                    created_at TEXT DEFAULT (NOW()),
                    resolved_at TEXT
                )`);

                // Create pending approval instead of immediate assignment
                const approvalId = uuidv4();
                await db.run(
                    `INSERT INTO pending_role_approvals (id, user_id, role_id, role_name, requested_by, tenant_id, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [approvalId, req.params.id, roleId, roleInfo.name, req.user.id, req.tenantId, expires_at]
                );

                // Audit log
                await db.run(
                    `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'HIGH_RISK_ROLE_PENDING', 'pending_approval', ?, ?)`,
                    [uuidv4(), req.user.id, approvalId, JSON.stringify({
                        role: roleInfo.name, display: roleInfo.display_name,
                        target_user: user.username, severity: 'high',
                        requires: 'org_owner or security_officer approval'
                    })]
                );

                // Remove this role from immediate assignment list
                role_ids.splice(role_ids.indexOf(roleId), 1);

                // If all roles were high-risk, return pending status
                if (role_ids.length === 0) {
                    return res.status(202).json({
                        message: 'High-risk role assignment requires approval',
                        code: 'DUAL_CONTROL_PENDING',
                        approval_id: approvalId,
                        pending_role: roleInfo.display_name,
                        requires_approval_from: 'org_owner or security_officer'
                    });
                }
            }
        }

        // Verify all roles belong to this tenant
        for (const roleId of role_ids) {
            const role = await db.get(
                'SELECT id, name FROM rbac_roles WHERE id = ? AND tenant_id = ?',
                [roleId, req.tenantId]
            );
            if (!role) {
                return res.status(400).json({ error: `Role ${roleId} not found in this tenant` });
            }

            // Check SoD for each role's permissions
            const rolePerms = await getPermissionsForRole(roleId);
            for (const perm of rolePerms) {
                const sod = await checkSoD(user.id, perm);
                if (sod.conflict) {
                    return res.status(409).json({
                        error: sod.details,
                        code: 'SOD_CONFLICT',
                        role: role.name,
                        permission: perm
                    });
                }
            }
        }

        // Remove existing roles for this tenant
        const tenantRoles = await db.all('SELECT id FROM rbac_roles WHERE tenant_id = ?', [req.tenantId]);
        const tenantRoleIds = tenantRoles.map(r => r.id);
        for (const rid of tenantRoleIds) {
            await db.run('DELETE FROM rbac_user_roles WHERE user_id = ? AND role_id = ?', [req.params.id, rid]);
        }

        // Assign new roles
        for (const roleId of role_ids) {
            await db.run(
                'INSERT OR IGNORE INTO rbac_user_roles (user_id, role_id, assigned_by, expires_at) VALUES (?, ?, ?, ?)',
                [req.params.id, roleId, req.user.id, expires_at]
            );
        }

        // Also update legacy role column (for backward compat)
        if (role_ids.length > 0) {
            const primaryRole = await db.get('SELECT name FROM rbac_roles WHERE id = ?', [role_ids[0]]);
            if (primaryRole) {
                await db.run('UPDATE users SET role = ? WHERE id = ?', [primaryRole.name, req.params.id]);
            }
        }

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'ROLES_ASSIGNED', 'user', ?, ?)`,
            [uuidv4(), req.user.id, req.params.id, JSON.stringify({ role_ids, expires_at })]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: 'Roles assigned', user_id: req.params.id, roles: role_ids });
    } catch (err) {
        console.error('[TenantAdmin] Assign roles error:', err);
        res.status(500).json({ error: 'Failed to assign roles' });
    }
});

// ─── DELETE /users/:id — Remove user from tenant ─────────────────────────────
router.delete('/users/:id', async (req, res) => {
    try {
        const user = await db.get(
            'SELECT id, username FROM users WHERE id = ? AND org_id = ?',
            [req.params.id, req.tenantId]
        );
        if (!user) return res.status(404).json({ error: 'User not found in this tenant' });

        // Don't allow deleting self
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        // Remove RBAC assignments
        await db.run('DELETE FROM rbac_user_roles WHERE user_id = ?', [req.params.id]);
        // Remove from tenant (set org_id to NULL, don't delete user row)
        await db.run('UPDATE users SET org_id = NULL WHERE id = ?', [req.params.id]);

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'USER_REMOVED', 'user', ?, ?)`,
            [uuidv4(), req.user.id, req.params.id, JSON.stringify({ username: user.username, tenant_id: req.tenantId })]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: 'User removed from tenant', user_id: req.params.id });
    } catch (err) {
        console.error('[TenantAdmin] Delete user error:', err);
        res.status(500).json({ error: 'Failed to remove user' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/audit', async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const logs = await db.all(
            `SELECT al.*, u.username as actor_name 
       FROM audit_log al
       LEFT JOIN users u ON u.id = al.actor_id
       WHERE al.actor_id IN (SELECT id FROM users WHERE org_id = ?)
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
            [req.tenantId, Math.min(parseInt(limit) || 50, 200), Math.max(parseInt(offset) || 0, 0)]
        );
        res.json({ logs });
    } catch (err) {
        console.error('[TenantAdmin] Audit error:', err);
        res.status(500).json({ error: 'Failed to load audit logs' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DUAL-CONTROL APPROVAL SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /approvals — List pending role approvals ──────────────────────────────
router.get('/approvals', async (req, res) => {
    try {
        const approvals = await db.all(
            `SELECT pa.*, 
                    u.username as target_user, u.email as target_email,
                    req_u.username as requester_name
             FROM pending_role_approvals pa
             LEFT JOIN users u ON u.id = pa.user_id
             LEFT JOIN users req_u ON req_u.id = pa.requested_by
             WHERE pa.tenant_id = ?
             ORDER BY pa.created_at DESC
             LIMIT 50`,
            [req.tenantId]
        );
        res.json({ approvals });
    } catch (err) {
        // Table may not exist yet
        res.json({ approvals: [] });
    }
});

// ─── POST /approvals/:id/approve — Approve high-risk role assignment ─────────
router.post('/approvals/:id/approve', async (req, res) => {
    try {
        // Only org_owner or security_officer can approve
        const approverRole = req.user.role;
        if (!['org_owner', 'security_officer', 'super_admin', 'admin'].includes(approverRole)) {
            return res.status(403).json({
                error: 'Only org_owner or security_officer can approve high-risk role assignments',
                code: 'DUAL_CONTROL_DENIED'
            });
        }

        const approval = await db.get(
            'SELECT * FROM pending_role_approvals WHERE id = ? AND tenant_id = ? AND status = ?',
            [req.params.id, req.tenantId, 'pending']
        );
        if (!approval) return res.status(404).json({ error: 'Approval not found or already resolved' });

        // Cannot approve own request
        if (approval.requested_by === req.user.id) {
            return res.status(403).json({
                error: 'Cannot approve your own request (dual-control)',
                code: 'DUAL_CONTROL_SELF_APPROVE'
            });
        }

        // Execute the role assignment
        await db.run(
            'INSERT OR IGNORE INTO rbac_user_roles (user_id, role_id, assigned_by, expires_at) VALUES (?, ?, ?, ?)',
            [approval.user_id, approval.role_id, req.user.id, approval.expires_at]
        );

        // Update legacy role column
        await db.run('UPDATE users SET role = ? WHERE id = ?', [approval.role_name, approval.user_id]);

        // Mark approval as approved
        await db.run(
            `UPDATE pending_role_approvals SET status = 'approved', approved_by = ?, resolved_at = NOW() WHERE id = ?`,
            [req.user.id, req.params.id]
        );

        // Audit
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'HIGH_RISK_ROLE_APPROVED', 'pending_approval', ?, ?)`,
            [uuidv4(), req.user.id, req.params.id, JSON.stringify({
                role: approval.role_name, target_user_id: approval.user_id,
                approver: req.user.username, severity: 'high'
            })]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: 'Role approved and assigned', approval_id: req.params.id, role: approval.role_name });
    } catch (err) {
        console.error('[TenantAdmin] Approve error:', err);
        res.status(500).json({ error: 'Failed to approve' });
    }
});

// ─── POST /approvals/:id/reject — Reject high-risk role assignment ──────────
router.post('/approvals/:id/reject', async (req, res) => {
    try {
        const approverRole = req.user.role;
        if (!['org_owner', 'security_officer', 'super_admin', 'admin'].includes(approverRole)) {
            return res.status(403).json({ error: 'Only org_owner or security_officer can reject', code: 'DUAL_CONTROL_DENIED' });
        }

        const approval = await db.get(
            'SELECT * FROM pending_role_approvals WHERE id = ? AND tenant_id = ? AND status = ?',
            [req.params.id, req.tenantId, 'pending']
        );
        if (!approval) return res.status(404).json({ error: 'Approval not found or already resolved' });

        const { reason = '' } = req.body;

        await db.run(
            `UPDATE pending_role_approvals SET status = 'rejected', approved_by = ?, reason = ?, resolved_at = NOW() WHERE id = ?`,
            [req.user.id, reason, req.params.id]
        );

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'HIGH_RISK_ROLE_REJECTED', 'pending_approval', ?, ?)`,
            [uuidv4(), req.user.id, req.params.id, JSON.stringify({
                role: approval.role_name, target_user_id: approval.user_id,
                rejector: req.user.username, reason, severity: 'high'
            })]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: 'Role assignment rejected', approval_id: req.params.id });
    } catch (err) {
        console.error('[TenantAdmin] Reject error:', err);
        res.status(500).json({ error: 'Failed to reject' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GOVERNANCE DASHBOARD (Operational Monitoring for CA)
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/governance/dashboard', async (req, res) => {
    try {
        const tid = req.tenantId;

        // Pending approvals
        let pendingCount = 0;
        try {
            const p = await db.get('SELECT COUNT(*) as c FROM pending_role_approvals WHERE tenant_id = ? AND status = ?', [tid, 'pending']);
            pendingCount = p?.c || 0;
        } catch (_) { /* table may not exist */ }

        // SoD conflict warnings (users with conflicting roles)
        const sodWarnings = [];
        const users = await db.all('SELECT id, username FROM users WHERE org_id = ?', [tid]);
        const { SOD_CONFLICTS } = require('../auth/rbac');
        for (const u of users.slice(0, 50)) {
            const perms = await db.all(`
                SELECT DISTINCT p.resource || ':' || p.action AS perm
                FROM rbac_user_roles ur
                JOIN rbac_role_permissions rp ON rp.role_id = ur.role_id
                JOIN rbac_permissions p ON p.id = rp.permission_id
                WHERE ur.user_id = ?`, [u.id]);
            const permSet = new Set(perms.map(r => r.perm));
            for (const [p1, p2] of SOD_CONFLICTS) {
                if (permSet.has(p1) && permSet.has(p2)) {
                    sodWarnings.push({ user: u.username, conflict: [p1, p2] });
                }
            }
        }

        // Recent high-severity audit events
        const highSeverityEvents = await db.all(
            `SELECT al.*, u.username as actor_name FROM audit_log al
             LEFT JOIN users u ON u.id = al.actor_id
             WHERE al.action IN ('SELF_ELEVATION_BLOCKED', 'PERMISSION_CEILING_BLOCKED', 'HIGH_RISK_ROLE_PENDING', 'HIGH_RISK_ROLE_APPROVED', 'HIGH_RISK_ROLE_REJECTED')
             AND al.actor_id IN (SELECT id FROM users WHERE org_id = ?)
             ORDER BY al.created_at DESC LIMIT 20`,
            [tid]
        );

        // Active user count
        const userCount = await db.get('SELECT COUNT(*) as c FROM users WHERE org_id = ?', [tid]);

        // Role distribution
        const roleDistribution = await db.all(
            `SELECT r.display_name, r.name, COUNT(ur.user_id) as count
             FROM rbac_roles r
             LEFT JOIN rbac_user_roles ur ON ur.role_id = r.id
             WHERE r.tenant_id = ?
             GROUP BY r.id
             ORDER BY count DESC`,
            [tid]
        );

        res.json({
            pending_approvals: pendingCount,
            sod_warnings: sodWarnings,
            sod_warning_count: sodWarnings.length,
            high_severity_events: highSeverityEvents,
            total_users: userCount?.c || 0,
            role_distribution: roleDistribution,
        });
    } catch (err) {
        console.error('[TenantAdmin] Governance dashboard error:', err);
        res.status(500).json({ error: 'Failed to load governance data' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ORG OWNER: APPOINT COMPANY ADMIN
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/tenant/appoint-admin — Org Owner appoints Company Admin by email
router.post('/appoint-admin', async (req, res) => {
    try {
        // Only org_owner (or super_admin) can appoint
        const callerRole = req.user.role;
        if (!['org_owner', 'super_admin'].includes(callerRole)) {
            return res.status(403).json({
                error: 'Only org_owner can appoint Company Admins',
                code: 'APPOINT_DENIED',
            });
        }

        const { email, name } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const tenantId = req.tenantId;

        // Check if already a company_admin in this org
        const existingCA = await db.get(
            `SELECT id FROM users WHERE email = ? AND org_id = ? AND role = 'company_admin'`,
            [email, tenantId]
        );
        if (existingCA) {
            return res.status(409).json({ error: 'This user is already a Company Admin', code: 'ALREADY_CA' });
        }

        let user = await db.get('SELECT id, email, org_id FROM users WHERE email = ?', [email]);
        let created = false;
        const tempPassword = 'Admin@' + Math.random().toString(36).substring(2, 10) + '!';

        if (!user) {
            // Create new user as company_admin
            const userId = uuidv4();
            const displayName = name || email.split('@')[0];
            const passwordHash = await bcrypt.hash(tempPassword, 12);

            await db.run(
                `INSERT INTO users (id, username, email, password_hash, role, org_id, user_type, must_change_password, created_at)
                 VALUES (?, ?, ?, ?, 'company_admin', ?, 'tenant', 1, datetime('now'))`,
                [userId, displayName, email, passwordHash, tenantId]
            );
            user = { id: userId, email };
            created = true;
        } else {
            // Promote existing user to company_admin
            if (user.org_id && user.org_id !== tenantId) {
                return res.status(409).json({ error: 'User belongs to a different organization', code: 'WRONG_ORG' });
            }
            await db.run('UPDATE users SET role = ?, org_id = ? WHERE id = ?', ['company_admin', tenantId, user.id]);
        }

        // Assign company_admin RBAC role
        const caRole = await db.get(
            `SELECT id FROM rbac_roles WHERE tenant_id = ? AND name = 'company_admin'`, [tenantId]
        );
        if (caRole) {
            await db.run(
                `INSERT OR IGNORE INTO rbac_user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)`,
                [user.id, caRole.id, req.user.id]
            );
        }

        // Audit
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'CA_APPOINTED', 'user', ?, ?)`,
            [uuidv4(), req.user.id, user.id, JSON.stringify({
                email, appointed_by: req.user.email, created,
                severity: 'high',
            })]
        );

        if (typeof db.save === 'function') await db.save();

        res.status(201).json({
            user_id: user.id,
            email,
            role: 'company_admin',
            created,
            temp_password: created ? tempPassword : undefined,
            must_change_password: created,
            message: created
                ? `Company Admin account created for ${email}. Temporary password provided.`
                : `${email} promoted to Company Admin.`,
        });
    } catch (err) {
        console.error('[TenantAdmin] Appoint admin error:', err);
        res.status(500).json({ error: 'Failed to appoint Company Admin' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ORG OWNER — STRATEGIC GOVERNANCE ENDPOINTS
// "See everything, touch nothing operational"
// ═══════════════════════════════════════════════════════════════════════════════

function requireOrgOwner() {
    return (req, res, next) => {
        if (!['org_owner', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Org Owner access required', code: 'OWNER_ONLY' });
        }
        next();
    };
}

// ─── 1. Governance Overview (Enhanced Dashboard) ─────────────────────────────
router.get('/owner/dashboard', requireOrgOwner(), async (req, res) => {
    try {
        const tid = req.tenantId;

        const [userCount, roleDistribution, highRiskCount, pendingApprovals,
            sodWarnings, suspiciousAlerts, carbonMints, riskModelVersion,
            selfElevationCount, inactivePrivCount, recentCritical] = await Promise.all([
                db.get(`SELECT COUNT(*) as c FROM users WHERE org_id = $1`, [tid]),
                db.all(`SELECT role, COUNT(*) as count FROM users WHERE org_id = $1 GROUP BY role ORDER BY count DESC`, [tid]),
                db.get(`SELECT COUNT(*) as c FROM users WHERE org_id = $1 AND role IN ('compliance_officer','risk_officer','risk_committee','security_officer','org_owner')`, [tid]),
                db.get(`SELECT COUNT(*) as c FROM pending_role_approvals WHERE tenant_id = $1 AND status = 'pending'`, [tid]).catch(() => ({ c: 0 })),
                db.all(`SELECT u.email, array_agg(ur.role_id) as roles FROM rbac_user_roles ur JOIN users u ON u.id = ur.user_id WHERE u.org_id = $1 GROUP BY u.email HAVING COUNT(*) > 3 LIMIT 10`, [tid]).catch(() => []),
                db.all(`SELECT action, details, created_at FROM audit_log WHERE entity_type IN ('session','security') AND actor_id IN (SELECT id FROM users WHERE org_id = $1) ORDER BY created_at DESC LIMIT 10`, [tid]).catch(() => []),
                db.get(`SELECT COUNT(*) as c FROM audit_log WHERE action = 'CARBON_MINT' AND actor_id IN (SELECT id FROM users WHERE org_id = $1) AND created_at > NOW() - INTERVAL '30 days'`, [tid]).catch(() => ({ c: 0 })),
                db.get(`SELECT details FROM audit_log WHERE action = 'RISK_MODEL_DEPLOY' AND actor_id IN (SELECT id FROM users WHERE org_id = $1) ORDER BY created_at DESC LIMIT 1`, [tid]).catch(() => null),
                // NEW: Self-elevation attempt count (30d)
                db.get(`SELECT COUNT(*) as c FROM audit_log WHERE action = 'SELF_ELEVATION_BLOCKED' AND actor_id IN (SELECT id FROM users WHERE org_id = $1) AND created_at > NOW() - INTERVAL '30 days'`, [tid]).catch(() => ({ c: 0 })),
                // NEW: Inactive privileged accounts count
                db.get(`SELECT COUNT(*) as c FROM users WHERE org_id = $1 AND role IN ('company_admin','admin','org_owner','security_officer','compliance_officer','risk_officer') AND (last_login IS NULL OR last_login < NOW() - INTERVAL '30 days')`, [tid]).catch(() => ({ c: 0 })),
                // NEW: Last 5 critical actions for quick view
                db.all(`SELECT al.action, al.created_at, u.email as actor_email FROM audit_log al LEFT JOIN users u ON u.id = al.actor_id WHERE al.action IN ('TENANT_FREEZE','FORCE_REAUTH','REVOKE_ALL_SESSIONS','ROLE_SUSPENDED','CA_APPOINTED','ROLE_APPOINTED','HIGH_RISK_ROLE_APPROVED','SELF_ELEVATION_BLOCKED') AND (al.actor_id IN (SELECT id FROM users WHERE org_id = $1) OR al.entity_id IN (SELECT id FROM users WHERE org_id = $1)) ORDER BY al.created_at DESC LIMIT 5`, [tid]).catch(() => []),
            ]);

        // Compute Privilege Risk Score (0-100)
        const hrCount = highRiskCount?.c || 0;
        const total = userCount?.c || 1;
        const sodCount = (sodWarnings || []).length;
        const inactiveCount = inactivePrivCount?.c || 0;
        const selfElevations = selfElevationCount?.c || 0;
        const privilege_risk_score = Math.min(100, Math.round(
            (hrCount / total) * 30 +           // High-risk role density
            sodCount * 15 +                     // Each SoD violation
            inactiveCount * 10 +                // Inactive privileged accounts
            selfElevations * 5 +                // Self-elevation attempts
            (pendingApprovals?.c || 0) * 3      // Unresolved approvals
        ));

        res.json({
            total_users: userCount?.c || 0,
            role_distribution: roleDistribution,
            high_risk_role_count: hrCount,
            pending_approvals: pendingApprovals?.c || 0,
            sod_warnings: sodWarnings,
            sod_violation_count: sodCount,
            suspicious_alerts: suspiciousAlerts,
            carbon_mints_30d: carbonMints?.c || 0,
            risk_model_version: (() => { try { const d = riskModelVersion?.details; if (!d) return 'N/A'; const obj = typeof d === 'string' ? JSON.parse(d) : d; return obj.version || 'N/A'; } catch { return 'N/A'; } })(),
            // Enhanced fields
            privilege_risk_score,
            inactive_privileged_count: inactiveCount,
            self_elevation_attempts_30d: selfElevations,
            recent_critical_5: recentCritical,
        });
    } catch (err) {
        console.error('[OwnerAPI] Dashboard error:', err);
        res.status(500).json({ error: 'Failed to load governance dashboard' });
    }
});

// ─── 2. Access Oversight ─────────────────────────────────────────────────────
router.get('/owner/access-oversight', requireOrgOwner(), async (req, res) => {
    try {
        const tid = req.tenantId;

        const [roleMatrix, escalationHistory, riskAccounts, inactivePrivileged] = await Promise.all([
            // Role matrix (read-only)
            db.all(`SELECT u.id, u.email, u.username, u.role, u.last_login, u.created_at
                    FROM users u WHERE u.org_id = $1 ORDER BY u.role, u.email`, [tid]),
            // Privilege escalation history (role changes)
            db.all(`SELECT al.actor_id, al.action, al.entity_id, al.details, al.created_at,
                           u.email as actor_email
                    FROM audit_log al LEFT JOIN users u ON u.id = al.actor_id
                    WHERE al.action IN ('ROLE_CHANGED','CA_APPOINTED','ROLE_ASSIGNED','SELF_ELEVATION_BLOCKED','PERMISSION_CEILING_BLOCKED')
                    AND al.entity_id IN (SELECT id FROM users WHERE org_id = $1)
                    ORDER BY al.created_at DESC LIMIT 50`, [tid]),
            // Highest-risk accounts (most permissions + roles)
            db.all(`SELECT u.email, u.role, u.last_login,
                           COUNT(DISTINCT ur.role_id) as role_count
                    FROM users u LEFT JOIN rbac_user_roles ur ON ur.user_id = u.id
                    WHERE u.org_id = $1 GROUP BY u.id, u.email, u.role, u.last_login
                    ORDER BY role_count DESC LIMIT 10`, [tid]),
            // Inactive privileged accounts (no login in 30+ days with admin-level roles)
            db.all(`SELECT email, role, last_login FROM users
                    WHERE org_id = $1 AND role IN ('company_admin','admin','org_owner','security_officer','compliance_officer','risk_officer')
                    AND (last_login IS NULL OR last_login < NOW() - INTERVAL '30 days')`, [tid]),
        ]);

        res.json({ role_matrix: roleMatrix, escalation_history: escalationHistory, risk_accounts: riskAccounts, inactive_privileged: inactivePrivileged });
    } catch (err) {
        console.error('[OwnerAPI] Access oversight error:', err);
        res.status(500).json({ error: 'Failed to load access oversight' });
    }
});

// ─── 3. Critical Action Log ──────────────────────────────────────────────────
router.get('/owner/critical-actions', requireOrgOwner(), async (req, res) => {
    try {
        const tid = req.tenantId;
        const criticalActions = await db.all(
            `SELECT al.id, al.actor_id, al.action, al.entity_type, al.entity_id, al.details, al.created_at,
                    u.email as actor_email
             FROM audit_log al LEFT JOIN users u ON u.id = al.actor_id
             WHERE al.action IN (
                 'RISK_MODEL_DEPLOY','CARBON_MINT','SCHEMA_CHANGE','REGULATORY_EXPORT',
                 'CA_APPOINTED','ORG_CREATED','TENANT_FREEZE','FORCE_REAUTH',
                 'REVOKE_ALL_SESSIONS','ROLE_SUSPENDED','EMERGENCY_AUDIT_EXPORT',
                 'PERMISSION_CEILING_BLOCKED','SELF_ELEVATION_BLOCKED','NEW_IP_LOGIN','ROLE_EXPIRED'
             )
             AND (al.actor_id IN (SELECT id FROM users WHERE org_id = $1) OR al.entity_id IN (SELECT id FROM users WHERE org_id = $1))
             ORDER BY al.created_at DESC LIMIT 100`,
            [tid]
        );

        res.json({ actions: criticalActions, total: criticalActions.length });
    } catch (err) {
        console.error('[OwnerAPI] Critical actions error:', err);
        res.status(500).json({ error: 'Failed to load critical actions' });
    }
});

// ─── 4. Emergency Controls ───────────────────────────────────────────────────
router.post('/owner/emergency', requireOrgOwner(), async (req, res) => {
    try {
        const { action, justification, target_role, target_user_id } = req.body;
        const tid = req.tenantId;

        if (!justification || justification.length < 10) {
            return res.status(400).json({ error: 'Justification is required (min 10 chars)', code: 'JUSTIFICATION_REQUIRED' });
        }

        const VALID_ACTIONS = ['TENANT_FREEZE', 'FORCE_REAUTH', 'REVOKE_ALL_SESSIONS', 'SUSPEND_ROLE', 'EMERGENCY_AUDIT_EXPORT'];
        if (!VALID_ACTIONS.includes(action)) {
            return res.status(400).json({ error: 'Invalid emergency action', valid_actions: VALID_ACTIONS });
        }

        let result = {};

        if (action === 'TENANT_FREEZE') {
            await db.run(`UPDATE organizations SET settings = jsonb_set(COALESCE(settings::jsonb, '{}'::jsonb), '{frozen}', 'true') WHERE id = $1`, [tid]);
            result = { message: 'Tenant frozen — all write operations blocked', frozen: true };
        } else if (action === 'FORCE_REAUTH') {
            const revoked = await db.run(`UPDATE sessions SET revoked = true WHERE user_id IN (SELECT id FROM users WHERE org_id = $1) AND revoked = false`, [tid]);
            result = { message: 'All user sessions invalidated — re-authentication required', sessions_revoked: true };
        } else if (action === 'REVOKE_ALL_SESSIONS') {
            await db.run(`UPDATE sessions SET revoked = true WHERE user_id IN (SELECT id FROM users WHERE org_id = $1) AND revoked = false`, [tid]);
            result = { message: 'All active sessions revoked', sessions_revoked: true };
        } else if (action === 'SUSPEND_ROLE') {
            if (!target_role) return res.status(400).json({ error: 'target_role is required for SUSPEND_ROLE' });
            await db.run(`UPDATE users SET role = 'viewer' WHERE org_id = $1 AND role = $2`, [tid, target_role]);
            result = { message: `All ${target_role} users demoted to viewer`, suspended_role: target_role };
        } else if (action === 'EMERGENCY_AUDIT_EXPORT') {
            const logs = await db.all(
                `SELECT al.* FROM audit_log al WHERE al.actor_id IN (SELECT id FROM users WHERE org_id = $1) ORDER BY al.created_at DESC LIMIT 1000`, [tid]
            );
            result = { message: 'Emergency audit export ready', log_count: logs.length, logs };
        }

        // Immutable audit log
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, 'emergency', $4, $5)`,
            [uuidv4(), req.user.id, action, tid, JSON.stringify({
                justification, target_role, target_user_id,
                severity: 'critical',
                triggered_by: req.user.email,
            })]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ success: true, action, ...result });
    } catch (err) {
        console.error('[OwnerAPI] Emergency action error:', err);
        res.status(500).json({ error: 'Emergency action failed' });
    }
});

// ─── 5. Appoint (CA or Security Officer) ─────────────────────────────────────
router.post('/owner/appoint', requireOrgOwner(), async (req, res) => {
    try {
        const { email, name, role: targetRole = 'company_admin' } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const APPOINTABLE = ['company_admin', 'security_officer'];
        if (!APPOINTABLE.includes(targetRole)) {
            return res.status(400).json({ error: `Can only appoint: ${APPOINTABLE.join(', ')}`, code: 'INVALID_ROLE' });
        }

        const tid = req.tenantId;
        let user = await db.get('SELECT id, email, org_id FROM users WHERE email = $1', [email]);
        let created = false;
        const tempPassword = 'Appoint@' + Math.random().toString(36).substring(2, 10) + '!';

        if (!user) {
            const userId = uuidv4();
            const displayName = name || email.split('@')[0];
            const passwordHash = await bcrypt.hash(tempPassword, 12);
            await db.run(
                `INSERT INTO users (id, username, email, password_hash, role, org_id, user_type, must_change_password, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6, 'tenant', true, NOW())`,
                [userId, displayName, email, passwordHash, targetRole, tid]
            );
            user = { id: userId, email };
            created = true;
        } else {
            if (user.org_id && user.org_id !== tid) {
                return res.status(409).json({ error: 'User belongs to a different organization' });
            }
            await db.run('UPDATE users SET role = $1, org_id = $2 WHERE id = $3', [targetRole, tid, user.id]);
        }

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES ($1, $2, 'ROLE_APPOINTED', 'user', $3, $4)`,
            [uuidv4(), req.user.id, user.id, JSON.stringify({
                email, role: targetRole, appointed_by: req.user.email, created, severity: 'high',
            })]
        );

        if (typeof db.save === 'function') await db.save();

        res.status(201).json({
            user_id: user.id, email, role: targetRole, created,
            temp_password: created ? tempPassword : undefined,
            message: created ? `${targetRole} account created for ${email}` : `${email} promoted to ${targetRole}`,
        });
    } catch (err) {
        console.error('[OwnerAPI] Appoint error:', err);
        res.status(500).json({ error: 'Failed to appoint' });
    }
});

// ─── 6. Privilege & Access Governance ────────────────────────────────────────
router.get('/owner/privilege-governance', requireOrgOwner(), async (req, res) => {
    try {
        const tid = req.tenantId;

        const [recentRoleAssignments, roleExpirations, selfElevationLog,
            highRiskUsers, sodConflicts] = await Promise.all([
                // Recent role assignments (who got what, when, by whom)
                db.all(`SELECT al.action, al.details, al.created_at,
                               u.email as actor_email, target.email as target_email
                        FROM audit_log al
                        LEFT JOIN users u ON u.id = al.actor_id
                        LEFT JOIN users target ON target.id = al.entity_id
                        WHERE al.action IN ('ROLES_ASSIGNED','HIGH_RISK_ROLE_APPROVED','HIGH_RISK_ROLE_REJECTED','HIGH_RISK_ROLE_PENDING','ROLE_APPOINTED','CA_APPOINTED')
                        AND (al.actor_id IN (SELECT id FROM users WHERE org_id = $1) OR al.entity_id IN (SELECT id FROM users WHERE org_id = $1))
                        ORDER BY al.created_at DESC LIMIT 30`, [tid]).catch(() => []),
                // Role expiration tracking
                db.all(`SELECT ur.expires_at, r.name as role_name, r.display_name, u.email
                        FROM rbac_user_roles ur
                        JOIN rbac_roles r ON r.id = ur.role_id
                        JOIN users u ON u.id = ur.user_id
                        WHERE r.tenant_id = $1 AND ur.expires_at IS NOT NULL
                        ORDER BY ur.expires_at ASC LIMIT 20`, [tid]).catch(() => []),
                // Self-assignment attempt log
                db.all(`SELECT al.created_at, al.details, u.email as actor_email
                        FROM audit_log al
                        LEFT JOIN users u ON u.id = al.actor_id
                        WHERE al.action IN ('SELF_ELEVATION_BLOCKED','PERMISSION_CEILING_BLOCKED')
                        AND al.actor_id IN (SELECT id FROM users WHERE org_id = $1)
                        ORDER BY al.created_at DESC LIMIT 20`, [tid]).catch(() => []),
                // High-risk role mapping
                db.all(`SELECT u.email, u.username, u.role, u.last_login, u.created_at,
                               COUNT(DISTINCT ur.role_id) as role_count
                        FROM users u
                        LEFT JOIN rbac_user_roles ur ON ur.user_id = u.id
                        WHERE u.org_id = $1 AND u.role IN ('compliance_officer','risk_officer','risk_committee','security_officer','org_owner','carbon_officer','company_admin')
                        GROUP BY u.id, u.email, u.username, u.role, u.last_login, u.created_at
                        ORDER BY role_count DESC`, [tid]).catch(() => []),
                // SoD conflict report
                db.all(`SELECT u.email, array_agg(ur.role_id) as roles, COUNT(DISTINCT ur.role_id) as role_count
                        FROM rbac_user_roles ur
                        JOIN users u ON u.id = ur.user_id
                        WHERE u.org_id = $1
                        GROUP BY u.id, u.email
                        HAVING COUNT(DISTINCT ur.role_id) > 2
                        ORDER BY role_count DESC LIMIT 15`, [tid]).catch(() => []),
            ]);

        res.json({
            recent_role_assignments: recentRoleAssignments,
            role_expirations: roleExpirations,
            self_elevation_log: selfElevationLog,
            high_risk_users: highRiskUsers,
            sod_conflicts: sodConflicts,
        });
    } catch (err) {
        console.error('[OwnerAPI] Privilege governance error:', err);
        res.status(500).json({ error: 'Failed to load privilege governance data' });
    }
});

// ─── 7. Risk & Integrity Monitoring ─────────────────────────────────────────
router.get('/owner/risk-monitoring', requireOrgOwner(), async (req, res) => {
    try {
        const tid = req.tenantId;

        const [riskSignals, anomalies, newIpLogins] = await Promise.all([
            // Risk signals: suspicious and security-related events
            db.all(`SELECT al.id, al.actor_id, al.action, al.entity_type, al.details, al.created_at,
                           u.email as actor_email
                    FROM audit_log al LEFT JOIN users u ON u.id = al.actor_id
                    WHERE al.action IN (
                        'SELF_ELEVATION_BLOCKED','PERMISSION_CEILING_BLOCKED',
                        'NEW_IP_LOGIN','ROLE_EXPIRED','SOD_CONFLICT_DETECTED'
                    )
                    AND (al.actor_id IN (SELECT id FROM users WHERE org_id = $1) OR al.entity_id IN (SELECT id FROM users WHERE org_id = $1))
                    ORDER BY al.created_at DESC LIMIT 50`, [tid]).catch(() => []),
            // Anomalous patterns: failed logins, unusual hours
            db.all(`SELECT al.action, al.details, al.created_at, u.email as actor_email
                    FROM audit_log al LEFT JOIN users u ON u.id = al.actor_id
                    WHERE al.action IN ('LOGIN_FAILED','SUSPICIOUS_ACCESS','RATE_LIMIT_HIT','SESSION_HIJACK_DETECTED')
                    AND al.actor_id IN (SELECT id FROM users WHERE org_id = $1)
                    ORDER BY al.created_at DESC LIMIT 30`, [tid]).catch(() => []),
            // New IP logins
            db.all(`SELECT al.details, al.created_at, u.email as actor_email
                    FROM audit_log al LEFT JOIN users u ON u.id = al.actor_id
                    WHERE al.action = 'NEW_IP_LOGIN'
                    AND al.actor_id IN (SELECT id FROM users WHERE org_id = $1)
                    ORDER BY al.created_at DESC LIMIT 20`, [tid]).catch(() => []),
        ]);

        res.json({
            risk_signals: riskSignals,
            anomalies: anomalies,
            new_ip_logins: newIpLogins,
            total_signals: riskSignals.length + anomalies.length,
        });
    } catch (err) {
        console.error('[OwnerAPI] Risk monitoring error:', err);
        res.status(500).json({ error: 'Failed to load risk monitoring data' });
    }
});

// ─── 8. Governance Activity Log (Meta-Governance) ───────────────────────────
router.get('/owner/governance-log', requireOrgOwner(), async (req, res) => {
    try {
        const tid = req.tenantId;

        const [governanceActions, emergencyLog, appointmentHistory] = await Promise.all([
            // All governance-level actions (immutable trail)
            db.all(`SELECT al.id, al.actor_id, al.action, al.entity_type, al.entity_id, al.details, al.created_at,
                           u.email as actor_email
                    FROM audit_log al LEFT JOIN users u ON u.id = al.actor_id
                    WHERE al.action IN (
                        'CA_APPOINTED','ROLE_APPOINTED','ROLES_ASSIGNED',
                        'HIGH_RISK_ROLE_APPROVED','HIGH_RISK_ROLE_REJECTED','HIGH_RISK_ROLE_PENDING',
                        'ROLE_CHANGED','ROLE_SUSPENDED','USER_CREATED','USER_REMOVED',
                        'RISK_MODEL_DEPLOY','SCHEMA_CHANGE','REGULATORY_EXPORT',
                        'CARBON_MINT','ORG_CREATED'
                    )
                    AND (al.actor_id IN (SELECT id FROM users WHERE org_id = $1) OR al.entity_id IN (SELECT id FROM users WHERE org_id = $1))
                    ORDER BY al.created_at DESC LIMIT 100`, [tid]).catch(() => []),
            // Emergency / break-glass events
            db.all(`SELECT al.id, al.action, al.details, al.created_at, u.email as actor_email
                    FROM audit_log al LEFT JOIN users u ON u.id = al.actor_id
                    WHERE al.entity_type = 'emergency'
                    AND (al.actor_id IN (SELECT id FROM users WHERE org_id = $1) OR al.entity_id = $1)
                    ORDER BY al.created_at DESC LIMIT 50`, [tid]).catch(() => []),
            // CA/SO appointment history
            db.all(`SELECT al.action, al.details, al.created_at, u.email as actor_email, target.email as target_email
                    FROM audit_log al
                    LEFT JOIN users u ON u.id = al.actor_id
                    LEFT JOIN users target ON target.id = al.entity_id
                    WHERE al.action IN ('CA_APPOINTED','ROLE_APPOINTED')
                    AND (al.actor_id IN (SELECT id FROM users WHERE org_id = $1) OR al.entity_id IN (SELECT id FROM users WHERE org_id = $1))
                    ORDER BY al.created_at DESC LIMIT 30`, [tid]).catch(() => []),
        ]);

        res.json({
            governance_actions: governanceActions,
            emergency_log: emergencyLog,
            appointment_history: appointmentHistory,
            total_entries: governanceActions.length,
        });
    } catch (err) {
        console.error('[OwnerAPI] Governance log error:', err);
        res.status(500).json({ error: 'Failed to load governance log' });
    }
});

// ─── 9. Financial & Plan (Org-level — by org_id) ────────────────────────────
router.get('/owner/financial', requireOrgOwner(), async (req, res) => {
    try {
        const tid = req.tenantId;

        const [orgPlan, orgInvoices, orgUsage, orgInfo] = await Promise.all([
            // Active billing plan for any user in this org
            db.get(`SELECT bp.* FROM billing_plans bp
                    JOIN users u ON u.id = bp.user_id
                    WHERE u.org_id = $1 AND bp.status = 'active'
                    ORDER BY bp.started_at DESC LIMIT 1`, [tid]).catch(() => null),
            // All invoices for users in this org
            db.all(`SELECT i.* FROM invoices i
                    JOIN users u ON u.id = i.user_id
                    WHERE u.org_id = $1
                    ORDER BY i.created_at DESC`, [tid]).catch(() => []),
            // Usage stats (org-wide)
            Promise.all([
                db.get(`SELECT COUNT(*) as c FROM scan_events WHERE scanned_at >= date_trunc('month', NOW())`).catch(() => ({ c: 0 })),
                db.get(`SELECT COALESCE(SUM(file_size), 0) as s FROM evidence_items`).catch(() => ({ s: 0 })),
                db.get(`SELECT COUNT(*) as c FROM audit_log WHERE created_at >= date_trunc('month', NOW()) AND actor_id IN (SELECT id FROM users WHERE org_id = $1)`, [tid]).catch(() => ({ c: 0 })),
            ]),
            // Org info
            db.get(`SELECT name, plan, settings FROM organizations WHERE id = $1`, [tid]).catch(() => null),
        ]);

        const plan = orgPlan || {};
        const isEnterprise = (plan.plan_name === 'enterprise') || (orgInfo?.plan === 'enterprise');

        // Build usage object
        const [scans, evidence, apiCalls] = orgUsage;
        const usage = {
            scans: { used: scans?.c || 0, limit: isEnterprise ? '∞' : (plan.scan_limit || 100) },
            api_calls: { used: apiCalls?.c || 0, limit: isEnterprise ? '∞' : (plan.api_limit || 500) },
            storage_mb: {
                used: Math.round((evidence?.s || 0) / (1024 * 1024) * 100) / 100,
                limit: isEnterprise ? '∞' : (plan.storage_mb || 50),
            },
        };

        const totalPaid = (orgInvoices || []).filter(i => i.status === 'paid').reduce((s, i) => s + (i.amount || 0), 0);

        res.json({
            plan: {
                plan_name: plan.plan_name || orgInfo?.plan || 'free',
                price_monthly: plan.price_monthly || 0,
                billing_cycle: plan.billing_cycle || 'monthly',
                sla_level: plan.sla_level || null,
                scan_limit: plan.scan_limit || 0,
                api_limit: plan.api_limit || 0,
                storage_mb: plan.storage_mb || 0,
                status: plan.status || 'active',
                started_at: plan.started_at,
            },
            period: new Date().toISOString().substring(0, 7),
            usage,
            invoices: orgInvoices || [],
            total_paid: totalPaid,
            org_name: orgInfo?.name || '',
        });
    } catch (err) {
        console.error('[OwnerAPI] Financial error:', err);
        res.status(500).json({ error: 'Failed to load financial data' });
    }
});

// ─── 10. Compliance & Legal (Org-level — by org_id) ─────────────────────────
router.get('/owner/compliance', requireOrgOwner(), async (req, res) => {
    try {
        const tid = req.tenantId;

        const [retentionPolicies, complianceRecords, gdprActivity, consentStats, orgSettings] = await Promise.all([
            // Retention policies created by org users (or all if table has no tenant scope)
            db.all(`SELECT drp.* FROM data_retention_policies drp
                    WHERE drp.created_by IN (SELECT id FROM users WHERE org_id = $1)
                    ORDER BY drp.created_at DESC`, [tid]).catch(() => []),
            // Compliance records linked to org's products
            db.all(`SELECT cr.* FROM compliance_records cr
                    WHERE cr.entity_id IN (SELECT id FROM products WHERE org_id = $1)
                    ORDER BY cr.created_at DESC LIMIT 50`, [tid]).catch(() => []),
            // GDPR activity for org users
            db.all(`SELECT al.action, al.created_at, al.details, u.email as actor_email
                    FROM audit_log al
                    LEFT JOIN users u ON u.id = al.actor_id
                    WHERE al.action IN ('GDPR_EXPORT','GDPR_DATA_EXPORT','GDPR_DELETION','CONSENT_GIVEN','RETENTION_EXECUTED')
                    AND al.actor_id IN (SELECT id FROM users WHERE org_id = $1)
                    ORDER BY al.created_at DESC LIMIT 30`, [tid]).catch(() => []),
            // Consent stats for this org
            Promise.all([
                db.get(`SELECT COUNT(*) as c FROM users WHERE org_id = $1`, [tid]).catch(() => ({ c: 0 })),
                db.get(`SELECT COUNT(DISTINCT al.actor_id) as c FROM audit_log al
                        WHERE al.action = 'CONSENT_GIVEN'
                        AND al.actor_id IN (SELECT id FROM users WHERE org_id = $1)`, [tid]).catch(() => ({ c: 0 })),
            ]),
            // Org settings for compliance context
            db.get(`SELECT name, plan, settings, feature_flags FROM organizations WHERE id = $1`, [tid]).catch(() => null),
        ]);

        const [totalUsers, consentedUsers] = consentStats;
        const totalU = totalUsers?.c || 0;
        const consentedU = consentedUsers?.c || 0;
        const consentRate = totalU > 0 ? Math.round((consentedU / totalU) * 100) : 0;

        // Default retention policies if none exist for this org
        const retention = retentionPolicies.length > 0 ? retentionPolicies : [
            { id: 'default-1', table_name: 'audit_log', name: 'Audit Log', retention_days: 730, action: 'archive', is_active: true, is_default: true },
            { id: 'default-2', table_name: 'scan_events', name: 'Scan Events', retention_days: 365, action: 'archive', is_active: true, is_default: true },
            { id: 'default-3', table_name: 'fraud_alerts', name: 'Fraud Alerts', retention_days: 365, action: 'archive', is_active: true, is_default: true },
            { id: 'default-4', table_name: 'usage_metrics', name: 'Usage Metrics', retention_days: 180, action: 'delete', is_active: true, is_default: true },
            { id: 'default-5', table_name: 'webhook_events', name: 'Webhook Events', retention_days: 90, action: 'delete', is_active: true, is_default: true },
        ];

        // Compliance score computation
        const hasRetention = retention.length > 0;
        const hasRecords = complianceRecords.length > 0;
        const compliantRecords = complianceRecords.filter(r => r.status === 'compliant').length;
        const totalRecords = complianceRecords.length;
        const recordScore = totalRecords > 0 ? Math.round((compliantRecords / totalRecords) * 100) : 0;
        const complianceScore = Math.round(
            (hasRetention ? 30 : 0) +
            (consentRate > 50 ? 20 : consentRate > 0 ? 10 : 0) +
            (recordScore * 0.5)
        );

        // Framework breakdown
        const frameworks = {};
        complianceRecords.forEach(r => {
            if (!frameworks[r.framework]) frameworks[r.framework] = { total: 0, compliant: 0, partial: 0, non_compliant: 0 };
            frameworks[r.framework].total++;
            if (r.status === 'compliant') frameworks[r.framework].compliant++;
            else if (r.status === 'partial') frameworks[r.framework].partial++;
            else frameworks[r.framework].non_compliant++;
        });

        res.json({
            compliance_score: complianceScore,
            consent: { total_users: totalU, consented: consentedU, rate: consentRate },
            retention_policies: retention,
            compliance_records: complianceRecords,
            frameworks: Object.entries(frameworks).map(([name, data]) => ({ framework: name, ...data })),
            gdpr_activity: gdprActivity,
            summary: {
                total_records: totalRecords,
                compliant: compliantRecords,
                partial: complianceRecords.filter(r => r.status === 'partial').length,
                non_compliant: complianceRecords.filter(r => r.status !== 'compliant' && r.status !== 'partial').length,
            },
            org_plan: orgSettings?.plan || 'free',
        });
    } catch (err) {
        console.error('[OwnerAPI] Compliance error:', err);
        res.status(500).json({ error: 'Failed to load compliance data' });
    }
});

// ═════════════════════════════════════════════════════════════════════════════
// CAPITAL COMMAND SYSTEM (CCS) — CEO Decision Intelligence
// All queries scoped by org_id
// ═════════════════════════════════════════════════════════════════════════════

function requireExecutiveAccess() {
    return (req, res, next) => {
        if (!['org_owner', 'super_admin', 'executive'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Executive access required', code: 'EXEC_ONLY' });
        }
        next();
    };
}

// ─── CCS Layer 1: Capital Exposure Radar ─────────────────────────────────────
router.get('/owner/ccs/exposure', requireExecutiveAccess(), async (req, res) => {
    try {
        const tid = req.tenantId;

        const [
            productStats, scanStats30d, scanStatsPrev, fraudAlerts,
            compRecords, supplyEvents, geoBreakdown, categoryBreakdown,
            orgInfo
        ] = await Promise.all([
            // Products overview
            db.get(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'active') as active,
                    ROUND(AVG(trust_score)::numeric, 2) as avg_trust
                    FROM products WHERE org_id = $1`, [tid]),
            // Scan stats (30d)
            db.get(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE result = 'suspicious') as suspicious,
                    COUNT(*) FILTER (WHERE result = 'counterfeit') as counterfeit,
                    COUNT(*) FILTER (WHERE result = 'authentic') as authentic,
                    ROUND(AVG(trust_score)::numeric, 3) as avg_trust,
                    ROUND(AVG(fraud_score)::numeric, 3) as avg_fraud
                    FROM scan_events WHERE org_id = $1
                    AND scanned_at >= NOW() - INTERVAL '30 days'`, [tid]),
            // Scan stats (prev 30d for trend)
            db.get(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE result = 'suspicious' OR result = 'counterfeit') as flagged
                    FROM scan_events WHERE org_id = $1
                    AND scanned_at >= NOW() - INTERVAL '60 days'
                    AND scanned_at < NOW() - INTERVAL '30 days'`, [tid]),
            // Fraud alerts
            db.get(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status != 'resolved') as open,
                    COUNT(*) FILTER (WHERE severity = 'critical') as critical,
                    COUNT(*) FILTER (WHERE severity = 'high') as high
                    FROM fraud_alerts WHERE product_id IN (SELECT id FROM products WHERE org_id = $1)`, [tid]),
            // Compliance records
            db.get(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'compliant') as compliant,
                    COUNT(*) FILTER (WHERE status = 'partial') as partial,
                    COUNT(*) FILTER (WHERE status != 'compliant' AND status != 'partial') as non_compliant
                    FROM compliance_records WHERE entity_id IN (SELECT id FROM products WHERE org_id = $1)`, [tid]),
            // Supply chain events
            db.get(`SELECT COUNT(*) as total FROM supply_chain_events
                    WHERE product_id IN (SELECT id FROM products WHERE org_id = $1)`, [tid]),
            // Geographic exposure
            db.all(`SELECT geo_country, COUNT(*) as scans,
                    COUNT(*) FILTER (WHERE result = 'suspicious' OR result = 'counterfeit') as flagged,
                    ROUND(AVG(fraud_score)::numeric, 3) as avg_fraud
                    FROM scan_events WHERE org_id = $1
                    AND scanned_at >= NOW() - INTERVAL '30 days'
                    AND geo_country IS NOT NULL
                    GROUP BY geo_country ORDER BY scans DESC LIMIT 15`, [tid]),
            // Category exposure
            db.all(`SELECT p.category, COUNT(DISTINCT p.id) as products,
                    COUNT(se.id) as scans,
                    COUNT(se.id) FILTER (WHERE se.result = 'suspicious') as suspicious
                    FROM products p
                    LEFT JOIN scan_events se ON se.product_id = p.id
                        AND se.scanned_at >= NOW() - INTERVAL '30 days'
                    WHERE p.org_id = $1 GROUP BY p.category ORDER BY scans DESC`, [tid]),
            // Org info + financial config
            db.get(`SELECT name, plan, settings FROM organizations WHERE id = $1`, [tid]),
        ]);

        const s30 = scanStats30d || {};
        const sPrev = scanStatsPrev || {};
        const fa = fraudAlerts || {};
        const cr = compRecords || {};
        const fin = orgInfo?.settings?.financials || {};

        // Capital exposure calculations
        const annualRevenue = fin.annual_revenue || 0;
        const brandValue = fin.brand_value_estimate || 0;
        const totalScans = parseInt(s30.total) || 0;
        const flaggedScans = (parseInt(s30.suspicious) || 0) + (parseInt(s30.counterfeit) || 0);
        const fraudRate = totalScans > 0 ? flaggedScans / totalScans : 0;
        const prevFlagged = parseInt(sPrev.flagged) || 0;
        const prevTotal = parseInt(sPrev.total) || 1;
        const prevFraudRate = prevTotal > 0 ? prevFlagged / prevTotal : 0;

        // Risk dimensions ($)
        const revenueAtRisk = Math.round(annualRevenue * fraudRate);
        const brandAtRisk = Math.round(brandValue * (1 - (parseFloat(s30.avg_trust) || 0.9)));
        const complianceRiskPct = cr.total > 0 ? (parseInt(cr.non_compliant || 0) + parseInt(cr.partial || 0) * 0.5) / parseInt(cr.total) : 0;
        const supplyChainRiskIndex = parseFloat(s30.avg_fraud) || 0;

        // Total exposure
        const totalExposure = revenueAtRisk + brandAtRisk;

        // Geo risk map
        const geoRisk = (geoBreakdown || []).map(g => ({
            country: g.geo_country,
            scans: parseInt(g.scans),
            flagged: parseInt(g.flagged),
            fraud_rate: parseInt(g.scans) > 0 ? Math.round((parseInt(g.flagged) / parseInt(g.scans)) * 100) : 0,
            avg_fraud_score: parseFloat(g.avg_fraud) || 0,
            risk_level: parseFloat(g.avg_fraud) > 0.5 ? 'critical' : parseFloat(g.avg_fraud) > 0.3 ? 'high' : parseFloat(g.avg_fraud) > 0.1 ? 'medium' : 'low',
        }));

        res.json({
            exposure: {
                total_capital_at_risk: totalExposure,
                revenue_at_risk: revenueAtRisk,
                brand_value_at_risk: brandAtRisk,
                compliance_risk_pct: Math.round(complianceRiskPct * 100),
                supply_chain_risk_index: supplyChainRiskIndex,
                fraud_exposure_rate: Math.round(fraudRate * 10000) / 100,
            },
            products: {
                total: parseInt(productStats?.total) || 0,
                active: parseInt(productStats?.active) || 0,
                avg_trust: parseFloat(productStats?.avg_trust) || 0,
            },
            scans_30d: {
                total: totalScans,
                authentic: parseInt(s30.authentic) || 0,
                suspicious: parseInt(s30.suspicious) || 0,
                counterfeit: parseInt(s30.counterfeit) || 0,
                avg_trust: parseFloat(s30.avg_trust) || 0,
                avg_fraud: parseFloat(s30.avg_fraud) || 0,
                trend: prevTotal > 0 ? Math.round(((totalScans - prevTotal) / prevTotal) * 100) : 0,
                fraud_trend: Math.round((fraudRate - prevFraudRate) * 10000) / 100,
            },
            fraud: {
                total: parseInt(fa.total) || 0,
                open: parseInt(fa.open) || 0,
                critical: parseInt(fa.critical) || 0,
                high: parseInt(fa.high) || 0,
            },
            compliance: {
                total: parseInt(cr.total) || 0,
                compliant: parseInt(cr.compliant) || 0,
                partial: parseInt(cr.partial) || 0,
                non_compliant: parseInt(cr.non_compliant) || 0,
                score: cr.total > 0 ? Math.round((parseInt(cr.compliant) / parseInt(cr.total)) * 100) : 0,
            },
            supply_chain: { events: parseInt(supplyEvents?.total) || 0 },
            geo_risk: geoRisk,
            category_exposure: (categoryBreakdown || []).map(c => ({
                category: c.category,
                products: parseInt(c.products),
                scans: parseInt(c.scans),
                suspicious: parseInt(c.suspicious),
                risk_rate: parseInt(c.scans) > 0 ? Math.round((parseInt(c.suspicious) / parseInt(c.scans)) * 100) : 0,
            })),
            financial_config: {
                annual_revenue: annualRevenue,
                brand_value: brandValue,
                configured: annualRevenue > 0,
            },
        });
    } catch (err) {
        console.error('[CCS] Exposure error:', err);
        res.status(500).json({ error: 'Failed to load capital exposure data' });
    }
});

// ─── CCS Layer 4: Decision Command Center ───────────────────────────────────
router.get('/owner/ccs/decisions', requireExecutiveAccess(), async (req, res) => {
    try {
        const tid = req.tenantId;

        const [criticalAlerts, complianceDeadlines, pendingApprovals, recentAnomalies, recentAudit] = await Promise.all([
            // Critical/high fraud alerts (unresolved)
            db.all(`SELECT fa.id, fa.alert_type, fa.severity, fa.description, fa.status, fa.created_at,
                           p.name as product_name, p.category
                    FROM fraud_alerts fa
                    JOIN products p ON p.id = fa.product_id
                    WHERE p.org_id = $1 AND fa.status != 'resolved'
                    ORDER BY CASE fa.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
                             fa.created_at DESC LIMIT 10`, [tid]),
            // Compliance records expiring within 60 days
            db.all(`SELECT cr.framework, cr.requirement, cr.status, cr.next_review, cr.checked_by,
                           p.name as product_name
                    FROM compliance_records cr
                    JOIN products p ON p.id = cr.entity_id
                    WHERE p.org_id = $1 AND cr.next_review IS NOT NULL
                    AND cr.next_review <= NOW() + INTERVAL '60 days'
                    ORDER BY cr.next_review ASC LIMIT 10`, [tid]),
            // Pending role/governance approvals
            db.all(`SELECT al.action, al.details, al.created_at, u.email as actor_email
                    FROM audit_log al
                    LEFT JOIN users u ON u.id = al.actor_id
                    WHERE al.action IN ('ROLE_CHANGE_REQUESTED','APPROVAL_PENDING','CA_APPOINTMENT_REQUESTED')
                    AND al.actor_id IN (SELECT id FROM users WHERE org_id = $1)
                    ORDER BY al.created_at DESC LIMIT 5`, [tid]),
            // Recent anomalies
            db.all(`SELECT ad.anomaly_type, ad.severity, ad.score, ad.description, ad.detected_at, ad.status
                    FROM anomaly_detections ad
                    WHERE ad.status != 'resolved'
                    ORDER BY ad.detected_at DESC LIMIT 5`).catch(() => []),
            // Recent critical audit actions
            db.all(`SELECT al.action, al.entity_type, al.details, al.created_at, u.email
                    FROM audit_log al
                    LEFT JOIN users u ON u.id = al.actor_id
                    WHERE al.actor_id IN (SELECT id FROM users WHERE org_id = $1)
                    AND al.action IN ('EMERGENCY_ACTION','LOCKOUT','ROLE_CHANGED','SELF_ELEVATION_BLOCKED','MFA_DISABLED')
                    ORDER BY al.created_at DESC LIMIT 5`, [tid]),
        ]);

        // Classify decisions
        const strategic_alerts = (criticalAlerts || []).map(a => ({
            id: a.id,
            severity: a.severity,
            type: a.alert_type,
            title: `${a.severity.toUpperCase()}: ${a.description}`,
            product: a.product_name,
            category: a.category,
            time: a.created_at,
            action_required: a.severity === 'critical' ? 'IMMEDIATE ACTION REQUIRED' : 'Review and assess',
        }));

        const compliance_actions = (complianceDeadlines || []).map(c => {
            const daysUntil = Math.ceil((new Date(c.next_review) - Date.now()) / 86400000);
            return {
                framework: c.framework,
                requirement: c.requirement,
                product: c.product_name,
                status: c.status,
                days_until_review: daysUntil,
                urgency: daysUntil <= 14 ? 'critical' : daysUntil <= 30 ? 'high' : 'medium',
                action: daysUntil <= 14 ? `URGENT: ${c.framework} review due in ${daysUntil} days` : `Schedule ${c.framework} review (${daysUntil} days)`,
            };
        });

        const governance_actions = (pendingApprovals || []).map(a => {
            let details = {};
            try { details = typeof a.details === 'string' ? JSON.parse(a.details) : (a.details || {}); } catch (_) { }
            return { action: a.action, actor: a.actor_email, time: a.created_at, details };
        });

        res.json({
            strategic_alerts,
            compliance_actions,
            governance_actions,
            anomalies: recentAnomalies || [],
            security_events: (recentAudit || []).map(a => {
                let details = {};
                try { details = typeof a.details === 'string' ? JSON.parse(a.details) : (a.details || {}); } catch (_) { }
                return { action: a.action, actor: a.email, time: a.created_at, details };
            }),
            summary: {
                total_decisions: strategic_alerts.length + compliance_actions.length + governance_actions.length,
                critical: strategic_alerts.filter(a => a.severity === 'critical').length,
                high: strategic_alerts.filter(a => a.severity === 'high').length,
                compliance_urgent: compliance_actions.filter(c => c.urgency === 'critical').length,
            },
        });
    } catch (err) {
        console.error('[CCS] Decisions error:', err);
        res.status(500).json({ error: 'Failed to load decision data' });
    }
});

// ─── CCS Layer 5: Enterprise Value Monitor ──────────────────────────────────
router.get('/owner/ccs/valuation', requireExecutiveAccess(), async (req, res) => {
    try {
        const tid = req.tenantId;

        const [orgInfo, compStats, scanStats, fraudStats, userStats, retentionStats, consentStats, invoiceStats] = await Promise.all([
            db.get(`SELECT name, plan, settings FROM organizations WHERE id = $1`, [tid]),
            // Compliance maturity
            db.get(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'compliant') as compliant
                    FROM compliance_records WHERE entity_id IN (SELECT id FROM products WHERE org_id = $1)`, [tid]),
            // Scan integrity
            db.get(`SELECT COUNT(*) as total,
                    ROUND(AVG(trust_score)::numeric, 3) as avg_trust,
                    COUNT(*) FILTER (WHERE result = 'authentic') as authentic
                    FROM scan_events WHERE org_id = $1
                    AND scanned_at >= NOW() - INTERVAL '90 days'`, [tid]),
            // Fraud control
            db.get(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'resolved') as resolved
                    FROM fraud_alerts WHERE product_id IN (SELECT id FROM products WHERE org_id = $1)`, [tid]),
            // User governance
            db.get(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE mfa_enabled = true) as mfa_enabled
                    FROM users WHERE org_id = $1`, [tid]),
            // Retention policies
            db.get(`SELECT COUNT(*) as c FROM data_retention_policies
                    WHERE created_by IN (SELECT id FROM users WHERE org_id = $1)`, [tid]),
            // Consent
            db.get(`SELECT COUNT(DISTINCT actor_id) as c FROM audit_log
                    WHERE action = 'CONSENT_GIVEN'
                    AND actor_id IN (SELECT id FROM users WHERE org_id = $1)`, [tid]),
            // Revenue (actual from invoices)
            db.get(`SELECT COALESCE(SUM(amount), 0) as total_paid,
                    COUNT(*) as invoice_count
                    FROM invoices WHERE user_id IN (SELECT id FROM users WHERE org_id = $1)
                    AND status = 'paid'`, [tid]),
        ]);

        const fin = orgInfo?.settings?.financials || {};
        const annualRevenue = fin.annual_revenue || 0;
        const ebitda = fin.ebitda || 0;
        const baseMultiple = fin.ev_multiple || 8;
        const brandValue = fin.brand_value_estimate || 0;

        // Governance Maturity Score (0-100)
        const compScore = compStats?.total > 0 ? (parseInt(compStats.compliant) / parseInt(compStats.total)) : 0;
        const scanIntegrity = scanStats?.total > 0 ? (parseInt(scanStats.authentic) / parseInt(scanStats.total)) : 0;
        const fraudResRate = fraudStats?.total > 0 ? (parseInt(fraudStats.resolved) / parseInt(fraudStats.total)) : 0;
        const mfaRate = userStats?.total > 0 ? (parseInt(userStats.mfa_enabled) / parseInt(userStats.total)) : 0;
        const hasRetention = (parseInt(retentionStats?.c) || 0) > 0 ? 1 : 0;
        const consentRate = userStats?.total > 0 ? (parseInt(consentStats?.c || 0) / parseInt(userStats.total)) : 0;

        const governanceScore = Math.round(
            compScore * 25 +        // Compliance (25%)
            scanIntegrity * 20 +     // Scan integrity (20%)
            fraudResRate * 15 +      // Fraud resolution (15%)
            mfaRate * 15 +           // MFA adoption (15%)
            hasRetention * 10 +      // Data governance (10%)
            consentRate * 15          // GDPR consent (15%)
        );

        // Governance Premium Multiplier (0.8x to 1.2x based on governance score)
        const govPremium = 0.8 + (governanceScore / 100) * 0.4;

        // EV Calculations
        const adjustedMultiple = Math.round(baseMultiple * govPremium * 100) / 100;
        const evBaseline = Math.round(ebitda * baseMultiple);
        const evWithGovernance = Math.round(ebitda * adjustedMultiple);
        const evUplift = evWithGovernance - evBaseline;

        // Risk-Adjusted Revenue
        const fraudRate = scanStats?.total > 0 ? (parseInt(scanStats.total) - parseInt(scanStats.authentic)) / parseInt(scanStats.total) : 0;
        const rar = Math.round(annualRevenue * (1 - fraudRate * 0.3)); // 30% impact severity

        // Capital Efficiency (if they invest in TrustChecker platform)
        const platformCost = parseFloat(invoiceStats?.total_paid || 0);
        const capitalEfficiency = platformCost > 0 && evUplift > 0 ? Math.round((evUplift / platformCost) * 100) / 100 : 0;

        res.json({
            financial_inputs: {
                annual_revenue: annualRevenue,
                ebitda,
                base_multiple: baseMultiple,
                brand_value: brandValue,
                configured: annualRevenue > 0,
            },
            governance_maturity: {
                score: governanceScore,
                breakdown: {
                    compliance: Math.round(compScore * 100),
                    scan_integrity: Math.round(scanIntegrity * 100),
                    fraud_resolution: Math.round(fraudResRate * 100),
                    mfa_adoption: Math.round(mfaRate * 100),
                    data_governance: hasRetention ? 100 : 0,
                    gdpr_consent: Math.round(consentRate * 100),
                },
                premium_multiplier: govPremium,
            },
            valuation: {
                ev_baseline: evBaseline,
                ev_with_governance: evWithGovernance,
                ev_uplift: evUplift,
                adjusted_multiple: adjustedMultiple,
                risk_adjusted_revenue: rar,
                revenue_protection: annualRevenue - rar,
            },
            efficiency: {
                platform_cost: platformCost,
                ev_uplift: evUplift,
                roi: capitalEfficiency,
                payback_months: platformCost > 0 && evUplift > 0 ? Math.round((platformCost / (evUplift / 12)) * 10) / 10 : 0,
            },
            org_plan: orgInfo?.plan || 'free',
        });
    } catch (err) {
        console.error('[CCS] Valuation error:', err);
        res.status(500).json({ error: 'Failed to load valuation data' });
    }
});

// ─── CCS: Save financial configuration ──────────────────────────────────────
router.patch('/owner/org-financials', requireExecutiveAccess(), async (req, res) => {
    try {
        const tid = req.tenantId;
        const { annual_revenue, ebitda, ev_multiple, brand_value_estimate, risk_tolerance } = req.body;

        // Get current settings
        const org = await db.get(`SELECT settings FROM organizations WHERE id = $1`, [tid]);
        const settings = org?.settings || {};

        // Merge financials
        settings.financials = {
            ...(settings.financials || {}),
            annual_revenue: annual_revenue !== undefined ? Number(annual_revenue) : (settings.financials?.annual_revenue || 0),
            ebitda: ebitda !== undefined ? Number(ebitda) : (settings.financials?.ebitda || 0),
            ev_multiple: ev_multiple !== undefined ? Number(ev_multiple) : (settings.financials?.ev_multiple || 8),
            brand_value_estimate: brand_value_estimate !== undefined ? Number(brand_value_estimate) : (settings.financials?.brand_value_estimate || 0),
            risk_tolerance: risk_tolerance || settings.financials?.risk_tolerance || 'moderate',
            updated_at: new Date().toISOString(),
            updated_by: req.user.id,
        };

        await db.run(`UPDATE organizations SET settings = $1, updated_at = NOW() WHERE id = $2`,
            [JSON.stringify(settings), tid]);

        // Audit log
        await db.run(`INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, created_at)
                      VALUES ($1, $2, 'FINANCIAL_CONFIG_UPDATED', 'organization', $3, $4, NOW())`,
            [require('uuid').v4(), req.user.id, tid, JSON.stringify(settings.financials)]);

        res.json({ success: true, financials: settings.financials });
    } catch (err) {
        console.error('[CCS] Financials update error:', err);
        res.status(500).json({ error: 'Failed to update financial configuration' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CCS: Market Insights — Channel, Geo, Leak, First-Scan Ratio
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/owner/ccs/market', requireExecutiveAccess(), async (req, res) => {
    try {
        const tid = req.tenantId;

        const [scanTotals, repeatScans, channelData, geoData, leakAlerts, partnerStats] = await Promise.all([
            // First-scan vs total
            db.get(`SELECT COUNT(*) as total,
                    COUNT(DISTINCT device_fingerprint) as unique_devices
                    FROM scan_events WHERE org_id = $1
                    AND scanned_at >= NOW() - INTERVAL '30 days'`, [tid]),
            // Repeat scans (same device)
            db.get(`SELECT COUNT(*) as repeat_count FROM (
                    SELECT device_fingerprint, COUNT(*) as cnt
                    FROM scan_events WHERE org_id = $1
                    AND scanned_at >= NOW() - INTERVAL '30 days'
                    AND device_fingerprint IS NOT NULL AND device_fingerprint != ''
                    GROUP BY device_fingerprint HAVING COUNT(*) > 1
                    ) sub`, [tid]),
            // Channel compliance by partner type
            db.all(`SELECT p.type as channel, COUNT(p.id) as partners,
                    ROUND(AVG(p.trust_score)::numeric, 1) as avg_trust,
                    COUNT(p.id) FILTER (WHERE p.kyc_status = 'verified') as verified,
                    ROUND(100.0 * COUNT(p.id) FILTER (WHERE p.kyc_status = 'verified') / NULLIF(COUNT(p.id), 0), 1) as compliance_pct
                    FROM partners p WHERE p.org_id = $1 AND p.status = 'active'
                    GROUP BY p.type ORDER BY partners DESC`, [tid]),
            // Regional penetration
            db.all(`SELECT geo_country as country, COUNT(*) as scans,
                    COUNT(DISTINCT device_fingerprint) as unique_users,
                    ROUND(100.0 * COUNT(*) FILTER (WHERE result = 'authentic') / NULLIF(COUNT(*), 0), 1) as auth_rate
                    FROM scan_events WHERE org_id = $1
                    AND scanned_at >= NOW() - INTERVAL '30 days'
                    AND geo_country IS NOT NULL AND geo_country != ''
                    GROUP BY geo_country ORDER BY scans DESC LIMIT 10`, [tid]),
            // Gray market / leak detection
            db.all(`SELECT la.platform, la.listing_title, la.leak_type, la.risk_score,
                    la.region_detected, la.status, la.created_at
                    FROM leak_alerts la
                    WHERE la.product_id IN (SELECT id FROM products WHERE org_id = $1)
                    AND la.status != 'resolved'
                    ORDER BY la.created_at DESC LIMIT 10`, [tid]),
            // Partner overview
            db.get(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE kyc_status = 'verified') as verified,
                    COUNT(*) FILTER (WHERE risk_level = 'high') as high_risk
                    FROM partners WHERE org_id = $1 AND status = 'active'`, [tid]),
        ]);

        const total = Number(scanTotals?.total || 0);
        const unique = Number(scanTotals?.unique_devices || 0);
        const firstScanRatio = total > 0 ? Math.round(1000 * unique / total) / 10 : 0;
        const repeatRate = total > 0 ? Math.round(1000 * Number(repeatScans?.repeat_count || 0) / total) / 10 : 0;
        const channelCompliance = channelData.length > 0
            ? Math.round(10 * channelData.reduce((s, c) => s + Number(c.compliance_pct || 0), 0) / channelData.length) / 10 : 0;
        const grayMarketIndex = leakAlerts.length > 0
            ? Math.round(100 * leakAlerts.reduce((s, l) => s + Number(l.risk_score || 0), 0) / leakAlerts.length) / 100 : 0;

        res.json({
            kpis: {
                first_scan_ratio: firstScanRatio,
                repeat_scan_rate: repeatRate,
                channel_compliance: channelCompliance,
                gray_market_index: grayMarketIndex,
                total_scans_30d: total,
            },
            channels: channelData.map(c => ({
                name: c.channel || 'Unknown',
                partners: Number(c.partners),
                compliance: Number(c.compliance_pct || 0),
                avg_trust: Number(c.avg_trust || 0),
                verified: Number(c.verified || 0),
            })),
            regions: geoData.map(g => ({
                country: g.country,
                scans: Number(g.scans),
                unique_users: Number(g.unique_users || 0),
                auth_rate: Number(g.auth_rate || 0),
            })),
            gray_market: {
                total_alerts: leakAlerts.length,
                alerts: leakAlerts,
                partners_total: Number(partnerStats?.total || 0),
                partners_verified: Number(partnerStats?.verified || 0),
                partners_high_risk: Number(partnerStats?.high_risk || 0),
            },
        });
    } catch (err) {
        console.error('[CCS] Market error:', err);
        res.status(500).json({ error: 'Failed to load market data' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CCS: Performance & Financial Impact
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/owner/ccs/performance', requireExecutiveAccess(), async (req, res) => {
    try {
        const tid = req.tenantId;

        const [scanStats, fraudStats, productStats, scanSpeed, orgInfo, billingPlan] = await Promise.all([
            // Scan volume
            db.get(`SELECT COUNT(*) as total_scans,
                    COUNT(*) FILTER (WHERE result = 'authentic') as authentic,
                    COUNT(*) FILTER (WHERE result = 'counterfeit') as counterfeit,
                    COUNT(*) FILTER (WHERE result = 'suspicious') as suspicious
                    FROM scan_events WHERE org_id = $1
                    AND scanned_at >= NOW() - INTERVAL '1 year'`, [tid]),
            // Fraud financial impact
            db.get(`SELECT COUNT(*) as total_alerts,
                    COUNT(*) FILTER (WHERE severity = 'critical') as critical,
                    COUNT(*) FILTER (WHERE status = 'resolved') as resolved
                    FROM fraud_alerts WHERE product_id IN (SELECT id FROM products WHERE org_id = $1)`, [tid]),
            // Product values
            db.get(`SELECT COUNT(*) as total_products,
                    ROUND(AVG(trust_score)::numeric, 2) as avg_trust
                    FROM products WHERE org_id = $1 AND status = 'active'`, [tid]),
            // Scan performance
            db.get(`SELECT ROUND(AVG(response_time_ms)::numeric, 0) as avg_ms,
                    ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms)::numeric, 0) as p95_ms
                    FROM scan_events WHERE org_id = $1
                    AND scanned_at >= NOW() - INTERVAL '30 days'
                    AND response_time_ms > 0`, [tid]),
            // Org settings for financials
            db.get(`SELECT settings, plan FROM organizations WHERE id = $1`, [tid]),
            // Actual billing plan cost
            db.get(`SELECT bp.price_monthly, bp.billing_cycle, bp.plan_name
                    FROM billing_plans bp
                    JOIN users u ON u.id = bp.user_id
                    WHERE u.org_id = $1 AND bp.status = 'active'
                    ORDER BY bp.price_monthly DESC LIMIT 1`, [tid]).catch(() => null),
        ]);

        const totalProducts = Number(productStats?.total_products || 0);
        const counterfeit = Number(scanStats?.counterfeit || 0);
        const suspicious = Number(scanStats?.suspicious || 0);
        const authentic = Number(scanStats?.authentic || 0);
        const totalScans = Number(scanStats?.total_scans || 0);
        const fraudCount = Number(fraudStats?.total_alerts || 0);
        const settings = orgInfo?.settings || {};
        const fin = settings.financials || {};

        // valuePerUnit: revenue per verification (each scan checks one unit)
        const annualRevenue = Number(fin.annual_revenue || 0);
        const valuePerUnit = (annualRevenue > 0 && totalScans > 0)
            ? Math.round(annualRevenue / totalScans)
            : 50;

        // platformCost: from actual billing plan, fallback to plan tier estimate
        const planTierCosts = { free: 0, starter: 588, pro: 2388, business: 5988, enterprise: 12000 };
        let platformCost = 0;
        if (billingPlan?.price_monthly > 0) {
            platformCost = Math.round(billingPlan.price_monthly * 12);
        } else {
            const orgPlan = orgInfo?.plan || 'free';
            platformCost = planTierCosts[orgPlan] || 0;
        }

        // Financial impact calculations (per-unit based)
        const estimatedFraudLoss = Math.round((counterfeit + suspicious * 0.3) * valuePerUnit);
        const revenueProtected = Math.min(Math.round(authentic * valuePerUnit), annualRevenue || authentic * valuePerUnit);
        const savingsFraudAvoided = Math.round(estimatedFraudLoss * 0.6); // 60% of fraud loss detected & avoided
        const savingsAudit = Math.round(totalScans * 2); // $2/scan automation savings
        const totalSavings = savingsFraudAvoided + savingsAudit;
        const roi = platformCost > 0 ? Math.round(totalSavings / platformCost * 100) / 100 : 0;
        const costPerVerification = totalScans > 0 ? Math.round(platformCost / totalScans * 1000) / 1000 : 0;

        res.json({
            financial_impact: {
                estimated_fraud_loss: estimatedFraudLoss,
                revenue_protected: revenueProtected,
                system_roi: roi,
                cost_per_verification: costPerVerification,
            },
            savings: {
                fraud_avoided: savingsFraudAvoided,
                audit_automation: savingsAudit,
                total: totalSavings,
            },
            investment: {
                platform_cost: platformCost,
                total_scans_ytd: totalScans,
            },
            performance: {
                avg_speed_ms: Number(scanSpeed?.avg_ms || 0),
                p95_speed_ms: Number(scanSpeed?.p95_ms || 0),
                uptime_pct: 99.97,
                total_products: Number(productStats?.total_products || 0),
                avg_trust: Number(productStats?.avg_trust || 0),
            },
            fraud: {
                total_alerts: fraudCount,
                critical: Number(fraudStats?.critical || 0),
                resolved: Number(fraudStats?.resolved || 0),
                resolution_rate: fraudCount > 0
                    ? Math.round(100 * Number(fraudStats?.resolved || 0) / fraudCount) : 0,
            },
        });
    } catch (err) {
        console.error('[CCS] Performance error:', err);
        res.status(500).json({ error: 'Failed to load performance data' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CCS: Risk Intelligence — Integrity Score, Heatmap, Product Risk, Forecast
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/owner/ccs/risk-intel', requireExecutiveAccess(), async (req, res) => {
    try {
        const tid = req.tenantId;

        const [scanIntegrity, duplicateRate, complianceRate,
            geoRisk, productRisk, anomalies, recentAnomalies] = await Promise.all([
                // Scan authenticity score
                db.get(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE result = 'authentic') as authentic,
                    ROUND(100.0 * COUNT(*) FILTER (WHERE result = 'authentic') / NULLIF(COUNT(*), 0), 1) as auth_pct
                    FROM scan_events WHERE org_id = $1
                    AND scanned_at >= NOW() - INTERVAL '30 days'`, [tid]),
                // Duplicate detection
                db.get(`SELECT COUNT(*) as total_dupes FROM (
                    SELECT qr_code_id, COUNT(*) as cnt
                    FROM scan_events WHERE org_id = $1
                    AND scanned_at >= NOW() - INTERVAL '30 days'
                    AND qr_code_id IS NOT NULL
                    GROUP BY qr_code_id HAVING COUNT(*) > 3
                    ) sub`, [tid]),
                // Distribution compliance
                db.get(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE status = 'compliant') as compliant
                    FROM compliance_records WHERE entity_id IN (SELECT id FROM products WHERE org_id = $1)`, [tid]),
                // Geographic risk heatmap
                db.all(`SELECT geo_country as name,
                    COUNT(*) as scans,
                    COUNT(*) FILTER (WHERE result = 'suspicious' OR result = 'counterfeit') as flagged,
                    ROUND(AVG(fraud_score)::numeric * 100, 0) as risk_score
                    FROM scan_events WHERE org_id = $1
                    AND scanned_at >= NOW() - INTERVAL '30 days'
                    AND geo_country IS NOT NULL AND geo_country != ''
                    GROUP BY geo_country
                    ORDER BY risk_score DESC LIMIT 10`, [tid]),
                // Product line risk
                db.all(`SELECT p.name, p.category,
                    ROUND(AVG(se.fraud_score)::numeric * 100, 0) as risk_score,
                    COUNT(se.id) as scan_count
                    FROM products p
                    LEFT JOIN scan_events se ON se.product_id = p.id
                        AND se.scanned_at >= NOW() - INTERVAL '30 days'
                    WHERE p.org_id = $1 AND p.status = 'active'
                    GROUP BY p.id, p.name, p.category
                    HAVING COUNT(se.id) > 0
                    ORDER BY risk_score DESC LIMIT 10`, [tid]),
                // Anomaly stats
                db.get(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE severity = 'critical' OR severity = 'high') as high_sev,
                    COUNT(*) FILTER (WHERE status = 'open') as open_count
                    FROM anomaly_detections WHERE source_id IN (SELECT id FROM products WHERE org_id = $1)`, [tid]),
                // Recent anomalies for forecast
                db.all(`SELECT anomaly_type, severity, description, detected_at
                    FROM anomaly_detections
                    WHERE source_id IN (SELECT id FROM products WHERE org_id = $1)
                    ORDER BY detected_at DESC LIMIT 5`, [tid]),
            ]);

        const totalScans = Number(scanIntegrity?.total || 0);
        const authPct = Number(scanIntegrity?.auth_pct || 0);
        const dupeCount = Number(duplicateRate?.total_dupes || 0);
        const dupePct = totalScans > 0 ? Math.round(100 * (1 - dupeCount / totalScans)) : 100;
        const compTotal = Number(complianceRate?.total || 0);
        const compCompliant = Number(complianceRate?.compliant || 0);
        const compPct = compTotal > 0 ? Math.round(100 * compCompliant / compTotal) : 0;
        const integrityScore = Math.round((authPct + dupePct + compPct) / 3);

        const forecast = {
            fraud_probability: Number(anomalies?.high_sev || 0) > 3 ? 'High'
                : Number(anomalies?.high_sev || 0) > 0 ? 'Moderate' : 'Low',
            fraud_pct: totalScans > 0 ? Math.round(100 * (totalScans - Number(scanIntegrity?.authentic || 0)) / totalScans) : 0,
            counterfeit_risk: dupeCount > 5 ? 'High' : dupeCount > 0 ? 'Moderate' : 'Low',
            open_anomalies: Number(anomalies?.open_count || 0),
        };

        res.json({
            integrity_score: {
                overall: integrityScore,
                scan_authenticity: Math.round(authPct),
                duplicate_rate: dupePct,
                distribution_compliance: compPct,
                traceability: totalScans > 0 ? Math.min(100, Math.round(totalScans / 5)) : 0,
            },
            risk_heatmap: geoRisk.map(g => ({
                name: g.name,
                level: Number(g.risk_score) >= 60 ? 'HIGH' : Number(g.risk_score) >= 30 ? 'MEDIUM' : 'LOW',
                score: Number(g.risk_score),
                scans: Number(g.scans),
                flagged: Number(g.flagged),
                detail: `${g.flagged} flagged / ${g.scans} scans`,
            })),
            product_risk: productRisk.map(p => ({
                name: p.name,
                category: p.category,
                score: Number(p.risk_score || 0),
                level: Number(p.risk_score) >= 60 ? 'high' : Number(p.risk_score) >= 30 ? 'medium' : 'low',
            })),
            forecast,
            recent_anomalies: recentAnomalies,
        });
    } catch (err) {
        console.error('[CCS] Risk-intel error:', err);
        res.status(500).json({ error: 'Failed to load risk intelligence' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CCS: Executive Reports — Summary data for report generation
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/owner/ccs/reports', requireExecutiveAccess(), async (req, res) => {
    try {
        const tid = req.tenantId;

        const [monthlySummaries, scansByMonth, alertsByMonth, recentAudit] = await Promise.all([
            // Monthly snapshots (last 6 months)
            db.all(`SELECT TO_CHAR(scanned_at, 'YYYY-MM') as month,
                    COUNT(*) as total_scans,
                    COUNT(*) FILTER (WHERE result = 'authentic') as authentic,
                    COUNT(*) FILTER (WHERE result = 'suspicious') as suspicious,
                    COUNT(*) FILTER (WHERE result = 'counterfeit') as counterfeit,
                    ROUND(AVG(trust_score)::numeric, 2) as avg_trust
                    FROM scan_events WHERE org_id = $1
                    AND scanned_at >= NOW() - INTERVAL '6 months'
                    GROUP BY TO_CHAR(scanned_at, 'YYYY-MM')
                    ORDER BY month DESC`, [tid]),
            // Scan trend
            db.get(`SELECT COUNT(*) as total_30d FROM scan_events
                    WHERE org_id = $1 AND scanned_at >= NOW() - INTERVAL '30 days'`, [tid]),
            // Alert trend
            db.get(`SELECT COUNT(*) as total_alerts,
                    COUNT(*) FILTER (WHERE severity = 'critical') as critical,
                    COUNT(*) FILTER (WHERE status = 'resolved') as resolved
                    FROM fraud_alerts WHERE product_id IN (SELECT id FROM products WHERE org_id = $1)
                    AND created_at >= NOW() - INTERVAL '30 days'`, [tid]),
            // Recent audit events (report-related)
            db.all(`SELECT action, details, created_at, actor_id
                    FROM audit_log WHERE tenant_id = $1
                    AND (action LIKE '%REPORT%' OR action LIKE '%EXPORT%' OR action LIKE '%FINANCIAL%')
                    ORDER BY created_at DESC LIMIT 10`, [tid]),
        ]);

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const reports = monthlySummaries.map(m => {
            const [y, mo] = m.month.split('-');
            return {
                title: `${months[parseInt(mo) - 1]} ${y} — Executive Summary`,
                type: 'Auto-generated',
                date: `${y}-${mo}-01`,
                status: 'ready',
                scans: Number(m.total_scans),
                authentic: Number(m.authentic),
                suspicious: Number(m.suspicious),
                counterfeit: Number(m.counterfeit),
                avg_trust: Number(m.avg_trust || 0),
            };
        });

        res.json({
            reports,
            current_month: {
                scans: Number(scansByMonth?.total_30d || 0),
                alerts: Number(alertsByMonth?.total_alerts || 0),
                critical: Number(alertsByMonth?.critical || 0),
                resolved: Number(alertsByMonth?.resolved || 0),
            },
            scheduled: [
                { name: 'Executive Summary', frequency: 'Monthly', recipients: 'CEO, CFO, COO', next_run: null, active: true },
                { name: 'Risk Alert Digest', frequency: 'Weekly', recipients: 'CEO, CRO', next_run: null, active: true },
                { name: 'Board Deck', frequency: 'Quarterly', recipients: 'Board members', next_run: null, active: true },
            ],
            recent_activity: recentAudit || [],
        });
    } catch (err) {
        console.error('[CCS] Reports error:', err);
        res.status(500).json({ error: 'Failed to load reports' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CCS: Trust Report — Seal Coverage, Chain Integrity, Brand Protection
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/owner/ccs/trust-report', requireExecutiveAccess(), async (req, res) => {
    try {
        const tid = req.tenantId;

        const [sealStats, chainIntegrity, tamperDetection, scanIntegrity,
            evidenceStats, productCount] = await Promise.all([
                // Blockchain seal coverage
                db.get(`SELECT COUNT(*) as total_seals,
                    COUNT(DISTINCT event_type) as seal_types,
                    COUNT(*) FILTER (WHERE event_type = 'scan_event') as scan_seals,
                    COUNT(*) FILTER (WHERE event_type = 'supply_chain') as chain_seals,
                    COUNT(*) FILTER (WHERE event_type = 'evidence') as evidence_seals
                    FROM blockchain_seals WHERE event_id IN (
                        SELECT id FROM scan_events WHERE org_id = $1
                        UNION SELECT id FROM supply_chain_events WHERE product_id IN (SELECT id FROM products WHERE org_id = $1)
                    )`, [tid]),
                // Supply chain integrity
                db.get(`SELECT COUNT(*) as total_events,
                    COUNT(*) FILTER (WHERE blockchain_seal_id IS NOT NULL) as sealed_events
                    FROM supply_chain_events
                    WHERE product_id IN (SELECT id FROM products WHERE org_id = $1)`, [tid]),
                // Tamper/anomaly detection
                db.get(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE severity = 'critical') as critical,
                    COUNT(*) FILTER (WHERE status = 'resolved') as resolved
                    FROM anomaly_detections
                    WHERE source_id IN (SELECT id FROM products WHERE org_id = $1)`, [tid]),
                // Scan verification integrity
                db.get(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE result = 'authentic') as authentic,
                    ROUND(AVG(trust_score)::numeric, 2) as avg_trust
                    FROM scan_events WHERE org_id = $1`, [tid]),
                // Evidence packages
                db.get(`SELECT COUNT(*) as total,
                    COUNT(*) FILTER (WHERE blockchain_seal_id IS NOT NULL) as sealed
                    FROM evidence_items
                    WHERE entity_id IN (SELECT id FROM products WHERE org_id = $1)`, [tid]),
                // Product count
                db.get(`SELECT COUNT(*) as total FROM products WHERE org_id = $1 AND status = 'active'`, [tid]),
            ]);

        const totalScans = Number(scanIntegrity?.total || 0);
        const authentic = Number(scanIntegrity?.authentic || 0);
        const chainTotal = Number(chainIntegrity?.total_events || 0);
        const chainSealed = Number(chainIntegrity?.sealed_events || 0);
        const tamperTotal = Number(tamperDetection?.total || 0);
        const tamperResolved = Number(tamperDetection?.resolved || 0);
        const evidenceTotal = Number(evidenceStats?.total || 0);
        const evidenceSealed = Number(evidenceStats?.sealed || 0);

        // Calculate brand protection score (0-100)
        const scanScore = totalScans > 0 ? (authentic / totalScans) * 100 : 50;
        const chainScore = chainTotal > 0 ? (chainSealed / chainTotal) * 100 : 50;
        const tamperScore = tamperTotal > 0 ? (tamperResolved / tamperTotal) * 100 : 100;
        const evidenceScore = evidenceTotal > 0 ? (evidenceSealed / evidenceTotal) * 100 : 50;
        const brandProtectionScore = Math.round((scanScore * 0.35 + chainScore * 0.25 + tamperScore * 0.25 + evidenceScore * 0.15));

        res.json({
            seal_coverage: {
                total: Number(sealStats?.total_seals || 0),
                scan_seals: Number(sealStats?.scan_seals || 0),
                chain_seals: Number(sealStats?.chain_seals || 0),
                evidence_seals: Number(sealStats?.evidence_seals || 0),
            },
            chain_integrity: {
                total_events: chainTotal,
                sealed: chainSealed,
                coverage_pct: chainTotal > 0 ? Math.round(100 * chainSealed / chainTotal) : 0,
            },
            tamper_detection: {
                total: tamperTotal,
                critical: Number(tamperDetection?.critical || 0),
                resolved: tamperResolved,
                resolution_rate: tamperTotal > 0 ? Math.round(100 * tamperResolved / tamperTotal) : 100,
            },
            scan_verification: {
                total: totalScans,
                authentic,
                integrity_pct: totalScans > 0 ? Math.round(100 * authentic / totalScans) : 0,
                avg_trust: Number(scanIntegrity?.avg_trust || 0),
            },
            evidence_packages: {
                total: evidenceTotal,
                sealed: evidenceSealed,
            },
            brand_protection_score: brandProtectionScore,
            product_count: Number(productCount?.total || 0),
            recommendation: brandProtectionScore >= 80
                ? 'Data integrity posture is strong. All material risk events are sealed.'
                : brandProtectionScore >= 60
                    ? 'Moderate integrity. Consider sealing more supply chain events and resolving open anomalies.'
                    : 'Action required: significant gaps in seal coverage and unresolved tamper alerts.',
        });
    } catch (err) {
        console.error('[CCS] Trust-report error:', err);
        res.status(500).json({ error: 'Failed to load trust report' });
    }
});

module.exports = router;

