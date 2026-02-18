/**
 * TrustChecker v9.4 — API Gateway Policy Middleware
 * 
 * Request/response transformation, quota management,
 * API key validation, request validation, response sanitization,
 * and IP whitelist/blacklist per API key.
 */

const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════
// QUOTA MANAGER
// ═══════════════════════════════════════════════════════════════════

class QuotaManager {
    constructor() {
        this._quotas = new Map(); // tenantId → { daily: { count, resetAt }, monthly: { count, resetAt } }
        this._plans = new Map(); // plan → { dailyLimit, monthlyLimit }

        // Default plan quotas
        this._plans.set('free', { dailyLimit: 10000, monthlyLimit: 100000 });
        this._plans.set('starter', { dailyLimit: 1000, monthlyLimit: 20000 });
        this._plans.set('professional', { dailyLimit: 10000, monthlyLimit: 200000 });
        this._plans.set('enterprise', { dailyLimit: 100000, monthlyLimit: 2000000 });
    }

    check(tenantId, plan = 'free') {
        const limits = this._plans.get(plan) || this._plans.get('free');
        const now = Date.now();

        if (!this._quotas.has(tenantId)) {
            this._quotas.set(tenantId, {
                daily: { count: 0, resetAt: now + 86400000 },
                monthly: { count: 0, resetAt: now + 30 * 86400000 },
            });
        }

        const quota = this._quotas.get(tenantId);

        // Reset if window expired
        if (now >= quota.daily.resetAt) {
            quota.daily = { count: 0, resetAt: now + 86400000 };
        }
        if (now >= quota.monthly.resetAt) {
            quota.monthly = { count: 0, resetAt: now + 30 * 86400000 };
        }

        // Check limits
        if (quota.daily.count >= limits.dailyLimit) {
            return {
                allowed: false,
                reason: 'Daily API quota exceeded',
                limit: limits.dailyLimit,
                used: quota.daily.count,
                resetsAt: new Date(quota.daily.resetAt).toISOString(),
            };
        }
        if (quota.monthly.count >= limits.monthlyLimit) {
            return {
                allowed: false,
                reason: 'Monthly API quota exceeded',
                limit: limits.monthlyLimit,
                used: quota.monthly.count,
                resetsAt: new Date(quota.monthly.resetAt).toISOString(),
            };
        }

        // Increment
        quota.daily.count++;
        quota.monthly.count++;

        return {
            allowed: true,
            daily: { used: quota.daily.count, limit: limits.dailyLimit, remaining: limits.dailyLimit - quota.daily.count },
            monthly: { used: quota.monthly.count, limit: limits.monthlyLimit, remaining: limits.monthlyLimit - quota.monthly.count },
        };
    }

    getUsage(tenantId) {
        return this._quotas.get(tenantId) || null;
    }
}

// ═══════════════════════════════════════════════════════════════════
// RESPONSE SANITIZER
// ═══════════════════════════════════════════════════════════════════

const INTERNAL_FIELDS = [
    'password_hash', 'passwordHash', 'password',
    'mfa_secret', 'mfaSecret', 'totp_secret',
    'api_secret', 'apiSecret', 'refresh_token',
    'internal_id', 'internalId', '_prisma',
    'stack', 'sql', 'query',
    '__v', '$__', '$isNew',
];

function sanitizeResponse(data) {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) return data.map(sanitizeResponse);
    if (typeof data !== 'object') return data;

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
        if (INTERNAL_FIELDS.includes(key)) continue;
        if (key.startsWith('_') && key !== '_id') continue;
        sanitized[key] = sanitizeResponse(value);
    }
    return sanitized;
}

// ═══════════════════════════════════════════════════════════════════
// API KEY MANAGER
// ═══════════════════════════════════════════════════════════════════

class APIKeyManager {
    constructor() {
        this._keys = new Map(); // key → { tenantId, plan, scopes, ipWhitelist, ipBlacklist, createdAt, lastUsed }
    }

    register(tenantId, options = {}) {
        const key = `tc_${crypto.randomBytes(24).toString('hex')}`;
        this._keys.set(key, {
            tenantId,
            plan: options.plan || 'free',
            scopes: options.scopes || ['read'],
            ipWhitelist: new Set(options.ipWhitelist || []),
            ipBlacklist: new Set(options.ipBlacklist || []),
            createdAt: Date.now(),
            lastUsed: null,
            requestCount: 0,
        });
        return key;
    }

