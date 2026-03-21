/**
 * API Key Authentication Middleware
 *
 * Supports external partner access via API keys.
 * Keys are stored in DB table `api_keys` with org_id scope.
 *
 * Usage:
 *   Header: X-API-Key: <key>
 *   Or: Authorization: ApiKey <key>
 *
 * Creates: api_keys table if not exists
 */
const crypto = require('crypto');

let db;
try {
    db = require('../db');
} catch (e) {}

// In-memory cache for validated keys (5 min TTL)
const keyCache = new Map();
const KEY_CACHE_TTL = 5 * 60 * 1000;

/**
 * Ensure api_keys table exists
 */
async function ensureTable() {
    if (!db) return;
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS api_keys (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                org_id UUID NOT NULL REFERENCES organizations(id),
                key_hash VARCHAR(128) NOT NULL UNIQUE,
                key_prefix VARCHAR(8) NOT NULL,
                name VARCHAR(200) NOT NULL,
                scopes TEXT[] DEFAULT '{}',
                rate_limit INTEGER DEFAULT 60,
                last_used_at TIMESTAMPTZ,
                expires_at TIMESTAMPTZ,
                revoked BOOLEAN DEFAULT FALSE,
                created_by UUID REFERENCES users(id),
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        await db.run('CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash) WHERE revoked = false');
    } catch (e) {
        // Table may already exist with different schema, proceed anyway
    }
}

// Run on import
ensureTable().catch(() => {});

/**
 * Hash an API key for storage
 */
function hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Generate a new API key
 * Returns: { key, keyPrefix, keyHash }
 */
function generateKey() {
    const key = 'tc_' + crypto.randomBytes(32).toString('hex');
    return {
        key,
        keyPrefix: key.substring(0, 8),
        keyHash: hashKey(key),
    };
}

/**
 * API Key auth middleware
 * Extracts key from X-API-Key header or Authorization: ApiKey <key>
 * Sets req.user and req.apiKey on success
 */
function apiKeyAuth(options = {}) {
    return async (req, res, next) => {
        // Extract key
        const apiKey =
            req.headers['x-api-key'] ||
            (req.headers.authorization && req.headers.authorization.startsWith('ApiKey ')
                ? req.headers.authorization.slice(7)
                : null);

        if (!apiKey) return next(); // No API key, let other auth handle it

        if (!db) return res.status(503).json({ error: 'Database unavailable' });

        try {
            const hash = hashKey(apiKey);

            // Check cache first
            const cached = keyCache.get(hash);
            if (cached && Date.now() - cached._cachedAt < KEY_CACHE_TTL) {
                req.user = cached.user;
                req.apiKey = cached.apiKey;
                req.authMethod = 'api_key';
                return next();
            }

            // Query DB
            const record = await db.get(
                'SELECT ak.*, o.name as org_name FROM api_keys ak JOIN organizations o ON o.id = ak.org_id WHERE ak.key_hash = $1 AND ak.revoked = false',
                [hash]
            );

            if (!record) {
                return res.status(401).json({ error: 'Invalid API key' });
            }

            // Check expiry
            if (record.expires_at && new Date(record.expires_at) < new Date()) {
                return res.status(401).json({ error: 'API key expired' });
            }

            // Build user-like object
            const user = {
                id: record.created_by || record.id,
                org_id: record.org_id,
                role: 'api_key',
                api_key_id: record.id,
                api_key_name: record.name,
                scopes: record.scopes || [],
            };

            // Cache it
            keyCache.set(hash, {
                user,
                apiKey: record,
                _cachedAt: Date.now(),
            });

            // Update last_used_at (async, don't wait)
            db.run('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [record.id]).catch(() => {});

            req.user = user;
            req.apiKey = record;
            req.authMethod = 'api_key';
            next();
        } catch (e) {
            console.error('[api-key-auth] Error:', e.message);
            return res.status(500).json({ error: 'API key validation failed' });
        }
    };
}

/**
 * Check if API key has a specific scope
 */
function requireScope(scope) {
    return (req, res, next) => {
        if (req.authMethod !== 'api_key') return next(); // Not API key auth, skip
        const scopes = req.user?.scopes || [];
        if (scopes.includes('*') || scopes.includes(scope)) return next();
        return res.status(403).json({ error: 'API key missing scope: ' + scope });
    };
}

module.exports = {
    apiKeyAuth: apiKeyAuth(),
    apiKeyAuthMiddleware: apiKeyAuth,
    requireScope,
    generateKey,
    hashKey,
    _cache: keyCache,
};
