/**
 * MFA Guard v9.4.3
 * Requires TOTP verification for sensitive platform admin actions.
 *
 * Usage:
 *   router.post('/dangerous-action', mfaGuard(), handler);
 *
 * The client must include x-mfa-token header with a valid TOTP code.
 * MFA secrets are stored in users.mfa_secret (encrypted).
 */
const crypto = require('crypto');

// Simple TOTP implementation (RFC 6238)
function generateTOTP(secret, window = 0) {
    const time = Math.floor(Date.now() / 30000) + window;
    const buf = Buffer.alloc(8);
    buf.writeBigInt64BE(BigInt(time));
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'base32hex')).update(buf).digest();
    const offset = hmac[hmac.length - 1] & 0xf;
    const code = ((hmac[offset] & 0x7f) << 24 | hmac[offset + 1] << 16 | hmac[offset + 2] << 8 | hmac[offset + 3]) % 1000000;
    return code.toString().padStart(6, '0');
}

function verifyTOTP(secret, token) {
    // Check current window and ±1 for clock drift
    for (let w = -1; w <= 1; w++) {
        if (generateTOTP(secret, w) === token) return true;
    }
    return false;
}

function mfaGuard() {
    return async (req, res, next) => {
        // Only enforce for platform admins and sensitive actions
        const isPlatform = req.user?.user_type === 'platform' || req.user?.role === 'super_admin';
        if (!isPlatform) return next(); // Regular users don't need MFA for now

        const mfaToken = req.headers['x-mfa-token'];
        const mfaSecret = req.user?.mfa_secret;

        // If user hasn't set up MFA yet, warn but allow (grace period)
        if (!mfaSecret) {
            // Log the access without MFA
            console.warn(`⚠️ Platform admin ${req.user.email} accessed ${req.path} without MFA setup`);
            return next();
        }

        if (!mfaToken) {
            return res.status(403).json({
                error: 'MFA verification required',
                code: 'MFA_REQUIRED',
                message: 'Please provide x-mfa-token header with your TOTP code'
            });
        }

        if (!verifyTOTP(mfaSecret, mfaToken)) {
            return res.status(403).json({
                error: 'Invalid MFA code',
                code: 'MFA_INVALID'
            });
        }

        next();
    };
}

// Generate new MFA secret for enrollment
function generateMFASecret() {
    const bytes = crypto.randomBytes(20);
    return bytes.toString('base32hex').toUpperCase().replace(/=/g, '');
}

module.exports = { mfaGuard, verifyTOTP, generateMFASecret };
