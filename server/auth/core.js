/**
 * Auth Core — Middleware, helpers, constants
 * Shared by all auth domain modules.
 */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('JWT_SECRET env var is required in production'); })()
    : 'trustchecker-secret-key-DEV-ONLY');
if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET not set — using dev fallback. Set JWT_SECRET env var for production!');
}
const JWT_EXPIRY = '1h';
const REFRESH_EXPIRY_DAYS = 7;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

// v2.0 Role Hierarchy (L1-L5 Authority Map)
const ROLE_HIERARCHY = {
    // L5: Platform Layer
    super_admin: 5, platform_security: 5, data_gov_officer: 5,
    global_risk_committee: 5, change_management_officer: 5, incident_response_lead: 5,
    // L4: Global Governance
    ggc_member: 4, risk_committee: 4, compliance_officer: 4, ivu_validator: 4,
    // L3: Tenant Governance
    org_owner: 3, admin: 3, company_admin: 3, executive: 3, carbon_officer: 3, security_officer: 3,
    // L2: Operational
    ops_manager: 2, risk_officer: 2, scm_analyst: 2, disclosure_officer: 2,
    // L1: Technical Execution
    developer: 1, blockchain_operator: 1, operator: 1, auditor: 1, viewer: 1,
    data_steward: 1, legal_counsel: 1, board_observer: 1, supplier_contributor: 1,
    esg_reporting_manager: 1, external_auditor: 1, financial_viewer: 1, public_verifier: 1,
    internal_reviewer: 1, export_officer: 1, mgb_member: 1, ivu_registry_admin: 1,
};

// ─── Middleware: Verify JWT ──────────────────────────────────────────────────

async function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET, { issuer: 'trustchecker', audience: 'trustchecker-users' });
        req.user = decoded;

        // Update session last_active (non-blocking — don't kill auth if this fails)
        if (decoded.session_id) {
            try {
                await db.prepare("UPDATE sessions SET last_active = NOW() WHERE id = ? AND revoked = false")
                    .run(decoded.session_id);
            } catch (sessionErr) {
                console.warn(`[Auth] Session update failed (non-critical): ${sessionErr.message}`);
            }
        }

        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
}

// ─── Middleware: Require Role ────────────────────────────────────────────────

function requireRole(...roles) {
    return async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const userLevel = ROLE_HIERARCHY[req.user.role] || 0;
        const minLevel = Math.min(...roles.map(r => ROLE_HIERARCHY[r] || 0));
        if (userLevel < minLevel) {
            return res.status(403).json({ error: 'Insufficient permissions', required: roles });
        }
        next();
    };
}

// ─── Helper: Generate Token Pair ─────────────────────────────────────────────

async function generateTokenPair(user, sessionId) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        user_type: user.user_type || 'tenant',
        session_id: sessionId,
        plan: user.plan || 'free',
    };

    if (user.orgId || user.org_id) {
        payload.orgId = user.orgId || user.org_id;
        payload.orgSlug = user.orgSlug || user.org_slug || null;
        payload.orgPlan = user.orgPlan || user.org_plan || null;
        payload.orgSchema = user.orgSchema || user.org_schema || null;
    }

    const accessToken = jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: JWT_EXPIRY, issuer: 'trustchecker', audience: 'trustchecker-users' }
    );

    const refreshToken = crypto.randomBytes(48).toString('hex');
    const refreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 86400000).toISOString();

    await db.prepare(`INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`)
        .run(uuidv4(), user.id, refreshHash, expiresAt);

    return { accessToken, refreshToken };
}

// ─── Helper: Enrich user with org context ────────────────────────────────────

async function enrichUserWithOrg(user) {
    try {
        const org = await db.prepare(
            `SELECT o.id, o.name, o.slug, o.plan, o.schema_name, o.feature_flags
             FROM organizations o
             JOIN users u ON u.org_id = o.id
             WHERE u.id = ?`
        ).get(user.id);
        if (org) {
            user.orgId = org.id;
            user.orgSlug = org.slug;
            user.orgPlan = org.plan;
            user.orgSchema = org.schema_name;
            user.plan = org.plan;
        }
    } catch (_) {
        // org table may not exist yet (pre-migration)
    }
    // Preserve user_type from DB or default to tenant
    if (!user.user_type) user.user_type = 'tenant';
    return user;
}

