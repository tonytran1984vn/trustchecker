/**
 * Auth: OAuth2 (Simulated)
 * Google and GitHub OAuth callback endpoints.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { eventBus, EVENT_TYPES } = require('../events');
const { generateTokenPair, createSession } = require('./core');

const router = express.Router();

// ─── GET /oauth/google/url ───────────────────────────────────────────────────

router.get('/oauth/google/url', async (req, res) => {
    const state = crypto.randomBytes(16).toString('hex');
    res.json({
        url: `https://accounts.google.com/o/oauth2/v2/auth?client_id=simulated&redirect_uri=${encodeURIComponent(req.protocol + '://' + req.get('host') + '/api/auth/oauth/google/callback')}&scope=openid+email+profile&state=${state}&response_type=code`,
        state,
        note: 'Simulated — use POST /oauth/google/callback with a profile to login'
    });
});

// ─── POST /oauth/google/callback ─────────────────────────────────────────────

router.post('/oauth/google/callback', async (req, res) => {
    try {
        const { email, name, google_id } = req.body;
        if (!email) return res.status(400).json({ error: 'email required' });

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        const username = name || email.split('@')[0];
        let user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

        if (!user) {
            const id = uuidv4();
            const tempHash = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 10);
            await db.prepare(`INSERT INTO users (id, username, email, password_hash, company) VALUES (?, ?, ?, ?, ?)`)
                .run(id, username, email, tempHash, 'Google OAuth');
            user = { id, username, email, role: 'operator' };

            await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
                .run(uuidv4(), id, 'OAUTH_REGISTER', 'user', id, JSON.stringify({ provider: 'google', google_id }));
        }

        const sessionId = await createSession(user.id, req);
        const { accessToken, refreshToken } = await generateTokenPair(user, sessionId);

        eventBus.emitEvent(EVENT_TYPES.USER_LOGIN, { username: user.username, method: 'oauth_google' });

        res.json({
            token: accessToken,
            refresh_token: refreshToken,
            user: { id: user.id, username: user.username, email: user.email, role: user.role },
            auth_method: 'oauth_google',
            is_new_user: !await db.get('SELECT 1 FROM audit_log WHERE actor_id = ? AND action = ? LIMIT 1', [user.id, 'OAUTH_REGISTER']) ? false : true
        });
    } catch (err) {
        console.error('Google OAuth error:', err);
        res.status(500).json({ error: 'OAuth authentication failed' });
    }
});

// ─── POST /oauth/github/callback ─────────────────────────────────────────────

router.post('/oauth/github/callback', async (req, res) => {
    try {
        const { email, login, github_id } = req.body;
        if (!email && !login) return res.status(400).json({ error: 'email or login required' });

        const username = login || email.split('@')[0];
        const userEmail = email || `${login}@github.simulated`;
        let user = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [userEmail, username]);

        if (!user) {
            const id = uuidv4();
            const tempHash = bcrypt.hashSync(crypto.randomBytes(32).toString('hex'), 10);
            await db.prepare(`INSERT INTO users (id, username, email, password_hash, company) VALUES (?, ?, ?, ?, ?)`)
                .run(id, username, userEmail, tempHash, 'GitHub OAuth');
            user = { id, username, email: userEmail, role: 'operator' };

            await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
                .run(uuidv4(), id, 'OAUTH_REGISTER', 'user', id, JSON.stringify({ provider: 'github', github_id }));
        }

        const sessionId = await createSession(user.id, req);
        const { accessToken, refreshToken } = await generateTokenPair(user, sessionId);

        eventBus.emitEvent(EVENT_TYPES.USER_LOGIN, { username: user.username, method: 'oauth_github' });

        res.json({
            token: accessToken,
            refresh_token: refreshToken,
            user: { id: user.id, username: user.username, email: user.email, role: user.role },
            auth_method: 'oauth_github'
        });
    } catch (err) {
        console.error('GitHub OAuth error:', err);
        res.status(500).json({ error: 'OAuth authentication failed' });
    }
});

module.exports = router;
