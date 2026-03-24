const { validatePassword, hashForHistory } = require('../../../server/security/password-policy');

describe('password-policy', () => {
    describe('validatePassword', () => {
        test('valid password passes', () => {
            expect(validatePassword('MyStr0ng!Pass').valid).toBe(true);
        });

        test('returns false on null input', () => {
            const result = validatePassword(null);
            expect(result.valid).toBe(false);
        });

        test('returns false on undefined input', () => {
            const result = validatePassword(undefined);
            expect(result.valid).toBe(false);
        });

        test('rejects empty string', () => {
            expect(validatePassword('').valid).toBe(false);
        });

        test('rejects short password (< 12)', () => {
            const r = validatePassword('Aa1!short');
            expect(r.valid).toBe(false);
            expect(r.errors).toContain('Password must be at least 12 characters');
        });

        test('rejects no uppercase', () => {
            const r = validatePassword('mylongpass1!test');
            expect(r.valid).toBe(false);
            expect(r.errors).toEqual(expect.arrayContaining([expect.stringContaining('uppercase')]));
        });

        test('rejects no lowercase', () => {
            const r = validatePassword('MYLONGPASS1!TEST');
            expect(r.valid).toBe(false);
            expect(r.errors).toEqual(expect.arrayContaining([expect.stringContaining('lowercase')]));
        });

        test('rejects no digit', () => {
            const r = validatePassword('MyLongPass!Test');
            expect(r.valid).toBe(false);
            expect(r.errors).toEqual(expect.arrayContaining([expect.stringContaining('digit')]));
        });

        test('rejects no special character', () => {
            const r = validatePassword('MyLongPass1Test');
            expect(r.valid).toBe(false);
            expect(r.errors).toEqual(expect.arrayContaining([expect.stringContaining('special')]));
        });

        test('rejects common password: password123', () => {
            const r = validatePassword('password123');
            expect(r.valid).toBe(false);
            expect(r.errors).toEqual(expect.arrayContaining([expect.stringContaining('common')]));
        });

        test('rejects common password: trustchecker', () => {
            const r = validatePassword('trustchecker');
            expect(r.valid).toBe(false);
        });

        test('returns errors array', () => {
            const r = validatePassword('short');
            expect(Array.isArray(r.errors)).toBe(true);
            expect(r.errors.length).toBeGreaterThan(0);
        });

        test('returns empty errors for valid password', () => {
            expect(validatePassword('MyStr0ng!Pass').errors).toEqual([]);
        });

        test('accumulates multiple errors', () => {
            const r = validatePassword('abc'); // short, no upper, no digit, no special
            expect(r.errors.length).toBeGreaterThan(2);
        });

        test('accepts password with special chars @#$%', () => {
            expect(validatePassword('MyStr0ng@Pass').valid).toBe(true);
        });

        test('accepts password with special chars []{}', () => {
            expect(validatePassword('MyStr0ng[Pass]').valid).toBe(true);
        });

        test('case-insensitive common password check', () => {
            const r = validatePassword('Password123');
            expect(r.errors).toEqual(expect.arrayContaining([expect.stringContaining('common')]));
        });

        test('exactly 12 characters passes', () => {
            expect(validatePassword('Aa1!bcdefghi').valid).toBe(true);
        });
    });

    describe('hashForHistory', () => {
        test('returns hex hash', () => {
            expect(hashForHistory('password')).toMatch(/^[a-f0-9]{64}$/);
        });

        test('same input produces same hash', () => {
            expect(hashForHistory('same')).toBe(hashForHistory('same'));
        });

        test('different input produces different hash', () => {
            expect(hashForHistory('a')).not.toBe(hashForHistory('b'));
        });

        test('includes salt in hash', () => {
            // Hash with our function should differ from plain SHA-256
            const crypto = require('crypto');
            const plain = crypto.createHash('sha256').update('test').digest('hex');
            expect(hashForHistory('test')).not.toBe(plain);
        });
    });
});
