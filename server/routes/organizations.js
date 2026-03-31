const logger = require('../lib/logger');
/**
 * Organization Management Routes
 * Multi-org org CRUD, member management, and Enterprise provisioning.
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

const { withTransaction } = require('../middleware/transaction');

function _safeId(name) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error('Invalid identifier: ' + name);
    return name;
}

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
        const total = await db.get('SELECT COUNT(*) as count FROM organizations');

        // Enrich with member counts
        const enriched = [];
        for (const org of orgs) {
            const mc = await db.get('SELECT COUNT(*) as count FROM users WHERE org_id = ?', [org.id]);
            enriched.push({ ...org, member_count: mc?.count || 0 });
        }

        res.json({ organizations: enriched, total: total?.count || 0 });
    } catch (err) {
        logger.error('[org] List all error:', err.message);
        res.status(500).json({ error: 'Failed to list organizations' });
    }
});

// ─── Create Organization (super_admin only) ──────────────────────────────────
// GOV: Auto-creates org_owner account. Org Owner then appoints Company Admin.
router.post('/', requireSuperAdmin(), async (req, res) => {
    try {
        const { name, plan = 'free', owner_email, owner_name, template = 'supply_chain' } = req.body;
        if (!name || name.length < 2) {
            return res.status(400).json({ error: 'Organization name is required (min 2 chars)' });
        }
        if (!owner_email) {
            return res.status(400).json({ error: 'Org Owner email is required' });
        }

        const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '')
            .substring(0, 50);

        const id = uuidv4();

        // Check name uniqueness
        const existingName = await db.get('SELECT id FROM organizations WHERE name = ?', [name]);
        if (existingName) {
            return res.status(409).json({ error: 'Organization name already exists' });
        }

        // Check slug uniqueness
        const existing = await db.get('SELECT id FROM organizations WHERE slug = ?', [slug]);
        if (existing) {
            return res.status(409).json({ error: 'Organization slug already exists' });
        }

        await db
            .prepare(
                `INSERT INTO organizations (id, name, slug, plan, settings, created_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, '{}', ?, NOW(), NOW())`
            )
            .run(id, name, slug, plan, req.user.id);

        // ── Auto-create or assign Org Owner ──────────────────────────────
        let ownerUser = await db.get('SELECT id, email FROM users WHERE email = ?', [owner_email]);
        let ownerCreated = false;
        const tempPassword = 'Change@' + Math.random().toString(36).substring(2, 10) + '!';

        if (!ownerUser) {
            const bcrypt = require('bcryptjs');
            const ownerId = uuidv4();
            const displayName = owner_name || owner_email.split('@')[0];
            const passwordHash = await bcrypt.hash(tempPassword, 12);

            await db
                .prepare(
                    `INSERT INTO users (id, username, email, password_hash, role, org_id, user_type, must_change_password, created_at)
                 VALUES (?, ?, ?, ?, 'org_owner', ?, 'org', 1, NOW())`
                )
                .run(ownerId, displayName, owner_email, passwordHash, id);
            ownerUser = { id: ownerId, email: owner_email };
            ownerCreated = true;
        } else {
            await db.prepare('UPDATE users SET org_id = ?, role = ? WHERE id = ?').run(id, 'org_owner', ownerUser.id);
        }

        // ── Seed RBAC roles for new org (filtered by template) ─────────
        const ROLE_TEMPLATES = {
            supply_chain: [
                'org_owner',
                'company_admin',
                'ops_manager',
                'scm_analyst',
                'risk_officer',
                'supplier_contributor',
                'operator',
                'viewer',
            ],
            esg_carbon: [
                'org_owner',
                'company_admin',
                'carbon_officer',
                'compliance_officer',
                'disclosure_officer',
                'data_steward',
                'internal_reviewer',
                'viewer',
            ],
            audit_ready: [
                'org_owner',
                'company_admin',
                'auditor',
                'external_auditor',
                'compliance_officer',
                'legal_counsel',
                'security_officer',
                'viewer',
            ],
            minimal: ['org_owner', 'company_admin', 'operator', 'viewer'],
        };
        const allowedRoles = ROLE_TEMPLATES[template] || ROLE_TEMPLATES.supply_chain;

        const templateRoles = await db.all(`SELECT * FROM rbac_roles WHERE org_id = '__TEMPLATE__' AND is_system = 1`);
        let rolesProvisioned = 0;
        for (const tmpl of templateRoles) {
            if (!allowedRoles.includes(tmpl.name)) continue; // Skip roles not in template
            const roleId = uuidv4();
            await db.run(
                `INSERT OR IGNORE INTO rbac_roles (id, org_id, name, display_name, type, is_system, description, mfa_policy)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [roleId, id, tmpl.name, tmpl.display_name, 'system', 1, tmpl.description, tmpl.mfa_policy]
            );
            rolesProvisioned++;
        }

        // ── Create membership for org owner ─────────────────────────────
        const membershipId = uuidv4();
        await db.run(
            `INSERT INTO memberships (id, user_id, org_id, status, role_context, invited_by) VALUES (?, ?, ?, 'active', 'owner', ?)`,
            [membershipId, ownerUser.id, id, req.user.id]
        );

        // Assign org_owner RBAC role via membership
        const ownerRole = await db.get(`SELECT id FROM rbac_roles WHERE org_id = ? AND name = 'org_owner'`, [id]);
        if (ownerRole) {
            await db.run(
                `INSERT OR IGNORE INTO rbac_user_roles (user_id, role_id, assigned_by, membership_id) VALUES (?, ?, ?, ?)`,
                [ownerUser.id, ownerRole.id, req.user.id, membershipId]
            );
        }

        // ── Auto-assign default scopes for org owner ─────────────────
        // Org owner gets access to all supply chains in the org (org-wide)
        const existingChains = await db.all(`SELECT id FROM supply_chains WHERE org_id = ?`, [id]);
        for (const chain of existingChains) {
            await db.run(
                `INSERT INTO membership_scopes (id, membership_id, scope_type, scope_id, access_level, granted_by)
                 VALUES (?, ?, 'supply_chain', ?, 'full', ?)
                 ON CONFLICT (membership_id, scope_type, scope_id) DO NOTHING`,
                [uuidv4(), membershipId, chain.id, req.user.id]
            );
        }

        // Audit
        await db
            .prepare(
                `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
                uuidv4(),
                req.user.id,
                'ORG_CREATED',
                'organization',
                id,
                JSON.stringify({
                    name,
                    slug,
                    plan,
                    template,
                    roles_provisioned: rolesProvisioned,
                    org_owner_email: owner_email,
                    org_owner_created: ownerCreated,
                }),
                req.ip || null
            );

        if (typeof db.save === 'function') await db.save();

        res.status(201).json({
            id,
            name,
            slug,
            plan,
            template,
            roles_provisioned: rolesProvisioned,
            org_owner: {
                id: ownerUser.id,
                email: owner_email,
                created: ownerCreated,
                temp_password: ownerCreated ? tempPassword : undefined,
                must_change_password: ownerCreated,
            },
            message: `Organization created with ${ROLE_TEMPLATES[template]?.length || 0} roles from '${template}' template`,
        });
    } catch (err) {
        logger.error('[org] Create error:', err.message);
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

        const org = await db.get('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        await db.prepare('UPDATE organizations SET plan = ?, updated_at = NOW() WHERE id = ?').run(plan, req.params.id);

        // Audit
        await db
            .prepare(
                `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
                uuidv4(),
                req.user.id,
                'ORG_PLAN_CHANGED',
                'organization',
                req.params.id,
                JSON.stringify({ old_plan: org.plan, new_plan: plan }),
                req.ip || null
            );

        res.json({ message: 'Plan updated', org_id: req.params.id, plan });
    } catch (err) {
        logger.error('[org] Plan update error:', err.message);
        res.status(500).json({ error: 'Failed to update plan' });
    }
});

// ─── Set Features Override for Organization (super_admin only) ───────────────
router.put('/:id/features', requireSuperAdmin(), async (req, res) => {
    try {
        const { featureFlags } = req.body;
        if (!featureFlags || typeof featureFlags !== 'object') {
            return res.status(400).json({ error: 'featureFlags object is required' });
        }

        const org = await db.get('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        await db
            .prepare('UPDATE organizations SET feature_flags = ?, updated_at = NOW() WHERE id = ?')
            .run(JSON.stringify(featureFlags), req.params.id);

        // Invalidate Entitlement Cache for this ORG
        const { EntitlementService } = require('../services/entitlement.service');
        await EntitlementService.refreshCache(req.params.id);

        // Audit
        await db
            .prepare(
                `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
                uuidv4(),
                req.user.id,
                'ORG_FEATURES_UPDATED',
                'organization',
                req.params.id,
                JSON.stringify({ old_features: org.feature_flags, new_features: featureFlags }),
                req.ip || null
            );

        res.json({ message: 'Features updated', org_id: req.params.id, feature_flags: featureFlags });
    } catch (err) {
        logger.error('[org] Features update error:', err.message);
        res.status(500).json({ error: 'Failed to update features' });
    }
});

// ─── Deactivate Organization (super_admin only) ──────────────────────────────
router.delete('/:id', requireSuperAdmin(), async (req, res) => {
    try {
        const org = await db.get('SELECT * FROM organizations WHERE id = ?', [req.params.id]);
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        if (org.slug === 'trustchecker') {
            return res.status(403).json({ error: 'Cannot deactivate the platform organization' });
        }

        await db
            .prepare("UPDATE organizations SET status = 'inactive', updated_at = NOW() WHERE id = ?")
            .run(req.params.id);

        // Audit
        await db
            .prepare(
                `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
                uuidv4(),
                req.user.id,
                'ORG_DEACTIVATED',
                'organization',
                req.params.id,
                JSON.stringify({ name: org.name, slug: org.slug }),
                req.ip || null
            );

        res.json({ message: 'Organization deactivated', org_id: req.params.id });
    } catch (err) {
        logger.error('[org] Deactivate error:', err.message);
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

        const org = await db.get('SELECT * FROM organizations WHERE id = ?', [orgId]);
        if (!org) return res.status(404).json({ error: 'Organization not found' });

        const memberCount = await db.get('SELECT COUNT(*) as count FROM users WHERE org_id = ?', [orgId]);

        res.json({
            ...org,
            member_count: memberCount?.count || 0,
            settings: typeof org.settings === 'string' ? JSON.parse(org.settings) : org.settings,
        });
    } catch (err) {
        logger.error('[org] Get error:', err.message);
        res.status(500).json({ error: 'Failed to fetch organization' });
    }
});

// ─── Update Organization ─────────────────────────────────────────────────────
router.put('/', requirePermission('org:settings_update'), async (req, res) => {
    try {
        const { name, settings } = req.body;
        const orgId = req.user.orgId;

        if (!orgId) return res.status(403).json({ error: 'No organization context' });

        const updates = [];
        const params = [];

        if (name) {
            updates.push('name = ?');
            params.push(name);
        }
        if (settings) {
            updates.push('settings = ?');
            params.push(JSON.stringify(settings));
        }

        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

        updates.push('updated_at = NOW()');
        params.push(orgId);

        await db.run(`UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`, params);
        res.json({ message: 'Organization updated successfully' });
    } catch (err) {
        logger.error('[org] Update error:', err.message);
        res.status(500).json({ error: 'Failed to update organization' });
    }
});

// ─── List Members ────────────────────────────────────────────────────────────
router.get('/members', async (req, res) => {
    try {
        const orgId = req.user.orgId;
        if (!orgId) return res.status(403).json({ error: 'No organization context' });

        const members = await db
            .prepare(
                `SELECT id, username, email, role, created_at, last_login FROM users WHERE org_id = ? ORDER BY created_at LIMIT 1000`
            )
            .all(orgId);

        res.json({ members, total: members.length });
    } catch (err) {
        logger.error('[org] Members error:', err.message);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

// ─── Invite Member ───────────────────────────────────────────────────────────
router.post('/invite', requirePermission('org:user_create'), async (req, res) => {
    try {
        const { email, role = 'operator' } = req.body;
        const orgId = req.user.orgId;

        if (!orgId) return res.status(403).json({ error: 'No organization context' });
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const existingUser = await db.get('SELECT id, org_id FROM users WHERE email = ?', [email]);
        if (existingUser) {
            if (existingUser.org_id) {
                return res.status(409).json({ error: 'User already belongs to an organization' });
            }
            await db.run('UPDATE users SET org_id = ? WHERE id = ?', [orgId, existingUser.id]);
            // Create membership
            await db.run(
                `INSERT INTO memberships (id, user_id, org_id, status, role_context, invited_by) VALUES (?, ?, ?, 'active', 'member', ?) ON CONFLICT (user_id, org_id) DO UPDATE SET status = 'active'`,
                [uuidv4(), existingUser.id, orgId, req.user.id]
            );
            return res.json({ message: 'Existing user added to organization', userId: existingUser.id });
        }

        const inviteId = uuidv4();
        const token = crypto.randomBytes(32).toString('hex');

        await db
            .prepare(
                `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, 'org_invite', 'organization', ?, ?, ?)`
            )
            .run(inviteId, req.user.id, orgId, JSON.stringify({ email, role, token }), req.ip || '');

        res.status(201).json({ message: 'Invitation sent', invite_token: token, email });
    } catch (err) {
        logger.error('[org] Invite error:', err.message);
        res.status(500).json({ error: 'Failed to send invitation' });
    }
});

// ─── Remove Member ───────────────────────────────────────────────────────────
router.delete('/members/:id', requirePermission('org:user_delete'), async (req, res) => {
    try {
        const orgId = req.user.orgId;
        const targetId = req.params.id;

        if (!orgId) return res.status(403).json({ error: 'No organization context' });
        if (targetId === req.user.id) return res.status(400).json({ error: 'Cannot remove yourself' });

        const target = await db.get('SELECT id FROM users WHERE id = ? AND org_id = ?', [targetId, orgId]);
        if (!target) return res.status(404).json({ error: 'Member not found in organization' });

        await db.run('UPDATE users SET org_id = NULL WHERE id = ?', [targetId]);
        // Deactivate membership
        await db.run(`UPDATE memberships SET status = 'removed' WHERE user_id = ? AND org_id = ?`, [targetId, orgId]);
        res.json({ message: 'Member removed from organization' });
    } catch (err) {
        logger.error('[org] Remove member error:', err.message);
        res.status(500).json({ error: 'Failed to remove member' });
    }
});

// ─── Provision Enterprise Schema ─────────────────────────────────────────────
router.post('/provision', requirePermission('org:settings_update'), async (req, res) => {
    try {
        const orgId = req.user.orgId;
        if (!orgId) return res.status(403).json({ error: 'No organization context' });

        const org = await db.get('SELECT * FROM organizations WHERE id = ?', [orgId]);
        if (!org) return res.status(404).json({ error: 'Organization not found' });
        if (org.plan !== 'enterprise') {
            return res.status(403).json({ error: 'Schema isolation requires Enterprise plan', current_plan: org.plan });
        }
        if (org.schema_name) {
            return res.json({ message: 'Schema already provisioned', schema_name: org.schema_name });
        }

        const schemaName = `org_${org.slug.replace(/-/g, '_')}`;
        try {
            await db.run(`CREATE SCHEMA IF NOT EXISTS "${_safeId(schemaName)}"`);
            await db
                .prepare('UPDATE organizations SET schema_name = ?, updated_at = NOW() WHERE id = ?')
                .run(schemaName, orgId);

            res.status(201).json({
                message: 'Enterprise schema provisioned',
                schema_name: schemaName,
            });
        } catch (schemaErr) {
            logger.error('[org] Schema provisioning error:', schemaErr.message);
            res.status(500).json({ error: 'Failed to provision schema — ensure PostgreSQL is configured' });
        }
    } catch (err) {
        logger.error('[org] Provision error:', err.message);
        res.status(500).json({ error: 'Failed to provision Enterprise schema' });
    }
});

module.exports = router;
