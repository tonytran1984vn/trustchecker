/**
 * License Management Routes — On-Prem / Self-Hosted
 *
 * Offline license validation with hardware fingerprint binding.
 * Supports Enterprise on-premise deployments with:
 *   - Ed25519-signed license keys (offline verification)
 *   - Hardware fingerprint binding (CPU, hostname, MAC)
 *   - Feature unlock based on license tier
 *   - Expiration + 30-day grace period
 *
 * License Format:
 *   base64({ payload: {...}, signature: "hex" })
 *   Signature = Ed25519.sign(JSON.stringify(payload), privateKey)
 *
 * Endpoints:
 *   POST /api/license/activate   — Activate license key
 *   GET  /api/license/status     — Current license status
 *   POST /api/license/deactivate — Deactivate (for transfer)
 *   GET  /api/license/fingerprint — Get hardware fingerprint
 *   GET  /api/license/public-key  — Get public key for license generation
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');
const { authMiddleware, requirePlatformAdmin } = require('../auth');
const logger = require('../lib/logger');

// All management routes require platform admin authentication
router.use('/activate', authMiddleware, requirePlatformAdmin());
router.use('/deactivate', authMiddleware, requirePlatformAdmin());
router.use('/generate', authMiddleware, requirePlatformAdmin());
router.use('/status', authMiddleware);

// ─── Ed25519 Key Management ─────────────────────────────────────────────────
// In production, the public key is bundled with the app.
// The private key is kept only by the license server (never shipped to customers).

let PUBLIC_KEY = null;
let PRIVATE_KEY = null; // Only available on license generation server (dev/internal)

async function loadKeys() {
    // Try loading from file first
    const keyDir = path.join(__dirname, '..', '..', 'certs');
    const fsp = require('fs').promises;
    const { withTransaction } = require('../middleware/transaction');

    try {
        const pubKeyPath = process.env.LICENSE_PUBLIC_KEY_PATH || path.join(keyDir, 'license-public.pem');
        await fsp.access(pubKeyPath);
        PUBLIC_KEY = crypto.createPublicKey(await fsp.readFile(pubKeyPath));
    } catch (_) {
        /* key not found — will auto-generate for dev */
    }

    try {
        const privKeyPath = process.env.LICENSE_PRIVATE_KEY_PATH || path.join(keyDir, 'license-private.pem');
        await fsp.access(privKeyPath);
        PRIVATE_KEY = crypto.createPrivateKey(await fsp.readFile(privKeyPath));
    } catch (_) {
        /* private key not available — that's fine for customer deployments */
    }

    // Auto-generate keypair for development/testing
    if (!PUBLIC_KEY && process.env.NODE_ENV !== 'production') {
        logger.info('🔑 [license] Generating ephemeral Ed25519 keypair for development...');
        const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
        PUBLIC_KEY = publicKey;
        PRIVATE_KEY = privateKey;
    }
}

loadKeys().catch(err => logger.error('[license] Key loading failed:', err.message));

