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

const express = require("express");
const { v4: uuidv4 } = require("uuid");
const crypto = require("crypto");
const db = require("../db");
const { authMiddleware } = require("../auth");
const { orgGuard } = require("../middleware/org-middleware");
const { eventBus } = require("../events");

const router = express.Router();

// ─── Helper: generate secure invite token ─────────────────────────────────────
function generateToken() {
    return crypto.randomBytes(32).toString("hex");
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ENDPOINTS (no auth required)
// ═══════════════════════════════════════════════════════════════════════════════

// GET /join/:token — Validate invite and show details
router.get("/join/:token", async function (req, res) {
    try {
        const result = await db.all(
            `SELECT si.invited_company, si.invited_email, si.status, si.expires_at, si.message,
                    o.name as inviter_org_name
             FROM supplier_invitations si
             LEFT JOIN organizations o ON o.id = si.org_id
             WHERE si.token = $1 LIMIT 1`,
            [req.params.token]
        );

        if (!result[0]) return res.status(404).json({ error: "Invalid or expired invitation" });

        const invite = result[0];
        if (invite.status !== "pending") {
            return res.status(400).json({ error: "Invitation already " + invite.status });
        }
        if (new Date(invite.expires_at) < new Date()) {
            return res.status(400).json({ error: "Invitation has expired" });
        }

        res.json({
            invitation: {
                company: invite.invited_company,
                email: invite.invited_email,
                inviter: invite.inviter_org_name,
                message: invite.message,
                expiresAt: invite.expires_at
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to validate invitation" });
    }
});

// POST /join/:token — Accept invitation and create supplier account
router.post("/join/:token", async function (req, res) {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: "name, email, and password are required" });
        }

        // 1. Validate token
        const inviteResult = await db.all(
            `SELECT * FROM supplier_invitations WHERE token = $1 AND status = 'pending' LIMIT 1`,
            [req.params.token]
        );
        if (!inviteResult[0]) return res.status(404).json({ error: "Invalid or expired invitation" });

        const invite = inviteResult[0];
        if (new Date(invite.expires_at) < new Date()) {
            return res.status(400).json({ error: "Invitation has expired" });
        }

        // 2. Create org for the supplier
        const orgId = "org-" + uuidv4().substring(0, 8);
        const bcrypt = require("bcryptjs");
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
            await db.run(
                `UPDATE partners SET network_org_id = $1 WHERE id = $2`,
                [orgId, invite.partner_id]
            );
        }

        // 6. Create supply chain graph edge (inviter → supplier)
        await db.run(
            `INSERT INTO supply_chain_graph (id, from_node_id, from_node_type, to_node_id, to_node_type, relationship, weight, risk_score, metadata, org_id, created_at)
             VALUES ($1, $2, 'organization', $3, 'supplier', 'supplies_to', 1.0, 0, $4, $5, NOW())`,
            [
                uuidv4(),
                invite.org_id,
                orgId,
                JSON.stringify({ source: "network_invite", partner_id: invite.partner_id }),
                invite.org_id
            ]
        );

        // 7. Create supplier profile
        const slug = invite.invited_company.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        await db.run(
            `INSERT INTO supplier_profiles (id, partner_id, org_id, public_name, slug, country, is_published, created_at)
             VALUES ($1, $2, $3, $4, $5, '', true, NOW())
             ON CONFLICT (slug) DO NOTHING`,
            [uuidv4(), invite.partner_id || null, orgId, invite.invited_company, slug]
        );

        // 8. Emit event
        eventBus.emit("trust_network:supplier_joined", {
            orgId: invite.org_id,
            supplierOrgId: orgId,
            partnerId: invite.partner_id,
            companyName: invite.invited_company
        });

        // 9. Audit log
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details)
             VALUES ($1, $2, 'SUPPLIER_JOINED_NETWORK', 'organization', $3, $4)`,
            [uuidv4(), userId, orgId, JSON.stringify({
                inviter_org: invite.org_id,
                company: invite.invited_company,
                invite_id: invite.id
            })]
        );

        res.status(201).json({
            success: true,
            message: "Welcome to the TrustChecker Network!",
            org_id: orgId,
            user_id: userId
        });
    } catch (err) {
        console.error("Join network error:", err);
        if (err.message && err.message.includes("unique")) {
            return res.status(409).json({ error: "An account with this email already exists" });
        }
        res.status(500).json({ error: "Failed to create account" });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATED ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════
router.use(authMiddleware);
router.use(orgGuard());

// POST /invite — Send supplier network invitation
router.post("/invite", async function (req, res) {
    try {
        const { email, company_name, partner_id, message } = req.body;
        if (!email || !company_name) {
            return res.status(400).json({ error: "email and company_name are required" });
        }

        // Check duplicate
        const existing = await db.all(
            `SELECT id, status FROM supplier_invitations WHERE invited_email = $1 AND org_id = $2 AND status = 'pending' LIMIT 1`,
            [email, req.orgId]
        );
        if (existing[0]) {
            return res.status(409).json({ error: "An invitation has already been sent to this email" });
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
        const inviterOrg = orgResult[0]?.name || "TrustChecker User";

        // Generate invite URL
        const baseUrl = process.env.BASE_URL || "https://trustchecker.tonytran.work";
        const joinUrl = `${baseUrl}/network/join/${token}`;

        // Send email (use template engine)
        try {
            const emailTemplates = require("../engines/emailTemplates");
            const html = emailTemplates.supplierInvite(req.user.username, inviterOrg, company_name, joinUrl, message);
            // In production, use real email service
            eventBus.emit("email:send", { to: email, subject: `${inviterOrg} invites you to TrustChecker Network`, html });
        } catch (emailErr) {
            console.warn("Email send skipped:", emailErr.message);
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
                expiresIn: "30 days"
            }
        });
    } catch (err) {
        console.error("Invite error:", err);
        res.status(500).json({ error: "Failed to send invitation" });
    }
});

// GET /invitations — List sent invitations
router.get("/invitations", async function (req, res) {
    try {
        const invitations = await db.all(
            `SELECT si.id, si.invited_email, si.invited_company, si.status, si.created_at, si.expires_at, si.accepted_at,
                    si.message, u.username as invited_by_name,
                    CASE WHEN si.expires_at < NOW() AND si.status = 'pending' THEN 'expired' ELSE si.status END as effective_status
             FROM supplier_invitations si
             LEFT JOIN users u ON u.id = si.invited_by
             WHERE si.org_id = $1
             ORDER BY si.created_at DESC LIMIT 100`,
            [req.orgId]
        );
        res.json({ invitations, total: invitations.length });
    } catch (err) {
        res.status(500).json({ error: "Failed to list invitations" });
    }
});

// DELETE /invite/:id — Revoke invitation
router.delete("/invite/:id", async function (req, res) {
    try {
        await db.run(
            `UPDATE supplier_invitations SET status = 'revoked' WHERE id = $1 AND org_id = $2 AND status = 'pending'`,
            [req.params.id, req.orgId]
        );
        res.json({ success: true, message: "Invitation revoked" });
    } catch (err) {
        res.status(500).json({ error: "Failed to revoke invitation" });
    }
});

// GET /graph — Trust network graph (nodes + edges)
router.get("/graph", async function (req, res) {
    try {
        const orgId = req.orgId;

        // Get org's partners as nodes
        const partners = await db.all(
            `SELECT id, name, type, country, trust_score, risk_level, status, network_org_id
             FROM partners WHERE org_id = $1 ORDER BY trust_score DESC LIMIT 500`,
            [orgId]
        );

        // Get graph edges
        const edges = await db.all(
            `SELECT id, from_node_id, from_node_type, to_node_id, to_node_type, relationship, weight, risk_score
             FROM supply_chain_graph WHERE org_id = $1 LIMIT 1000`,
            [orgId]
        );

        // Build nodes: org + partners
        const orgInfo = await db.all(`SELECT id, name FROM organizations WHERE id = $1 LIMIT 1`, [orgId]);
        const nodes = [
            { id: orgId, label: orgInfo[0]?.name || "My Organization", type: "organization", isCenter: true }
        ];

        partners.forEach(function (p) {
            nodes.push({
                id: p.id,
                label: p.name,
                type: p.type || "supplier",
                country: p.country,
                trustScore: p.trust_score,
                riskLevel: p.risk_level,
                isNetworkMember: !!p.network_org_id,
                status: p.status
            });
        });

        // Get 2nd-degree connections (suppliers of suppliers that are also in the network)
        const networkOrgIds = partners.filter(function (p) { return p.network_org_id; }).map(function (p) { return p.network_org_id; });
        var secondDegree = [];
        if (networkOrgIds.length > 0) {
            const placeholders = networkOrgIds.map(function (_, i) { return "$" + (i + 1); }).join(",");
            secondDegree = await db.all(
                `SELECT DISTINCT p.id, p.name, p.type, p.country, p.trust_score, p.org_id as belongs_to_org
                 FROM partners p WHERE p.org_id IN (${placeholders}) LIMIT 100`,
                networkOrgIds
            );
        }

        res.json({
            graph: { nodes, edges, secondDegree },
            stats: {
                totalPartners: partners.length,
                networkMembers: partners.filter(function (p) { return p.network_org_id; }).length,
                totalEdges: edges.length,
                secondDegreeNodes: secondDegree.length
            }
        });
    } catch (err) {
        console.error("Graph error:", err);
        res.status(500).json({ error: "Failed to load network graph" });
    }
});

// GET /shared-scores — Cross-org trust scores
router.get("/shared-scores", async function (req, res) {
    try {
        const scores = await db.all(
            `SELECT partner_id, partner_name, trust_score, risk_level, country, partner_type,
                    public_trust_score, profile_slug, is_published, network_connections,
                    avg_community_rating, total_ratings, badge_level, kyc_status, compliance_score, delivery_score
             FROM shared_trust_scores WHERE org_id = $1
             ORDER BY trust_score DESC LIMIT 200`,
            [req.orgId]
        );
        res.json({ scores, total: scores.length });
    } catch (err) {
        res.status(500).json({ error: "Failed to load shared scores" });
    }
});

// GET /stats — Network statistics
router.get("/stats", async function (req, res) {
    try {
        const orgId = req.orgId;

        const stats = await db.all(`
            SELECT
                (SELECT COUNT(*) FROM partners WHERE org_id = $1) as total_partners,
                (SELECT COUNT(*) FROM partners WHERE org_id = $1 AND network_org_id IS NOT NULL) as network_members,
                (SELECT COUNT(*) FROM supplier_invitations WHERE org_id = $1 AND status = 'pending') as pending_invites,
                (SELECT COUNT(*) FROM supplier_invitations WHERE org_id = $1 AND status = 'accepted') as accepted_invites,
                (SELECT COUNT(*) FROM supply_chain_graph WHERE org_id = $1) as graph_edges,
                (SELECT ROUND(AVG(trust_score)::numeric, 1) FROM partners WHERE org_id = $1) as avg_trust_score,
                (SELECT COUNT(DISTINCT p2.id) FROM partners p 
                 JOIN partners p2 ON p2.org_id = p.network_org_id 
                 WHERE p.org_id = $1 AND p.network_org_id IS NOT NULL) as second_degree_suppliers
        `, [orgId]);

        // Network growth (invitations over time)
        const growth = await db.all(`
            SELECT DATE(created_at) as day, COUNT(*) as invites, 
                   SUM(CASE WHEN status = 'accepted' THEN 1 ELSE 0 END) as accepted
            FROM supplier_invitations WHERE org_id = $1
            GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 30
        `, [orgId]);

        res.json({
            stats: stats[0] || {},
            growth,
            networkHealth: {
                coveragePercent: stats[0] ? Math.round((stats[0].network_members / Math.max(stats[0].total_partners, 1)) * 100) : 0,
                avgTrustScore: stats[0]?.avg_trust_score || 0
            }
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to load network stats" });
    }
});

module.exports = router;
