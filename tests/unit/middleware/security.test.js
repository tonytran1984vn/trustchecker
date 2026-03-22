const { securityHeaders, sanitizeRequest, requestLogger } = require('../../../server/middleware/security');

describe('securityHeaders', () => {
    function mockRes() { return { setHeader: jest.fn() }; }
    function mockReq() { return {}; }

    test('sets X-Content-Type-Options', () => {
        const res = mockRes();
        securityHeaders(mockReq(), res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    });

    test('sets X-Frame-Options', () => {
        const res = mockRes();
        securityHeaders(mockReq(), res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });

    test('sets X-XSS-Protection', () => {
        const res = mockRes();
        securityHeaders(mockReq(), res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block');
    });

    test('sets Referrer-Policy', () => {
        const res = mockRes();
        securityHeaders(mockReq(), res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('Referrer-Policy', 'strict-origin-when-cross-origin');
    });

    test('sets Permissions-Policy', () => {
        const res = mockRes();
        securityHeaders(mockReq(), res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('Permissions-Policy', expect.stringContaining('camera'));
    });

    test('sets X-DNS-Prefetch-Control', () => {
        const res = mockRes();
        securityHeaders(mockReq(), res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-DNS-Prefetch-Control', 'off');
    });

    test('generates request ID', () => {
        const req = mockReq();
        securityHeaders(req, mockRes(), jest.fn());
        expect(req.requestId).toBeDefined();
        expect(req.requestId).toMatch(/^req-/);
    });

    test('calls next()', () => {
        const next = jest.fn();
        securityHeaders(mockReq(), mockRes(), next);
        expect(next).toHaveBeenCalled();
    });
});

describe('sanitizeRequest', () => {
    test('is a no-op (calls next)', () => {
        const next = jest.fn();
        sanitizeRequest({}, {}, next);
        expect(next).toHaveBeenCalled();
    });
});

describe('requestLogger', () => {
    test('calls next()', () => {
        const next = jest.fn();
        requestLogger({ method: 'GET', path: '/', ip: '1.1.1.1' }, { end: jest.fn() }, next);
        expect(next).toHaveBeenCalled();
    });

    test('getEntries returns array', () => {
        expect(Array.isArray(requestLogger.getEntries())).toBe(true);
    });

    test('getMetrics returns object', () => {
        const m = requestLogger.getMetrics();
        expect(m).toHaveProperty('total_requests');
        expect(m).toHaveProperty('avg_response_ms');
    });
});
