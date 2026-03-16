/**
 * SOC2 SC-6: Token Rotation Policy
 * - Access token: 1h (already set)
 * - Refresh token: 7 days, single-use (rotate on each refresh)
 * - Token binding: tie to IP + User-Agent fingerprint
 */
const crypto = require('crypto');

function generateFingerprint(req) {
    const data = (req.ip || '') + (req.headers['user-agent'] || '');
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
}

function validateFingerprint(req, storedFingerprint) {
    if (!storedFingerprint) return true; // Legacy tokens without fingerprint
    return generateFingerprint(req) === storedFingerprint;
}

module.exports = { generateFingerprint, validateFingerprint };
