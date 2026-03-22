const { apiVersionMiddleware, versionInfoHandler, CURRENT_VERSION, SUPPORTED_VERSIONS } = require('../../../server/middleware/api-version');

function mockReq(path = '/', headers = {}) {
    return { path, headers, apiVersion: null };
}

function mockRes() {
    const headers = {};
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
        setHeader: jest.fn((k, v) => { headers[k] = v; }),
        _headers: headers,
    };
}

describe('apiVersionMiddleware', () => {
    const mw = apiVersionMiddleware();

    test('defaults to current version', () => {
        const req = mockReq('/api/products');
        const res = mockRes();
        mw(req, res, jest.fn());
        expect(req.apiVersion).toBe(1);
    });

    test('detects URL-based version /api/v1/', () => {
        const req = mockReq('/api/v1/products');
        const res = mockRes();
        mw(req, res, jest.fn());
        expect(req.apiVersion).toBe(1);
    });

    test('detects Accept header version', () => {
        const req = mockReq('/api/products', {
            accept: 'application/vnd.trustchecker.v1+json'
        });
        const res = mockRes();
        mw(req, res, jest.fn());
        expect(req.apiVersion).toBe(1);
    });

    test('detects X-API-Version header', () => {
        const req = mockReq('/api/products', { 'x-api-version': '1' });
        const res = mockRes();
        mw(req, res, jest.fn());
        expect(req.apiVersion).toBe(1);
    });

    test('returns 400 for unsupported version', () => {
        const req = mockReq('/api/v99/products');
        const res = mockRes();
        mw(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            error: 'Unsupported API version',
        }));
    });

    test('sets deprecation header for unversioned calls', () => {
        const req = mockReq('/api/products');
        const res = mockRes();
        mw(req, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('Deprecation', 'true');
    });

    test('sets X-API-Version response header', () => {
        const req = mockReq('/api/v1/products');
        const res = mockRes();
        mw(req, res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-API-Version', 1);
    });

    test('calls next() on valid version', () => {
        const req = mockReq('/api/v1/test');
        const next = jest.fn();
        mw(req, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });
});

describe('versionInfoHandler', () => {
    test('returns version info', () => {
        const res = mockRes();
        versionInfoHandler({}, res);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            platform: 'TrustChecker',
            edition: 'Enterprise',
        }));
    });
});

describe('constants', () => {
    test('CURRENT_VERSION is 1', () => {
        expect(CURRENT_VERSION).toBe(1);
    });

    test('SUPPORTED_VERSIONS includes 1', () => {
        expect(SUPPORTED_VERSIONS).toContain(1);
    });
});