// ─── Hardware Fingerprint ────────────────────────────────────────────────────
function getHardwareFingerprint() {
    const data = [
        os.hostname(),
        os.cpus()[0]?.model || 'unknown-cpu',
        os.arch(),
        os.platform(),
        // MAC address of first non-internal interface
        ...Object.values(os.networkInterfaces())
            .flat()
            .filter(i => !i.internal && i.mac !== '00:00:00:00:00:00')
            .map(i => i.mac)
            .slice(0, 2),
    ].join('|');

    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

// ─── License Validation (with signature verification) ────────────────────────
function validateLicense(licenseKey) {
    try {
        // License format: base64-encoded JSON { payload, signature }
        const decoded = Buffer.from(licenseKey, 'base64').toString('utf-8');
        const envelope = JSON.parse(decoded);

        // ── Signature Verification ──────────────────────────────────────
        if (!envelope.payload || !envelope.signature) {
            // Legacy format (unsigned) — reject in production
            if (process.env.NODE_ENV === 'production') {
                return { valid: false, error: 'Unsigned license rejected in production mode' };
            }
            // Dev mode: allow unsigned for testing with deprecation warning
            logger.warn('⚠️  [license] Unsigned license accepted — development mode only');
            return validatePayload(envelope);
        }

        // Verify Ed25519 signature
        if (!PUBLIC_KEY) {
            return { valid: false, error: 'No public key configured — cannot verify license signature' };
        }

        const payloadStr = JSON.stringify(envelope.payload);
        const signatureBuffer = Buffer.from(envelope.signature, 'hex');

        const isValid = crypto.verify(
            null, // Ed25519 doesn't use a hash algorithm parameter
            Buffer.from(payloadStr),
            PUBLIC_KEY,
            signatureBuffer
        );

        if (!isValid) {
            return { valid: false, error: 'Invalid license signature — license may be tampered' };
        }

        return validatePayload(envelope.payload);
    } catch (err) {
        return { valid: false, error: 'Invalid license format' };
    }
}

function validatePayload(license) {
    // Required fields
    const required = ['org', 'plan', 'features', 'expires', 'fingerprint', 'issued'];
    for (const field of required) {
        if (!license[field]) {
            return { valid: false, error: `Missing field: ${field}` };
        }
    }

    // Check expiration
    const expiresAt = new Date(license.expires);
    const now = new Date();
    const gracePeriod = 30 * 24 * 60 * 60 * 1000; // 30 days

    if (now > new Date(expiresAt.getTime() + gracePeriod)) {
        return { valid: false, error: 'License expired (past grace period)', license };
    }

    const expired = now > expiresAt;
    const inGrace = expired && now <= new Date(expiresAt.getTime() + gracePeriod);

    // Check fingerprint
    const currentFP = getHardwareFingerprint();
    if (license.fingerprint !== '*' && license.fingerprint !== currentFP) {
        return {
            valid: false,
            error: 'Hardware fingerprint mismatch — license bound to different machine',
            expected: license.fingerprint,
            current: currentFP,
        };
    }

    return {
        valid: true,
        signed: !!license._signed,
        expired,
        in_grace_period: inGrace,
        days_remaining: expired ? 0 : Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000)),
        license: {
            org: license.org,
            plan: license.plan,
            features: license.features,
            expires: license.expires,
            issued: license.issued,
            max_users: license.max_users || 'unlimited',
        },
    };
}

// In-memory license state
let currentLicense = null;

// ─── Activate License ────────────────────────────────────────────────────────
router.post('/activate', authMiddleware, requirePlatformAdmin(), async (req, res) => {
    try {
        const { license_key } = req.body;
        if (!license_key) {
            return res.status(400).json({ error: 'license_key is required' });
        }

        const result = validateLicense(license_key);
        if (!result.valid) {
            return res.status(400).json({
                error: 'Invalid license',
                details: result.error,
            });
        }

        // Store license
        currentLicense = {
            key: license_key,
            ...result,
            activated_at: new Date().toISOString(),
            hardware_fingerprint: getHardwareFingerprint(),
        };

        // Persist to DB
        const db = req.app.locals.db;
        if (db) {
            await db.run(
                `INSERT INTO system_settings (key, value, updated_at)
                 VALUES ('license', ?, NOW())
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = NOW()`,
                [JSON.stringify(currentLicense)]
            );
        }

        const status = result.in_grace_period ? 'active (grace period)' : 'active';
        logger.info(`✅ License activated: ${result.license.org} — ${result.license.plan} — ${status}`);

        res.json({
            status,
            ...result.license,
            days_remaining: result.days_remaining,
            signed: result.signed || false,
            hardware_fingerprint: getHardwareFingerprint(),
        });
    } catch (err) {
        logger.error('[license] Activation error:', err.message);
        res.status(500).json({ error: 'License activation failed' });
    }
});

