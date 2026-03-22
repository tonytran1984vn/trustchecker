// Expanded middleware tests 
const { validatePassword } = require('../../../server/security/password-policy');

describe('password-policy validatePassword', () => {
    test('rejects short password', () => {
        const r = validatePassword('Short1!');
        expect(r.valid).toBe(false);
    });

    test('accepts strong password', () => {
        const r = validatePassword('StrongP@ssw0rd123!');
        expect(r.valid).toBe(true);
    });

    test('rejects password without uppercase', () => {
        const r = validatePassword('alllowercase123!');
        expect(r.valid).toBe(false);
    });

    test('rejects password without lowercase', () => {
        const r = validatePassword('ALLUPPERCASE123!');
        expect(r.valid).toBe(false);
    });

    test('rejects password without number', () => {
        const r = validatePassword('NoNumbersHere!!');
        expect(r.valid).toBe(false);
    });

    test('rejects password without special char', () => {
        const r = validatePassword('NoSpecial123abc');
        expect(r.valid).toBe(false);
    });

    test('returns errors array', () => {
        const r = validatePassword('weak');
        expect(Array.isArray(r.errors)).toBe(true);
    });

    test('errors is empty for valid password', () => {
        const r = validatePassword('StrongP@ssw0rd123!');
        expect(r.errors).toHaveLength(0);
    });

    test('rejects common passwords', () => {
        const r = validatePassword('Password123!!');
        expect(r.valid).toBe(false);
    });

    test('accepts 16 char complex password', () => {
        const r = validatePassword('C0mpl3x!P@ssW0rd');
        expect(r.valid).toBe(true);
    });

    test('rejects empty password', () => {
        const r = validatePassword('');
        expect(r.valid).toBe(false);
    });

    test('rejects null password', () => {
        const r = validatePassword(null);
        expect(r.valid).toBe(false);
    });

    test('rejects undefined password', () => {
        const r = validatePassword(undefined);
        expect(r.valid).toBe(false);
    });
});
