/**
 * Auth: Login, Register, Refresh
 * Core authentication endpoints with lockout protection and MFA challenge.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { verifySync } = require('otplib');
const db = require('../db');
const { eventBus, EVENT_TYPES } = require('../events');
const {
    JWT_SECRET, MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES,
    generateTokenPair, enrichUserWithOrg, createSession
} = require('./core');

const router = express.Router();

// ─── POST /register ──────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
    try {
        const { username, password, email, company } = req.body;

        if (!username || !password || !email) {
            return res.status(400).json({ error: 'Username, password, and email are required' });
        }

        if (password.length < 12) {
            return res.status(400).json({ error: 'Password must be at least 12 characters' });
        }

        if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
            return res.status(400).json({ error: 'Password must contain uppercase, lowercase, number, and special character' });
        }

        const existing = await db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
        if (existing) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        const id = uuidv4();
        const password_hash = await bcrypt.hash(password, 12);

        await db.prepare(`
      INSERT INTO users (id, username, email, password_hash, company)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, username, email, password_hash, company || '');

        const sessionId = await createSession(id, req);
        const user = { id, username, role: 'operator' };
        const { accessToken, refreshToken } = await generateTokenPair(user, sessionId);

        await db.prepare(`INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)`)
            .run(uuidv4(), id, 'USER_REGISTERED', 'user', id);

        res.status(201).json({
            message: 'User registered successfully',
            token: accessToken,
            refresh_token: refreshToken,
            user: { id, username, email, role: 'operator' }
        });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// ─── POST /login ─────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
    try {
        const { username, password, mfa_code, mfa_token } = req.body;

        // Step 2: MFA verification (if mfa_token provided)
        if (mfa_token) {
            try {
                const decoded = jwt.verify(mfa_token, JWT_SECRET, { issuer: 'trustchecker', audience: 'trustchecker-users' });
                if (decoded.type !== 'mfa_challenge') {
                    return res.status(400).json({ error: 'Invalid MFA token' });
                }

                const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.user_id);
                if (!user || !user.mfa_enabled || !user.mfa_secret) {
                    return res.status(400).json({ error: 'MFA not configured' });
                }

                const mfaResult = mfa_code ? verifySync({ token: mfa_code, secret: user.mfa_secret }) : null;
                if (!mfa_code || !mfaResult || !mfaResult.valid) {
                    return res.status(401).json({ error: 'Invalid MFA code' });
                }

                await db.prepare('UPDATE users SET last_login = datetime("now"), failed_attempts = 0 WHERE id = ?').run(user.id);
                const sessionId = await createSession(user.id, req);
                const { accessToken, refreshToken } = await generateTokenPair(user, sessionId);

                eventBus.emitEvent(EVENT_TYPES.USER_LOGIN, { username: user.username, mfa: true });

                return res.json({
                    token: accessToken,
                    refresh_token: refreshToken,
                    user: { id: user.id, username: user.username, email: user.email, role: user.role }
                });
            } catch (e) {
                return res.status(401).json({ error: 'Invalid or expired MFA token' });
            }
        }

        // Step 1: Password verification
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }

        const user = await db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check lockout
        if (user.locked_until) {
            const lockTime = new Date(user.locked_until + 'Z').getTime();
            if (Date.now() < lockTime) {
                const remainMin = Math.ceil((lockTime - Date.now()) / 60000);
                return res.status(423).json({
                    error: `Account locked. Try again in ${remainMin} minute(s)`,
                    locked_until: user.locked_until
                });
            }
            await db.prepare('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            const attempts = (user.failed_attempts || 0) + 1;
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString().replace('Z', '');
                await db.prepare('UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?')
                    .run(attempts, lockUntil, user.id);

                await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
                    .run(uuidv4(), user.id, 'ACCOUNT_LOCKED', 'user', user.id, JSON.stringify({ attempts, lockout_minutes: LOCKOUT_MINUTES }));

                return res.status(423).json({
                    error: `Account locked after ${MAX_FAILED_ATTEMPTS} failed attempts. Try again in ${LOCKOUT_MINUTES} minutes`,
                    locked: true
                });
            }

            await db.prepare('UPDATE users SET failed_attempts = ? WHERE id = ?').run(attempts, user.id);
            return res.status(401).json({
                error: 'Invalid credentials',
                remaining_attempts: MAX_FAILED_ATTEMPTS - attempts
            });
        }

        // Password valid — check if MFA is required
        if (user.mfa_enabled && user.mfa_secret) {
            const mfaChallenge = jwt.sign(
                { user_id: user.id, type: 'mfa_challenge' },
                JWT_SECRET,
                { expiresIn: '5m', issuer: 'trustchecker', audience: 'trustchecker-users' }
            );
            return res.json({
                mfa_required: true,
                mfa_token: mfaChallenge,
                message: 'Please provide your MFA code'
            });
        }

        // No MFA — issue tokens directly
        await db.prepare('UPDATE users SET last_login = datetime("now"), failed_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);
        await enrichUserWithOrg(user);
        const sessionId = await createSession(user.id, req);
        const { accessToken, refreshToken } = await generateTokenPair(user, sessionId);

        eventBus.emitEvent(EVENT_TYPES.USER_LOGIN, { username: user.username });

        res.json({
            token: accessToken,
            refresh_token: refreshToken,
            user: { id: user.id, username: user.username, email: user.email, role: user.role, plan: user.plan || 'free' }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ─── POST /refresh ───────────────────────────────────────────────────────────

router.post('/refresh', async (req, res) => {
    try {
        const { refresh_token } = req.body;
        if (!refresh_token) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        const tokenHash = crypto.createHash('sha256').update(refresh_token).digest('hex');
        const stored = await db.prepare(
            'SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0'
        ).get(tokenHash);

        if (!stored) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        if (new Date(stored.expires_at) < new Date()) {
            await db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').run(stored.id);
            return res.status(401).json({ error: 'Refresh token expired' });
        }

        // Revoke old token (rotation)
        await db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE id = ?').run(stored.id);

        const user = await db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(stored.user_id);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        const existingSession = await db.prepare(
            'SELECT id FROM sessions WHERE user_id = ? AND revoked = 0 ORDER BY last_active DESC LIMIT 1'
        ).get(user.id);
        const sessionId = existingSession ? existingSession.id : await createSession(user.id, req);

        const { accessToken, refreshToken: newRefresh } = await generateTokenPair(user, sessionId);

        res.json({
            token: accessToken,
            refresh_token: newRefresh
        });
    } catch (err) {
        console.error('Refresh error:', err);
        res.status(500).json({ error: 'Token refresh failed' });
    }
});

module.exports = router;
