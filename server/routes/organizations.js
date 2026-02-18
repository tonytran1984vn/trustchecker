/**
 * Organization Management Routes
 * CRUD for organizations, member management, and Enterprise provisioning.
 *
 * Endpoints:
 *   POST   /api/org              — Create organization
 *   GET    /api/org               — Get current user's organization
 *   PUT    /api/org               — Update organization settings
 *   POST   /api/org/invite        — Invite member (email)
 *   DELETE /api/org/members/:id   — Remove member
 *   GET    /api/org/members       — List members
 *   POST   /api/org/provision     — Provision Enterprise schema (admin only)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authMiddleware } = require('../auth');

// ─── Auth: all org routes require authentication ─────────────────────────────
router.use(authMiddleware);

// ─── Create Organization ─────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || name.length < 2) {
            return res.status(400).json({ error: 'Organization name is required (min 2 chars)' });
        }

        // Generate slug from name
        const slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);

        const id = crypto.randomUUID();
        const db = req.app.locals.db;

        // Check slug uniqueness
        const existing = await db.get('SELECT id FROM organizations WHERE slug = ?', [slug]);
        if (existing) {
            return res.status(409).json({ error: 'Organization slug already exists' });
        }

        await db.run(
            `INSERT INTO organizations (id, name, slug, plan, settings, created_at, updated_at)
             VALUES (?, ?, ?, 'free', '{}', datetime('now'), datetime('now'))`,
            [id, name, slug]
        );

        // Link user to org
        await db.run('UPDATE users SET org_id = ? WHERE id = ?', [id, req.user.id]);

        res.status(201).json({
            id,
            name,
            slug,
            plan: 'free',
            message: 'Organization created successfully',
        });
    } catch (err) {
        console.error('[org] Create error:', err.message);
        res.status(500).json({ error: 'Failed to create organization' });
    }
});


// ─── Get Current Organization ────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const db = req.app.locals.db;

        if (!req.user.orgId && !req.tenantId) {
            return res.json({ org: null, message: 'User is not part of any organization' });
        }

        const orgId = req.user.orgId || req.tenantId;
        const org = await db.get('SELECT * FROM organizations WHERE id = ?', [orgId]);

        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        const memberCount = await db.get(
            'SELECT COUNT(*) as count FROM users WHERE org_id = ?', [orgId]
        );

        res.json({
            ...org,
            member_count: memberCount?.count || 0,
            settings: typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings,
        });
    } catch (err) {
        console.error('[org] Get error:', err.message);
        res.status(500).json({ error: 'Failed to fetch organization' });
    }
});


// ─── Update Organization ─────────────────────────────────────────────────────
router.put('/', async (req, res) => {
    try {
        const { name, settings } = req.body;
        const db = req.app.locals.db;
        const orgId = req.user.orgId || req.tenantId;

        if (!orgId) {
            return res.status(403).json({ error: 'No organization context' });
        }

        // Only admins and managers can update org
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        // Column names are hardcoded (never from user input) — safe from SQL injection
        const ALLOWED_FIELDS = { name: 'name', settings: 'settings' };
        const updates = [];
        const params = [];

        if (name) {
            updates.push(`${ALLOWED_FIELDS.name} = ?`);
            params.push(name);
        }
        if (settings) {
            updates.push(`${ALLOWED_FIELDS.settings} = ?`);
            params.push(JSON.stringify(settings));
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        updates.push("updated_at = datetime('now')");
        params.push(orgId);

        await db.run(
            `UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`,
            params
        );

        res.json({ message: 'Organization updated successfully' });
    } catch (err) {
        console.error('[org] Update error:', err.message);
        res.status(500).json({ error: 'Failed to update organization' });
    }
});


// ─── List Members ────────────────────────────────────────────────────────────
router.get('/members', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const orgId = req.user.orgId || req.tenantId;

        if (!orgId) {
            return res.status(403).json({ error: 'No organization context' });
        }

        const members = await db.all(
            `SELECT id, username, email, role, created_at, last_login
             FROM users WHERE org_id = ? ORDER BY created_at`,
            [orgId]
        );

        res.json({ members, total: members.length });
    } catch (err) {
        console.error('[org] Members error:', err.message);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});


// ─── Invite Member ───────────────────────────────────────────────────────────
router.post('/invite', async (req, res) => {
    try {
        const { email, role = 'user' } = req.body;
        const db = req.app.locals.db;
        const orgId = req.user.orgId || req.tenantId;

        if (!orgId) {
            return res.status(403).json({ error: 'No organization context' });
        }
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only admins and managers can invite' });
        }
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        // Check if user exists
        const existingUser = await db.get('SELECT id, org_id FROM users WHERE email = ?', [email]);

        if (existingUser) {
            if (existingUser.org_id) {
                return res.status(409).json({ error: 'User already belongs to an organization' });
            }
            // Link existing user to org
            await db.run('UPDATE users SET org_id = ? WHERE id = ?', [orgId, existingUser.id]);
            return res.json({ message: 'Existing user added to organization', userId: existingUser.id });
        }

        // TODO: Send invitation email for new users
        // For now, create a pending invitation record
        const inviteId = crypto.randomUUID();
        const token = crypto.randomBytes(32).toString('hex');

        await db.run(
            `INSERT INTO audit_log (id, user_id, action, details, ip_address, created_at)
             VALUES (?, ?, 'org_invite', ?, ?, datetime('now'))`,
            [inviteId, req.user.id, JSON.stringify({ email, role, org_id: orgId, token }), req.ip]
        );

        res.status(201).json({
            message: 'Invitation sent',
            invite_token: token,
            email,
        });
    } catch (err) {
        console.error('[org] Invite error:', err.message);
        res.status(500).json({ error: 'Failed to send invitation' });
    }
});


// ─── Remove Member ───────────────────────────────────────────────────────────
router.delete('/members/:id', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const orgId = req.user.orgId || req.tenantId;
        const targetId = req.params.id;

        if (!orgId) {
            return res.status(403).json({ error: 'No organization context' });
        }
        if (!['admin', 'manager'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }
        if (targetId === req.user.id) {
            return res.status(400).json({ error: 'Cannot remove yourself from organization' });
        }

        const target = await db.get(
            'SELECT id, org_id FROM users WHERE id = ? AND org_id = ?',
            [targetId, orgId]
        );

        if (!target) {
            return res.status(404).json({ error: 'Member not found in organization' });
        }

        await db.run('UPDATE users SET org_id = NULL WHERE id = ?', [targetId]);

        res.json({ message: 'Member removed from organization' });
    } catch (err) {
        console.error('[org] Remove member error:', err.message);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});


// ─── Provision Enterprise Schema ─────────────────────────────────────────────
router.post('/provision', async (req, res) => {
    try {
        const db = req.app.locals.db;
        const orgId = req.user.orgId || req.tenantId;

        if (req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Admin only' });
        }
        if (!orgId) {
            return res.status(403).json({ error: 'No organization context' });
        }

        const org = await db.get('SELECT * FROM organizations WHERE id = ?', [orgId]);
        if (!org) {
            return res.status(404).json({ error: 'Organization not found' });
        }
        if (org.plan !== 'enterprise') {
            return res.status(403).json({
                error: 'Schema isolation requires Enterprise plan',
                current_plan: org.plan,
            });
        }
        if (org.schema_name) {
            return res.json({
                message: 'Schema already provisioned',
                schema_name: org.schema_name,
            });
        }

        // Create dedicated PostgreSQL schema
        const schemaName = `tenant_${org.slug.replace(/-/g, '_')}`;

        try {
            await db.run(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

            // Clone table structure from public schema
            // In production, this would run Prisma migrations against the new schema
            await db.run(
                'UPDATE organizations SET schema_name = ?, updated_at = datetime(\'now\') WHERE id = ?',
                [schemaName, orgId]
            );

            res.status(201).json({
                message: 'Enterprise schema provisioned',
                schema_name: schemaName,
                note: 'Run prisma migrate deploy with schema_name to initialize tables',
            });
        } catch (schemaErr) {
            console.error('[org] Schema provisioning error:', schemaErr.message);
            res.status(500).json({ error: 'Failed to provision schema — ensure PostgreSQL is configured' });
        }
    } catch (err) {
        console.error('[org] Provision error:', err.message);
        res.status(500).json({ error: 'Failed to provision Enterprise schema' });
    }
});


module.exports = router;
