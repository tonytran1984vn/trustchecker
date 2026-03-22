const { ROLE_HIERARCHY, JWT_EXPIRY, REFRESH_EXPIRY_DAYS, MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES, requireRole } = require('../../../server/auth/core');

describe('auth/core', () => {
    describe('constants', () => {
        test('JWT_EXPIRY is 1h', () => {
            expect(JWT_EXPIRY).toBe('1h');
        });

        test('REFRESH_EXPIRY_DAYS is 7', () => {
            expect(REFRESH_EXPIRY_DAYS).toBe(7);
        });

        test('MAX_FAILED_ATTEMPTS is 5', () => {
            expect(MAX_FAILED_ATTEMPTS).toBe(5);
        });

        test('LOCKOUT_MINUTES is 15', () => {
            expect(LOCKOUT_MINUTES).toBe(15);
        });
    });

    describe('ROLE_HIERARCHY', () => {
        test('has 5 levels (L1-L5)', () => {
            const levels = new Set(Object.values(ROLE_HIERARCHY));
            expect(levels).toContain(1);
            expect(levels).toContain(2);
            expect(levels).toContain(3);
            expect(levels).toContain(4);
            expect(levels).toContain(5);
        });

        test('super_admin is L5', () => {
            expect(ROLE_HIERARCHY.super_admin).toBe(5);
        });

        test('platform_security is L5', () => {
            expect(ROLE_HIERARCHY.platform_security).toBe(5);
        });

        test('admin is L3', () => {
            expect(ROLE_HIERARCHY.admin).toBe(3);
        });

        test('viewer is L1', () => {
            expect(ROLE_HIERARCHY.viewer).toBe(1);
        });

        test('developer is L1', () => {
            expect(ROLE_HIERARCHY.developer).toBe(1);
        });

        test('ggc_member is L4', () => {
            expect(ROLE_HIERARCHY.ggc_member).toBe(4);
        });

        test('ops_manager is L2', () => {
            expect(ROLE_HIERARCHY.ops_manager).toBe(2);
        });

        test('org_owner is L3', () => {
            expect(ROLE_HIERARCHY.org_owner).toBe(3);
        });

        test('auditor is L1', () => {
            expect(ROLE_HIERARCHY.auditor).toBe(1);
        });

        test('compliance_officer is L4', () => {
            expect(ROLE_HIERARCHY.compliance_officer).toBe(4);
        });

        test('has 40+ roles', () => {
            expect(Object.keys(ROLE_HIERARCHY).length).toBeGreaterThanOrEqual(30);
        });
    });

    describe('requireRole middleware', () => {
        function mockRes() {
            return { status: jest.fn().mockReturnThis(), json: jest.fn() };
        }

        test('returns 401 when no user', async () => {
            const res = mockRes();
            const mw = requireRole('admin');
            await mw({ user: null }, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(401);
        });

        test('allows user with sufficient level', async () => {
            const next = jest.fn();
            await requireRole('viewer')({ user: { role: 'admin' } }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('blocks user with insufficient level', async () => {
            const res = mockRes();
            await requireRole('admin')({ user: { role: 'viewer' } }, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('super_admin passes any role check', async () => {
            const next = jest.fn();
            await requireRole('admin')({ user: { role: 'super_admin' } }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });
    });
});
