/**
 * Auth: MFA (Multi-Factor Authentication)
 * Setup, verify, and disable TOTP-based MFA.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { generateSecret, verifySync, generateURI } = require('otplib');
const db = require('../db');
const { authMiddleware } = require('./core');

const router = express.Router();

// ─── POST /mfa/setup ─────────────────────────────────────────────────────────

router.post('/mfa/setup', authMiddleware, async (req, res) => {
    try {
        const user = await db.prepare('SELECT id, username, mfa_enabled FROM users WHERE id = ?').get(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (user.mfa_enabled) {
            return res.status(400).json({ error: 'MFA is already enabled. Disable it first.' });
        }

        const secret = generateSecret();
        const otpauth = generateURI({ issuer: 'TrustChecker', accountName: user.username, secret });

        await db.prepare('UPDATE users SET mfa_secret = ? WHERE id = ?').run(secret, user.id);

        const backupCodes = Array.from({ length: 6 }, () =>
            crypto.randomBytes(4).toString('hex').toUpperCase()
        );

        res.json({
            secret,
            otpauth_url: otpauth,
            backup_codes: backupCodes,
            message: 'Scan the QR code with your authenticator app, then verify with a code'
        });
    } catch (err) {
        console.error('MFA setup error:', err);
        res.status(500).json({ error: 'MFA setup failed' });
    }
});

// ─── POST /mfa/verify ────────────────────────────────────────────────────────

router.post('/mfa/verify', authMiddleware, async (req, res) => {
    try {
        const { code } = req.body;
        if (!code) return res.status(400).json({ error: 'MFA code required' });

        const user = await db.prepare('SELECT id, mfa_secret, mfa_enabled FROM users WHERE id = ?').get(req.user.id);
        if (!user || !user.mfa_secret) {
            return res.status(400).json({ error: 'MFA not set up. Call /mfa/setup first' });
        }

        const result = verifySync({ token: code, secret: user.mfa_secret });
        const isValid = result && result.valid;
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid MFA code. Try again.' });
        }

        await db.prepare('UPDATE users SET mfa_enabled = 1 WHERE id = ?').run(user.id);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)')
            .run(uuidv4(), user.id, 'MFA_ENABLED', 'user', user.id);

        res.json({ message: 'MFA enabled successfully', mfa_enabled: true });
    } catch (err) {
        console.error('MFA verify error:', err);
        res.status(500).json({ error: 'MFA verification failed' });
    }
});

// ─── POST /mfa/disable ───────────────────────────────────────────────────────

router.post('/mfa/disable', authMiddleware, async (req, res) => {
    try {
        const { password } = req.body;
        if (!password) return res.status(400).json({ error: 'Password required to disable MFA' });

        const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Invalid password' });

        await db.prepare('UPDATE users SET mfa_enabled = 0, mfa_secret = NULL WHERE id = ?').run(user.id);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)')
            .run(uuidv4(), user.id, 'MFA_DISABLED', 'user', user.id);

        res.json({ message: 'MFA disabled', mfa_enabled: false });
    } catch (err) {
        console.error('MFA disable error:', err);
        res.status(500).json({ error: 'Failed to disable MFA' });
    }
});

module.exports = router;
