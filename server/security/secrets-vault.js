/**
 * TrustChecker v9.5 — Secrets Vault
 * ═══════════════════════════════════════════════════════════════════
 * Provider-agnostic secrets management.
 * Supports: HashiCorp Vault, AWS Secrets Manager, Environment Variables.
 * Auto-selects provider based on available config.
 * 
 * Features:
 *   - Provider abstraction (swap without code changes)
 *   - In-memory cache with TTL (reduces external calls)
 *   - Secret rotation watching
 *   - Audit trail (who accessed what, when)
 *   - Boot integration for replacing process.env secrets
 * 
 * Env:
 *   VAULT_ADDR    — HashiCorp Vault address (enables Vault provider)
 *   VAULT_TOKEN   — Vault authentication token
 *   AWS_REGION    — AWS region (enables AWS Secrets Manager)
 *   SECRETS_PREFIX — Key prefix (default: trustchecker/)
 */

// (No external dependencies required)
const http = require('http');
const https = require('https');

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const SECRETS_PREFIX = process.env.SECRETS_PREFIX || 'trustchecker/';
const ROTATION_CHECK_INTERVAL = 60 * 1000; // 1 minute

// Known secret keys
const SECRET_KEYS = [
    'jwt_secret',
    'jwt_refresh_secret',
    'database_url',
    'redis_url',
    'stripe_key',
    'stripe_webhook_secret',
    'license_signing_key',
    'encryption_master_key',
    'ai_api_key',
    'smtp_password',
];

// ═══════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════

const _auditLog = [];
const MAX_AUDIT = 200;

