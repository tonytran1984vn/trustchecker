/**
 * SOC2 SC-3: Password Policy Enforcement
 * - Minimum 12 characters
 * - At least 1 uppercase, 1 lowercase, 1 digit, 1 special char
 * - Not in common password list
 * - Password history check (last 5 passwords)
 */
const crypto = require('crypto');

const COMMON_PASSWORDS = new Set([
    'password123',
    'admin123456',
    'qwerty123456',
    'letmein12345',
    'trustchecker',
    'welcome12345',
    'changeme1234',
    '123456789012',
    'password123!!',
]);

function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, errors: ['Password must be a valid string'] };
    }
    const errors = [];
    if (password.length < 12) errors.push('Password must be at least 12 characters');
    if (!/[A-Z]/.test(password)) errors.push('Must contain at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Must contain at least one lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Must contain at least one digit');
    if (!/[!@#$%^&*()_+\-=\[\]{};:'",.<>?/|`~]/.test(password))
        errors.push('Must contain at least one special character');
    if (COMMON_PASSWORDS.has(password.toLowerCase())) errors.push('Password is too common');
    return { valid: errors.length === 0, errors };
}

function hashForHistory(password) {
    return crypto
        .createHash('sha256')
        .update(password + 'pwd-history-salt')
        .digest('hex');
}

module.exports = { validatePassword, hashForHistory };
