/**
 * Auth: Passkey (WebAuthn Simulation)
 * Register, authenticate, list, and delete passkey credentials.
 */
const express = require('express');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { eventBus, EVENT_TYPES } = require('../events');
const { authMiddleware, generateTokenPair, createSession } = require('./core');

const router = express.Router();

// ─── POST /passkey/register ──────────────────────────────────────────────────

router.post('/passkey/register', authMiddleware, async (req, res) => {
    try {
        const { nickname } = req.body;
        const user = await db.get('SELECT id, username FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const credentialId = crypto.randomBytes(32).toString('base64url');
        const publicKey = crypto.randomBytes(65).toString('base64url');
        const id = uuidv4();

        await db.prepare(`
      INSERT INTO passkey_credentials (id, user_id, credential_id, public_key, nickname)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, user.id, credentialId, publicKey, nickname || 'My Passkey');

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), user.id, 'PASSKEY_REGISTERED', 'user', user.id, JSON.stringify({ credential_id: credentialId, nickname }));

        res.json({
            message: 'Passkey registered successfully',
            passkey: {
                id, credential_id: credentialId, nickname: nickname || 'My Passkey',
                created_at: new Date().toISOString()
            },
            webauthn_options: {
                challenge: crypto.randomBytes(32).toString('base64url'),
                rp: { name: 'TrustChecker', id: req.hostname },
                user: { id: user.id, name: user.username, displayName: user.username },
                pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
                authenticatorSelection: { userVerification: 'preferred', residentKey: 'preferred' },
                timeout: 60000
            }
        });
    } catch (err) {
        console.error('Passkey register error:', err);
        res.status(500).json({ error: 'Passkey registration failed' });
    }
});

// ─── POST /passkey/authenticate ──────────────────────────────────────────────

router.post('/passkey/authenticate', async (req, res) => {
    try {
        const { credential_id, username } = req.body;
        if (!credential_id && !username) {
            return res.status(400).json({ error: 'credential_id or username required' });
        }

        let cred;
        if (credential_id) {
            cred = await db.get('SELECT * FROM passkey_credentials WHERE credential_id = ?', [credential_id]);
        } else {
            cred = await db.get(`
                SELECT pc.* FROM passkey_credentials pc
                JOIN users u ON pc.user_id = u.id
                WHERE u.username = ?
                ORDER BY pc.last_used DESC LIMIT 1
            `, [username]);
        }

        if (!cred) return res.status(401).json({ error: 'Passkey not found' });

        const user = await db.get('SELECT id, username, email, role FROM users WHERE id = ?', [cred.user_id]);
        if (!user) return res.status(401).json({ error: 'User not found' });

        await db.prepare("UPDATE passkey_credentials SET sign_count = sign_count + 1, last_used = datetime('now') WHERE id = ?")
            .run(cred.id);

        await db.prepare("UPDATE users SET last_login = datetime('now'), failed_attempts = 0 WHERE id = ?").run(user.id);
        const sessionId = await createSession(user.id, req);
        const { accessToken, refreshToken } = await generateTokenPair(user, sessionId);

        eventBus.emitEvent(EVENT_TYPES.USER_LOGIN, { username: user.username, method: 'passkey' });

        res.json({
            token: accessToken,
            refresh_token: refreshToken,
            user: { id: user.id, username: user.username, email: user.email, role: user.role },
            auth_method: 'passkey'
        });
    } catch (err) {
        console.error('Passkey auth error:', err);
        res.status(500).json({ error: 'Passkey authentication failed' });
    }
});

// ─── GET /passkey/list ───────────────────────────────────────────────────────

router.get('/passkey/list', authMiddleware, async (req, res) => {
    try {
        const passkeys = await db.all(
            'SELECT id, credential_id, nickname, sign_count, created_at, last_used FROM passkey_credentials WHERE user_id = ? ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ passkeys });
    } catch (err) {
        console.error('Passkey list error:', err);
        res.status(500).json({ error: 'Failed to list passkeys' });
    }
});

// ─── DELETE /passkey/:id ─────────────────────────────────────────────────────

router.delete('/passkey/:id', authMiddleware, async (req, res) => {
    try {
        const cred = await db.get('SELECT * FROM passkey_credentials WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
        if (!cred) return res.status(404).json({ error: 'Passkey not found' });

        await db.prepare('DELETE FROM passkey_credentials WHERE id = ?').run(req.params.id);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'PASSKEY_REMOVED', 'user', req.user.id, JSON.stringify({ credential_id: cred.credential_id }));

        res.json({ message: 'Passkey removed' });
    } catch (err) {
        console.error('Passkey delete error:', err);
        res.status(500).json({ error: 'Failed to remove passkey' });
    }
});

module.exports = router;
