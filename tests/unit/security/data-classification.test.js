const { dataClassification } = require('../../../server/security/data-classification');

describe('dataClassification', () => {
    const mw = dataClassification();

    function mockRes() {
        const headers = {};
        return {
            setHeader: jest.fn((k, v) => { headers[k] = v; }),
            _headers: headers,
        };
    }

    test('returns a middleware function', () => {
        expect(typeof mw).toBe('function');
    });

    test('PUBLIC for /api/public paths', () => {
        const res = mockRes();
        mw({ path: '/api/public/verify' }, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Data-Classification', 'PUBLIC');
    });

    test('PUBLIC for /api/docs', () => {
        const res = mockRes();
        mw({ path: '/api/docs/openapi' }, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Data-Classification', 'PUBLIC');
    });

    test('CONFIDENTIAL for /api/products', () => {
        const res = mockRes();
        mw({ path: '/api/products/123' }, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Data-Classification', 'CONFIDENTIAL');
    });

    test('RESTRICTED for /api/billing', () => {
        const res = mockRes();
        mw({ path: '/api/billing/plans' }, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Data-Classification', 'RESTRICTED');
    });

    test('RESTRICTED for /api/platform', () => {
        const res = mockRes();
        mw({ path: '/api/platform/stats' }, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Data-Classification', 'RESTRICTED');
    });

    test('RESTRICTED for /api/admin', () => {
        const res = mockRes();
        mw({ path: '/api/admin/users' }, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Data-Classification', 'RESTRICTED');
    });

    test('RESTRICTED for /api/auth', () => {
        const res = mockRes();
        mw({ path: '/api/auth/login' }, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Data-Classification', 'RESTRICTED');
    });

    test('RESTRICTED for /api/kyc', () => {
        const res = mockRes();
        mw({ path: '/api/kyc/verify' }, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Data-Classification', 'RESTRICTED');
    });

    test('CONFIDENTIAL for /api/org-admin', () => {
        const res = mockRes();
        mw({ path: '/api/org-admin/members' }, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Data-Classification', 'CONFIDENTIAL');
    });

    test('CONFIDENTIAL for /api/compliance', () => {
        const res = mockRes();
        mw({ path: '/api/compliance/checks' }, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Data-Classification', 'CONFIDENTIAL');
    });

    test('INTERNAL for unknown paths', () => {
        const res = mockRes();
        mw({ path: '/api/unknown' }, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Data-Classification', 'INTERNAL');
    });

    test('sets X-Content-Security header', () => {
        const res = mockRes();
        mw({ path: '/api/test' }, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Content-Security', 'no-store, no-cache');
    });

    test('sets Cache-Control for RESTRICTED', () => {
        const res = mockRes();
        mw({ path: '/api/billing' }, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('no-store'));
    });

    test('sets Pragma for RESTRICTED', () => {
        const res = mockRes();
        mw({ path: '/api/billing' }, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('Pragma', 'no-cache');
    });

    test('calls next()', () => {
        const next = jest.fn();
        mw({ path: '/api/test' }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });
});
