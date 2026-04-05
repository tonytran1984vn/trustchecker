const express = require('express');
const router = express.Router();
const db = require('../db');
const { apiKeyAuthMiddleware, generateKey, hashKey } = require('../middleware/api-key-auth');
const { orgGuard } = require('../middleware/org-middleware');
const { v4: uuidv4 } = require('uuid');

// Ensure IP whitelist column exists
async function ensureIpWhitelist() {
    try {
        await db.run('ALTER TABLE organizations ADD COLUMN ip_whitelist TEXT DEFAULT "[]"');
    } catch (e) {
        // Safe to ignore if it already exists
    }
}
ensureIpWhitelist().catch(() => {});

// Mount orgGuard so all requests in this route are org-scoped
router.use(orgGuard({ allowPlatform: false }));

// ─── GET /developers/ip-whitelist ──────────────────────────────────────────
router.get('/ip-whitelist', async (req, res) => {
    try {
        const orgInfo = await db.get('SELECT ip_whitelist FROM organizations WHERE id = $1', [req.orgId]);
        let ips = [];
        if (orgInfo && orgInfo.ip_whitelist) {
            try {
                ips = JSON.parse(orgInfo.ip_whitelist);
            } catch (e) {}
        }
        res.json({ ips });
    } catch (err) {
        console.error('[Developers] Get IP whitelist error', err);
        res.status(500).json({ error: 'Failed to fetch network policy' });
    }
});

// ─── PUT /developers/ip-whitelist ──────────────────────────────────────────
router.put('/ip-whitelist', async (req, res) => {
    try {
        const { ips } = req.body;
        if (!Array.isArray(ips)) {
            return res.status(400).json({ error: 'ips must be an array of strings' });
        }

        await db.run('UPDATE organizations SET ip_whitelist = $1 WHERE id = $2', [JSON.stringify(ips), req.orgId]);

        // Audit log
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'IP_WHITELIST_UPDATED', 'organization', ?, ?)`,
            [uuidv4(), req.user.id, req.orgId, JSON.stringify({ ips })]
        );
        res.json({ message: 'Network policy updated', ips });
    } catch (err) {
        console.error('[Developers] Update IP whitelist error', err);
        res.status(500).json({ error: 'Failed to update network policy' });
    }
});

// ─── GET /developers/keys ──────────────────────────────────────────────────
router.get('/keys', async (req, res) => {
    try {
        const keys = await db.all(
            'SELECT id, name, key_prefix, rate_limit, last_used_at, created_at, expires_at FROM api_keys WHERE org_id = $1 AND revoked = false ORDER BY created_at DESC',
            [req.orgId]
        );
        res.json({ api_keys: keys });
    } catch (err) {
        console.error('[Developers] List api keys error', err);
        res.status(500).json({ error: 'Failed to fetch API keys' });
    }
});

// ─── POST /developers/keys ─────────────────────────────────────────────────
router.post('/keys', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'name is required' });
        }

        const keyData = generateKey();
        const keyId = uuidv4();

        await db.run(
            `INSERT INTO api_keys (id, org_id, name, key_hash, key_prefix, created_by) VALUES ($1, $2, $3, $4, $5, $6)`,
            [keyId, req.orgId, name, keyData.keyHash, keyData.keyPrefix, req.user.id]
        );

        // Audit log
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'API_KEY_CREATED', 'api_key', ?, ?)`,
            [uuidv4(), req.user.id, keyId, JSON.stringify({ name })]
        );

        res.status(201).json({
            message: 'API Key generated',
            api_key: {
                id: keyId,
                name: name,
                key_prefix: keyData.keyPrefix,
                token: keyData.key, // Returning the raw key once only
            },
        });
    } catch (err) {
        console.error('[Developers] Generate api key error', err);
        res.status(500).json({ error: 'Failed to generate API Key' });
    }
});

// ─── DELETE /developers/keys/:id ───────────────────────────────────────────
router.delete('/keys/:id', async (req, res) => {
    try {
        const keyId = req.params.id;

        const existing = await db.get('SELECT id FROM api_keys WHERE id = $1 AND org_id = $2', [keyId, req.orgId]);
        if (!existing) {
            return res.status(404).json({ error: 'API key not found' });
        }

        await db.run('UPDATE api_keys SET revoked = true WHERE id = $1', [keyId]);

        // Audit log
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'API_KEY_REVOKED', 'api_key', ?, ?)`,
            [uuidv4(), req.user.id, keyId, '{}']
        );

        res.json({ message: 'API Key revoked successfully' });
    } catch (err) {
        console.error('[Developers] Revoke api key error', err);
        res.status(500).json({ error: 'Failed to revoke API Key' });
    }
});

module.exports = router;
