/**
 * TrustChecker v9.5 — Application-Level Encryption at Rest
 * ═══════════════════════════════════════════════════════════════════
 * AES-256-GCM field-level encryption for PII fields.
 * Per-org key derivation from master key.
 * 
 * Features:
 *   - AES-256-GCM authenticated encryption
 *   - HKDF key derivation (master key + org salt)
 *   - Per-org isolation — orgs can't read each other's data
 *   - Prisma middleware for automatic encrypt-on-write / decrypt-on-read
 *   - Key rotation support with re-encryption job
 *   - Master key loaded from secrets vault (not env vars)
 * 
 * PII Fields:
 *   User.email, KYCBusiness.representative_name,
 *   ConsentRecord.data_subject_email
 */

const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;           // 256 bits
const IV_LENGTH = 12;            // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;      // 128 bits
const HKDF_HASH = 'sha256';
const ENCRYPTED_PREFIX = 'enc:v1:'; // Versioned prefix for encrypted values

// Fields to auto-encrypt per model
const PII_FIELDS = {
    User: ['email'],
    KYCBusiness: ['representative_name', 'representative_email'],
    ConsentRecord: ['data_subject_email', 'data_subject_name'],
    AuditLog: ['actor_email'],
};

let _masterKey = null;
let _stats = { encryptions: 0, decryptions: 0, errors: 0 };

// ── Derived key cache (orgId → Buffer) — avoids re-deriving on every call
const _keyCache = new Map();
const KEY_CACHE_MAX = 500;

function _getCachedKey(masterKey, orgId) {
    const cacheKey = `${masterKey.toString('hex').slice(0, 8)}:${orgId || 'default'}`;
    if (_keyCache.has(cacheKey)) return _keyCache.get(cacheKey);
    const derived = deriveKey(masterKey, orgId);
    if (_keyCache.size >= KEY_CACHE_MAX) {
        // Evict oldest entry
        const first = _keyCache.keys().next().value;
        _keyCache.delete(first);
    }
    _keyCache.set(cacheKey, derived);
    return derived;
}

// ═══════════════════════════════════════════════════════════════════
// KEY DERIVATION (HKDF)
// ═══════════════════════════════════════════════════════════════════

/**
 * Derive a per-org key using HKDF.
 * @param {Buffer} masterKey — 32-byte master key
 * @param {string} orgId — org identifier (used as salt)
 * @returns {Buffer} 32-byte derived key
 */
function deriveKey(masterKey, orgId) {
    const salt = crypto.createHash('sha256').update(orgId || 'default').digest();
    const info = Buffer.from(`trustchecker-pii-${orgId || 'default'}`, 'utf8');
    return crypto.hkdfSync(HKDF_HASH, masterKey, salt, info, KEY_LENGTH);
}

// ═══════════════════════════════════════════════════════════════════
// ENCRYPT / DECRYPT
// ═══════════════════════════════════════════════════════════════════

/**
 * Encrypt a plaintext string.
 * @param {string} plaintext — value to encrypt
 * @param {string} orgId — org identifier
 * @returns {string} encrypted string: "enc:v1:<iv>:<authTag>:<ciphertext>" (all base64)
 */
