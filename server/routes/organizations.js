/**
 * Organization Management Routes
 * Multi-tenant org CRUD, member management, and Enterprise provisioning.
 *
 * Super Admin Endpoints:
 *   GET    /api/org/all            — List ALL organizations (super_admin only)
 *   POST   /api/org               — Create organization (super_admin only)
 *   PUT    /api/org/:id/plan       — Assign plan to org (super_admin only)
 *   DELETE /api/org/:id            — Deactivate org (super_admin only)
 *
 * Org Admin Endpoints:
 *   GET    /api/org               — Get current user's organization
 *   PUT    /api/org               — Update organization settings
 *   POST   /api/org/invite        — Invite member (email)
 *   DELETE /api/org/members/:id   — Remove member
 *   GET    /api/org/members       — List members
 *   POST   /api/org/provision     — Provision Enterprise schema
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const requireSuperAdmin = require('../middleware/requireSuperAdmin');

// All org routes require authentication
router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════════
// SUPER ADMIN ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// ─── List ALL Organizations (super_admin only) ───────────────────────────────
router.get('/all', requireSuperAdmin(), async (req, res) => {
    try {
        const { status, plan, limit = 50, offset = 0 } = req.query;
        let query = 'SELECT * FROM organizations WHERE 1=1';
        const params = [];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (plan) {
            query += ' AND plan = ?';
            params.push(plan);
        }
        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Math.max(Number(offset) || 0, 0));

        const orgs = await db.prepare(query).all(...params);
        const total = await db.prepare('SELECT COUNT(*) as count FROM organizations').get();

        // Enrich with member counts
        const enriched = [];
        for (const org of orgs) {
            const mc = await db.prepare('SELECT COUNT(*) as count FROM users WHERE org_id = ?').get(org.id);
            enriched.push({ ...org, member_count: mc?.count || 0 });
        }

        res.json({ organizations: enriched, total: total?.count || 0 });
    } catch (err) {
        console.error('[org] List all error:', err.message);
        res.status(500).json({ error: 'Failed to list organizations' });
    }
});

// ─── Create Organization (super_admin only) ──────────────────────────────────
router.post('/', requireSuperAdmin(), async (req, res) => {
    try {
        const { name, plan = 'free', owner_email } = req.body;
        if (!name || name.length < 2) {
            return res.status(400).json({ error: 'Organization name is required (min 2 chars)' });
        }

        const slug = name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);

        const id = uuidv4();

        const existing = await db.prepare('SELECT id FROM organizations WHERE slug = ?').get(slug);
        if (existing) {
            return res.status(409).json({ error: 'Organization slug already exists' });
        }

        await db.prepare(
            `INSERT INTO organizations (id, name, slug, plan, settings, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, '{}', ?, datetime('now'), datetime('now'))`
        ).run(id, name, slug, plan, req.user.id);

        // If owner_email is provided, link that user to the new org as admin
        if (owner_email) {
            const ownerUser = await db.prepare('SELECT id FROM users WHERE email = ?').get(owner_email);
            if (ownerUser) {
                await db.prepare('UPDATE users SET org_id = ?, role = ? WHERE id = ?')
                    .run(id, 'admin', ownerUser.id);
            }
        }

        // Audit
        await db.prepare(`INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.user.id, 'ORG_CREATED', 'organization', id, JSON.stringify({ name, slug, plan }));

        res.status(201).json({
            id, name, slug, plan,
            message: 'Organization created successfully',
        });
    } catch (err) {
        console.error('[org] Create error:', err.message);
        res.status(500).json({ error: 'Failed to create organization' });
    }
});

// ─── Assign Plan to Organization (super_admin only) ──────────────────────────
router.put('/:id/plan', requireSuperAdmin(), async (req, res) => {
    try {
        const { plan } = req.body;
        const validPlans = ['free', 'starter', 'professional', 'enterprise'];
        if (!plan || !validPlans.includes(plan)) {
            return res.status(400).json({ error: 'Valid plan required: ' + validPlans.join(', ') });
        }

        const org = await db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        await db.prepare("UPDATE organizations SET plan = ?, updated_at = datetime('now') WHERE id = ?")
            .run(plan, req.params.id);

        // Audit
        await db.prepare(`INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.user.id, 'ORG_PLAN_CHANGED', 'organization', req.params.id,
                JSON.stringify({ old_plan: org.plan, new_plan: plan }));

        res.json({ message: 'Plan updated', org_id: req.params.id, plan });
    } catch (err) {
        console.error('[org] Plan update error:', err.message);
        res.status(500).json({ error: 'Failed to update plan' });
    }
});

// ─── Deactivate Organization (super_admin only) ──────────────────────────────
router.delete('/:id', requireSuperAdmin(), async (req, res) => {
    try {
        const org = await db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.params.id);
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        if (org.slug === 'trustchecker') {
            return res.status(403).json({ error: 'Cannot deactivate the platform organization' });
        }

        await db.prepare("UPDATE organizations SET status = 'inactive', updated_at = datetime('now') WHERE id = ?")
            .run(req.params.id);

        // Audit
        await db.prepare(`INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.user.id, 'ORG_DEACTIVATED', 'organization', req.params.id,
                JSON.stringify({ name: org.name, slug: org.slug }));

        res.json({ message: 'Organization deactivated', org_id: req.params.id });
    } catch (err) {
        console.error('[org] Deactivate error:', err.message);
        res.status(500).json({ error: 'Failed to deactivate organization' });
    }
});


// ═══════════════════════════════════════════════════════════════════
// ORG ADMIN & MEMBER ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

// ─── Get Current Organization ────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const orgId = req.user.orgId || null;

        if (!orgId) {
            return res.json({ org: null, message: 'User is not part of any organization' });
        }

        const org = await db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId);
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        const memberCount = await db.prepare('SELECT COUNT(*) as count FROM users WHERE org_id = ?').get(orgId);

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
router.put('/', requirePermission('tenant:settings_update'), async (req, res) => {
    try {
        const { name, settings } = req.body;
        const orgId = req.user.orgId;

        if (!orgId) return res.status(403).json({ error: 'No organization context' });

        const updates = [];
        const params = [];

        if (name) { updates.push('name = ?'); params.push(name); }
        if (settings) { updates.push('settings = ?'); params.push(JSON.stringify(settings)); }

        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

        updates.push("updated_at = datetime('now')");
        params.push(orgId);

        await db.prepare(`UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        res.json({ message: 'Organization updated successfully' });
    } catch (err) {
        console.error('[org] Update error:', err.message);
        res.status(500).json({ error: 'Failed to update organization' });
    }
});

// ─── List Members ────────────────────────────────────────────────────────────
router.get('/members', async (req, res) => {
    try {
        const orgId = req.user.orgId;
        if (!orgId) return res.status(403).json({ error: 'No organization context' });

        const members = await db.prepare(
            `SELECT id, username, email, role, created_at, last_login FROM users WHERE org_id = ? ORDER BY created_at`
        ).all(orgId);

        res.json({ members, total: members.length });
    } catch (err) {
        console.error('[org] Members error:', err.message);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// ─── Invite Member ───────────────────────────────────────────────────────────
router.post('/invite', requirePermission('tenant:user_create'), async (req, res) => {
    try {
        const { email, role = 'operator' } = req.body;
        const orgId = req.user.orgId;

        if (!orgId) return res.status(403).json({ error: 'No organization context' });
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const existingUser = await db.prepare('SELECT id, org_id FROM users WHERE email = ?').get(email);
        if (existingUser) {
            if (existingUser.org_id) {
                return res.status(409).json({ error: 'User already belongs to an organization' });
            }
            await db.prepare('UPDATE users SET org_id = ? WHERE id = ?').run(orgId, existingUser.id);
            return res.json({ message: 'Existing user added to organization', userId: existingUser.id });
        }

        const inviteId = uuidv4();
        const token = crypto.randomBytes(32).toString('hex');

        await db.prepare(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, 'org_invite', 'organization', ?, ?, ?)`
        ).run(inviteId, req.user.id, orgId, JSON.stringify({ email, role, token }), req.ip || '');

        res.status(201).json({ message: 'Invitation sent', invite_token: token, email });
    } catch (err) {
        console.error('[org] Invite error:', err.message);
        res.status(500).json({ error: 'Failed to send invitation' });
    }
});

// ─── Remove Member ───────────────────────────────────────────────────────────
router.delete('/members/:id', requirePermission('tenant:user_delete'), async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const targetId = req.params.id;

        if (!orgId) return res.status(403).json({ error: 'No organization context' });
        if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself' });

        const target = await db.prepare('SELECT id FROM users WHERE id = ? AND org_id = ?').get(targetId, orgId);
        if (!target) return res.status(404).json({ error: 'Member not found in organization' });

        await db.prepare('UPDATE users SET org_id = NULL WHERE id = ?').run(targetId);
        res.json({ message: 'Member removed from organization' });
    } catch (err) {
        console.error('[org] Remove member error:', err.message);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

// ─── Provision Enterprise Schema ─────────────────────────────────────────────
router.post('/provision', requirePermission('tenant:settings_update'), async (req, res) => {
    try {
        const orgId = req.user.orgId;
        if (!orgId) return res.status(403).json({ error: 'No organization context' });

        const org = await db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId);
        if (!org) return res.status(404).json({ error: 'Organization not found' });
        if (org.plan !== 'enterprise') {
            return res.status(403).json({ error: 'Schema isolation requires Enterprise plan', current_plan: org.plan });
        }
        if (org.schema_name) {
            return res.json({ message: 'Schema already provisioned', schema_name: org.schema_name });
        }

        const schemaName = `tenant_${org.slug.replace(/-/g, '_')}`;
        try {
            await db.run(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
            await db.prepare("UPDATE organizations SET schema_name = ?, updated_at = datetime('now') WHERE id = ?")
                .run(schemaName, orgId);

            res.status(201).json({
                message: 'Enterprise schema provisioned',
                schema_name: schemaName,
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
