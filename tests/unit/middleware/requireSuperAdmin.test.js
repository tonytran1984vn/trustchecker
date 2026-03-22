const requireSuperAdmin = require('../../../server/middleware/requireSuperAdmin');

describe('requireSuperAdmin', () => {
    const createRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

    test('returns 401 if no user', () => {
        const mw = requireSuperAdmin();
        const res = createRes();
        mw({}, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('returns 403 for non-super_admin', () => {
        const mw = requireSuperAdmin();
        const req = { user: { role: 'admin' } };
        const res = createRes();
        mw(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SUPER_ADMIN_ONLY' }));
    });

    test('calls next() for super_admin', () => {
        const mw = requireSuperAdmin();
        const req = { user: { role: 'super_admin' } };
        const next = jest.fn();
        mw(req, createRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('returns 403 for viewer role', () => {
        const mw = requireSuperAdmin();
        const req = { user: { role: 'viewer' } };
        const res = createRes();
        mw(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('returns 403 for operator role', () => {
        const mw = requireSuperAdmin();
        const req = { user: { role: 'operator' } };
        const res = createRes();
        mw(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
    });
});
