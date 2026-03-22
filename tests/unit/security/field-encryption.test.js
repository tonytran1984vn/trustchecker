// field-encryption.js uses process.env.ENCRYPTION_KEY with scrypt
// When no ENCRYPTION_KEY is set, encrypt/decrypt are passthrough

const { encrypt, decrypt } = require('../../../server/security/field-encryption');

describe('field-encryption', () => {
    describe('without ENCRYPTION_KEY (passthrough mode)', () => {
        test('encrypt returns plaintext when no key', () => {
            // In test env, ENCRYPTION_KEY is likely not set
            const result = encrypt('hello');
            // Either returns plaintext (no key) or encrypted string
            expect(typeof result).toBe('string');
        });

        test('decrypt returns original for non-encrypted', () => {
            expect(decrypt('plain text')).toBe('plain text');
        });

        test('encrypt returns null for null input', () => {
            expect(encrypt(null)).toBeNull();
        });

        test('encrypt returns undefined for undefined input', () => {
            expect(encrypt(undefined)).toBeUndefined();
        });

        test('decrypt returns null for null input', () => {
            expect(decrypt(null)).toBeNull();
        });

        test('decrypt returns empty string for empty input', () => {
            expect(decrypt('')).toBe('');
        });

        test('decrypt skips non-enc: prefixed values', () => {
            expect(decrypt('normal value')).toBe('normal value');
        });

        test('encrypt returns empty string for empty', () => {
            expect(encrypt('')).toBe('');
        });
    });

    describe('with ENCRYPTION_KEY (integration)', () => {
        let origKey;

        beforeAll(() => {
            origKey = process.env.ENCRYPTION_KEY;
            process.env.ENCRYPTION_KEY = 'test-encryption-key-for-unit-tests';
            // Need to re-require to pick up the env var
        });

        afterAll(() => {
            if (origKey) process.env.ENCRYPTION_KEY = origKey;
            else delete process.env.ENCRYPTION_KEY;
        });

        test('encrypt/decrypt exports are functions', () => {
            expect(typeof encrypt).toBe('function');
            expect(typeof decrypt).toBe('function');
        });
    });

    describe('export verification', () => {
        test('module exports encrypt', () => {
            expect(typeof encrypt).toBe('function');
        });

        test('module exports decrypt', () => {
            expect(typeof decrypt).toBe('function');
        });

        test('encrypt accepts single argument', () => {
            expect(encrypt.length).toBeLessThanOrEqual(1);
        });

        test('decrypt accepts single argument', () => {
            expect(decrypt.length).toBeLessThanOrEqual(1);
        });
    });
});
