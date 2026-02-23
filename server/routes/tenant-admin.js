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
const { requireTenantAdmin, checkPlanGuardrail, checkSoD, getPermissionsForRole } = require('../auth/rbac');
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

        // Verify user belongs to this tenant
        const user = await db.get(
            'SELECT id, username FROM users WHERE id = ? AND org_id = ?',
            [req.params.id, req.tenantId]
        );
        if (!user) return res.status(404).json({ error: 'User not found in this tenant' });

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

module.exports = router;
