const { encrypt, decrypt } = require('../security/field-encryption');
/**
 * Platform Routes — SuperAdmin Only
 *
 * Manages orgs (companies), licensing, feature flags, and platform audit.
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
const { clearCacheByPrefix } = require('../cache');

// All routes require auth + platform admin
router.use(authMiddleware);
router.use(requirePlatformAdmin());

// ─── GET /orgs/check-availability — Real-time name/slug uniqueness check ────
router.get('/orgs/check-availability', async (req, res) => {
    try {
        const { name, slug } = req.query;
        const result = { name_available: true, slug_available: true, suggestions: [] };

        if (name) {
            const existing = await db.get('SELECT id FROM organizations WHERE LOWER(name) = LOWER(?)', [name]);
            result.name_available = !existing;
        }

        if (slug) {
            const existing = await db.get('SELECT id FROM organizations WHERE slug = ?', [slug]);
            result.slug_available = !existing;

            if (existing) {
                // Generate 3 slug suggestions
                const rand = () => Math.floor(100 + Math.random() * 900); // 3-digit
                const suffixes = ['ltd', String(rand()), 'co'];
                const suggestions = [];
                for (const s of suffixes) {
                    const candidate = `${slug}-${s}`;
                    const taken = await db.get('SELECT id FROM organizations WHERE slug = ?', [candidate]);
                    if (!taken) suggestions.push(candidate);
                }
                result.suggestions = suggestions;
            }
        }

        res.json(result);
    } catch (err) {
        logger.error('[Platform] Check availability error:', err);
        res.status(500).json({ error: 'Failed to check availability' });
    }
});

// ─── POST /orgs — Create new org/company ──────────────────────────────
router.post('/orgs', async (req, res) => {
    try {
        const { name, slug, plan = 'free', feature_flags = {}, admin_email, admin_username, admin_password } = req.body;

        if (!name || !slug) {
            return res.status(400).json({ error: 'name and slug are required' });
        }
        if (!admin_email || !admin_username || !admin_password) {
            return res
                .status(400)
                .json({ error: 'admin_email, admin_username, admin_password are required to create Company Admin' });
        }

        // Check name uniqueness
        const existingName = await db.get('SELECT id FROM organizations WHERE name = ?', [name]);
        if (existingName) {
            return res.status(409).json({ error: `Organization name "${name}" already exists` });
        }

        // Check slug uniqueness
        const existing = await db.get('SELECT id FROM organizations WHERE slug = ?', [slug]);
        if (existing) {
            return res.status(409).json({ error: `Slug "${slug}" already taken` });
        }

        const orgId = uuidv4();
        const flags = typeof feature_flags === 'string' ? feature_flags : JSON.stringify(feature_flags);

        // Create org
        await db.run(
            `INSERT INTO organizations (id, name, slug, plan, feature_flags, status, created_by) VALUES (?, ?, ?, ?, ?, 'active', ?)`,
            [orgId, name, slug, plan, flags, req.user.id]
        );

        // Create Company Admin user
        const adminId = uuidv4();
        const hash = await bcrypt.hash(admin_password, 12);
        await db.run(
            `INSERT INTO users (id, username, email, password_hash, role, user_type, company, org_id) VALUES (?, ?, ?, ?, 'admin', 'org', ?, ?)`,
            [adminId, admin_username, admin_email, hash, name, orgId]
        );

        // Create org-scoped company_admin role
        const roleId = `role-${orgId}-company_admin`;
        await db.run(
            `INSERT OR IGNORE INTO rbac_roles (id, org_id, name, display_name, type, is_system, description) VALUES (?, ?, 'company_admin', 'Company Admin', 'system', 1, 'Org administrator')`,
            [roleId, orgId]
        );

        // Copy company_admin template permissions
        const templatePerms = await db.all(
            `SELECT permission_id FROM rbac_role_permissions WHERE role_id = 'role-company_admin'`
        );
        for (const p of templatePerms) {
            await db.run('INSERT OR IGNORE INTO rbac_role_permissions (role_id, permission_id) VALUES (?, ?)', [
                roleId,
                p.permission_id,
            ]);
        }

        // Assign role to admin user
        await db.run('INSERT OR IGNORE INTO rbac_user_roles (user_id, role_id, assigned_by) VALUES (?, ?, ?)', [
            adminId,
            roleId,
            req.user.id,
        ]);

        // Audit log
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'TENANT_CREATED', 'organization', ?, ?)`,
            [uuidv4(), req.user.id, orgId, JSON.stringify({ name, slug, plan, admin_username })]
        );

        // Save if SQLite
        if (typeof db.save === 'function') await db.save();

        res.status(201).json({
            org: { id: orgId, name, slug, plan, status: 'active' },
            admin: { id: adminId, username: admin_username, email: admin_email, role: 'admin' },
            message: 'Tenant created with Company Admin',
        });
    } catch (err) {
        logger.error('[Platform] Create org error:', err);
        res.status(500).json({ error: 'Failed to create org' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM-WIDE FEATURE FLAGS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /feature-flags — Read platform-wide flags from dedicated table
router.get('/feature-flags', async (req, res) => {
    try {
        const rows = await db.all(
            'SELECT key, label, description, icon, color, enabled FROM platform_feature_flags ORDER BY key LIMIT 1000'
        );
        // Also return as a simple key→value map for backward compat
        const flags = {};
        rows.forEach(r => {
            flags[r.key] = r.enabled;
        });
        res.json({ flags, flagList: rows });
    } catch (err) {
        logger.error('[Platform] Feature flags read error:', err);
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
            'UPDATE platform_feature_flags SET enabled = ?, updated_at = NOW(), updated_by = ? WHERE key = ?',
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
        logger.error('[Platform] Feature flag toggle error:', err);
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
            "SELECT id, key, label, description, icon, enabled FROM notification_preferences WHERE user_id = ? AND category = 'channel' ORDER BY created_at LIMIT 1000",
            [req.user.id]
        );
        const events = await db.all(
            "SELECT id, key, label, description, severity, enabled FROM notification_preferences WHERE user_id = ? AND category = 'event' ORDER BY created_at LIMIT 1000",
            [req.user.id]
        );
        res.json({ channels, events });
    } catch (err) {
        logger.error('[Platform] Notifications read error:', err);
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

        await db.run('UPDATE notification_preferences SET enabled = ?, updated_at = NOW() WHERE id = ?', [
            enabled,
            req.params.id,
        ]);

        if (typeof db.save === 'function') await db.save();
        res.json({ message: `${pref.key} ${enabled ? 'enabled' : 'disabled'}`, id: req.params.id, enabled });
    } catch (err) {
        logger.error('[Platform] Notification toggle error:', err);
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
        logger.error('[Platform] Email settings read error:', err);
        res.status(500).json({ error: 'Failed to read email settings' });
    }
});

// PUT /email-settings — Update SMTP config + recipients
router.put('/email-settings', async (req, res) => {
    try {
        const {
            smtp_host,
            smtp_port,
            smtp_user,
            smtp_pass,
            smtp_secure,
            from_name,
            from_email,
            recipients,
            enabled,
            smtp_accounts,
            daily_limit,
        } = req.body;

        // Build SET clause dynamically (only update provided fields)
        const updates = [];
        const params = [];
        let idx = 1;

        if (smtp_host !== undefined) {
            updates.push(`smtp_host = $${idx++}`);
            params.push(smtp_host);
        }
        if (smtp_port !== undefined) {
            updates.push(`smtp_port = $${idx++}`);
            params.push(smtp_port);
        }
        if (smtp_user !== undefined) {
            updates.push(`smtp_user = $${idx++}`);
            params.push(smtp_user);
        }
        if (smtp_pass !== undefined && smtp_pass !== '••••••••') {
            updates.push(`smtp_pass = $${idx++}`);
            params.push(smtp_pass);
        }
        if (smtp_secure !== undefined) {
            updates.push(`smtp_secure = $${idx++}`);
            params.push(smtp_secure);
        }
        if (from_name !== undefined) {
            updates.push(`from_name = $${idx++}`);
            params.push(from_name);
        }
        if (from_email !== undefined) {
            updates.push(`from_email = $${idx++}`);
            params.push(from_email);
        }
        if (recipients !== undefined) {
            updates.push(`recipients = $${idx++}::jsonb`);
            params.push(JSON.stringify(recipients));
        }
        if (enabled !== undefined) {
            updates.push(`enabled = $${idx++}`);
            params.push(enabled);
        }
        if (smtp_accounts !== undefined) {
            updates.push(`smtp_accounts = $${idx++}::jsonb`);
            params.push(JSON.stringify(smtp_accounts));
        }
        if (daily_limit !== undefined) {
            updates.push(`daily_limit = $${idx++}`);
            params.push(daily_limit);
        }

        updates.push(`updated_at = NOW()`);
        updates.push(`updated_by = $${idx++}`);
        params.push(req.user.id);

        if (updates.length > 2) {
            await db.run(`UPDATE email_settings SET ${updates.join(', ')} WHERE id = 'default'`, params);
            emailService.invalidateConfig();
        }

        if (typeof db.save === 'function') await db.save();
        res.json({ message: 'Email settings updated' });
    } catch (err) {
        logger.error('[Platform] Email settings update error:', err);
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
        logger.error('[Platform] Test email error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CHANNEL SETTINGS (Slack / SMS / Push)
// ═══════════════════════════════════════════════════════════════════════════════
const slackService = require('../services/slack');
const { withTransaction } = require('../middleware/transaction');
const logger = require('../lib/logger');

// GET /channel-settings/:channel
router.get('/channel-settings/:channel', async (req, res) => {
    try {
        const row = await db.get('SELECT * FROM channel_settings WHERE channel = $1', [req.params.channel]);
        if (!row) return res.json({ config: { enabled: false, config: {} } });
        res.json({ config: { ...row, config: typeof row.config === 'string' ? JSON.parse(row.config) : row.config } });
    } catch (err) {
        logger.error('[Platform] Channel settings read error:', err);
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

        if (enabled !== undefined) {
            updates.push(`enabled = $${idx++}`);
            params.push(enabled);
        }
        if (config !== undefined) {
            updates.push(`config = $${idx++}::jsonb`);
            params.push(JSON.stringify(config));
        }
        updates.push(`updated_at = NOW()`);
        updates.push(`updated_by = $${idx++}`);
        params.push(req.user.id);
        params.push(req.params.channel);

        await db.run(`UPDATE channel_settings SET ${updates.join(', ')} WHERE channel = $${idx}`, params);

        // Invalidate cache for slack
        if (req.params.channel === 'slack') slackService.invalidateConfig();

        res.json({ message: `${req.params.channel} settings updated` });
    } catch (err) {
        logger.error('[Platform] Channel settings update error:', err);
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
        logger.error('[Platform] Channel test error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

const PLATFORM_ROLES = [
    'super_admin',
    'platform_security',
    'data_gov_officer',
    'global_risk_committee',
    'emission_engine',
    'change_management_officer',
    'incident_response_lead',
    'auditor',
    'developer',
    'platform_devops',
];

// ─── GET /users — List platform users ────────────────────────────────────────
router.get('/users', async (req, res) => {
    try {
        const users = await db.all(
            `SELECT id, username, email, role, user_type, mfa_enabled, created_at, last_login
             FROM users WHERE user_type = 'platform' ORDER BY created_at ASC LIMIT 1000`
        );
        res.json({ users });
    } catch (err) {
        logger.error('[Platform] List users error:', err);
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
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'PLATFORM_USER_CREATED', 'user', ?, ?)`,
            [uuidv4(), req.user.id, id, JSON.stringify({ username, email, role })]
        );

        if (typeof db.save === 'function') await db.save();
        res.status(201).json({ id, username, email, role, user_type: 'platform', message: 'Platform user created' });
    } catch (err) {
        logger.error('[Platform] Create user error:', err);
        res.status(500).json({ error: 'Failed to create platform user' });
    }
});

// ─── PUT /users/:id — Update platform user (role, password, status) ─────────
router.put('/users/:id', async (req, res) => {
    try {
        const user = await db.get('SELECT id, username, role, email FROM users WHERE id = ? AND user_type = ?', [
            req.params.id,
            'platform',
        ]);
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
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'PLATFORM_USER_UPDATED', 'user', ?, ?)`,
            [uuidv4(), req.user.id, req.params.id, JSON.stringify({ username: user.username, ...changes })]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: 'User updated', id: req.params.id, changes });
    } catch (err) {
        logger.error('[Platform] Update user error:', err);
        res.status(500).json({ error: 'Failed to update platform user' });
    }
});

// ─── DELETE /users/:id — Remove platform user ───────────────────────────────
router.delete('/users/:id', async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }
        const user = await db.get('SELECT id, username, role FROM users WHERE id = ? AND user_type = ?', [
            req.params.id,
            'platform',
        ]);
        if (!user) return res.status(404).json({ error: 'Platform user not found' });

        await db.run('DELETE FROM users WHERE id = ?', [req.params.id]);

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'PLATFORM_USER_DELETED', 'user', ?, ?)`,
            [uuidv4(), req.user.id, req.params.id, JSON.stringify({ username: user.username, role: user.role })]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: 'Platform user deleted', id: req.params.id });
    } catch (err) {
        logger.error('[Platform] Delete user error:', err);
        res.status(500).json({ error: 'Failed to delete platform user' });
    }
});

// ─── GET /orgs — List all orgs ─────────────────────────────────────────
router.get('/orgs', async (req, res) => {
    try {
        const orgs = await db.all(`
      SELECT o.*, 
        (SELECT COUNT(*)::INT FROM users WHERE org_id = o.id) as user_count
      FROM organizations o
      ORDER BY o.created_at DESC
     LIMIT 1000`);
        res.json({ orgs });
    } catch (err) {
        logger.error('[Platform] List orgs error:', err);
        res.status(500).json({ error: 'Failed to list orgs' });
    }
});

// ─── GET /orgs/:id — Get org details ───────────────────────────────────
router.get('/orgs/:id', async (req, res) => {
    try {
        const org = await db.get('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
        if (!org) return res.status(404).json({ error: 'Tenant not found' });

        const users = await db.all(
            'SELECT id, username, email, role, user_type, created_at, last_login FROM users WHERE org_id = ?',
            [req.params.id]
        );

        const roles = await db.all('SELECT * FROM rbac_roles WHERE org_id = ?', [req.params.id]);

        res.json({ org, users, roles });
    } catch (err) {
        logger.error('[Platform] Get org error:', err);
        res.status(500).json({ error: 'Failed to get org' });
    }
});

// ─── POST /orgs/:id/users — Create company user within org ─────────────
router.post('/orgs/:id/users', async (req, res) => {
    try {
        const org = await db.get('SELECT id, name FROM organizations WHERE id = ?', [req.params.id]);
        if (!org) return res.status(404).json({ error: 'Tenant not found' });

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
             VALUES (?, ?, ?, ?, ?, 'org', ?, ?)`,
            [id, username, email, hash, role, company || org.name, req.params.id]
        );

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'TENANT_USER_CREATED', 'user', ?, ?)`,
            [
                uuidv4(),
                req.user.id,
                id,
                JSON.stringify({ username, email, role, org_id: req.params.id, org_name: org.name }),
            ]
        );

        if (typeof db.save === 'function') await db.save();
        res.status(201).json({
            id,
            username,
            email,
            role,
            user_type: 'org',
            org_id: req.params.id,
            message: 'Company user created',
        });
    } catch (err) {
        logger.error('[Platform] Create org user error:', err);
        res.status(500).json({ error: 'Failed to create company user' });
    }
});

// ─── PUT /orgs/:id — Update org plan/flags ─────────────────────────────
router.put('/orgs/:id', async (req, res) => {
    try {
        const { plan, feature_flags, name } = req.body;
        const org = await db.get('SELECT id FROM organizations WHERE id = ?', [req.params.id]);
        if (!org) return res.status(404).json({ error: 'Tenant not found' });

        const updates = [];
        const params = [];
        if (plan) {
            updates.push('plan = ?');
            params.push(plan);
        }
        if (feature_flags) {
            const flags = typeof feature_flags === 'string' ? feature_flags : JSON.stringify(feature_flags);
            updates.push('feature_flags = ?');
            params.push(flags);
        }
        if (name) {
            // Check name uniqueness (exclude self)
            const existingName = await db.get('SELECT id FROM organizations WHERE name = ? AND id != ?', [
                name,
                req.params.id,
            ]);
            if (existingName) {
                return res.status(409).json({ error: `Organization name "${name}" already exists` });
            }
            updates.push('name = ?');
            params.push(name);
        }
        updates.push('updated_at = NOW()');

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
        logger.error('[Platform] Update org error:', err);
        res.status(500).json({ error: 'Failed to update org' });
    }
});

// ─── POST /orgs/:id/suspend — Suspend org ─────────────────────────────
router.post('/orgs/:id/suspend', async (req, res) => {
    try {
        const { reason } = req.body;
        await db.run("UPDATE organizations SET status = 'suspended', updated_at = NOW() WHERE id = ?", [req.params.id]);

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'TENANT_SUSPENDED', 'organization', ?, ?)`,
            [uuidv4(), req.user.id, req.params.id, JSON.stringify({ reason: reason || 'No reason provided' })]
        );

        if (typeof db.save === 'function') await db.save();
        clearCacheByPrefix('/api/risk-graph').catch(() => {});
        res.json({ message: 'Tenant suspended', id: req.params.id });
    } catch (err) {
        logger.error('[Platform] Suspend org error:', err);
        res.status(500).json({ error: 'Failed to suspend org' });
    }
});

// ─── POST /orgs/:id/activate — Reactivate org ─────────────────────────
router.post('/orgs/:id/activate', async (req, res) => {
    try {
        await db.run("UPDATE organizations SET status = 'active', updated_at = NOW() WHERE id = ?", [req.params.id]);

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'TENANT_ACTIVATED', 'organization', ?, ?)`,
            [uuidv4(), req.user.id, req.params.id, '{}']
        );

        if (typeof db.save === 'function') await db.save();
        clearCacheByPrefix('/api/risk-graph').catch(() => {});
        res.json({ message: 'Tenant activated', id: req.params.id });
    } catch (err) {
        logger.error('[Platform] Activate org error:', err);
        res.status(500).json({ error: 'Failed to activate org' });
    }
});

// ─── POST /orgs/:id/admin-reset — Reset Company Admin password ────────────
router.post('/orgs/:id/admin-reset', async (req, res) => {
    try {
        const { new_password } = req.body;
        if (!new_password || new_password.length < 8) {
            return res.status(400).json({ error: 'new_password required (min 8 chars)' });
        }

        // Find company admin for this org
        const admin = await db.get(
            "SELECT id, username FROM users WHERE org_id = ? AND (role = 'admin' OR role = 'company_admin') ORDER BY created_at ASC LIMIT 1",
            [req.params.id]
        );
        if (!admin) return res.status(404).json({ error: 'No Company Admin found for this org' });

        const hash = await bcrypt.hash(new_password, 12);
        await db.run('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?', [
            hash,
            admin.id,
        ]);

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'ADMIN_PASSWORD_RESET', 'user', ?, ?)`,
            [
                uuidv4(),
                req.user.id,
                admin.id,
                JSON.stringify({ org_id: req.params.id, target_username: admin.username }),
            ]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: `Password reset for ${admin.username}`, user_id: admin.id });
    } catch (err) {
        logger.error('[Platform] Admin reset error:', err);
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
       ORDER BY al.timestamp DESC
       LIMIT ? OFFSET ?`,
            [Math.min(parseInt(limit) || 50, 200), Math.max(parseInt(offset) || 0, 0)]
        );
        res.json({ logs });
    } catch (err) {
        logger.error('[Platform] Audit error:', err);
        res.status(500).json({ error: 'Failed to load audit logs' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// SA CONFIG — Generic JSON config storage (approval-workflows, escalation, ABAC)
// ═══════════════════════════════════════════════════════════════════════════════

const SA_CONFIG_KEYS = ['approval_workflows', 'escalation_flow', 'abac_policies'];

// ─── GET /sa-config/:key — Read config ──────────────────────────────────────
router.get('/sa-config/:key', async (req, res) => {
    const key = req.params.key;
    if (!SA_CONFIG_KEYS.includes(key)) {
        return res.status(400).json({ error: `Invalid config key. Allowed: ${SA_CONFIG_KEYS.join(', ')}` });
    }
    try {
        const row = await db.get(
            "SELECT setting_value FROM system_settings WHERE category = 'sa_config' AND setting_key = ?",
            [key]
        );
        if (row && row.setting_value) {
            try {
                const data = JSON.parse(row.setting_value);
                return res.json({ key, data, source: 'database' });
            } catch {
                /* invalid JSON, fall through */
            }
        }
        res.json({ key, data: null, source: 'none' });
    } catch (err) {
        logger.error(`[Platform] SA config read error (${key}):`, err.message);
        res.json({ key, data: null, source: 'error' });
    }
});