function auditAccess(key, action, details = {}) {
    _auditLog.push({
        key,
        action,
        timestamp: new Date().toISOString(),
        ...details,
    });
    if (_auditLog.length > MAX_AUDIT) _auditLog.shift();
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER: ENVIRONMENT VARIABLES (fallback)
// ═══════════════════════════════════════════════════════════════════

class EnvProvider {
    constructor() {
        this.name = 'env';
    }

    async get(key) {
        // Map secret keys to env var names
        const envKey = key.toUpperCase().replace(/-/g, '_');
        const value = process.env[envKey];
        if (value) {
            auditAccess(key, 'read', { provider: 'env' });
        }
        return value || null;
    }

    async set(key, value) {
        const envKey = key.toUpperCase().replace(/-/g, '_');
        process.env[envKey] = value;
        auditAccess(key, 'write', { provider: 'env' });
    }

    async list() {
        return SECRET_KEYS.filter(k => {
            const envKey = k.toUpperCase().replace(/-/g, '_');
            return !!process.env[envKey];
        });
    }
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER: HASHICORP VAULT
// ═══════════════════════════════════════════════════════════════════

class VaultProvider {
    constructor() {
        this.name = 'vault';
        this.addr = process.env.VAULT_ADDR;
        this.token = process.env.VAULT_TOKEN;
        this.mountPath = process.env.VAULT_MOUNT || 'secret';
    }

    async _request(method, path, body) {
        const rawUrl = `${this.addr}/v1/${this.mountPath}/data/${SECRETS_PREFIX}${path}`;
        const parsedUrl = new URL(rawUrl);
        const transport = parsedUrl.protocol === 'https:' ? https : http;

        return new Promise((resolve, reject) => {
            const opts = {
                method,
                hostname: parsedUrl.hostname,
                port: parsedUrl.port,
                path: parsedUrl.pathname,
                headers: {
                    'X-Vault-Token': this.token,
                    'Content-Type': 'application/json',
                },
                timeout: 5000,
            };

            const req = transport.request(opts, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        resolve({ status: res.statusCode, data: json });
                    } catch {
                        resolve({ status: res.statusCode, data: null });
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => { req.destroy(); reject(new Error('Vault timeout')); });

            if (body) req.write(JSON.stringify(body));
            req.end();
        });
    }

    async get(key) {
        try {
            const res = await this._request('GET', key);
            if (res.status === 200 && res.data?.data?.data) {
                auditAccess(key, 'read', { provider: 'vault' });
                return res.data.data.data.value || null;
            }
            return null;
        } catch (err) {
            console.warn(`[Vault] Failed to read ${key}:`, err.message);
            return null;
        }
    }

    async set(key, value) {
        try {
            await this._request('POST', key, { data: { value } });
            auditAccess(key, 'write', { provider: 'vault' });
        } catch (err) {
            console.error(`[Vault] Failed to write ${key}:`, err.message);
            throw err;
        }
    }

    async list() {
        try {
            const res = await this._request('LIST', '');
            return res.data?.data?.keys || [];
        } catch {
            return [];
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// PROVIDER: AWS SECRETS MANAGER
// ═══════════════════════════════════════════════════════════════════

class AWSSecretsProvider {
    constructor() {
        this.name = 'aws-sm';
        this.region = process.env.AWS_REGION || 'ap-southeast-1';
    }

    async _getClient() {
        // Lazy import — only load AWS SDK if this provider is used
        if (!this._client) {
            try {
                const { SecretsManagerClient, GetSecretValueCommand, PutSecretValueCommand, ListSecretsCommand } = require('@aws-sdk/client-secrets-manager');
                this._client = new SecretsManagerClient({ region: this.region });
                this._commands = { GetSecretValueCommand, PutSecretValueCommand, ListSecretsCommand };
            } catch {
                console.warn('[SecretsVault] AWS SDK not installed. Using env fallback.');
                return null;
            }
        }
        return this._client;
    }

    async get(key) {
        const client = await this._getClient();
        if (!client) return null;

        try {
            const cmd = new this._commands.GetSecretValueCommand({
                SecretId: `${SECRETS_PREFIX}${key}`,
            });
            const result = await client.send(cmd);
            auditAccess(key, 'read', { provider: 'aws-sm' });

            if (result.SecretString) {
                try {
                    const parsed = JSON.parse(result.SecretString);
                    return parsed.value || result.SecretString;
                } catch {
                    return result.SecretString;
                }
            }
            return null;
        } catch (err) {
            if (err.name !== 'ResourceNotFoundException') {
                console.warn(`[AWS SM] Failed to read ${key}:`, err.message);
            }
            return null;
        }
    }

    async set(key, value) {
        const client = await this._getClient();
        if (!client) throw new Error('AWS SDK not available');

        const cmd = new this._commands.PutSecretValueCommand({
            SecretId: `${SECRETS_PREFIX}${key}`,
            SecretString: JSON.stringify({ value }),
        });
        await client.send(cmd);
        auditAccess(key, 'write', { provider: 'aws-sm' });
    }

    async list() {
        const client = await this._getClient();
        if (!client) return [];

        try {
            const cmd = new this._commands.ListSecretsCommand({
                Filters: [{ Key: 'name', Values: [SECRETS_PREFIX] }],
            });
            const result = await client.send(cmd);
            return (result.SecretList || []).map(s => s.Name.replace(SECRETS_PREFIX, ''));
        } catch {
            return [];
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// SECRETS VAULT (main abstraction)
// ═══════════════════════════════════════════════════════════════════

class SecretsVault {
    constructor() {
        this._cache = new Map(); // key → { value, expiresAt }
        this._rotationTimer = null;

        // Auto-select provider
        if (process.env.VAULT_ADDR && process.env.VAULT_TOKEN) {
            this.provider = new VaultProvider();
        } else if (process.env.AWS_REGION && !process.env.SECRETS_USE_ENV) {
            this.provider = new AWSSecretsProvider();
        } else {
            this.provider = new EnvProvider();
        }

        console.log(`[SecretsVault] Using provider: ${this.provider.name}`);
    }

    /**
     * Get a secret value. Uses cache if fresh.
     * @param {string} key — secret key (e.g. 'jwt_secret')
     * @returns {Promise<string|null>}
     */
    async get(key) {
        // Check cache
        const cached = this._cache.get(key);
        if (cached && Date.now() < cached.expiresAt) {
            return cached.value;
        }

        // Fetch from provider
        const value = await this.provider.get(key);

        if (value) {
            this._cache.set(key, {
                value,
                expiresAt: Date.now() + CACHE_TTL,
            });
        }

        return value;
    }

    /**
     * Set a secret value.
     */
    async set(key, value) {
        await this.provider.set(key, value);
        this._cache.set(key, {
            value,
            expiresAt: Date.now() + CACHE_TTL,
        });
    }

    /**
     * Get secret or throw if not found.
     */
    async getRequired(key) {
        const value = await this.get(key);
        if (!value) {
            throw new Error(`[SecretsVault] Required secret "${key}" not found in ${this.provider.name}`);
        }
        return value;
    }

    /**
     * Pre-load all known secrets into cache at boot time.
     * Returns summary of what was loaded.
     */
    async preload() {
        const results = { loaded: [], missing: [] };

        // Fetch all secrets in parallel for faster boot
        const entries = await Promise.allSettled(
            SECRET_KEYS.map(async (key) => {
                const value = await this.get(key);
                return { key, value };
            })
        );

        for (const entry of entries) {
            if (entry.status === 'fulfilled' && entry.value.value) {
                results.loaded.push(entry.value.key);
            } else {
                const key = entry.status === 'fulfilled' ? entry.value.key : 'unknown';
                results.missing.push(key);
            }
        }

        console.log(`[SecretsVault] Preloaded ${results.loaded.length}/${SECRET_KEYS.length} secrets`);
        if (results.missing.length > 0) {
            console.warn(`[SecretsVault] Missing secrets: ${results.missing.join(', ')}`);
        }

        return results;
    }

    /**
     * Start rotation watcher — periodically refreshes secrets.
     */
    startRotationWatcher() {
        if (this.provider.name === 'env') return; // No rotation for env vars

        this._rotationTimer = setInterval(async () => {
            try {
                for (const key of SECRET_KEYS) {
                    const cached = this._cache.get(key);
                    if (!cached) continue;

                    const fresh = await this.provider.get(key);
                    if (fresh && fresh !== cached.value) {
                        console.log(`[SecretsVault] 🔄 Secret rotated: ${key}`);
                        this._cache.set(key, {
                            value: fresh,
                            expiresAt: Date.now() + CACHE_TTL,
                        });
                        auditAccess(key, 'rotation-detected', { provider: this.provider.name });
                    }
                }
            } catch (err) {
                console.error('[SecretsVault] Rotation watcher error:', err.message);
            }
        }, ROTATION_CHECK_INTERVAL);
        if (this._rotationTimer.unref) this._rotationTimer.unref();
    }

    /**
     * Stop rotation watcher.
     */
    stopRotationWatcher() {
        if (this._rotationTimer) {
            clearInterval(this._rotationTimer);
            this._rotationTimer = null;
        }
    }

    /**
     * Clear all cached secrets.
     */
    clearCache() {
        this._cache.clear();
    }

    /**
     * Get audit log.
     */
    getAuditLog() {
        return [..._auditLog];
    }

    /**
     * Get vault status.
     */
    getStatus() {
        return {
            provider: this.provider.name,
            cachedSecrets: this._cache.size,
            rotationWatcherActive: !!this._rotationTimer,
            knownKeys: SECRET_KEYS.length,
            auditEntries: _auditLog.length,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════

const vault = new SecretsVault();

module.exports = {
    vault,
    SecretsVault,
    SECRET_KEYS,
};
