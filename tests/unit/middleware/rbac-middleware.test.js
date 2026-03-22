// Test the rbac-middleware module's requirePerm, requireRoleDB, attachPermissions
// These require mocking the rbacService

jest.mock('../../../server/services/rbac.service', () => ({
    hasAnyPermission: jest.fn(),
    getUserPermissions: jest.fn(),
}));

const rbacService = require('../../../server/services/rbac.service');
const { requirePerm, requireRoleDB, attachPermissions } = require('../../../server/middleware/rbac-middleware');

describe('rbac-middleware', () => {
    function mockRes() {
        return { status: jest.fn().mockReturnThis(), json: jest.fn() };
    }

    describe('requirePerm', () => {
        test('returns 401 when no user', async () => {
            const mw = requirePerm('product:create');
            const res = mockRes();
            await mw({ user: null }, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(401);
        });

        test('super_admin bypasses permission check', async () => {
            const next = jest.fn();
            await requirePerm('product:create')({ user: { role: 'super_admin', id: '1' } }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('platform_admin bypasses', async () => {
            const next = jest.fn();
            await requirePerm('x')({ user: { role: 'platform_admin', id: '1' } }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('allows when hasAnyPermission returns true', async () => {
            rbacService.hasAnyPermission.mockResolvedValue(true);
            const next = jest.fn();
            await requirePerm('product:create')({ user: { id: '1', role: 'editor', orgId: 'o1' } }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('blocks when hasAnyPermission returns false', async () => {
            rbacService.hasAnyPermission.mockResolvedValue(false);
            const res = mockRes();
            await requirePerm('product:create')({ user: { id: '1', role: 'viewer', orgId: 'o1' } }, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('error code is INSUFFICIENT_PERMISSIONS', async () => {
            rbacService.hasAnyPermission.mockResolvedValue(false);
            const res = mockRes();
            await requirePerm('x')({ user: { id: '1', role: 'v', orgId: 'o' } }, res, jest.fn());
            expect(res.json.mock.calls[0][0].code).toBe('INSUFFICIENT_PERMISSIONS');
        });

        test('falls back to next on service error', async () => {
            rbacService.hasAnyPermission.mockRejectedValue(new Error('db down'));
            const next = jest.fn();
            await requirePerm('x')({ user: { id: '1', role: 'v', orgId: 'o' } }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('accepts array of permissions', async () => {
            rbacService.hasAnyPermission.mockResolvedValue(true);
            const next = jest.fn();
            await requirePerm(['product:create', 'product:update'])({ user: { id: '1', role: 'editor', orgId: 'o' } }, mockRes(), next);
            expect(rbacService.hasAnyPermission).toHaveBeenCalledWith('1', 'o', ['product:create', 'product:update']);
        });
    });

    describe('requireRoleDB', () => {
        test('returns 401 when no user', async () => {
            const res = mockRes();
            await requireRoleDB('admin')({ user: null }, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(401);
        });

        test('allows matching role', async () => {
            rbacService.getUserPermissions.mockResolvedValue({ roles: ['admin'], permissions: [] });
            const next = jest.fn();
            await requireRoleDB('admin')({ user: { id: '1', role: 'admin', orgId: 'o' } }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('blocks non-matching role', async () => {
            rbacService.getUserPermissions.mockResolvedValue({ roles: ['viewer'], permissions: [] });
            const res = mockRes();
            await requireRoleDB('admin')({ user: { id: '1', role: 'viewer', orgId: 'o' } }, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('falls back to user.role on error', async () => {
            rbacService.getUserPermissions.mockRejectedValue(new Error('err'));
            const next = jest.fn();
            await requireRoleDB('admin')({ user: { id: '1', role: 'admin', orgId: 'o' } }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('attachPermissions', () => {
        test('skips when no user', async () => {
            const next = jest.fn();
            await attachPermissions()({ user: null }, {}, next);
            expect(next).toHaveBeenCalled();
        });

        test('attaches permissions to req', async () => {
            rbacService.getUserPermissions.mockResolvedValue({ permissions: ['read', 'write'], roles: ['editor'] });
            const req = { user: { id: '1', orgId: 'o' } };
            await attachPermissions()(req, {}, jest.fn());
            expect(req.userPermissions).toEqual(['read', 'write']);
            expect(req.userRoles).toEqual(['editor']);
        });

        test('falls back on error', async () => {
            rbacService.getUserPermissions.mockRejectedValue(new Error('err'));
            const req = { user: { id: '1', role: 'viewer', orgId: 'o' } };
            await attachPermissions()(req, {}, jest.fn());
            expect(req.userPermissions).toEqual([]);
            expect(req.userRoles).toEqual(['viewer']);
        });
    });
});
