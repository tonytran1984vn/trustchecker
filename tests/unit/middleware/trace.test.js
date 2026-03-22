const { traceMiddleware } = require('../../../server/middleware/trace');

describe('traceMiddleware', () => {
    const mw = traceMiddleware();

    function mockReq(headers = {}) {
        return { headers, method: 'GET', path: '/test', user: null };
    }

    function mockRes() {
        const listeners = {};
        return {
            setHeader: jest.fn(),
            on: jest.fn((event, fn) => { listeners[event] = fn; }),
            _listeners: listeners,
            statusCode: 200,
        };
    }

    test('generates trace ID if none provided', () => {
        const req = mockReq();
        mw(req, mockRes(), jest.fn());
        expect(req.traceId).toBeDefined();
        expect(req.traceId).toMatch(/^tc-/);
    });

    test('uses incoming x-trace-id', () => {
        const req = mockReq({ 'x-trace-id': 'external-trace' });
        mw(req, mockRes(), jest.fn());
        expect(req.traceId).toBe('external-trace');
    });

    test('uses incoming x-request-id', () => {
        const req = mockReq({ 'x-request-id': 'req-id' });
        mw(req, mockRes(), jest.fn());
        expect(req.traceId).toBe('req-id');
    });

    test('x-trace-id takes precedence over x-request-id', () => {
        const req = mockReq({ 'x-trace-id': 'trace', 'x-request-id': 'req' });
        mw(req, mockRes(), jest.fn());
        expect(req.traceId).toBe('trace');
    });

    test('sets response header X-Trace-Id', () => {
        const res = mockRes();
        mw(mockReq(), res, jest.fn());
        expect(res.setHeader).toHaveBeenCalledWith('X-Trace-Id', expect.any(String));
    });

    test('sets req.startTime', () => {
        const req = mockReq();
        mw(req, mockRes(), jest.fn());
        expect(req.startTime).toBeDefined();
        expect(typeof req.startTime).toBe('number');
    });

    test('calls next()', () => {
        const next = jest.fn();
        mw(mockReq(), mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('registers finish listener', () => {
        const res = mockRes();
        mw(mockReq(), res, jest.fn());
        expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
    });
});
