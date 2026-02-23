/**
 * Auth: Account Management
 * Password change, sessions, revoke, /me, admin user mgmt, password reset, profile.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, ROLE_HIERARCHY } = require('./core');

const router = express.Router();

// ─── POST /password ──────────────────────────────────────────────────────────

router.post('/password', authMiddleware, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        if (!current_password || !new_password) {
            return res.status(400).json({ error: 'Current and new password required' });
        }

        if (new_password.length < 12) {
            return res.status(400).json({ error: 'New password must be at least 12 characters' });
        }

        if (!/[A-Z]/.test(new_password) || !/[a-z]/.test(new_password) || !/[0-9]/.test(new_password) || !/[^A-Za-z0-9]/.test(new_password)) {
            return res.status(400).json({ error: 'Password must contain uppercase, lowercase, number, and special character' });
        }

        const user = await db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Verify current password first
        const valid = await bcrypt.compare(current_password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

        // SEC-13: Prevent password reuse (check AFTER verifying current password)
        const isSameAsOld = await bcrypt.compare(new_password, user.password_hash);
        if (isSameAsOld) {
            return res.status(400).json({ error: 'New password must be different from current password' });
        }

        const newHash = await bcrypt.hash(new_password, 12);
        await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, user.id);

        await db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?').run(user.id);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)')
            .run(uuidv4(), user.id, 'PASSWORD_CHANGED', 'user', user.id);

        res.json({ message: 'Password changed successfully' });
    } catch (err) {
        console.error('Password change error:', err);
        res.status(500).json({ error: 'Password change failed' });
    }
});

// ─── GET /sessions ───────────────────────────────────────────────────────────

router.get('/sessions', authMiddleware, async (req, res) => {
    const sessions = await db.prepare(`
        SELECT id, ip_address, user_agent, created_at, last_active
        FROM sessions WHERE user_id = ? AND revoked = 0
        ORDER BY last_active DESC
    `).all(req.user.id);

    res.json({ sessions });
});

// ─── POST /revoke ────────────────────────────────────────────────────────────

router.post('/revoke', authMiddleware, async (req, res) => {
    try {
        const { session_id } = req.body;

        if (session_id) {
            await db.prepare('UPDATE sessions SET revoked = 1 WHERE id = ? AND user_id = ?')
                .run(session_id, req.user.id);
            await db.prepare('UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ? AND id IN (SELECT id FROM refresh_tokens WHERE user_id = ?)')
                .run(req.user.id, req.user.id);
        } else {
            await db.prepare('UPDATE sessions SET revoked = 1 WHERE user_id = ? AND id != ?')
                .run(req.user.id, req.user.session_id || '');
        }

        res.json({ message: session_id ? 'Session revoked' : 'All other sessions revoked' });
    } catch (err) {
        console.error('Revoke error:', err);
        res.status(500).json({ error: 'Failed to revoke session' });
    }
});

// ─── GET /me ─────────────────────────────────────────────────────────────────

router.get('/me', authMiddleware, async (req, res) => {
    const user = await db.prepare(
        'SELECT id, username, email, role, company, mfa_enabled, created_at, last_login, org_id FROM users WHERE id = ?'
    ).get(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    let org = null;
    let orgFlags = {};
    if (user.org_id) {
        try {
            org = await db.prepare(
                'SELECT id, name, slug, plan, schema_name, settings, feature_flags FROM organizations WHERE id = ?'
            ).get(user.org_id);
            if (org && org.feature_flags) {
                try { orgFlags = typeof org.feature_flags === 'string' ? JSON.parse(org.feature_flags) : org.feature_flags; } catch (_) { }
            }
        } catch (_) { /* org table may not exist */ }
    }

    const { getFeaturesForPlan } = require('../middleware/featureGate');
    const { safeParse } = require('../utils/safe-json');
    const plan = org?.plan || user.plan || 'free';
    const features = getFeaturesForPlan(plan);
    const planFlags = features.reduce((acc, f) => { acc[f] = true; return acc; }, {});

    // Merge: plan-based features + org-level flags (org flags override)
    const mergedFlags = { ...planFlags, ...orgFlags };

    res.json({
        user: {
            ...user,
            plan,
            org: org ? { id: org.id, name: org.name, slug: org.slug, plan: org.plan } : null,
        },
        features,
        feature_flags: mergedFlags,
        org_feature_flags: orgFlags,
    });
});

// ─── GET /users (admin only) ─────────────────────────────────────────────────

router.get('/users', authMiddleware, requireRole('admin'), async (req, res) => {
    const users = await db.prepare(
        'SELECT id, username, email, role, company, mfa_enabled, created_at, last_login FROM users ORDER BY created_at DESC'
    ).all();
    res.json({ users });
});

