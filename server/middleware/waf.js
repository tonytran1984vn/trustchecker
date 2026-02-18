/**
 * TrustChecker v9.4 — Web Application Firewall Middleware
 * 
 * Request-level security filtering against:
 * SQL injection, XSS, path traversal, bot detection,
 * suspicious headers, and IP+endpoint rate limiting.
 */

// ═══════════════════════════════════════════════════════════════════
// WAF RULES
// ═══════════════════════════════════════════════════════════════════

const SQL_INJECTION_PATTERNS = [
    /(\b(union\s+select|select\s+.*\s+from|insert\s+into|update\s+.*\s+set|delete\s+from|drop\s+table|alter\s+table)\b)/i,
    /(\s--\s|\/\*|\*\/|\bxp_\w+|\bsp_\w+|;\s*(select|drop|insert|update|delete|alter|create))/i,
    /(\b(or|and)\b\s+\d+\s*=\s*\d+)/i,
    /('\s*(or|and)\s+')/i,
    /(benchmark\s*\(|sleep\s*\(|waitfor\s+delay)/i,
    /(char\s*\(|concat\s*\(|concat_ws\s*\()/i,
];

const XSS_PATTERNS = [
    /(<\s*script[^>]*>)/i,
    /(javascript\s*:)/i,
    /(on(error|load|click|mouseover|submit|focus|blur)\s*=)/i,
    /(<\s*iframe[^>]*>)/i,
    /(<\s*object[^>]*>)/i,
    /(<\s*embed[^>]*>)/i,
    /(<\s*svg[^>]*on)/i,
    /(expression\s*\()/i,
    /(document\.(cookie|write|domain))/i,
    /(window\.(location|open))/i,
];

const PATH_TRAVERSAL_PATTERNS = [
    /(\.\.\/)/, /(\.\.\%2[fF])/, /(\.\.\%5[cC])/,
    /(\/etc\/(passwd|shadow|hosts))/i,
    /(\/proc\/self)/i,
    /(%00|\\x00)/,
];

const BLOCKED_USER_AGENTS = [
    /sqlmap/i, /nikto/i, /nessus/i, /w3af/i, /burp/i,
    /havij/i, /nmap/i, /masscan/i, /dirbuster/i,
    /gobuster/i, /wfuzz/i, /nuclei/i,
];

const SUSPICIOUS_HEADERS = [
    'x-forwarded-host',  // Header injection
    'x-original-url',    // Path override
    'x-rewrite-url',
];

// ═══════════════════════════════════════════════════════════════════
// IP + ENDPOINT RATE LIMITER
// ═══════════════════════════════════════════════════════════════════

class IPEndpointLimiter {
    constructor(maxPerMinute = 60) {
        this.maxPerMinute = maxPerMinute;
        this._buckets = new Map();
        this._cleanupInterval = setInterval(() => this._cleanup(), 60000);
        if (this._cleanupInterval.unref) this._cleanupInterval.unref();
    }

    check(ip, endpoint) {
        const key = `${ip}:${endpoint}`;
        const now = Date.now();

        if (!this._buckets.has(key)) {
            this._buckets.set(key, { count: 1, windowStart: now });
            return { allowed: true, remaining: this.maxPerMinute - 1 };
        }

        const bucket = this._buckets.get(key);
        if (now - bucket.windowStart > 60000) {
            bucket.count = 1;
            bucket.windowStart = now;
            return { allowed: true, remaining: this.maxPerMinute - 1 };
        }

        bucket.count++;
        const remaining = Math.max(0, this.maxPerMinute - bucket.count);
        return { allowed: bucket.count <= this.maxPerMinute, remaining };
    }

    _cleanup() {
        const now = Date.now();
        for (const [key, bucket] of this._buckets) {
            if (now - bucket.windowStart > 120000) this._buckets.delete(key);
        }
    }

    stop() {
        clearInterval(this._cleanupInterval);
    }
}

// ═══════════════════════════════════════════════════════════════════
// WAF MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

class WAF {
    constructor(options = {}) {
        this.enabled = options.enabled !== false;
        this.whitelist = new Set(options.whitelist || []);
        this.logBlocked = options.logBlocked !== false;
        this.ipLimiter = new IPEndpointLimiter(options.ratePerMinute || 120);
        this.customRules = options.customRules || [];

        this.stats = {
            totalRequests: 0,
            blockedRequests: 0,
            blockedBySQLi: 0,
            blockedByXSS: 0,
            blockedByTraversal: 0,
            blockedByBot: 0,
            blockedByHeaders: 0,
            blockedByRate: 0,
            blockedByCustom: 0,
        };
    }

    /**
     * Express middleware.
     */
    middleware() {
        return (req, res, next) => {
            if (!this.enabled) return next();

            this.stats.totalRequests++;

            // Check whitelist
            const clientIP = req.ip || req.connection?.remoteAddress || '0.0.0.0';
            if (this.whitelist.has(clientIP)) return next();

            // Run checks
            const result = this._check(req, clientIP);
            if (result.blocked) {
                this.stats.blockedRequests++;
                this.stats[`blockedBy${result.category}`] = (this.stats[`blockedBy${result.category}`] || 0) + 1;

                if (this.logBlocked) {
                    console.warn(`[WAF] BLOCKED ${req.method} ${req.path} from ${clientIP} — ${result.reason} (${result.category})`);
                }

                return res.status(403).json({
                    error: 'Request blocked by security policy',
                    code: 'WAF_BLOCKED',
                    requestId: req.headers['x-request-id'] || undefined,
                });
            }

            next();
        };
    }

    _check(req, clientIP) {
        // 1. Bot detection
        const ua = req.headers['user-agent'] || '';
        for (const pattern of BLOCKED_USER_AGENTS) {
            if (pattern.test(ua)) {
                return { blocked: true, reason: `Blocked user-agent: ${ua.slice(0, 50)}`, category: 'Bot' };
            }
        }

        // 2. Suspicious headers
        for (const header of SUSPICIOUS_HEADERS) {
            if (req.headers[header]) {
                return { blocked: true, reason: `Suspicious header: ${header}`, category: 'Headers' };
            }
        }

        // 3. IP + endpoint rate limit
        const endpoint = `${req.method}:${req.path.split('?')[0]}`;
        const rateCheck = this.ipLimiter.check(clientIP, endpoint);
        if (!rateCheck.allowed) {
            return { blocked: true, reason: `Rate limit exceeded for ${endpoint}`, category: 'Rate' };
        }

        // 4. Scan all values (query, body, params)
        const values = this._extractValues(req);
        for (const val of values) {
            // SQL Injection
            for (const pattern of SQL_INJECTION_PATTERNS) {
                if (pattern.test(val)) {
                    return { blocked: true, reason: `SQL injection detected: ${val.slice(0, 50)}`, category: 'SQLi' };
                }
            }
            // XSS
            for (const pattern of XSS_PATTERNS) {
                if (pattern.test(val)) {
                    return { blocked: true, reason: `XSS payload detected: ${val.slice(0, 50)}`, category: 'XSS' };
                }
            }
            // Path Traversal
            for (const pattern of PATH_TRAVERSAL_PATTERNS) {
                if (pattern.test(val)) {
                    return { blocked: true, reason: `Path traversal detected: ${val.slice(0, 50)}`, category: 'Traversal' };
                }
            }
        }

        // 5. Custom rules
        for (const rule of this.customRules) {
            if (rule.test && rule.test(req)) {
                return { blocked: true, reason: rule.reason || 'Custom rule violation', category: 'Custom' };
            }
        }

        return { blocked: false };
    }

    _extractValues(req) {
        const values = [];

        // URL path + query string
        values.push(req.originalUrl || req.url || '');

        // Query params
        if (req.query) {
            for (const val of Object.values(req.query)) {
                if (typeof val === 'string') values.push(val);
                if (Array.isArray(val)) val.forEach(v => typeof v === 'string' && values.push(v));
            }
        }

        // Body params (depth 5 covers most nested JSON payloads;
        // deeper nesting is atypical and likely adversarial)
        if (req.body && typeof req.body === 'object') {
            this._flattenValues(req.body, values, 5);
        }

        // Route params
        if (req.params) {
            for (const val of Object.values(req.params)) {
                if (typeof val === 'string') values.push(val);
            }
        }

        return values;
    }

    _flattenValues(obj, result, depth) {
        if (depth <= 0) return;
        for (const val of Object.values(obj)) {
            if (typeof val === 'string') result.push(val);
            else if (Array.isArray(val)) {
                val.forEach(v => {
                    if (typeof v === 'string') result.push(v);
                    else if (typeof v === 'object' && v !== null) this._flattenValues(v, result, depth - 1);
                });
            } else if (typeof val === 'object' && val !== null) {
                this._flattenValues(val, result, depth - 1);
            }
        }
    }

    // ─── Management ─────────────────────────────────────────────────

    addWhitelist(ip) { this.whitelist.add(ip); }
    removeWhitelist(ip) { this.whitelist.delete(ip); }
    addRule(rule) { this.customRules.push(rule); }

    getStats() {
        return {
            ...this.stats,
            blockRate: this.stats.totalRequests > 0
                ? Math.round((this.stats.blockedRequests / this.stats.totalRequests) * 10000) / 100 : 0,
            whitelistSize: this.whitelist.size,
            customRuleCount: this.customRules.length,
        };
    }

    stop() {
        this.ipLimiter.stop();
    }
}

// Singleton
const waf = new WAF();

module.exports = { WAF, waf };
