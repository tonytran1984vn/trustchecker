/**
 * Idempotency Middleware (Phase 4.3 — Hardened v3)
 *
 * Invariant: 1 (org + endpoint + key) → 1 effect + 1 response
 *
 * FIX v3 (Audit M-1):
 *   - Stale IN_PROGRESS rows auto-cleaned after STALE_CLAIM_MINUTES (5 min)
 *   - Prevents 24h retry block when res.json cache update fails
 *   - Periodic cleanup of expired keys to prevent table bloat
 *
 * FIX v2:
 *   - PK changed from (key) → (key, org_id, endpoint) — no cross-tenant collision
 *   - Claim-before-execute: INSERT placeholder BEFORE calling next()
 *   - TOCTOU race eliminated: ON CONFLICT prevents double-claim
 *   - Same key + same hash → return cached response (byte-level identical)
 *   - Same key + different hash → 422 reject
 *   - Expired key (>24h) → IDEMPOTENCY_KEY_EXPIRED (retryable: false)
 *   - TTL: 24 hours
 */
const db = require('../db');
const logger = require('../lib/logger');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const TTL_HOURS = 24;
const STALE_CLAIM_MINUTES = 5; // M-1 FIX: auto-release claimed-but-unfulfilled keys

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
            // 1. Check for existing key (uses composite PK: key + org_id + endpoint)
            const existing = await db.get(
                `SELECT response, status_code, request_hash, expires_at, created_at FROM idempotency_keys
                 WHERE key = $1 AND org_id = $2 AND endpoint = $3`,
                [key, orgId, endpoint]
            );

            if (existing) {
                // Check if still being processed (response is null)
                if (existing.response === null || existing.response === '{}') {
                    // M-1 FIX: Auto-release stale claims (>5 min old with no response)
                    const claimAge = Date.now() - new Date(existing.created_at).getTime();
                    if (claimAge > STALE_CLAIM_MINUTES * 60 * 1000) {
                        // Stale claim — delete it so the request can be retried
                        await db.run(`DELETE FROM idempotency_keys WHERE key = $1 AND org_id = $2 AND endpoint = $3`, [
                            key,
                            orgId,
                            endpoint,
                        ]);
                        await logMetric('idempotency_stale_claim_released', orgId, endpoint, {
                            key,
                            age_ms: claimAge,
                        });
                        // Fall through to claim the key again below
                    } else {
                        // Genuinely in progress — reject
                        return res.status(409).json({
                            error: 'IDEMPOTENCY_IN_PROGRESS',
                            message: 'Another request with this idempotency key is still being processed.',
                        });
                    }
                } else {
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
            }

            // 2. CLAIM the key atomically (INSERT ... ON CONFLICT DO NOTHING RETURNING)
            //    This eliminates the TOCTOU race: only ONE request can claim a key.
            //    Response is NULL initially — updated after business logic completes.
            const claimed = await db.get(
                `INSERT INTO idempotency_keys (key, org_id, endpoint, request_hash, response, status_code, expires_at)
                 VALUES ($1, $2, $3, $4, NULL, 0, NOW() + INTERVAL '${TTL_HOURS} hours')
                 ON CONFLICT (key, org_id, endpoint) DO NOTHING
                 RETURNING key`,
                [key, orgId, endpoint, requestHash]
            );

            if (!claimed) {
                // Another request claimed this key between our SELECT and INSERT
                return res.status(409).json({
                    error: 'IDEMPOTENCY_IN_PROGRESS',
                    message: 'Duplicate request detected. Please retry shortly.',
                });
            }

            // 3. Monkey-patch res.json to UPDATE the cached response after execution
            const originalJson = res.json.bind(res);
            res.json = async function (body) {
                try {
                    await db.run(
                        `UPDATE idempotency_keys SET response = $1, status_code = $2
                         WHERE key = $3 AND org_id = $4 AND endpoint = $5`,
                        [JSON.stringify(body), res.statusCode || 200, key, orgId, endpoint]
                    );
                } catch (e) {
                    logger.warn('[Idempotency] Failed to update cache:', e.message);
                    // M-1 FIX: Clean up the stale claim so retries aren't blocked
                    try {
                        await db.run(
                            `DELETE FROM idempotency_keys WHERE key = $1 AND org_id = $2 AND endpoint = $3 AND response IS NULL`,
                            [key, orgId, endpoint]
                        );
                    } catch (_) {
                        /* best-effort */
                    }
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

// M-1 FIX: Periodic cleanup of expired keys + stale claims (prevents table bloat)
// Run every 30 minutes
const _cleanupTimer = setInterval(
    async () => {
        try {
            await db.run(`DELETE FROM idempotency_keys WHERE expires_at < NOW()`);
            await db.run(
                `DELETE FROM idempotency_keys WHERE response IS NULL AND created_at < NOW() - INTERVAL '${STALE_CLAIM_MINUTES} minutes'`
            );
        } catch (e) {
            /* best-effort cleanup */
        }
    },
    30 * 60 * 1000
);
if (_cleanupTimer.unref) _cleanupTimer.unref();

module.exports = { idempotency };
