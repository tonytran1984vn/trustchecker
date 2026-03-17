/**
 * Audit Logging Middleware
 *
 * Automatically logs all write operations (POST, PUT, PATCH, DELETE)
 * to the `audit_log` table. Captures:
 *   - Who (user_id, role, api_key_id)
 *   - What (method, path, status)
 *   - Where (IP, user agent)
 *   - When (timestamp)
 *   - Body (sanitized, no passwords)
 *
 * Usage: app.use('/api', auditLog);
 */
let db;
try { db = require('../db'); } catch(e) {}

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_FIELDS = new Set(['password', 'password_hash', 'secret', 'token', 'refreshToken', 'credit_card', 'ssn']);
const SKIP_PATHS = ['/api/auth/login', '/api/auth/refresh', '/healthz'];

/**
 * Remove sensitive fields from object
 */
function sanitize(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const result = {};
    for (const [k, v] of Object.entries(obj)) {
        if (SENSITIVE_FIELDS.has(k.toLowerCase())) {
            result[k] = '[REDACTED]';
        } else if (typeof v === 'object' && !Array.isArray(v)) {
            result[k] = sanitize(v);
        } else {
            result[k] = v;
        }
    }
    return result;
}

/**
 * Get client IP from behind proxy
 */
function getIP(req) {
    const forwarded = req.headers['x-forwarded-for'];
    return forwarded ? forwarded.split(',')[0].trim() : (req.ip || 'unknown');
}

function auditLog(req, res, next) {
    // Only audit write operations
    if (!WRITE_METHODS.has(req.method)) return next();

    // Skip certain paths
    if (SKIP_PATHS.some(p => req.path.startsWith(p))) return next();

    // Capture response
    const originalJson = res.json.bind(res);
    const startTime = Date.now();

    res.json = function(body) {
        // Log asynchronously (don't block response)
        if (db && req.user) {
            const entry = {
                user_id: req.user.id,
                action: req.method + ' ' + req.originalUrl,
                details: JSON.stringify({
                    method: req.method,
                    path: req.originalUrl,
                    status: res.statusCode,
                    body: sanitize(req.body),
                    ip: getIP(req),
                    user_agent: (req.headers['user-agent'] || '').substring(0, 200),
                    auth_method: req.authMethod || 'jwt',
                    api_key_id: req.apiKey?.id || null,
                    duration_ms: Date.now() - startTime,
                    role: req.user.role,
                    org_id: req.user.org_id,
                }),
            };

            db.run(
                'INSERT INTO audit_log (id, user_id, action, details, created_at) VALUES (gen_random_uuid(), $1, $2, $3, NOW())',
                [entry.user_id, entry.action, entry.details]
            ).catch(e => console.warn('[audit] Log failed:', e.message));
        }

        return originalJson(body);
    };

    next();
}

module.exports = auditLog;
