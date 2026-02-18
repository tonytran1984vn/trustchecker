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

// Role Hierarchy
const ROLE_HIERARCHY = { admin: 4, manager: 3, operator: 2, viewer: 1 };

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

        // Update session last_active
        if (decoded.session_id) {
            await db.prepare('UPDATE sessions SET last_active = datetime("now") WHERE id = ? AND revoked = 0')
                .run(decoded.session_id);
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
        username: user.username,
        role: user.role,
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
            `SELECT o.id, o.name, o.slug, o.plan, o.schema_name
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
    return user;
}

// ─── Helper: Create Session ──────────────────────────────────────────────────

async function createSession(userId, req) {
    const sessionId = uuidv4();
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const ua = req.headers['user-agent'] || 'unknown';
    await db.prepare('INSERT INTO sessions (id, user_id, ip_address, user_agent) VALUES (?, ?, ?, ?)')
        .run(sessionId, userId, ip, ua);
    return sessionId;
}

module.exports = {
    JWT_SECRET, JWT_EXPIRY, REFRESH_EXPIRY_DAYS, MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES,
    ROLE_HIERARCHY,
    authMiddleware, requireRole,
    generateTokenPair, enrichUserWithOrg, createSession
};
