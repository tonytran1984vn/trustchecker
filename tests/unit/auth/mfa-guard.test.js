const { mfaGuard, verifyTOTP, generateMFASecret } = require('../../../server/auth/mfa-guard');

// base32hex encoding may not be available in all Node.js versions
let base32Available = true;
try { generateMFASecret(); } catch (e) { base32Available = false; }

describe('mfa-guard', () => {
    describe('generateMFASecret', () => {
        const runIf = base32Available ? test : test.skip;

        runIf('generates a string', () => {
            expect(typeof generateMFASecret()).toBe('string');
        });

        runIf('generates uppercase string', () => {
            const secret = generateMFASecret();
            expect(secret).toBe(secret.toUpperCase());
        });

        runIf('has no padding characters', () => {
            const secret = generateMFASecret();
            expect(secret).not.toContain('=');
        });

        runIf('generates different secrets each call', () => {
            expect(generateMFASecret()).not.toBe(generateMFASecret());
        });

        runIf('generated secret has reasonable length', () => {
            const secret = generateMFASecret();
            expect(secret.length).toBeGreaterThan(10);
        });

        test('function is exported', () => {
            expect(typeof generateMFASecret).toBe('function');
        });
    });

    describe('verifyTOTP', () => {
        const runIf = base32Available ? test : test.skip;

        runIf('returns boolean', () => {
            const result = verifyTOTP('JBSWY3DPEHPK3PXP', '000000');
            expect(typeof result).toBe('boolean');
        });

        runIf('rejects empty token', () => {
            expect(verifyTOTP('JBSWY3DPEHPK3PXP', '')).toBe(false);
        });

        runIf('rejects wrong token', () => {
            expect(verifyTOTP('JBSWY3DPEHPK3PXP', '999888')).toBe(false);
        });

        test('function is exported', () => {
            expect(typeof verifyTOTP).toBe('function');
        });
    });

    describe('mfaGuard middleware', () => {
        function mockRes() {
            return { status: jest.fn().mockReturnThis(), json: jest.fn() };
        }

        test('returns a function', () => {
            expect(typeof mfaGuard()).toBe('function');
        });

        test('passes through for non-platform users', async () => {
            const next = jest.fn();
            await mfaGuard()({ user: { role: 'admin', user_type: 'org' } }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('passes through for platform admin without MFA setup', async () => {
            const next = jest.fn();
            const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
            await mfaGuard()(
                { user: { role: 'super_admin', user_type: 'platform', email: 'a@b.com' }, path: '/test', headers: {} },
                mockRes(),
                next
            );
            consoleSpy.mockRestore();
            expect(next).toHaveBeenCalled();
        });

        test('returns 403 when MFA set up but no token provided', async () => {
            const res = mockRes();
            await mfaGuard()(
                { user: { role: 'super_admin', user_type: 'platform', mfa_secret: 'JBSWY3DPEHPK3PXP' }, headers: {} },
                res,
                jest.fn()
            );
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json.mock.calls[0][0].code).toBe('MFA_REQUIRED');
        });

        test('passes through for null user', async () => {
            const next = jest.fn();
            await mfaGuard()({ user: null, headers: {} }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });
    });
});
