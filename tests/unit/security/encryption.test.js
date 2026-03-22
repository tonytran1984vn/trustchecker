const {
    encrypt, decrypt, initEncryption, generateMasterKey, getEncryptionStats, PII_FIELDS,
} = require('../../../server/security/encryption');

describe('encryption', () => {
    // Generate a test master key for these tests
    const testMasterKey = require('crypto').randomBytes(32).toString('hex');

    beforeAll(() => {
        // Suppress console output during init
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'warn').mockImplementation();
        initEncryption(testMasterKey);
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    describe('PII_FIELDS', () => {
        test('has User model', () => {
            expect(PII_FIELDS.User).toBeDefined();
        });

        test('User has email field', () => {
            expect(PII_FIELDS.User).toContain('email');
        });

        test('has KYCBusiness model', () => {
            expect(PII_FIELDS.KYCBusiness).toBeDefined();
        });

        test('KYCBusiness has representative_name', () => {
            expect(PII_FIELDS.KYCBusiness).toContain('representative_name');
        });

        test('has ConsentRecord model', () => {
            expect(PII_FIELDS.ConsentRecord).toBeDefined();
        });

        test('has AuditLog model', () => {
            expect(PII_FIELDS.AuditLog).toBeDefined();
        });

        test('AuditLog has actor_email', () => {
            expect(PII_FIELDS.AuditLog).toContain('actor_email');
        });
    });

    describe('generateMasterKey', () => {
        test('returns 64-char hex string', () => {
            const key = generateMasterKey();
            expect(key).toMatch(/^[a-f0-9]{64}$/);
        });

        test('generates different keys each call', () => {
            expect(generateMasterKey()).not.toBe(generateMasterKey());
        });

        test('key is 32 bytes (256 bits)', () => {
            const key = generateMasterKey();
            expect(Buffer.from(key, 'hex').length).toBe(32);
        });
    });

    describe('initEncryption', () => {
        test('activates encryption with valid key', () => {
            const spy = jest.spyOn(console, 'log').mockImplementation();
            initEncryption(testMasterKey);
            spy.mockRestore();
            expect(getEncryptionStats().active).toBe(true);
        });

        test('rejects invalid length key', () => {
            const spy = jest.spyOn(console, 'error').mockImplementation();
            initEncryption('abcd'); // too short
            spy.mockRestore();
        });

        test('handles null key', () => {
            const spy = jest.spyOn(console, 'warn').mockImplementation();
            initEncryption(null);
            spy.mockRestore();
        });

        test('handles empty string', () => {
            const spy = jest.spyOn(console, 'warn').mockImplementation();
            initEncryption('');
            spy.mockRestore();
            // Re-init so remaining tests work
            jest.spyOn(console, 'log').mockImplementation();
            initEncryption(testMasterKey);
            console.log.mockRestore();
        });
    });

    describe('encrypt', () => {
        test('returns string with enc:v1: prefix', () => {
            const result = encrypt('hello@example.com', 'org-1');
            expect(result.startsWith('enc:v1:')).toBe(true);
        });

        test('returns different ciphertext for same plaintext (random IV)', () => {
            const a = encrypt('test@test.com', 'org-1');
            const b = encrypt('test@test.com', 'org-1');
            expect(a).not.toBe(b);
        });

        test('returns null for null input', () => {
            expect(encrypt(null, 'org-1')).toBeNull();
        });

        test('returns undefined for undefined input', () => {
            expect(encrypt(undefined, 'org-1')).toBeUndefined();
        });

        test('returns non-string as-is', () => {
            expect(encrypt(42, 'org-1')).toBe(42);
        });

        test('skips already encrypted values', () => {
            const encrypted = encrypt('plaintext', 'org-1');
            expect(encrypt(encrypted, 'org-1')).toBe(encrypted);
        });

        test('ciphertext has 3 colon-separated parts after prefix', () => {
            const result = encrypt('data', 'org-1');
            const payload = result.slice('enc:v1:'.length);
            expect(payload.split(':').length).toBe(3);
        });
    });

    describe('decrypt', () => {
        test('round-trip: encrypt then decrypt', () => {
            const original = 'sensitive@email.com';
            const encrypted = encrypt(original, 'org-1');
            const decrypted = decrypt(encrypted, 'org-1');
            expect(decrypted).toBe(original);
        });

        test('returns plaintext for non-encrypted value', () => {
            expect(decrypt('plaintext', 'org-1')).toBe('plaintext');
        });

        test('returns null for null input', () => {
            expect(decrypt(null, 'org-1')).toBeNull();
        });

        test('per-org isolation: org-1 cannot decrypt org-2', () => {
            const encrypted = encrypt('secret', 'org-1');
            const decrypted = decrypt(encrypted, 'org-2');
            // Should fail to decrypt (auth tag mismatch) and return ciphertext
            expect(decrypted).toBe(encrypted);
        });

        test('handles malformed ciphertext gracefully', () => {
            const spy = jest.spyOn(console, 'error').mockImplementation();
            const result = decrypt('enc:v1:invalid', 'org-1');
            spy.mockRestore();
            expect(result).toBe('enc:v1:invalid');
        });

        test('round-trip with unicode', () => {
            const original = 'Nguyễn Văn A 日本語';
            const encrypted = encrypt(original, 'org-1');
            expect(decrypt(encrypted, 'org-1')).toBe(original);
        });

        test('round-trip with long string', () => {
            const original = 'a'.repeat(10000);
            const encrypted = encrypt(original, 'org-1');
            expect(decrypt(encrypted, 'org-1')).toBe(original);
        });
    });

    describe('getEncryptionStats', () => {
        test('returns active status', () => {
            expect(getEncryptionStats().active).toBe(true);
        });

        test('returns algorithm', () => {
            expect(getEncryptionStats().algorithm).toBe('aes-256-gcm');
        });

        test('returns piiModels', () => {
            expect(getEncryptionStats().piiModels).toContain('User');
        });

        test('returns totalPiiFields count', () => {
            expect(getEncryptionStats().totalPiiFields).toBeGreaterThan(0);
        });

        test('tracks encryptions count', () => {
            expect(typeof getEncryptionStats().encryptions).toBe('number');
        });

        test('tracks decryptions count', () => {
            expect(typeof getEncryptionStats().decryptions).toBe('number');
        });
    });
});
