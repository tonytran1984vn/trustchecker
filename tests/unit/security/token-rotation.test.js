const { generateFingerprint, validateFingerprint } = require('../../../server/security/token-rotation');

describe('token-rotation', () => {
    describe('generateFingerprint', () => {
        test('returns hex string', () => {
            const fp = generateFingerprint({ ip: '1.1.1.1', headers: { 'user-agent': 'Chrome' } });
            expect(fp).toMatch(/^[a-f0-9]{16}$/);
        });

        test('returns 16 chars', () => {
            const fp = generateFingerprint({ ip: '::1', headers: {} });
            expect(fp.length).toBe(16);
        });

        test('same input produces same fingerprint', () => {
            const req = { ip: '1.1.1.1', headers: { 'user-agent': 'Firefox' } };
            expect(generateFingerprint(req)).toBe(generateFingerprint(req));
        });

        test('different IP produces different fingerprint', () => {
            const fp1 = generateFingerprint({ ip: '1.1.1.1', headers: { 'user-agent': 'X' } });
            const fp2 = generateFingerprint({ ip: '2.2.2.2', headers: { 'user-agent': 'X' } });
            expect(fp1).not.toBe(fp2);
        });

        test('different user-agent produces different fingerprint', () => {
            const fp1 = generateFingerprint({ ip: '1.1.1.1', headers: { 'user-agent': 'Chrome' } });
            const fp2 = generateFingerprint({ ip: '1.1.1.1', headers: { 'user-agent': 'Firefox' } });
            expect(fp1).not.toBe(fp2);
        });

        test('handles missing ip', () => {
            const fp = generateFingerprint({ headers: { 'user-agent': 'X' } });
            expect(fp).toBeDefined();
            expect(fp.length).toBe(16);
        });

        test('handles missing user-agent', () => {
            const fp = generateFingerprint({ ip: '1.1.1.1', headers: {} });
            expect(fp).toBeDefined();
        });
    });

    describe('validateFingerprint', () => {
        test('returns true for legacy tokens (no stored fingerprint)', () => {
            expect(validateFingerprint({}, null)).toBe(true);
            expect(validateFingerprint({}, undefined)).toBe(true);
        });

        test('returns true for matching fingerprint', () => {
            const req = { ip: '1.1.1.1', headers: { 'user-agent': 'Chrome' } };
            const fp = generateFingerprint(req);
            expect(validateFingerprint(req, fp)).toBe(true);
        });

        test('returns false for mismatched fingerprint', () => {
            const req = { ip: '1.1.1.1', headers: { 'user-agent': 'Chrome' } };
            expect(validateFingerprint(req, 'abcdef0123456789')).toBe(false);
        });

        test('returns false when IP changes', () => {
            const origReq = { ip: '1.1.1.1', headers: { 'user-agent': 'Chrome' } };
            const fp = generateFingerprint(origReq);
            const newReq = { ip: '2.2.2.2', headers: { 'user-agent': 'Chrome' } };
            expect(validateFingerprint(newReq, fp)).toBe(false);
        });

        test('returns true for empty stored fingerprint', () => {
            expect(validateFingerprint({ ip: '1.1.1.1', headers: {} }, '')).toBe(true);
        });
    });
});
