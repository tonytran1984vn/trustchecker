/**
 * SOC2 SC-1: Field-Level Encryption at Rest
 * Encrypts sensitive fields (mfa_secret, API keys, webhook secrets)
 * using AES-256-GCM with the ENCRYPTION_KEY from .env
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const KEY = process.env.ENCRYPTION_KEY
    ? crypto.scryptSync(process.env.ENCRYPTION_KEY, 'trustchecker-salt-v1', 32)
    : null;

function encrypt(plaintext) {
    if (!KEY || !plaintext) return plaintext;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return `enc:${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decrypt(ciphertext) {
    if (!KEY || !ciphertext || !ciphertext.startsWith('enc:')) return ciphertext;
    const [, ivHex, tagHex, encrypted] = ciphertext.split(':');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = { encrypt, decrypt };
