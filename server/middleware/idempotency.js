/**
 * Idempotency Middleware (F1)
 * Prevents duplicate writes for POST endpoints by caching responses keyed by
 * the Idempotency-Key header. Keys expire after 24 hours.
 */
const db = require('../db');
const logger = require('../lib/logger');

function idempotency(endpoint) {
    return async function (req, res, next) {
        const key = req.headers['idempotency-key'];
        if (!key) return next(); // No key = no idempotency guard

        const orgId = req.user?.orgId || req.user?.org_id || 'unknown';

        try {
            // Check for existing response
            const existing = await db.get(
                `SELECT response, status_code FROM idempotency_keys 
                 WHERE key = $1 AND org_id = $2 AND expires_at > NOW()`,
                [key, orgId]
            );

            if (existing) {
                // Return cached response
                return res.status(existing.status_code).json(existing.response);
            }

            // Intercept res.json to capture the response
            const originalJson = res.json.bind(res);
            res.json = async function (body) {
                try {
                    await db.run(
                        `INSERT INTO idempotency_keys (key, org_id, endpoint, response, status_code)
                         VALUES ($1, $2, $3, $4, $5)
                         ON CONFLICT (key) DO NOTHING`,
                        [key, orgId, endpoint, JSON.stringify(body), res.statusCode || 200]
                    );
                } catch (e) {
                    logger.warn('[Idempotency] Failed to cache response:', e.message);
                }
                return originalJson(body);
            };

            next();
        } catch (err) {
            logger.error('[Idempotency] Middleware error:', err.message);
            next(); // Don't block on idempotency errors
        }
    };
}

module.exports = { idempotency };
