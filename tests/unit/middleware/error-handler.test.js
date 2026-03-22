const { errorHandler, notFoundHandler } = require('../../../server/middleware/error-handler');

function mockReq(overrides = {}) {
    return {
        method: 'GET',
        path: '/api/test',
        headers: {},
        user: null,
        traceId: 'trace-123',
        ...overrides,
    };
}

function mockRes() {
    return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('errorHandler', () => {
    const mw = errorHandler();
    const origEnv = process.env.NODE_ENV;

    afterEach(() => { process.env.NODE_ENV = origEnv; });

    test('returns error message in dev', () => {
        process.env.NODE_ENV = 'development';
        const res = mockRes();
        const err = new Error('Something broke');
        mw(err, mockReq(), res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json.mock.calls[0][0].error).toBe('Something broke');
    });

    test('sanitizes 500 errors in production', () => {
        process.env.NODE_ENV = 'production';
        const res = mockRes();
        const err = new Error('SQL connection failed');
        mw(err, mockReq(), res, jest.fn());
        expect(res.json.mock.calls[0][0].error).toBe('Internal server error');
    });

    test('shows message for non-500 in production', () => {
        process.env.NODE_ENV = 'production';
        const res = mockRes();
        const err = new Error('Not found');
        err.status = 404;
        mw(err, mockReq(), res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json.mock.calls[0][0].error).toBe('Not found');
    });

    test('includes trace ID', () => {
        const res = mockRes();
        mw(new Error('fail'), mockReq(), res, jest.fn());
        expect(res.json.mock.calls[0][0].trace).toBe('trace-123');
    });

    test('uses x-request-id if no traceId', () => {
        const res = mockRes();
        mw(new Error('fail'), mockReq({ traceId: undefined, headers: { 'x-request-id': 'req-456' } }), res, jest.fn());
        expect(res.json.mock.calls[0][0].trace).toBe('req-456');
    });

    test('uses custom error code', () => {
        const res = mockRes();
        const err = new Error('rate limit');
        err.code = 'RATE_LIMITED';
        mw(err, mockReq(), res, jest.fn());
        expect(res.json.mock.calls[0][0].code).toBe('RATE_LIMITED');
    });

    test('includes stack in dev', () => {
        process.env.NODE_ENV = 'development';
        const res = mockRes();
        mw(new Error('fail'), mockReq(), res, jest.fn());
        expect(res.json.mock.calls[0][0].stack).toBeDefined();
    });

    test('excludes stack in production', () => {
        process.env.NODE_ENV = 'production';
        const res = mockRes();
        mw(new Error('fail'), mockReq(), res, jest.fn());
        expect(res.json.mock.calls[0][0].stack).toBeUndefined();
    });
});

describe('notFoundHandler', () => {
    const mw = notFoundHandler();

    test('returns 404', () => {
        const res = mockRes();
        mw(mockReq(), res);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('includes path and method', () => {
        const res = mockRes();
        mw(mockReq({ path: '/api/missing', method: 'POST' }), res);
        const body = res.json.mock.calls[0][0];
        expect(body.path).toBe('/api/missing');
        expect(body.method).toBe('POST');
    });

    test('includes hint', () => {
        const res = mockRes();
        mw(mockReq(), res);
        expect(res.json.mock.calls[0][0].hint).toContain('/api/docs');
    });
});
