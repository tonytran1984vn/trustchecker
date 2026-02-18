const { safeError } = require('../utils/safe-error');
/**
 * TrustChecker – Integration Settings Routes (Admin Only)
 * Manages API keys and configuration for external services
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// Encryption for API keys at rest — MUST set ENCRYPTION_KEY in production
const ENCRYPTION_KEY_SOURCE = process.env.ENCRYPTION_KEY || (process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('ENCRYPTION_KEY env var is required in production'); })()
    : 'trustchecker-settings-key-DEV-ONLY');
if (!process.env.ENCRYPTION_KEY) {
    console.warn('⚠️  ENCRYPTION_KEY not set — using dev fallback. Set ENCRYPTION_KEY env var for production!');
}
const CIPHER_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY_SOURCE).digest();
const IV_LENGTH = 16;

function encrypt(text) {
    if (!text) return '';
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-cbc', CIPHER_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
}

function decrypt(text) {
    if (!text || !text.includes(':')) return '';
    try {
        const [ivHex, encrypted] = text.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', CIPHER_KEY, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return '';
    }
}

function maskSecret(val) {
    if (!val || val.length < 8) return '••••••••';
    return val.substring(0, 4) + '••••' + val.substring(val.length - 4);
}

// Integration categories with their settings definitions
const INTEGRATION_SCHEMA = {
    stripe: {
        label: 'Stripe (Payments)',
        icon: '💳',
        description: 'Accept credit card payments, manage subscriptions and invoices',
        settings: [
            { key: 'publishable_key', label: 'Publishable Key', secret: false, placeholder: 'pk_live_...' },
            { key: 'secret_key', label: 'Secret Key', secret: true, placeholder: 'sk_live_...' },
            { key: 'webhook_secret', label: 'Webhook Secret', secret: true, placeholder: 'whsec_...' },
            { key: 'enabled', label: 'Enabled', secret: false, placeholder: 'true / false' },
        ]
    },
    google_oauth: {
        label: 'Google OAuth',
        icon: '🔐',
        description: 'Allow users to sign in with their Google accounts',
        settings: [
            { key: 'client_id', label: 'Client ID', secret: false, placeholder: '123456789.apps.googleusercontent.com' },
            { key: 'client_secret', label: 'Client Secret', secret: true, placeholder: 'GOCSPX-...' },
            { key: 'redirect_uri', label: 'Redirect URI', secret: false, placeholder: 'https://yourdomain.com/auth/google/callback' },
            { key: 'enabled', label: 'Enabled', secret: false, placeholder: 'true / false' },
        ]
    },
    github_oauth: {
        label: 'GitHub OAuth',
        icon: '🐙',
        description: 'Allow users to sign in with their GitHub accounts',
        settings: [
            { key: 'client_id', label: 'Client ID', secret: false, placeholder: 'Iv1.abc123...' },
            { key: 'client_secret', label: 'Client Secret', secret: true, placeholder: 'ghp_...' },
            { key: 'redirect_uri', label: 'Redirect URI', secret: false, placeholder: 'https://yourdomain.com/auth/github/callback' },
            { key: 'enabled', label: 'Enabled', secret: false, placeholder: 'true / false' },
        ]
    },
    ethereum: {
        label: 'Ethereum / Polygon',
        icon: '⛓️',
        description: 'Anchor evidence hashes on-chain for immutable proof',
        settings: [
            { key: 'rpc_url', label: 'RPC URL (Infura/Alchemy)', secret: false, placeholder: 'https://mainnet.infura.io/v3/YOUR_KEY' },
            { key: 'private_key', label: 'Wallet Private Key', secret: true, placeholder: '0x...' },
            { key: 'contract_address', label: 'Smart Contract Address', secret: false, placeholder: '0x...' },
            { key: 'chain_id', label: 'Chain ID', secret: false, placeholder: '1 (mainnet) / 137 (polygon)' },
            { key: 'enabled', label: 'Enabled', secret: false, placeholder: 'true / false' },
        ]
    },
    carrier_api: {
        label: 'Carrier APIs (Logistics)',
        icon: '🚚',
        description: 'Real-time shipment tracking via FedEx, DHL, UPS',
        settings: [
            { key: 'fedex_api_key', label: 'FedEx API Key', secret: true, placeholder: 'l7xx...' },
            { key: 'fedex_secret', label: 'FedEx Secret', secret: true, placeholder: '' },
            { key: 'dhl_api_key', label: 'DHL API Key', secret: true, placeholder: '' },
            { key: 'ups_client_id', label: 'UPS Client ID', secret: false, placeholder: '' },
            { key: 'ups_client_secret', label: 'UPS Client Secret', secret: true, placeholder: '' },
            { key: 'enabled', label: 'Enabled', secret: false, placeholder: 'true / false' },
        ]
    },
    kyc_provider: {
        label: 'KYC Provider (Veriff/Onfido)',
        icon: '🪪',
        description: 'Identity verification and document validation',
        settings: [
            { key: 'provider', label: 'Provider', secret: false, placeholder: 'veriff / onfido' },
            { key: 'api_key', label: 'API Key', secret: true, placeholder: '' },
            { key: 'api_secret', label: 'API Secret', secret: true, placeholder: '' },
            { key: 'webhook_url', label: 'Webhook URL', secret: false, placeholder: 'https://yourdomain.com/api/kyc/webhook' },
            { key: 'enabled', label: 'Enabled', secret: false, placeholder: 'true / false' },
        ]
    },
    smtp: {
        label: 'Email / SMTP',
        icon: '📧',
        description: 'Send transactional emails, alerts and notifications',
        settings: [
            { key: 'host', label: 'SMTP Host', secret: false, placeholder: 'smtp.gmail.com' },
            { key: 'port', label: 'SMTP Port', secret: false, placeholder: '587' },
            { key: 'username', label: 'Username', secret: false, placeholder: 'noreply@yourdomain.com' },
            { key: 'password', label: 'Password', secret: true, placeholder: '' },
            { key: 'from_name', label: 'From Name', secret: false, placeholder: 'TrustChecker' },
            { key: 'enabled', label: 'Enabled', secret: false, placeholder: 'true / false' },
        ]
    },
    webhook: {
        label: 'Outgoing Webhooks',
        icon: '🔗',
        description: 'Send real-time event notifications to external systems',
        settings: [
            { key: 'url', label: 'Webhook URL', secret: false, placeholder: 'https://hooks.slack.com/services/...' },
            { key: 'secret', label: 'Signing Secret', secret: true, placeholder: '' },
            { key: 'events', label: 'Events (comma-separated)', secret: false, placeholder: 'scan.completed, fraud.detected, evidence.created' },
            { key: 'enabled', label: 'Enabled', secret: false, placeholder: 'true / false' },
        ]
    }
};

module.exports = function (db) {
    // GET /api/integrations/schema — Return available integration categories
    router.get('/schema', async (req, res) => {
        const schema = {};
        for (const [cat, def] of Object.entries(INTEGRATION_SCHEMA)) {
            schema[cat] = { ...def, settings: def.settings.map(s => ({ ...s })) };
        }
        res.json(schema);
    });

    // GET /api/integrations — Get all settings (mask secrets)
    router.get('/', async (req, res) => {
        try {
            const rows = await db.all('SELECT * FROM system_settings ORDER BY category, setting_key');
            const result = {};
            for (const row of rows) {
                if (!result[row.category]) result[row.category] = {};
                let val = row.setting_value;
                if (row.is_secret && val) {
                    const decrypted = decrypt(val);
                    val = maskSecret(decrypted);
                }
                result[row.category][row.setting_key] = {
                    value: val,
                    is_secret: !!row.is_secret,
                    updated_at: row.updated_at,
                    updated_by: row.updated_by
                };
            }
            res.json(result);
        } catch (e) {
            safeError(res, 'Operation failed', e);
        }
    });

    // PUT /api/integrations/:category — Update settings for a category
    router.put('/:category', async (req, res) => {
        try {
            const { category } = req.params;
            const schema = INTEGRATION_SCHEMA[category];
            if (!schema) return res.status(400).json({ error: `Unknown category: ${category}` });

            const settings = req.body;
            const updated = [];

            for (const def of schema.settings) {
                const val = settings[def.key];
                if (val === undefined || val === null) continue;
                // Skip masked values (don't overwrite with mask)
                if (def.secret && val.includes('••••')) continue;

                const storedValue = def.secret ? encrypt(val) : val;
                const existing = await db.get(
                    'SELECT id FROM system_settings WHERE category = ? AND setting_key = ?',
                    [category, def.key]
                );

                if (existing) {
                    await db.prepare(
                        'UPDATE system_settings SET setting_value = ?, is_secret = ?, updated_by = ?, updated_at = datetime(\'now\') WHERE id = ?'
                    ).run(storedValue, def.secret ? 1 : 0, req.user.username, existing.id);
                } else {
                    await db.prepare(
                        'INSERT INTO system_settings (id, category, setting_key, setting_value, is_secret, description, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
                    ).run(uuidv4(), category, def.key, storedValue, def.secret ? 1 : 0, def.label, req.user.username);
                }
                updated.push(def.key);
            }

            res.json({ message: `Updated ${updated.length} settings for ${schema.label}`, updated });
        } catch (e) {
            safeError(res, 'Operation failed', e);
        }
    });

    // DELETE /api/integrations/:category — Clear all settings for a category
    router.delete('/:category', async (req, res) => {
        try {
            const { category } = req.params;
            await db.prepare('DELETE FROM system_settings WHERE category = ?').run(category);
            res.json({ message: `All settings cleared for ${category}` });
        } catch (e) {
            safeError(res, 'Operation failed', e);
        }
    });

    // GET /api/integrations/:category/test — Test connection for a category
    router.get('/:category/test', async (req, res) => {
        try {
            const { category } = req.params;
            const rows = await db.all('SELECT * FROM system_settings WHERE category = ?', [category]);
            const settings = {};
            for (const row of rows) {
                settings[row.setting_key] = row.is_secret ? decrypt(row.setting_value) : row.setting_value;
            }

            // Check if enabled
            if (settings.enabled !== 'true') {
                return res.json({ status: 'disabled', message: `${category} integration is disabled` });
            }

            // Test connectivity based on category
            let testResult = { status: 'ok', message: 'Configuration looks valid' };

            switch (category) {
                case 'stripe':
                    testResult = settings.secret_key?.startsWith('sk_')
                        ? { status: 'ok', message: 'Stripe key format valid (sk_...)' }
                        : { status: 'error', message: 'Invalid Stripe secret key format' };
                    break;
                case 'google_oauth':
                    testResult = settings.client_id?.includes('.apps.googleusercontent.com')
                        ? { status: 'ok', message: 'Google OAuth client ID format valid' }
                        : { status: 'error', message: 'Invalid Google Client ID format' };
                    break;
                case 'ethereum':
                    testResult = settings.rpc_url?.startsWith('http')
                        ? { status: 'ok', message: `RPC URL format valid (chain ${settings.chain_id || '?'})` }
                        : { status: 'error', message: 'Invalid RPC URL' };
                    break;
                case 'smtp':
                    testResult = settings.host && settings.port
                        ? { status: 'ok', message: `SMTP endpoint ${settings.host}:${settings.port} configured` }
                        : { status: 'error', message: 'Missing SMTP host or port' };
                    break;
                default:
                    testResult = { status: 'ok', message: 'Configuration saved (no live test available)' };
            }

            res.json(testResult);
        } catch (e) {
            res.status(500).json({ status: 'error', message: e.message });
        }
    });

    return router;
};