// ─── PUT /users/:id/role (admin only) ────────────────────────────────────────

router.put('/users/:id/role', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { role } = req.body;
        if (!ROLE_HIERARCHY[role]) {
            return res.status(400).json({ error: 'Invalid role. Must be: admin, manager, operator, or viewer' });
        }

        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot change your own role' });
        }

        await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'ROLE_CHANGED', 'user', req.params.id, JSON.stringify({ new_role: role }));

        res.json({ message: `Role updated to ${role}` });
    } catch (err) {
        console.error('Role update error:', err);
        res.status(500).json({ error: 'Role update failed' });
    }
});

// ─── POST /forgot-password ───────────────────────────────────────────────────

router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email required' });

        const user = await db.get('SELECT id, username, email FROM users WHERE email = ?', [email]);
        if (!user) return res.json({ message: 'If the email exists, a reset link has been sent' });

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpiry = new Date(Date.now() + 3600000).toISOString();

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), user.id, 'PASSWORD_RESET_REQUESTED', 'user', user.id,
                JSON.stringify({ token_hash: crypto.createHash('sha256').update(resetToken).digest('hex'), expires: resetExpiry }));

        // SEC-1: Token removed from logs — use audit_log token_hash for debugging
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[DEV] Password reset requested for ${user.username} (token hash in audit_log)`);
        }

        res.json({ message: 'If the email exists, a reset link has been sent' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Password reset request failed' });
    }
});

// ─── POST /reset-password ────────────────────────────────────────────────────

router.post('/reset-password', async (req, res) => {
    try {
        const { token, new_password } = req.body;
        if (!token || !new_password) return res.status(400).json({ error: 'Token and new_password required' });
        if (new_password.length < 12) return res.status(400).json({ error: 'Password must be at least 12 characters' });
        if (!/[A-Z]/.test(new_password) || !/[a-z]/.test(new_password) || !/[0-9]/.test(new_password) || !/[^A-Za-z0-9]/.test(new_password)) {
            return res.status(400).json({ error: 'Password must contain uppercase, lowercase, number, and special character' });
        }

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        // SEC-04: Use json_extract instead of LIKE to prevent wildcard injection
        const resetLog = await db.get(
            `SELECT * FROM audit_log WHERE action = 'PASSWORD_RESET_REQUESTED' AND json_extract(details, '$.token_hash') = ? ORDER BY created_at DESC LIMIT 1`,
            [tokenHash]
        );

        if (!resetLog) return res.status(400).json({ error: 'Invalid or expired reset token' });

        const details = safeParse(resetLog.details, {});
        if (new Date(details.expires) < new Date()) {
            return res.status(400).json({ error: 'Reset token has expired' });
        }

        const newHash = await bcrypt.hash(new_password, 12);
        await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(newHash, resetLog.actor_id);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?, ?)')
            .run(uuidv4(), resetLog.actor_id, 'PASSWORD_RESET_COMPLETED', 'user', resetLog.actor_id);

        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// ─── PUT /profile ────────────────────────────────────────────────────────────

router.put('/profile', authMiddleware, async (req, res) => {
    try {
        const { email, company, display_name } = req.body;
        const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const updates = [];
        const params = [];

        // SEC-08: Explicit allowlist for profile update fields
        const ALLOWED_PROFILE_FIELDS = ['email', 'company', 'username'];

        if (email && email !== user.email) {
            const existing = await db.get('SELECT id FROM users WHERE email = ? AND id != ?', [email, user.id]);
            if (existing) return res.status(409).json({ error: 'Email already in use' });
            updates.push('email = ?');
            params.push(email);
        }
        if (company !== undefined) { updates.push('company = ?'); params.push(company); }
        if (display_name !== undefined) { updates.push('username = ?'); params.push(display_name); }

        if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });

        // Validate all field names against allowlist
        const fieldNames = updates.map(u => u.split(' = ')[0]);
        if (fieldNames.some(f => !ALLOWED_PROFILE_FIELDS.includes(f))) {
            return res.status(400).json({ error: 'Invalid field update' });
        }

        params.push(req.user.id);
        await db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'PROFILE_UPDATED', 'user', req.user.id, JSON.stringify({ fields: updates.map(u => u.split(' = ')[0]) }));

        const updated = await db.get('SELECT id, username, email, role, company, mfa_enabled, created_at, last_login FROM users WHERE id = ?', [req.user.id]);
        res.json({ message: 'Profile updated', user: updated });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Profile update failed' });
    }
});

module.exports = router;