// ─── Helper: Create Session ──────────────────────────────────────────────────

async function createSession(userId, req) {
    const sessionId = uuidv4();
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';

    // Generate device fingerprint hash from User-Agent + accept-language + screen info
    const fpSource = [ua, req.headers['accept-language'] || '', req.headers['sec-ch-ua'] || ''].join('|');
    const deviceFingerprint = crypto.createHash('sha256').update(fpSource).digest('hex').substring(0, 16);

    try {
        await db.prepare('INSERT INTO sessions (id, user_id, ip_address, user_agent, device_fingerprint) VALUES (?, ?, ?, ?, ?)')
            .run(sessionId, userId, ip, ua, deviceFingerprint);
    } catch (e) {
        // Fallback without device_fingerprint if column doesn't exist yet
        await db.prepare('INSERT INTO sessions (id, user_id, ip_address, user_agent) VALUES (?, ?, ?, ?)')
            .run(sessionId, userId, ip, ua);
    }
    return sessionId;
}

// ─── Helper: IP Anomaly Detection ────────────────────────────────────────────

async function checkIPAnomaly(userId, currentIP) {
    try {
        // Get distinct IPs from last 30 sessions
        const knownIPs = await db.all(
            `SELECT ip_address FROM (SELECT DISTINCT ON (ip_address) ip_address, last_active FROM sessions WHERE user_id = ? AND revoked = false ORDER BY ip_address, last_active DESC) sub ORDER BY last_active DESC LIMIT 30`,
            [userId]
        ).catch(() => []);
        const knownSet = new Set(knownIPs.map(r => r.ip_address));

        if (knownSet.size === 0) return { anomaly: false, reason: 'first_login' };
        if (knownSet.has(currentIP)) return { anomaly: false, reason: 'known_ip' };

        // New IP detected — log it
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'NEW_IP_LOGIN', 'session', ?, ?)`,
            [uuidv4(), userId, uuidv4(), JSON.stringify({
                new_ip: currentIP,
                known_ips: [...knownSet].slice(0, 5),
                severity: 'warning',
                message: 'Login from previously unseen IP address'
            })]
        );

        return { anomaly: true, reason: 'new_ip', ip: currentIP };
    } catch (_) {
        return { anomaly: false, reason: 'check_failed' };
    }
}

// ─── Helper: Cleanup Expired Roles ───────────────────────────────────────────

async function cleanupExpiredRoles(userId) {
    try {
        const expired = await db.all(
            `SELECT ur.role_id, r.name FROM rbac_user_roles ur
             JOIN rbac_roles r ON r.id = ur.role_id
             WHERE ur.user_id = ? AND ur.expires_at IS NOT NULL AND ur.expires_at < NOW()`,
            [userId]
        );
        if (expired.length > 0) {
            await db.run(
                `DELETE FROM rbac_user_roles WHERE user_id = ? AND expires_at IS NOT NULL AND expires_at < NOW()`,
                [userId]
            );
            // Audit log
            await db.run(
                `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'ROLE_EXPIRED', 'user', ?, ?)`,
                [uuidv4(), 'system', userId, JSON.stringify({
                    expired_roles: expired.map(r => r.name),
                    count: expired.length,
                    severity: 'info'
                })]
            );
        }
        return expired;
    } catch (_) {
        return [];
    }
}

// Re-export RBAC middleware for convenience
const { requirePermission, requireConstitutional, requirePlatformAdmin, requireTenantAdmin } = require('./rbac');

module.exports = {
    JWT_SECRET, JWT_EXPIRY, REFRESH_EXPIRY_DAYS, MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES,
    ROLE_HIERARCHY,
    authMiddleware, requireRole,
    requirePermission, requireConstitutional, requirePlatformAdmin, requireTenantAdmin,
    generateTokenPair, enrichUserWithOrg, createSession,
    // P3: Advanced Security
    checkIPAnomaly, cleanupExpiredRoles,
};
