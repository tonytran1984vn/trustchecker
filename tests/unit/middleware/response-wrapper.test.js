const { responseWrapper } = require('../../../server/middleware/response-wrapper');

function mockReq(path = '/api/test', apiVersion = 1) {
    return { path, apiVersion };
}

function mockRes() {
    const original = jest.fn();
    return {
        json: original,
        _originalJson: original,
    };
}

describe('responseWrapper', () => {
    const mw = responseWrapper();

    test('skips healthz paths', () => {
        const req = mockReq('/healthz');
        const res = mockRes();
        const next = jest.fn();
        mw(req, res, next);
        expect(next).toHaveBeenCalled();
        // json should not be patched
        expect(res.json).toBe(res._originalJson);
    });

    test('skips /api/v1/ paths', () => {
        const req = mockReq('/api/v1/products');
        const res = mockRes();
        const next = jest.fn();
        mw(req, res, next);
        expect(res.json).toBe(res._originalJson);
    });

    test('wraps unversioned API responses', () => {
        const req = mockReq('/api/products');
        const res = mockRes();
        mw(req, res, () => {});
        // json should be patched
        expect(res.json).not.toBe(res._originalJson);
    });

    test('passes through already-unified responses', () => {
        const req = mockReq('/api/products');
        const res = mockRes();
        mw(req, res, () => {});
        res.json({ data: [1, 2], meta: { total: 2 } });
        expect(res._originalJson).toHaveBeenCalledWith(
            expect.objectContaining({ data: [1, 2] })
        );
    });

    test('wraps error responses', () => {
        const req = mockReq('/api/test');
        const res = mockRes();
        mw(req, res, () => {});
        res.json({ error: 'Not found' });
        const call = res._originalJson.mock.calls[0][0];
        expect(call.data).toBeNull();
        expect(call.errors[0].message).toBe('Not found');
    });

    test('wraps single-key success responses', () => {
        const req = mockReq('/api/test');
        const res = mockRes();
        mw(req, res, () => {});
        res.json({ products: [{ id: 1 }], total: 5 });
        const call = res._originalJson.mock.calls[0][0];
        expect(call.data).toEqual([{ id: 1 }]);
        expect(call.meta.total).toBe(5);
    });

    test('wraps multi-key responses as data', () => {
        const req = mockReq('/api/test');
        const res = mockRes();
        mw(req, res, () => {});
        res.json({ name: 'test', status: 'active' });
        const call = res._originalJson.mock.calls[0][0];
        expect(call.data.name).toBe('test');
    });

    test('includes meta with timestamp and path', () => {
        const req = mockReq('/api/test');
        const res = mockRes();
        mw(req, res, () => {});
        res.json({ items: [] });
        const call = res._originalJson.mock.calls[0][0];
        expect(call.meta.path).toBe('/api/test');
        expect(call.meta.timestamp).toBeDefined();
    });

    test('passes through null body', () => {
        const req = mockReq('/api/test');
        const res = mockRes();
        mw(req, res, () => {});
        res.json(null);
        expect(res._originalJson).toHaveBeenCalledWith(null);
    });

    test('error preserves error code', () => {
        const req = mockReq('/api/test');
        const res = mockRes();
        mw(req, res, () => {});
        res.json({ error: 'Auth failed', code: 'AUTH_ERROR' });
        const call = res._originalJson.mock.calls[0][0];
        expect(call.errors[0].code).toBe('AUTH_ERROR');
    });
});