// ─── PUT /sa-config/:key — Write config ─────────────────────────────────────
router.put('/sa-config/:key', async (req, res) => {
    const key = req.params.key;
    if (!SA_CONFIG_KEYS.includes(key)) {
        return res.status(400).json({ error: `Invalid config key. Allowed: ${SA_CONFIG_KEYS.join(', ')}` });
    }
    try {
        const value = JSON.stringify(req.body.data || req.body);
        // Upsert: try update first, then insert
        const existing = await db.get(
            "SELECT id FROM system_settings WHERE category = 'sa_config' AND setting_key = ?",
            [key]
        );
        if (existing) {
            await db.run(
                "UPDATE system_settings SET setting_value = ?, updated_by = ?, updated_at = NOW() WHERE category = 'sa_config' AND setting_key = ?",
                [value, req.user.id, key]
            );
        } else {
            await db.run(
                "INSERT INTO system_settings (id, category, setting_key, setting_value, description, updated_by) VALUES (?, 'sa_config', ?, ?, ?, ?)",
                [uuidv4(), key, value, `SA config: ${key}`, req.user.id]
            );
        }

        // Audit
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'SA_CONFIG_UPDATED', 'sa_config', ?, ?)`,
            [uuidv4(), req.user.id, key, JSON.stringify({ key, size: value.length })]
        );

        if (typeof db.save === 'function') await db.save();
        res.json({ message: `Config "${key}" saved`, key });
    } catch (err) {
        logger.error(`[Platform] SA config write error (${key}):`, err.message);
        res.status(500).json({ error: 'Failed to save config' });
    }
});

module.exports = router;