    validate(key, ip = null) {
        const entry = this._keys.get(key);
        if (!entry) return { valid: false, error: 'Invalid API key' };

        // IP whitelist check
        if (entry.ipWhitelist.size > 0 && ip && !entry.ipWhitelist.has(ip)) {
            return { valid: false, error: 'IP not in whitelist' };
        }

        // IP blacklist check
        if (ip && entry.ipBlacklist.has(ip)) {
            return { valid: false, error: 'IP is blacklisted' };
        }

        entry.lastUsed = Date.now();
        entry.requestCount++;

        return {
            valid: true,
            tenantId: entry.tenantId,
            plan: entry.plan,
            scopes: entry.scopes,
        };
    }

    checkScope(key, requiredScope) {
        const entry = this._keys.get(key);
        if (!entry) return false;
        return entry.scopes.includes(requiredScope) || entry.scopes.includes('admin');
    }

    addIPWhitelist(key, ip) {
        const entry = this._keys.get(key);
        if (entry) entry.ipWhitelist.add(ip);
    }

    addIPBlacklist(key, ip) {
        const entry = this._keys.get(key);
        if (entry) entry.ipBlacklist.add(ip);
    }

    revoke(key) {
        return this._keys.delete(key);
    }

    getStats() {
        return {
            totalKeys: this._keys.size,
            activeKeys: [...this._keys.values()].filter(k => k.lastUsed && Date.now() - k.lastUsed < 86400000).length,
        };
    }
}

// ═══════════════════════════════════════════════════════════════════
// API GATEWAY MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

class APIGateway {
    constructor(options = {}) {
        this.quotaManager = new QuotaManager();
        this.keyManager = new APIKeyManager();
        this.sanitizeResponses = options.sanitizeResponses !== false;
        this.enforceQuota = options.enforceQuota !== false;
        this.requireApiKey = options.requireApiKey || false;
        this.transformRules = options.transformRules || [];

        this.stats = {
            totalRequests: 0,
            quotaBlocked: 0,
            keyBlocked: 0,
            sanitized: 0,
        };
    }

    /**
     * Express middleware.
     */
    middleware() {
        return (req, res, next) => {
            this.stats.totalRequests++;
            const clientIP = req.ip || req.connection?.remoteAddress || '0.0.0.0';

            // 1. API Key validation (if header present or required)
            const apiKey = req.headers['x-api-key'];
            if (apiKey || this.requireApiKey) {
                if (!apiKey) {
                    this.stats.keyBlocked++;
                    return res.status(401).json({ error: 'API key required', code: 'MISSING_API_KEY' });
                }
                const keyResult = this.keyManager.validate(apiKey, clientIP);
                if (!keyResult.valid) {
                    this.stats.keyBlocked++;
                    return res.status(401).json({ error: keyResult.error, code: 'INVALID_API_KEY' });
                }
                req.apiKeyData = keyResult;
            }

            // 2. Quota check (skip for health, auth, and public endpoints)
            const quotaExempt = ['/api/health', '/api/auth/', '/api/public/'];
            const isQuotaExempt = quotaExempt.some(p => req.path.startsWith(p));
            if (this.enforceQuota && !isQuotaExempt) {
                const tenantId = req.tenantId || req.apiKeyData?.tenantId || 'anonymous';
                const plan = req.apiKeyData?.plan || req.user?.plan || 'free';
                const quotaResult = this.quotaManager.check(tenantId, plan);

                // Add quota headers
                if (quotaResult.daily) {
                    res.set('X-RateLimit-Limit', String(quotaResult.daily.limit));
                    res.set('X-RateLimit-Remaining', String(quotaResult.daily.remaining));
                }

                if (!quotaResult.allowed) {
                    this.stats.quotaBlocked++;
                    return res.status(429).json({
                        error: quotaResult.reason,
                        code: 'QUOTA_EXCEEDED',
                        resetsAt: quotaResult.resetsAt,
                    });
                }
            }

            // 3. Request transformation
            for (const rule of this.transformRules) {
                if (rule.match && rule.match(req)) {
                    if (rule.transform) rule.transform(req);
                }
            }

            // 4. Response sanitization
            if (this.sanitizeResponses) {
                const originalJson = res.json.bind(res);
                res.json = (data) => {
                    this.stats.sanitized++;
                    return originalJson(sanitizeResponse(data));
                };
            }

            next();
        };
    }

    // ─── Diagnostics ────────────────────────────────────────────────

    getStats() {
        return {
            ...this.stats,
            quota: this.quotaManager,
            keys: this.keyManager.getStats(),
        };
    }
}

// Singleton
const gateway = new APIGateway();

module.exports = { APIGateway, gateway, QuotaManager, APIKeyManager, sanitizeResponse };
