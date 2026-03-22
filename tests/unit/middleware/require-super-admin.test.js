const requireSuperAdmin = require('../../../server/middleware/requireSuperAdmin');

describe('requireSuperAdmin', () => {
    const mw = requireSuperAdmin();

    function mockRes() {
        return { status: jest.fn().mockReturnThis(), json: jest.fn() };
    }

    test('returns 401 when no user', () => {
        const res = mockRes();
        mw({ user: null }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('returns 403 for non-super_admin', () => {
        const res = mockRes();
        mw({ user: { role: 'admin' } }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json.mock.calls[0][0].code).toBe('SUPER_ADMIN_ONLY');
    });

    test('passes through for super_admin', () => {
        const next = jest.fn();
        mw({ user: { role: 'super_admin' } }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('blocks viewer role', () => {
        const res = mockRes();
        mw({ user: { role: 'viewer' } }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('blocks operator role', () => {
        const res = mockRes();
        mw({ user: { role: 'operator' } }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
    });
});
