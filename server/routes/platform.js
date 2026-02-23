/**
 * Platform Routes — SuperAdmin Only
 *
 * Manages tenants (companies), licensing, feature flags, and platform audit.
 * All routes require platform admin access.
 *
 * Base path: /api/platform
 */
const express = require('express');
const router = express.Router();
const emailService = require('../services/email');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware } = require('../auth/core');
const { requirePlatformAdmin } = require('../auth/rbac');

// All routes require auth + platform admin
router.use(authMiddleware);
router.use(requirePlatformAdmin());

// ─── POST /tenants — Create new tenant/company ──────────────────────────────
router.post('/tenants', async (req, res) => {
    try {
        const { name, slug, plan = 'free', feature_flags = {}, admin_email, admin_username, admin_password } = req.body;

        if (!name || !slug) {
            return res.status(400).json({ error: 'name and slug are required' });
        }
        if (!admin_email || !admin_username || !admin_password) {
            return res.status(400).json({ error: 'admin_email, admin_username, admin_password are required to create Company Admin' });
        }

        // Check slug uniqueness
        const existing = await db.get('SELECT id FROM organizations WHERE slug = ?', [slug]);
        if (existing) {
            return res.status(409).json({ error: `Slug "${slug}" already taken` });
        }

        const tenantId = uuidv4();
        const flags = typeof feature_flags === 'string' ? feature_flags : JSON.stringify(feature_flags);

        // Create tenant
        await db.run(
            `INSERT INTO organizations (id, name, slug, plan, feature_flags, status, created_by) VALUES (?, ?, ?, ?, ?, 'active', ?)`,
            [tenantId, name, slug, plan, flags, req.user.id]
        );

        // Create Company Admin user
        const adminId = uuidv4();
        const hash = await bcrypt.hash(admin_password, 12);
        await db.run(
            `INSERT INTO users (id, username, email, password_hash, role, user_type, company, org_id) VALUES (?, ?, ?, ?, 'admin', 'tenant', ?, ?)`,
            [adminId, admin_username, admin_email, hash, name, tenantId]
        );

        // Create tenant-scoped company_admin role
        const roleId = `role-${tenantId}-company_admin`;
        await db.run(
            `INSERT OR IGNORE INTO rbac_roles (id, tenant_id, name, display_name, type, is_system, description) VALUES (?, ?, 'company_admin', 'Company Admin', 'system', 1, 'Tenant administrator')`,
            [roleId, tenantId]
        );

        // Copy company_admin template permissions
        const templatePerms = await db.all(
            `SELECT permission_id FROM rbac_role_permissions WHERE role_id = 'role-company_admin'`
        );
        for (const p of templatePerms) {
            await db.run('INSERT OR IGNORE INTO rbac_role_permissions (role_id, permission_id) VALUES (?, ?)', [roleId, p.permission_id]);
        }

        // Assign role to admin user
        await db.run(
            'INSERT OR IGNORE INTO rbac_user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)',
            [adminId, roleId, req.user.id]
        );

        // Audit log
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'TENANT_CREATED', 'organization', ?, ?)`,
            [uuidv4(), req.user.id, tenantId, JSON.stringify({ name, slug, plan, admin_username })]
        );

        // Save if SQLite
        if (typeof db.save === 'function') await db.save();

        res.status(201).json({
            tenant: { id: tenantId, name, slug, plan, status: 'active' },
            admin: { id: adminId, username: admin_username, email: admin_email, role: 'admin' },
            message: 'Tenant created with Company Admin'
        });
    } catch (err) {
        console.error('[Platform] Create tenant error:', err);
        res.status(500).json({ error: 'Failed to create tenant' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM-WIDE FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /feature-flags — Read platform-wide flags from dedicated table
router.get('/feature-flags', async (req, res) => {
    try {
        const rows = await db.all('SELECT key, label, description, icon, color, enabled FROM platform_feature_flags ORDER BY key');
        // Also return as a simple key→value map for backward compat
        const flags = {};
        rows.forEach(r => { flags[r.key] = r.enabled; });
        res.json({ flags, flagList: rows });
    } catch (err) {
        console.error('[Platform] Feature flags read error:', err);
        res.status(500).json({ error: 'Failed to read feature flags' });
    }
});

// PUT /feature-flags — Toggle a single flag
router.put('/feature-flags', async (req, res) => {
    try {
        const { key, value } = req.body;
        if (!key || typeof value !== 'boolean') {
            return res.status(400).json({ error: 'key (string) and value (boolean) required' });
        }

        // Update dedicated table
        const existing = await db.get('SELECT key FROM platform_feature_flags WHERE key = ?', [key]);
        if (!existing) {
            return res.status(404).json({ error: `Flag "${key}" not found` });
        }

        await db.run(
            "UPDATE platform_feature_flags SET enabled = ?, updated_at = NOW(), updated_by = ? WHERE key = ?",
            [value, req.user.id, key]
        );

        // Audit log
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'FEATURE_FLAG_TOGGLED', 'platform', ?, ?)`,
            [uuidv4(), req.user.id, key, JSON.stringify({ flag: key, value })]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: `Flag "${key}" ${value ? 'enabled' : 'disabled'}`, key, value });
    } catch (err) {
        console.error('[Platform] Feature flag toggle error:', err);
        res.status(500).json({ error: 'Failed to toggle feature flag' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION PREFERENCES (DB-backed)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /notifications — Read notification preferences for current user
router.get('/notifications', async (req, res) => {
    try {
        const channels = await db.all(
            "SELECT id, key, label, description, icon, enabled FROM notification_preferences WHERE user_id = ? AND category = 'channel' ORDER BY created_at",
            [req.user.id]
        );
        const events = await db.all(
            "SELECT id, key, label, description, severity, enabled FROM notification_preferences WHERE user_id = ? AND category = 'event' ORDER BY created_at",
            [req.user.id]
        );
        res.json({ channels, events });
    } catch (err) {
        console.error('[Platform] Notifications read error:', err);
        res.status(500).json({ error: 'Failed to read notification preferences' });
    }
});

// PUT /notifications/:id — Toggle a notification preference
router.put('/notifications/:id', async (req, res) => {
    try {
        const { enabled } = req.body;
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ error: 'enabled (boolean) required' });
        }

        const pref = await db.get(
            'SELECT id, key, category FROM notification_preferences WHERE id = ? AND user_id = ?',
            [req.params.id, req.user.id]
        );
        if (!pref) return res.status(404).json({ error: 'Preference not found' });

        await db.run(
            "UPDATE notification_preferences SET enabled = ?, updated_at = NOW() WHERE id = ?",
            [enabled, req.params.id]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: `${pref.key} ${enabled ? 'enabled' : 'disabled'}`, id: req.params.id, enabled });
    } catch (err) {
        console.error('[Platform] Notification toggle error:', err);
        res.status(500).json({ error: 'Failed to toggle notification preference' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL SETTINGS (SMTP config + recipients)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /email-settings — Read SMTP config (password masked)
router.get('/email-settings', async (req, res) => {
    try {
        const cfg = await db.get("SELECT * FROM email_settings WHERE id = 'default'");
        if (!cfg) return res.json({ config: null });
        // Mask password
        const masked = { ...cfg };
        if (masked.smtp_pass) masked.smtp_pass = '••••••••';
        res.json({ config: masked });
    } catch (err) {
        console.error('[Platform] Email settings read error:', err);
        res.status(500).json({ error: 'Failed to read email settings' });
    }
});

// PUT /email-settings — Update SMTP config + recipients
router.put('/email-settings', async (req, res) => {
    try {
        const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, from_name, from_email, recipients, enabled, smtp_accounts, daily_limit } = req.body;

        // Build SET clause dynamically (only update provided fields)
        const updates = [];
        const params = [];
        let idx = 1;

        if (smtp_host !== undefined) { updates.push(`smtp_host = $${idx++}`); params.push(smtp_host); }
        if (smtp_port !== undefined) { updates.push(`smtp_port = $${idx++}`); params.push(smtp_port); }
        if (smtp_user !== undefined) { updates.push(`smtp_user = $${idx++}`); params.push(smtp_user); }
        if (smtp_pass !== undefined && smtp_pass !== '••••••••') { updates.push(`smtp_pass = $${idx++}`); params.push(smtp_pass); }
        if (smtp_secure !== undefined) { updates.push(`smtp_secure = $${idx++}`); params.push(smtp_secure); }
        if (from_name !== undefined) { updates.push(`from_name = $${idx++}`); params.push(from_name); }
        if (from_email !== undefined) { updates.push(`from_email = $${idx++}`); params.push(from_email); }
        if (recipients !== undefined) { updates.push(`recipients = $${idx++}::jsonb`); params.push(JSON.stringify(recipients)); }
        if (enabled !== undefined) { updates.push(`enabled = $${idx++}`); params.push(enabled); }
        if (smtp_accounts !== undefined) { updates.push(`smtp_accounts = $${idx++}::jsonb`); params.push(JSON.stringify(smtp_accounts)); }
        if (daily_limit !== undefined) { updates.push(`daily_limit = $${idx++}`); params.push(daily_limit); }

        updates.push(`updated_at = NOW()`);
        updates.push(`updated_by = $${idx++}`); params.push(req.user.id);

        if (updates.length > 2) {
            await db.run(`UPDATE email_settings SET ${updates.join(', ')} WHERE id = 'default'`, params);
            emailService.invalidateConfig();
        }

        if (typeof db.save === 'function') await db.save();
        res.json({ message: 'Email settings updated' });
    } catch (err) {
        console.error('[Platform] Email settings update error:', err);
        res.status(500).json({ error: 'Failed to update email settings' });
    }
});

// POST /email-settings/test — Send test email
router.post('/email-settings/test', async (req, res) => {
    try {
        const result = await emailService.sendTestEmail();
        if (result.sent) {
            res.json({ message: 'Test email sent!', messageId: result.messageId });
        } else {
            res.status(400).json({ error: result.reason || 'Failed to send test email' });
        }
    } catch (err) {
        console.error('[Platform] Test email error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CHANNEL SETTINGS (Slack / SMS / Push)
// ═══════════════════════════════════════════════════════════════════════════════
const slackService = require('../services/slack');

// GET /channel-settings/:channel
router.get('/channel-settings/:channel', async (req, res) => {
    try {
        const row = await db.get("SELECT * FROM channel_settings WHERE channel = $1", [req.params.channel]);
        if (!row) return res.json({ config: { enabled: false, config: {} } });
        res.json({ config: { ...row, config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config } });
    } catch (err) {
        console.error('[Platform] Channel settings read error:', err);
        res.status(500).json({ error: 'Failed to read channel settings' });
    }
});

// PUT /channel-settings/:channel
router.put('/channel-settings/:channel', async (req, res) => {
    try {
        const { enabled, config } = req.body;
        const updates = [];
        const params = [];
        let idx = 1;

        if (enabled !== undefined) { updates.push(`enabled = $${idx++}`); params.push(enabled); }
        if (config !== undefined) { updates.push(`config = $${idx++}::jsonb`); params.push(JSON.stringify(config)); }
        updates.push(`updated_at = NOW()`);
        updates.push(`updated_by = $${idx++}`); params.push(req.user.id);
        params.push(req.params.channel);

        await db.run(`UPDATE channel_settings SET ${updates.join(', ')} WHERE channel = $${idx}`, params);

        // Invalidate cache for slack
        if (req.params.channel === 'slack') slackService.invalidateConfig();

        res.json({ message: `${req.params.channel} settings updated` });
    } catch (err) {
        console.error('[Platform] Channel settings update error:', err);
        res.status(500).json({ error: 'Failed to update channel settings' });
    }
});

// POST /channel-settings/:channel/test
router.post('/channel-settings/:channel/test', async (req, res) => {
    try {
        let result;
        if (req.params.channel === 'slack') {
            result = await slackService.sendTest();
        } else {
            return res.status(400).json({ error: `Test not implemented for ${req.params.channel} yet` });
        }
        if (result.sent) {
            res.json({ message: `Test ${req.params.channel} sent!`, results: result.results });
        } else {
            res.status(400).json({ error: result.reason || 'Failed' });
        }
    } catch (err) {
        console.error('[Platform] Channel test error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

const PLATFORM_ROLES = ['super_admin', 'platform_security', 'data_gov_officer', 'auditor', 'developer', 'platform_devops'];

// ─── GET /users — List platform users ────────────────────────────────────────
router.get('/users', async (req, res) => {
    try {
        const users = await db.all(
            `SELECT id, username, email, role, user_type, mfa_enabled, created_at, last_login, status
             FROM users WHERE user_type = 'platform' ORDER BY created_at ASC`
        );
        res.json({ users });
    } catch (err) {
        console.error('[Platform] List users error:', err);
        res.status(500).json({ error: 'Failed to list platform users' });
    }
});

// ─── POST /users — Create platform user ─────────────────────────────────────
router.post('/users', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        if (!username || !email || !password || !role) {
            return res.status(400).json({ error: 'username, email, password, and role are required' });
        }
        if (!PLATFORM_ROLES.includes(role)) {
            return res.status(400).json({ error: `Invalid platform role. Allowed: ${PLATFORM_ROLES.join(', ')}` });
        }

        // Check duplicate
        const existing = await db.get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existing) return res.status(409).json({ error: 'User with this email or username already exists' });

        const id = uuidv4();
        const hash = await bcrypt.hash(password, 12);
        await db.run(
            `INSERT INTO users (id, username, email, password_hash, role, user_type, company)
             VALUES (?, ?, ?, ?, ?, 'platform', 'TrustChecker')`,
            [id, username, email, hash, role]
        );

        // Audit
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, target_id, details) VALUES (?, ?, 'PLATFORM_USER_CREATED', ?, ?)`,
            [uuidv4(), req.user.id, id, JSON.stringify({ username, email, role })]
        );

        if (typeof db.save === 'function') await db.save();
        res.status(201).json({ id, username, email, role, user_type: 'platform', message: 'Platform user created' });
    } catch (err) {
        console.error('[Platform] Create user error:', err);
        res.status(500).json({ error: 'Failed to create platform user' });
    }
});

// ─── PUT /users/:id — Update platform user (role, password, status) ─────────
router.put('/users/:id', async (req, res) => {
    try {
        const user = await db.get('SELECT id, username, role, email FROM users WHERE id = ? AND user_type = ?', [req.params.id, 'platform']);
        if (!user) return res.status(404).json({ error: 'Platform user not found' });

        const { role, password, status } = req.body;
        const updates = [];
        const params = [];
        const changes = {};

        if (role && role !== user.role) {
            if (!PLATFORM_ROLES.includes(role)) {
                return res.status(400).json({ error: `Invalid role. Allowed: ${PLATFORM_ROLES.join(', ')}` });
            }
            updates.push('role = ?');
            params.push(role);
            changes.role = { from: user.role, to: role };
        }

        if (password) {
            if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
            const hash = await bcrypt.hash(password, 12);
            updates.push('password_hash = ?');
            params.push(hash);
            changes.password = 'reset';
        }

        if (status && ['active', 'suspended'].includes(status)) {
            updates.push('status = ?');
            params.push(status);
            changes.status = status;
        }

        if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });

        params.push(req.params.id);
        await db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, target_id, details) VALUES (?, ?, 'PLATFORM_USER_UPDATED', ?, ?)`,
            [uuidv4(), req.user.id, req.params.id, JSON.stringify({ username: user.username, ...changes })]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: 'User updated', id: req.params.id, changes });
    } catch (err) {
        console.error('[Platform] Update user error:', err);
        res.status(500).json({ error: 'Failed to update platform user' });
    }
});

// ─── DELETE /users/:id — Remove platform user ───────────────────────────────
router.delete('/users/:id', async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        const user = await db.get('SELECT id, username, role FROM users WHERE id = ? AND user_type = ?', [req.params.id, 'platform']);
        if (!user) return res.status(404).json({ error: 'Platform user not found' });

        await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, target_id, details) VALUES (?, ?, 'PLATFORM_USER_DELETED', ?, ?)`,
            [uuidv4(), req.user.id, req.params.id, JSON.stringify({ username: user.username, role: user.role })]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: 'Platform user deleted', id: req.params.id });
    } catch (err) {
        console.error('[Platform] Delete user error:', err);
        res.status(500).json({ error: 'Failed to delete platform user' });
    }
});

// ─── GET /tenants — List all tenants ─────────────────────────────────────────
router.get('/tenants', async (req, res) => {
    try {
        const tenants = await db.all(`
      SELECT o.*, 
        (SELECT COUNT(*) FROM users WHERE org_id = o.id) as user_count
      FROM organizations o
      ORDER BY o.created_at DESC
    `);
        res.json({ tenants });
    } catch (err) {
        console.error('[Platform] List tenants error:', err);
        res.status(500).json({ error: 'Failed to list tenants' });
    }
});

// ─── GET /tenants/:id — Get tenant details ───────────────────────────────────
router.get('/tenants/:id', async (req, res) => {
    try {
        const tenant = await db.get('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        const users = await db.all(
            'SELECT id, username, email, role, user_type, created_at, last_login FROM users WHERE org_id = ?',
            [req.params.id]
        );

        const roles = await db.all(
            'SELECT * FROM rbac_roles WHERE tenant_id = ?',
            [req.params.id]
        );

        res.json({ tenant, users, roles });
    } catch (err) {
        console.error('[Platform] Get tenant error:', err);
        res.status(500).json({ error: 'Failed to get tenant' });
    }
});

// ─── POST /tenants/:id/users — Create company user within tenant ─────────────
router.post('/tenants/:id/users', async (req, res) => {
    try {
        const tenant = await db.get('SELECT id, name FROM organizations WHERE id = ?', [req.params.id]);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        const { username, email, password, role, company } = req.body;
        if (!username || !email || !password || !role) {
            return res.status(400).json({ error: 'username, email, password, and role are required' });
        }

        const existing = await db.get('SELECT id FROM users WHERE email = ? OR username = ?', [email, username]);
        if (existing) return res.status(409).json({ error: 'User with this email or username already exists' });

        const id = uuidv4();
        const hash = await bcrypt.hash(password, 12);
        await db.run(
            `INSERT INTO users (id, username, email, password_hash, role, user_type, company, org_id)
             VALUES (?, ?, ?, ?, ?, 'tenant', ?, ?)`,
            [id, username, email, hash, role, company || tenant.name, req.params.id]
        );

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, target_id, details) VALUES (?, ?, 'TENANT_USER_CREATED', ?, ?)`,
            [uuidv4(), req.user.id, id, JSON.stringify({ username, email, role, tenant_id: req.params.id, tenant_name: tenant.name })]
        );

        if (typeof db.save === 'function') await db.save();
        res.status(201).json({ id, username, email, role, user_type: 'tenant', org_id: req.params.id, message: 'Company user created' });
    } catch (err) {
        console.error('[Platform] Create tenant user error:', err);
        res.status(500).json({ error: 'Failed to create company user' });
    }
});

// ─── PUT /tenants/:id — Update tenant plan/flags ─────────────────────────────
router.put('/tenants/:id', async (req, res) => {
    try {
        const { plan, feature_flags, name } = req.body;
        const tenant = await db.get('SELECT id FROM organizations WHERE id = ?', [req.params.id]);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        const updates = [];
        const params = [];
        if (plan) { updates.push('plan = ?'); params.push(plan); }
        if (feature_flags) {
            const flags = typeof feature_flags === 'string' ? feature_flags : JSON.stringify(feature_flags);
            updates.push('feature_flags = ?'); params.push(flags);
        }
        if (name) { updates.push('name = ?'); params.push(name); }
        updates.push("updated_at = datetime('now')");

        if (updates.length > 1) {
            params.push(req.params.id);
            await db.run(`UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        // Audit
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'TENANT_UPDATED', 'organization', ?, ?)`,
            [uuidv4(), req.user.id, req.params.id, JSON.stringify(req.body)]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: 'Tenant updated', id: req.params.id });
    } catch (err) {
        console.error('[Platform] Update tenant error:', err);
        res.status(500).json({ error: 'Failed to update tenant' });
    }
});

// ─── POST /tenants/:id/suspend — Suspend tenant ─────────────────────────────
router.post('/tenants/:id/suspend', async (req, res) => {
    try {
        const { reason } = req.body;
        await db.run(
            "UPDATE organizations SET status = 'suspended', updated_at = datetime('now') WHERE id = ?",
            [req.params.id]
        );

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'TENANT_SUSPENDED', 'organization', ?, ?)`,
            [uuidv4(), req.user.id, req.params.id, JSON.stringify({ reason: reason || 'No reason provided' })]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: 'Tenant suspended', id: req.params.id });
    } catch (err) {
        console.error('[Platform] Suspend tenant error:', err);
        res.status(500).json({ error: 'Failed to suspend tenant' });
    }
});

// ─── POST /tenants/:id/activate — Reactivate tenant ─────────────────────────
router.post('/tenants/:id/activate', async (req, res) => {
    try {
        await db.run(
            "UPDATE organizations SET status = 'active', updated_at = datetime('now') WHERE id = ?",
            [req.params.id]
        );

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'TENANT_ACTIVATED', 'organization', ?, ?)`,
            [uuidv4(), req.user.id, req.params.id, '{}']
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: 'Tenant activated', id: req.params.id });
    } catch (err) {
        console.error('[Platform] Activate tenant error:', err);
        res.status(500).json({ error: 'Failed to activate tenant' });
    }
});