function encrypt(plaintext, orgId = 'default') {
    if (!_masterKey) {
        console.warn('[Encryption] Master key not loaded — storing plaintext');
        return plaintext;
    }

    if (!plaintext || typeof plaintext !== 'string') return plaintext;

    // Already encrypted — skip
    if (plaintext.startsWith(ENCRYPTED_PREFIX)) return plaintext;

    try {
        const key = _getCachedKey(_masterKey, orgId);
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv, { authTagLength: AUTH_TAG_LENGTH });

        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const authTag = cipher.getAuthTag();

        _stats.encryptions++;

        return `${ENCRYPTED_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    } catch (err) {
        _stats.errors++;
        console.error('[Encryption] ⚠️ ENCRYPT FAILED — PII stored as plaintext:', {
            error: err.message,
            orgId,
            errorCount: _stats.errors,
            totalEncryptions: _stats.encryptions,
        });
        if (_stats.errors > 10) {
            console.error('[Encryption] 🚨 ALERT: >10 encryption failures — check ENCRYPTION_KEY and key derivation');
        }
        return plaintext; // Fail open — don't lose data
    }
}

/**
 * Decrypt an encrypted string.
 * @param {string} ciphertext — encrypted value (with enc:v1: prefix)
 * @param {string} orgId — org identifier
 * @returns {string} decrypted plaintext
 */
function decrypt(ciphertext, orgId = 'default') {
    if (!_masterKey) return ciphertext;
    if (!ciphertext || typeof ciphertext !== 'string') return ciphertext;

    // Not encrypted — return as-is
    if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) return ciphertext;

    try {
        const payload = ciphertext.slice(ENCRYPTED_PREFIX.length);
        const parts = payload.split(':');
        if (parts.length !== 3) {
            throw new Error('Malformed ciphertext: expected 3 parts (iv:authTag:data)');
        }
        const [ivB64, authTagB64, encryptedB64] = parts;
        if (!ivB64 || !authTagB64 || !encryptedB64) {
            throw new Error('Malformed ciphertext: empty component');
        }

        const key = _getCachedKey(_masterKey, orgId);
        const iv = Buffer.from(ivB64, 'base64');
        const authTag = Buffer.from(authTagB64, 'base64');
        const encrypted = Buffer.from(encryptedB64, 'base64');

        // Validate decoded lengths
        if (iv.length !== IV_LENGTH) throw new Error(`Invalid IV length: ${iv.length}`);
        if (authTag.length !== AUTH_TAG_LENGTH) throw new Error(`Invalid auth tag length: ${authTag.length}`);

        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv, { authTagLength: AUTH_TAG_LENGTH });
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, null, 'utf8');
        decrypted += decipher.final('utf8');

        _stats.decryptions++;
        return decrypted;
    } catch (err) {
        _stats.errors++;
        console.error('[Encryption] Decrypt failed:', err.message);
        return ciphertext; // Return encrypted value rather than crash
    }
}

// ═══════════════════════════════════════════════════════════════════
// PRISMA MIDDLEWARE
// ═══════════════════════════════════════════════════════════════════

/**
 * Prisma middleware for automatic field-level encryption.
 * 
 * On create/update: encrypts PII fields before write.
 * On findMany/findFirst/findUnique: decrypts PII fields after read.
 * 
 * Usage:
 *   prisma.$use(encryptionMiddleware);
 */
async function encryptionMiddleware(params, next) {
    const model = params.model;
    const fields = PII_FIELDS[model];

    if (!fields || !_masterKey) {
        return next(params);
    }

    // Get org ID from where clause or data
    const orgId = params.args?.data?.organizationId
        || params.args?.where?.organizationId
        || 'default';

    // ─── Encrypt on write ────────────────────────────────────
    if (['create', 'update', 'upsert', 'createMany'].includes(params.action)) {
        const data = params.args.data;
        if (data) {
            if (Array.isArray(data)) {
                // createMany
                data.forEach(item => encryptFields(item, fields, orgId));
            } else {
                encryptFields(data, fields, orgId);
                // Handle upsert
                if (params.args.create) encryptFields(params.args.create, fields, orgId);
                if (params.args.update) encryptFields(params.args.update, fields, orgId);
            }
        }
    }

    // Execute the query
    const result = await next(params);

    // ─── Decrypt on read (and after write — Prisma returns the record) ─
    if (['findUnique', 'findFirst', 'findMany', 'create', 'update', 'upsert'].includes(params.action)) {
        if (Array.isArray(result)) {
            result.forEach(item => decryptFields(item, fields, orgId));
        } else if (result) {
            decryptFields(result, fields, orgId);
        }
    }
    return result;
}

function encryptFields(obj, fields, orgId) {
    if (!obj) return;
    for (const field of fields) {
        if (obj[field] && typeof obj[field] === 'string') {
            obj[field] = encrypt(obj[field], orgId);
        }
    }
}

function decryptFields(obj, fields, orgId) {
    if (!obj) return;
    for (const field of fields) {
        if (obj[field] && typeof obj[field] === 'string') {
            obj[field] = decrypt(obj[field], orgId);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════
// KEY ROTATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Re-encrypt all PII fields with a new master key.
 * Call this during a key rotation event.
 * 
 * @param {Object} prisma — Prisma client instance
 * @param {Buffer} oldKey — previous master key
 * @param {Buffer} newKey — new master key
 * @returns {Object} { reencrypted, errors }
 */
async function rotateKey(prisma, oldKey, newKey) {
    const results = { reencrypted: 0, errors: 0 };

    // Use LOCAL key references — never mutate _masterKey during rotation.
    // This prevents race conditions if concurrent requests arrive during rotation.
    const decryptWithOldKey = (value, orgId) => {
        const key = deriveKey(oldKey, orgId);
        const payload = value.slice(ENCRYPTED_PREFIX.length);
        const parts = payload.split(':');
        if (parts.length !== 3) return value;
        const [ivB64, authTagB64, encryptedB64] = parts;
        const iv = Buffer.from(ivB64, 'base64');
        const authTag = Buffer.from(authTagB64, 'base64');
        const encrypted = Buffer.from(encryptedB64, 'base64');
        const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key), iv, { authTagLength: AUTH_TAG_LENGTH });
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, null, 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    };

    const encryptWithNewKey = (plaintext, orgId) => {
        const key = deriveKey(newKey, orgId);
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key), iv, { authTagLength: AUTH_TAG_LENGTH });
        let enc = cipher.update(plaintext, 'utf8', 'base64');
        enc += cipher.final('base64');
        const authTag = cipher.getAuthTag();
        return `${ENCRYPTED_PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${enc}`;
    };

    for (const [model, fields] of Object.entries(PII_FIELDS)) {
        try {
            const records = await prisma[model.charAt(0).toLowerCase() + model.slice(1)].findMany();

            for (const record of records) {
                let changed = false;
                const orgId = record.organizationId || 'default';

                for (const field of fields) {
                    if (record[field] && record[field].startsWith(ENCRYPTED_PREFIX)) {
                        try {
                            const plaintext = decryptWithOldKey(record[field], orgId);
                            record[field] = encryptWithNewKey(plaintext, orgId);
                            changed = true;
                        } catch (err) {
                            console.error(`[Encryption] Field rotation error ${model}.${field}:`, err.message);
                            results.errors++;
                        }
                    }
                }

                if (changed) {
                    const updateData = {};
                    fields.forEach(f => { if (record[f]) updateData[f] = record[f]; });

                    await prisma[model.charAt(0).toLowerCase() + model.slice(1)].update({
                        where: { id: record.id },
                        data: updateData,
                    });
                    results.reencrypted++;
                }
            }
        } catch (err) {
            console.error(`[Encryption] Key rotation error for ${model}:`, err.message);
            results.errors++;
        }
    }

    // Only swap global key AFTER all re-encryption is complete
    _masterKey = newKey;
    _keyCache.clear(); // Invalidate derived key cache
    console.log(`[Encryption] Key rotation complete: ${results.reencrypted} records re-encrypted, ${results.errors} errors`);
    return results;
}

// ═══════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════

/**
 * Initialize encryption with master key.
 * Key should come from secrets vault, not env vars directly.
 * 
 * @param {string} masterKeyHex — 64-char hex string (256 bits)
 */
function initEncryption(masterKeyHex) {
    if (!masterKeyHex) {
        console.warn('[Encryption] No master key provided — PII fields will NOT be encrypted');
        return;
    }

    try {
        _masterKey = Buffer.from(masterKeyHex, 'hex');
        if (_masterKey.length !== KEY_LENGTH) {
            throw new Error(`Master key must be ${KEY_LENGTH} bytes (${KEY_LENGTH * 2} hex chars), got ${_masterKey.length}`);
        }
        console.log('[Encryption] ✅ AES-256-GCM encryption initialized for PII fields');
    } catch (err) {
        console.error('[Encryption] Init failed:', err.message);
        _masterKey = null;
    }
}

/**
 * Generate a new random master key (for initial setup).
 * @returns {string} 64-char hex string
 */
function generateMasterKey() {
    return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

// ═══════════════════════════════════════════════════════════════════
// STATUS & STATS
// ═══════════════════════════════════════════════════════════════════

function getEncryptionStats() {
    return {
        active: !!_masterKey,
        algorithm: ALGORITHM,
        piiModels: Object.keys(PII_FIELDS),
        totalPiiFields: Object.values(PII_FIELDS).reduce((sum, f) => sum + f.length, 0),
        ..._stats,
    };
}

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

module.exports = {
    encrypt,
    decrypt,
    initEncryption,
    encryptionMiddleware,
    rotateKey,
    generateMasterKey,
    getEncryptionStats,
    PII_FIELDS,
};
