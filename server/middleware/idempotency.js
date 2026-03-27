/**
 * Idempotency Middleware (Phase 4.3 — Hardened)
 *
 * Invariant: 1 (org + endpoint + key) → 1 effect + 1 response
 * - SHA-256 payload hash → stored as request_hash
 * - Same key + same hash → return cached response (byte-level identical)
 * - Same key + different hash → 422 reject
 * - Expired key (>24h) → IDEMPOTENCY_KEY_EXPIRED (retryable: false)
 * - TTL: 24 hours
 */
const db = require('../db');
const logger = require('../lib/logger');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const TTL_HOURS = 24;

function hashPayload(body) {
    const payload = JSON.stringify(body || {});
    return crypto.createHash('sha256').update(payload).digest('hex');
}

async function logMetric(metricType, orgId, endpoint, details) {
    try {
        await db.run(
            'INSERT INTO system_metrics (id, metric_type, org_id, endpoint, details) VALUES ($1, $2, $3, $4, $5)',
            [uuidv4(), metricType, orgId, endpoint, JSON.stringify(details)]
        );
    } catch (e) {
        /* best-effort */
    }
}

function idempotency(endpoint) {
    return async function (req, res, next) {
        const key = req.headers['idempotency-key'];
        if (!key) return next();

        const orgId = req.user?.orgId || req.user?.org_id || 'unknown';
        const requestHash = hashPayload(req.body);

        try {
            // Check for existing key (including expired)
            const existing = await db.get(
                `SELECT response, status_code, request_hash, expires_at FROM idempotency_keys
                 WHERE key = $1 AND org_id = $2 AND endpoint = $3`,
                [key, orgId, endpoint]
            );

            if (existing) {
                // Expired key → reject clearly (NOT reprocess)
                if (new Date(existing.expires_at) <= new Date()) {
                    await logMetric('idempotency_expired_reject', orgId, endpoint, { key });
                    return res.status(410).json({
                        error: 'IDEMPOTENCY_KEY_EXPIRED',
                        retryable: false,
                        message: 'This idempotency key has expired. Use a new key.',
                    });
                }

                // Same hash → return cached response (byte-level identical)
                if (existing.request_hash === requestHash) {
                    await logMetric('idempotency_hit', orgId, endpoint, { key });
                    return res.status(existing.status_code).json(existing.response);
                }

                // Different hash → REJECT (payload mismatch)
                await logMetric('idempotency_hash_mismatch', orgId, endpoint, { key });
                return res.status(422).json({
                    error: 'IDEMPOTENCY_PAYLOAD_MISMATCH',
                    message:
                        'Same idempotency key used with different request body. Use a new key for different requests.',
                });
            }

            // No existing key → process request, capture response
            const originalJson = res.json.bind(res);
            res.json = async function (body) {
                try {
                    await db.run(
                        `INSERT INTO idempotency_keys (key, org_id, endpoint, request_hash, response, status_code, expires_at)
                         VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '${TTL_HOURS} hours')
                         ON CONFLICT (key) DO NOTHING`,
                        [key, orgId, endpoint, requestHash, JSON.stringify(body), res.statusCode || 200]
                    );
                } catch (e) {
                    logger.warn('[Idempotency] Failed to cache:', e.message);
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
