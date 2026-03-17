/**
 * V1 API Keys Controller
 * CRUD for managing API keys (company_admin+ only).
 */
const express = require('express');
const router = express.Router();
const { success, serviceError } = require('../../lib/response');
const { generateKey, hashKey } = require('../../middleware/api-key-auth');

let db;
try { db = require('../../db'); } catch(e) {}

// GET /api/v1/api-keys — list org's API keys
router.get('/', async (req, res) => {
    try {
        if (!['company_admin', 'owner', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Admin only' });
        }
        const keys = await db.all(
            'SELECT id, name, key_prefix, scopes, rate_limit, last_used_at, expires_at, revoked, created_at FROM api_keys WHERE org_id = $1 ORDER BY created_at DESC',
            [req.user.org_id]
        );
        success(res, keys);
    } catch(e) { serviceError(res, e); }
});

// POST /api/v1/api-keys — create new API key
router.post('/', async (req, res) => {
    try {
        if (!['company_admin', 'owner', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Admin only' });
        }
        const { name, scopes = ['read'], expires_in_days = 365 } = req.body;
        if (!name) return res.status(400).json({ error: 'Name required' });

        const { key, keyPrefix, keyHash } = generateKey();
        const expiresAt = new Date(Date.now() + expires_in_days * 86400000);

        await db.run(
            'INSERT INTO api_keys (org_id, key_hash, key_prefix, name, scopes, expires_at, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [req.user.org_id, keyHash, keyPrefix, name, scopes, expiresAt, req.user.id]
        );

        // Return key ONLY on creation (never again)
        success(res, {
            key, // ⚠️ Only shown once!
            key_prefix: keyPrefix,
            name,
            scopes,
            expires_at: expiresAt,
        }, { message: 'API key created. Save it now — it will not be shown again.' });
    } catch(e) { serviceError(res, e); }
});

// DELETE /api/v1/api-keys/:id — revoke API key
router.delete('/:id', async (req, res) => {
    try {
        if (!['company_admin', 'owner', 'super_admin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Admin only' });
        }
        await db.run(
            'UPDATE api_keys SET revoked = true, updated_at = NOW() WHERE id = $1 AND org_id = $2',
            [req.params.id, req.user.org_id]
        );
        success(res, { revoked: true });
    } catch(e) { serviceError(res, e); }
});

module.exports = router;