// ─── License Status ──────────────────────────────────────────────────────────
router.get('/status', authMiddleware, (req, res) => {
    if (!currentLicense) {
        return res.json({
            status: 'unlicensed',
            mode: 'community',
            message: 'Running in community mode — activate a license for Enterprise features',
            hardware_fingerprint: getHardwareFingerprint(),
        });
    }

    // Re-validate to check expiration
    const recheck = validateLicense(currentLicense.key);
    const status = !recheck.valid ? 'expired' : recheck.in_grace_period ? 'grace_period' : 'active';

    res.json({
        status,
        ...recheck.license,
        days_remaining: recheck.days_remaining,
        signed: recheck.signed || false,
        activated_at: currentLicense.activated_at,
        hardware_fingerprint: getHardwareFingerprint(),
    });
});

// ─── Deactivate License ──────────────────────────────────────────────────────
router.post('/deactivate', authMiddleware, requirePlatformAdmin(), async (req, res) => {
    try {
        if (!currentLicense) {
            return res.status(400).json({ error: 'No active license' });
        }

        const db = req.app.locals.db;
        if (db) {
            await db.run("DELETE FROM system_settings WHERE key = 'license'");
        }

        const orgName = currentLicense.license?.org || 'unknown';
        currentLicense = null;

        logger.info(`🔓 License deactivated: ${orgName}`);
        res.json({ message: 'License deactivated — reverted to community mode' });
    } catch (err) {
        logger.error('[license] Deactivation error:', err.message);
        res.status(500).json({ error: 'License deactivation failed' });
    }
});

// ─── Hardware Fingerprint ────────────────────────────────────────────────────
router.get('/fingerprint', (req, res) => {
    res.json({
        fingerprint: getHardwareFingerprint(),
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        cpus: os.cpus().length,
        message: 'Provide this fingerprint when requesting an on-premise license key',
    });
});

// ─── Generate License (internal/dev only) ────────────────────────────────────
// This endpoint is only available when PRIVATE_KEY is loaded (dev/license-server)
router.post('/generate', authMiddleware, requirePlatformAdmin(), async (req, res) => {
    if (!PRIVATE_KEY) {
        return res.status(403).json({
            error: 'License generation not available on this deployment',
            hint: 'Private key is only available on the license generation server',
        });
    }

    try {
        const {
            org,
            plan = 'enterprise',
            features = ['*'],
            expires_days = 365,
            max_users = 'unlimited',
            fingerprint = '*',
        } = req.body;

        if (!org) return res.status(400).json({ error: 'org is required' });

        const payload = {
            org,
            plan,
            features,
            expires: new Date(Date.now() + expires_days * 86400000).toISOString(),
            issued: new Date().toISOString(),
            fingerprint,
            max_users,
            _signed: true,
        };

        // Sign with Ed25519
        const payloadStr = JSON.stringify(payload);
        const signature = crypto.sign(null, Buffer.from(payloadStr), PRIVATE_KEY);

        const envelope = {
            payload,
            signature: signature.toString('hex'),
        };

        const licenseKey = Buffer.from(JSON.stringify(envelope)).toString('base64');

        logger.info(`🔐 License generated: ${org} — ${plan} — ${expires_days} days`);

        res.json({
            license_key: licenseKey,
            payload,
            expires_days,
            note: 'Provide this license_key to the customer for activation',
        });
    } catch (err) {
        logger.error('[license] Generation error:', err.message);
        res.status(500).json({ error: 'License generation failed' });
    }
});

// ─── Public Key (for verification) ───────────────────────────────────────────
router.get('/public-key', (req, res) => {
    if (!PUBLIC_KEY) {
        return res.status(404).json({ error: 'No public key configured' });
    }

    res.json({
        public_key: PUBLIC_KEY.export({ type: 'spki', format: 'pem' }),
        algorithm: 'Ed25519',
        message: 'Use this public key to verify license signatures offline',
    });
});

module.exports = router;
