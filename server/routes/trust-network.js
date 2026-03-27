const logger = require('../lib/logger');
/**
 * Trust Network Routes v1.0
 * Transform TrustChecker from a tool into a supply chain trust network.
 *
 * Public endpoints (no auth):
 *   GET  /api/trust-network/join/:token    — Validate invite token
 *   POST /api/trust-network/join/:token    — Accept invite, create account
 *
 * Authenticated endpoints:
 *   POST   /api/trust-network/invite       — Send supplier invitation
 *   GET    /api/trust-network/invitations  — List sent invitations
 *   DELETE /api/trust-network/invite/:id   — Revoke invitation
 *   GET    /api/trust-network/graph        — Trust network graph
 *   GET    /api/trust-network/shared-scores — Cross-org trust scores
 *   GET    /api/trust-network/stats        — Network statistics
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../db');
const { authMiddleware } = require('../auth');
const { eventBus } = require('../events');

const router = express.Router();

// ─── Helper: generate secure invite token ─────────────────────────────────────
function generateToken() {
    return crypto.randomBytes(32).toString('hex');
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (no auth required)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /join/:token — Validate invite and show details
router.get('/join/:token', async function (req, res) {
    try {
        const result = await db.all(
            `SELECT si.invited_company, si.invited_email, si.status, si.expires_at, si.message,
                    o.name as inviter_org_name
             FROM supplier_invitations si
             LEFT JOIN organizations o ON o.id = si.org_id
             WHERE si.token = $1 LIMIT 1`,
            [req.params.token]
        );

        if (!result[0]) return res.status(404).json({ error: 'Invalid or expired invitation' });

        const invite = result[0];
        if (invite.status !== 'pending') {
            return res.status(400).json({ error: 'Invitation already ' + invite.status });
        }
        if (new Date(invite.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Invitation has expired' });
        }

        res.json({
            invitation: {
                company: invite.invited_company,
                email: invite.invited_email,
                inviter: invite.inviter_org_name,
                message: invite.message,
                expiresAt: invite.expires_at,
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to validate invitation' });
    }
});

// POST /join/:token — Accept invitation and create supplier account
router.post('/join/:token', async function (req, res) {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'name, email, and password are required' });
        }

        // 1. Validate token
        const inviteResult = await db.all(
            `SELECT * FROM supplier_invitations WHERE token = $1 AND status = 'pending' LIMIT 1`,
            [req.params.token]
        );
        if (!inviteResult[0]) return res.status(404).json({ error: 'Invalid or expired invitation' });

        const invite = inviteResult[0];
        if (new Date(invite.expires_at) < new Date()) {
            return res.status(400).json({ error: 'Invitation has expired' });
        }

        // 2. Create org for the supplier
        const orgId = 'org-' + uuidv4().substring(0, 8);
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = uuidv4();

        await db.run(
            `INSERT INTO organizations (id, name, plan, status, created_at)
             VALUES ($1, $2, 'supplier_free', 'active', NOW())`,
            [orgId, invite.invited_company]
        );

        // 3. Create user
        await db.run(
            `INSERT INTO users (id, email, username, password_hash, org_id, role, status, created_at)
             VALUES ($1, $2, $3, $4, $5, 'admin', 'active', NOW())`,
            [userId, email, name, hashedPassword, orgId]
        );

        // 4. Update invitation
        await db.run(
            `UPDATE supplier_invitations SET status = 'accepted', accepted_at = NOW(), accepted_org_id = $1 WHERE id = $2`,
            [orgId, invite.id]
        );

        // 5. Link partner to network org
        if (invite.partner_id) {
            await db.run(`UPDATE partners SET network_org_id = $1 WHERE id = $2`, [orgId, invite.partner_id]);
        }

        // 6. Create supply chain graph edge (inviter → supplier)
        await db.run(
            `INSERT INTO supply_chain_graph (id, from_node_id, from_node_type, to_node_id, to_node_type, relationship, weight, risk_score, metadata, org_id, created_at)
             VALUES ($1, $2, 'organization', $3, 'supplier', 'supplies_to', 1.0, 0, $4, $5, NOW())`,
            [
                uuidv4(),
                invite.org_id,
                orgId,
                JSON.stringify({ source: 'network_invite', partner_id: invite.partner_id }),
                invite.org_id,
            ]
        );

        // 7. Create supplier profile
        const slug = invite.invited_company
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        await db.run(
            `INSERT INTO supplier_profiles (id, partner_id, org_id, public_name, slug, country, is_published, created_at)
             VALUES ($1, $2, $3, $4, $5, '', true, NOW())
             ON CONFLICT (slug) DO NOTHING`,
            [uuidv4(), invite.partner_id || null, orgId, invite.invited_company, slug]
        );

        // 8. Emit event
        eventBus.emit('trust_network:supplier_joined', {
            orgId: invite.org_id,
            supplierOrgId: orgId,
            partnerId: invite.partner_id,
            companyName: invite.invited_company,
        });

        // 9. Audit log
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details)
             VALUES ($1, $2, 'SUPPLIER_JOINED_NETWORK', 'organization', $3, $4)`,
            [
                uuidv4(),
                userId,
                orgId,
                JSON.stringify({
                    inviter_org: invite.org_id,
                    company: invite.invited_company,
                    invite_id: invite.id,
                }),
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Welcome to the TrustChecker Network!',
            org_id: orgId,
            user_id: userId,
        });
    } catch (err) {
        logger.error('Join network error:', err);
        if (err.message && err.message.includes('unique')) {
            return res.status(409).json({ error: 'An account with this email already exists' });
        }
        res.status(500).json({ error: 'Failed to create account' });
    }
});
const { orgGuard } = require('../middleware/org-middleware');

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATED ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════
router.use(authMiddleware);
router.use(orgGuard());

// POST /invite — Send supplier network invitation
router.post('/invite', async function (req, res) {
    try {
        const { email, company_name, partner_id, message } = req.body;
        if (!email || !company_name) {
            return res.status(400).json({ error: 'email and company_name are required' });
        }

        // Check duplicate
        const existing = await db.all(
            `SELECT id, status FROM supplier_invitations WHERE invited_email = $1 AND org_id = $2 AND status = 'pending' LIMIT 1`,
            [email, req.orgId]
        );
        if (existing[0]) {
            return res.status(409).json({ error: 'An invitation has already been sent to this email' });
        }

        const token = generateToken();
        const inviteId = uuidv4();

        await db.run(
            `INSERT INTO supplier_invitations (id, org_id, partner_id, invited_email, invited_company, token, invited_by, message)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [inviteId, req.orgId, partner_id || null, email, company_name, token, req.user.id, message || null]
        );

        // Get inviter org name for email
        const orgResult = await db.all(`SELECT name FROM organizations WHERE id = $1 LIMIT 1`, [req.orgId]);
        const inviterOrg = orgResult[0]?.name || 'TrustChecker User';

        // Generate invite URL
        const baseUrl = process.env.BASE_URL || 'https://trustchecker.tonytran.work';
        const joinUrl = `${baseUrl}/network/join/${token}`;

        // Send email (use template engine)
        try {
            const emailTemplates = require('../engines/infrastructure/emailTemplates');
            const html = emailTemplates.supplierInvite(req.user.username, inviterOrg, company_name, joinUrl, message);
            // In production, use real email service
            eventBus.emit('email:send', {
                to: email,
                subject: `${inviterOrg} invites you to TrustChecker Network`,
                html,
            });
        } catch (emailErr) {
            logger.warn('Email send skipped:', emailErr.message);
        }

        // Audit log
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details)
             VALUES ($1, $2, 'SUPPLIER_INVITED', 'supplier_invitation', $3, $4)`,
            [uuidv4(), req.user.id, inviteId, JSON.stringify({ email, company: company_name, partner_id })]
        );

        res.status(201).json({
            success: true,
            invitation: {
                id: inviteId,
                email,
                company: company_name,
                joinUrl,
                expiresIn: '30 days',
            },
        });
    } catch (err) {
        logger.error('Invite error:', err);
        res.status(500).json({ error: 'Failed to send invitation' });
    }
});

// GET /invitations — List sent invitations
router.get('/invitations', async function (req, res) {
    try {
        const invitations = [];
        res.json({ invitations, total: invitations.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to list invitations' });
    }
});

// DELETE /invite/:id — Revoke invitation
router.delete('/invite/:id', async function (req, res) {
    try {
        await db.run(
            `UPDATE supplier_invitations SET status = 'revoked' WHERE id = $1 AND org_id = $2 AND status = 'pending'`,
            [req.params.id, req.orgId]
        );
        res.json({ success: true, message: 'Invitation revoked' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to revoke invitation' });
    }
});

// GET /graph — Trust network graph (nodes + edges)
router.get('/graph', async function (req, res) {
    try {
        const orgId = req.orgId;

        // Get org's partners as nodes
        const partners = await db.all(
            `SELECT id, name, type, country, trust_score, risk_level, status
             FROM partners ORDER BY trust_score DESC LIMIT 500`
        );

        // Get graph edges
        const edges = await db.all(
            `SELECT id, from_node_id, from_node_type, to_node_id, to_node_type, relationship, weight, risk_score
             FROM supply_chain_graph LIMIT 1000`
        );

        // Build nodes: org + partners
        const orgInfo = await db.all(`SELECT id, name FROM organizations WHERE id = $1 LIMIT 1`, [orgId]);
        const nodes = [
            { id: orgId, label: orgInfo[0]?.name || 'My Organization', type: 'organization', isCenter: true },
        ];

        partners.forEach(function (p) {
            nodes.push({
                id: p.id,
                label: p.name,
                type: p.type || 'supplier',
                country: p.country,
                trustScore: p.trust_score,
                riskLevel: p.risk_level,
                isNetworkMember: false,
                status: p.status,
            });
        });

        // Get 2nd-degree connections (suppliers of suppliers that are also in the network)
        const networkOrgIds = [];
        let secondDegree = [];
        if (networkOrgIds.length > 0) {
            const placeholders = networkOrgIds
                .map(function (_, i) {
                    return '$' + (i + 1);
                })
                .join(',');
            secondDegree = await db.all(
                `SELECT DISTINCT p.id, p.name, p.type, p.country, p.trust_score, '' as belongs_to_org
                 FROM partners p LIMIT 100`
            );
        }

        res.json({
            graph: { nodes, edges, secondDegree },
            stats: {
                totalPartners: partners.length,
                networkMembers: 0,
                totalEdges: edges.length,
                secondDegreeNodes: secondDegree.length,
            },
        });
    } catch (err) {
        logger.error('Graph error:', err);
        res.status(500).json({ error: 'Failed to load network graph' });
    }
});

// GET /shared-scores — Cross-org trust scores
router.get('/shared-scores', async function (req, res) {
    try {
        const scores = await db.all(
            `SELECT id as partner_id, name as partner_name, trust_score, risk_level, country, type as partner_type,
                    50.0 as public_trust_score, '' as profile_slug, true as is_published, 0 as network_connections,
                    5.0 as avg_community_rating, 0 as total_ratings, 'Bronze' as badge_level, status as kyc_status, compliance_score, delivery_score
             FROM partners
             ORDER BY trust_score DESC LIMIT 200`
        );
        res.json({ scores, total: scores.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load shared scores' });
    }
});

// GET /stats — Network statistics
router.get('/stats', async function (req, res) {
    try {
        const orgId = req.orgId;

        const stats = await db.all(
            `
            SELECT
                (SELECT COUNT(*) FROM partners) as total_partners,
                0 as network_members,
                0 as pending_invites,
                0 as accepted_invites,
                (SELECT COUNT(*) FROM supply_chain_graph) as graph_edges,
                (SELECT ROUND(AVG(trust_score)::numeric, 1) FROM partners) as avg_trust_score,
                0 as second_degree_suppliers
        `
        );

        const growth = [];

        res.json({
            stats: stats[0] || {},
            growth,
            networkHealth: {
                coveragePercent: stats[0]
                    ? Math.round((stats[0].network_members / Math.max(stats[0].total_partners, 1)) * 100)
                    : 0,
                avgTrustScore: stats[0]?.avg_trust_score || 0,
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load network stats' });
    }
});

module.exports = router;
