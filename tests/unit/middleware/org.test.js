const { orgMiddleware, requireOrg } = require('../../../server/middleware/org');

describe('orgMiddleware', () => {
    function mockReq(overrides = {}) {
        return { path: '/api/test', user: null, headers: {}, ...overrides };
    }
    function mockRes() {
        return { status: jest.fn().mockReturnThis(), json: jest.fn() };
    }

    test('skips public routes', () => {
        const next = jest.fn();
        orgMiddleware(mockReq({ path: '/public/verify' }), mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('skips auth routes', () => {
        const next = jest.fn();
        orgMiddleware(mockReq({ path: '/auth/login' }), mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('extracts orgId from JWT user', () => {
        const req = mockReq({ user: { orgId: 'org-1', role: 'admin' } });
        const next = jest.fn();
        orgMiddleware(req, mockRes(), next);
        expect(req.orgId).toBe('org-1');
        expect(next).toHaveBeenCalled();
    });

    test('sets orgPlan from JWT', () => {
        const req = mockReq({ user: { orgId: 'org-1', orgPlan: 'pro' } });
        orgMiddleware(req, mockRes(), jest.fn());
        expect(req.orgPlan).toBe('pro');
    });

    test('defaults orgPlan to free', () => {
        const req = mockReq({ user: { orgId: 'org-1' } });
        orgMiddleware(req, mockRes(), jest.fn());
        expect(req.orgPlan).toBe('free');
    });

    test('sets isSuperAdmin flag for super_admin', () => {
        const req = mockReq({ user: { role: 'super_admin', orgId: 'org-1' } });
        orgMiddleware(req, mockRes(), jest.fn());
        expect(req.isSuperAdmin).toBe(true);
    });

    test('isSuperAdmin is false for non-super_admin', () => {
        const req = mockReq({ user: { role: 'admin', orgId: 'org-1' } });
        orgMiddleware(req, mockRes(), jest.fn());
        expect(req.isSuperAdmin).toBe(false);
    });

    test('extracts orgId from X-Org-ID header (valid UUID)', () => {
        const req = mockReq({
            headers: { 'x-org-id': '123e4567-e89b-12d3-a456-426614174000' },
        });
        orgMiddleware(req, mockRes(), jest.fn());
        expect(req.orgId).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    test('rejects invalid X-Org-ID header', () => {
        const req = mockReq({
            headers: { 'x-org-id': 'not-a-uuid' },
        });
        orgMiddleware(req, mockRes(), jest.fn());
        expect(req.orgId).toBeUndefined();
    });

    test('extracts orgSlug from subdomain', () => {
        const req = mockReq({
            headers: { host: 'acme.trustchecker.com' },
        });
        orgMiddleware(req, mockRes(), jest.fn());
        expect(req.orgSlug).toBe('acme');
    });

    test('ignores www subdomain', () => {
        const req = mockReq({
            headers: { host: 'www.trustchecker.com' },
        });
        orgMiddleware(req, mockRes(), jest.fn());
        expect(req.orgSlug).toBeUndefined();
    });

    test('ignores api subdomain', () => {
        const req = mockReq({
            headers: { host: 'api.trustchecker.com' },
        });
        orgMiddleware(req, mockRes(), jest.fn());
        expect(req.orgSlug).toBeUndefined();
    });

    test('validates slug format', () => {
        const req = mockReq({
            headers: { host: 'valid-slug.trustchecker.com' },
        });
        orgMiddleware(req, mockRes(), jest.fn());
        expect(req.orgSlug).toBe('valid-slug');
    });

    test('always calls next', () => {
        const next = jest.fn();
        orgMiddleware(mockReq(), mockRes(), next);
        expect(next).toHaveBeenCalled();
    });
});

describe('requireOrg', () => {
    function mockRes() {
        return { status: jest.fn().mockReturnThis(), json: jest.fn() };
    }

    test('returns 403 when no org context', () => {
        const res = mockRes();
        requireOrg({}, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test('passes when orgId present', () => {
        const next = jest.fn();
        requireOrg({ orgId: 'org-1' }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('passes when orgSlug present', () => {
        const next = jest.fn();
        requireOrg({ orgSlug: 'acme' }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('error message mentions organization', () => {
        const res = mockRes();
        requireOrg({}, res, jest.fn());
        expect(res.json.mock.calls[0][0].message).toContain('organization');
    });
});
