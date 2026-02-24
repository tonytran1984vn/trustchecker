/**
 * TrustChecker – Tenant Integration Settings (Company Admin)
 * Per-org API keys, webhooks, SMTP, carrier, ERP config
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const ENC_KEY = process.env.ENCRYPTION_KEY || 'trustchecker-settings-key-DEV-ONLY';
const CIPHER_KEY = crypto.createHash('sha256').update(ENC_KEY).digest();

function encrypt(text) {
    if (!text) return '';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', CIPHER_KEY, iv);
    return iv.toString('hex') + ':' + cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}
function decrypt(text) {
    if (!text || !text.includes(':')) return '';
    try { const [ivHex, enc] = text.split(':'); const d = crypto.createDecipheriv('aes-256-cbc', CIPHER_KEY, Buffer.from(ivHex, 'hex')); return d.update(enc, 'hex', 'utf8') + d.final('utf8'); } catch { return ''; }
}
function mask(val) { return (!val || val.length < 8) ? '••••••••' : val.substring(0, 4) + '••••' + val.substring(val.length - 4); }

// ─── Schema: Tenant-level integration categories ────────────────
const TENANT_SCHEMA = {
    webhooks: {
        label: 'Outgoing Webhooks', icon: '🔗',
        description: 'Send real-time event notifications to your systems (Slack, Teams, ERP)',
        settings: [
            { key: 'url', label: 'Webhook URL', secret: false, placeholder: 'https://hooks.slack.com/services/...' },
            { key: 'secret', label: 'Signing Secret', secret: true, placeholder: 'Auto-generated or custom' },
            { key: 'events', label: 'Events (comma-separated)', secret: false, placeholder: 'scan.completed, fraud.detected, shipment.delivered' },
            { key: 'enabled', label: 'Enabled', secret: false, placeholder: 'true / false' },
        ]
    },
    api_keys: {
        label: 'API Keys', icon: '🔑',
        description: 'Generate API keys for your dev team to access TrustChecker APIs',
        settings: [
            { key: 'primary_key', label: 'Primary API Key', secret: true, placeholder: 'Auto-generated', readonly: true },
            { key: 'secondary_key', label: 'Secondary API Key', secret: true, placeholder: 'Auto-generated', readonly: true },
            { key: 'rate_limit', label: 'Rate Limit (req/min)', secret: false, placeholder: '1000' },
            { key: 'allowed_ips', label: 'Allowed IPs (comma-separated)', secret: false, placeholder: '0.0.0.0/0 (all)' },
            { key: 'enabled', label: 'Enabled', secret: false, placeholder: 'true / false' },
        ]
    },
    smtp: {
        label: 'Email / SMTP', icon: '📧',
        description: 'Send alerts and notifications from your own email domain',
        settings: [
            { key: 'host', label: 'SMTP Host', secret: false, placeholder: 'smtp.gmail.com' },
            { key: 'port', label: 'SMTP Port', secret: false, placeholder: '587' },
            { key: 'username', label: 'Username', secret: false, placeholder: 'alerts@yourcompany.com' },
            { key: 'password', label: 'Password', secret: true, placeholder: '' },
            { key: 'from_name', label: 'From Name', secret: false, placeholder: 'Your Company Alerts' },
            { key: 'enabled', label: 'Enabled', secret: false, placeholder: 'true / false' },
        ]
    },
    carrier: {
        label: 'Carrier APIs (Logistics)', icon: '🚚',
        description: 'Connect your carrier accounts for real-time shipment tracking',
        settings: [
            { key: 'fedex_api_key', label: 'FedEx API Key', secret: true, placeholder: 'l7xx...' },
            { key: 'fedex_account', label: 'FedEx Account Number', secret: false, placeholder: '' },
            { key: 'dhl_api_key', label: 'DHL API Key', secret: true, placeholder: '' },
            { key: 'ups_client_id', label: 'UPS Client ID', secret: false, placeholder: '' },
            { key: 'ups_client_secret', label: 'UPS Client Secret', secret: true, placeholder: '' },
            { key: 'default_carrier', label: 'Default Carrier', secret: false, placeholder: 'fedex / dhl / ups' },
            { key: 'enabled', label: 'Enabled', secret: false, placeholder: 'true / false' },
        ]
    },
    erp: {
        label: 'ERP / WMS Connector', icon: '🏭',
        description: 'Sync inventory, orders and shipments with your ERP system',
        settings: [
            { key: 'provider', label: 'ERP Provider', secret: false, placeholder: 'sap / oracle / netsuite / odoo / custom' },
            { key: 'api_url', label: 'API Base URL', secret: false, placeholder: 'https://erp.yourcompany.com/api' },
            { key: 'api_key', label: 'API Key', secret: true, placeholder: '' },
            { key: 'api_secret', label: 'API Secret', secret: true, placeholder: '' },
            { key: 'sync_interval', label: 'Sync Interval (minutes)', secret: false, placeholder: '15' },
            { key: 'sync_entities', label: 'Sync Entities', secret: false, placeholder: 'products, orders, shipments' },
            { key: 'enabled', label: 'Enabled', secret: false, placeholder: 'true / false' },
        ]
    }
};

module.exports = function (db) {
    // GET /schema — Return available tenant integration categories
    router.get('/schema', (req, res) => {
        const schema = {};
        for (const [cat, def] of Object.entries(TENANT_SCHEMA)) {
            schema[cat] = { ...def, settings: def.settings.map(s => ({ ...s })) };
        }
        res.json(schema);
    });

    // GET / — Get all settings for this org (secrets masked)
    router.get('/', async (req, res) => {
        try {
            const orgId = req.user?.org_id || req.user?.orgId;
            if (!orgId) return res.json({});
            const rows = await db.all(
                'SELECT * FROM tenant_integrations WHERE org_id = ? ORDER BY category, setting_key',
                [orgId]
            );
            const result = {};
            for (const row of rows) {
                if (!result[row.category]) result[row.category] = {};
                let val = row.setting_value;
                if (row.is_secret && val) val = mask(decrypt(val));
                result[row.category][row.setting_key] = {
                    value: val, is_secret: !!row.is_secret,
                    updated_at: row.updated_at, updated_by: row.updated_by
                };
            }
            res.json(result);
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // PUT /:category — Upsert settings for a category (org-scoped)
    router.put('/:category', async (req, res) => {
        try {
            const orgId = req.user?.org_id || req.user?.orgId;
            if (!orgId) return res.status(400).json({ error: 'No organization' });
            const { category } = req.params;
            const schema = TENANT_SCHEMA[category];
            if (!schema) return res.status(400).json({ error: `Unknown category: ${category}` });

            const settings = req.body;
            const updated = [];

            for (const def of schema.settings) {
                const val = settings[def.key];
                if (val === undefined || val === null) continue;
                if (def.secret && val.includes('••••')) continue; // skip masked

                const storedValue = def.secret ? encrypt(val) : val;
                const existing = await db.get(
                    'SELECT id FROM tenant_integrations WHERE org_id = ? AND category = ? AND setting_key = ?',
                    [orgId, category, def.key]
                );

                if (existing) {
                    await db.run(
                        'UPDATE tenant_integrations SET setting_value = ?, is_secret = ?, updated_by = ?, updated_at = NOW() WHERE id = ?',
                        [storedValue, def.secret, req.user?.username || 'admin', existing.id]
                    );
                } else {
                    await db.run(
                        'INSERT INTO tenant_integrations (id, org_id, category, setting_key, setting_value, is_secret, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [uuidv4(), orgId, category, def.key, storedValue, def.secret, req.user?.username || 'admin']
                    );
                }
                updated.push(def.key);
            }

            // Auto-generate API keys if category is api_keys and no keys exist
            if (category === 'api_keys') {
                for (const keyName of ['primary_key', 'secondary_key']) {
                    const exists = await db.get(
                        'SELECT id FROM tenant_integrations WHERE org_id = ? AND category = ? AND setting_key = ?',
                        [orgId, category, keyName]
                    );
                    if (!exists) {
                        const apiKey = 'tc_' + crypto.randomBytes(24).toString('hex');
                        await db.run(
                            'INSERT INTO tenant_integrations (id, org_id, category, setting_key, setting_value, is_secret, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
                            [uuidv4(), orgId, category, keyName, encrypt(apiKey), true, req.user?.username || 'admin']
                        );
                        updated.push(keyName + ' (auto-generated)');
                    }
                }
            }

            res.json({ message: `Updated ${updated.length} settings for ${schema.label}`, updated });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // DELETE /:category — Clear all settings for a category (org-scoped)
    router.delete('/:category', async (req, res) => {
        try {
            const orgId = req.user?.org_id || req.user?.orgId;
            if (!orgId) return res.status(400).json({ error: 'No organization' });
            await db.run('DELETE FROM tenant_integrations WHERE org_id = ? AND category = ?', [orgId, req.params.category]);
            res.json({ ok: true });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    // POST /api-keys/regenerate — Regenerate API keys
    router.post('/api-keys/regenerate', async (req, res) => {
        try {
            const orgId = req.user?.org_id || req.user?.orgId;
            if (!orgId) return res.status(400).json({ error: 'No organization' });
            const keys = {};
            for (const keyName of ['primary_key', 'secondary_key']) {
                const apiKey = 'tc_' + crypto.randomBytes(24).toString('hex');
                const existing = await db.get(
                    'SELECT id FROM tenant_integrations WHERE org_id = ? AND category = ? AND setting_key = ?',
                    [orgId, 'api_keys', keyName]
                );
                if (existing) {
                    await db.run('UPDATE tenant_integrations SET setting_value = ?, updated_at = NOW() WHERE id = ?', [encrypt(apiKey), existing.id]);
                } else {
                    await db.run(
                        'INSERT INTO tenant_integrations (id, org_id, category, setting_key, setting_value, is_secret, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [uuidv4(), orgId, 'api_keys', keyName, encrypt(apiKey), true, req.user?.username || 'admin']
                    );
                }
                keys[keyName] = apiKey;
            }
            res.json({ message: 'API keys regenerated', keys });
        } catch (e) { res.status(500).json({ error: e.message }); }
    });

    return router;
};
