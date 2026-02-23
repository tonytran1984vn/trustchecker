/**
 * API Economy Routes — Gateway, SDK Keys, Marketplace
 * Endpoints: 6 | Mount: /api/api-economy
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requirePermission } = require('../auth');
const apiEconomy = require('../engines/api-economy-engine');
const { v4: uuidv4 } = require('uuid');
router.use(authMiddleware);

const init = async () => {
    try {
        await db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (id TEXT PRIMARY KEY, api_key TEXT UNIQUE NOT NULL, api_secret_hash TEXT, tier TEXT, integration_type TEXT, app_name TEXT, owner_id TEXT, tenant_id TEXT, status TEXT DEFAULT 'active', rate_limit_rpm INTEGER DEFAULT 100, daily_limit INTEGER DEFAULT 1000, total_requests INTEGER DEFAULT 0, created_at DATETIME DEFAULT (datetime('now')));
`);
    } catch (e) { }
};
init();

// POST /keys — Generate API key
router.post('/keys', requirePermission('admin:manage'), async (req, res) => {
    try {
        const result = apiEconomy.generateAPIKey({ ...req.body, tenant_id: req.user?.org_id, owner_id: req.user?.id });
        if (result.error) return res.status(400).json(result);
        const hash = require('crypto').createHash('sha256').update(result.api_secret).digest('hex');
        await db.prepare('INSERT INTO api_keys (id,api_key,api_secret_hash,tier,integration_type,app_name,owner_id,tenant_id,rate_limit_rpm,daily_limit) VALUES (?,?,?,?,?,?,?,?,?,?)')
            .run(uuidv4(), result.api_key, hash, req.body.tier || 'free', req.body.integration_type || 'scm_vendor', result.app_name, req.user?.id, req.user?.org_id, result.rate_limit.requests_per_minute, result.rate_limit.daily_limit);
        res.status(201).json(result);
    } catch (err) { res.status(500).json({ error: 'Key generation failed' }); }
});

// GET /keys — List API keys
router.get('/keys', async (req, res) => {
    try {
        const keys = await db.prepare('SELECT api_key,tier,integration_type,app_name,status,rate_limit_rpm,daily_limit,total_requests,created_at FROM api_keys WHERE tenant_id = ?').all(req.user?.org_id || 'default');
        res.json({ title: 'API Keys', total: keys.length, keys });
    } catch (err) { res.status(500).json({ error: 'Keys query failed' }); }
});

// GET /usage — Usage statistics
router.get('/usage', async (req, res) => {
    try {
        const keys = await db.prepare('SELECT * FROM api_keys WHERE tenant_id = ?').all(req.user?.org_id || 'default');
        res.json(apiEconomy.getUsageStats(keys, []));
    } catch (err) { res.status(500).json({ error: 'Usage stats failed' }); }
});

// GET /marketplace — Data marketplace listings
router.get('/marketplace', (req, res) => { res.json(apiEconomy.getMarketplaceListings()); });

// GET /tiers — Available API tiers
router.get('/tiers', (req, res) => { res.json({ tiers: apiEconomy.getTiers(), integrations: apiEconomy.getIntegrations() }); });

// DELETE /keys/:apiKey — Revoke key
router.delete('/keys/:apiKey', requirePermission('admin:manage'), async (req, res) => {
    try {
        await db.prepare('UPDATE api_keys SET status = ? WHERE api_key = ?').run('revoked', req.params.apiKey);
        res.json({ message: 'API key revoked', api_key: req.params.apiKey });
    } catch (err) { res.status(500).json({ error: 'Key revocation failed' }); }
});

module.exports = router;