// ─── POST /tenants/:id/admin-reset — Reset Company Admin password ────────────
router.post('/tenants/:id/admin-reset', async (req, res) => {
    try {
        const { new_password } = req.body;
        if (!new_password || new_password.length < 8) {
            return res.status(400).json({ error: 'new_password required (min 8 chars)' });
        }

        // Find company admin for this tenant
        const admin = await db.get(
            "SELECT id, username FROM users WHERE org_id = ? AND (role = 'admin' OR role = 'company_admin') ORDER BY created_at ASC LIMIT 1",
            [req.params.id]
        );
        if (!admin) return res.status(404).json({ error: 'No Company Admin found for this tenant' });

        const hash = await bcrypt.hash(new_password, 12);
        await db.run('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?', [hash, admin.id]);

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'ADMIN_PASSWORD_RESET', 'user', ?, ?)`,
            [uuidv4(), req.user.id, admin.id, JSON.stringify({ tenant_id: req.params.id, target_username: admin.username })]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: `Password reset for ${admin.username}`, user_id: admin.id });
    } catch (err) {
        console.error('[Platform] Admin reset error:', err);
        res.status(500).json({ error: 'Failed to reset admin password' });
    }
});

// ─── GET /audit — Global audit log ──────────────────────────────────────────
router.get('/audit', async (req, res) => {
    try {
        const { limit = 100, offset = 0 } = req.query;
        const logs = await db.all(
            `SELECT al.*, u.username as actor_name 
       FROM audit_log al
       LEFT JOIN users u ON u.id = al.actor_id
       ORDER BY al.created_at DESC
       LIMIT ? OFFSET ?`,
            [Math.min(parseInt(limit) || 50, 200), Math.max(parseInt(offset) || 0, 0)]
        );
        res.json({ logs });
    } catch (err) {
        console.error('[Platform] Audit error:', err);
        res.status(500).json({ error: 'Failed to load audit logs' });
    }
});

module.exports = router;
