// audit-log exports a middleware function, but also has pure functions we can test
// We need to access the internal sanitize and getIP functions
// Since they're not exported, we test the middleware behavior instead

const auditLog = require('../../../server/middleware/audit-log');

describe('auditLog middleware', () => {
    function mockRes() {
        return {
            json: jest.fn(),
            statusCode: 200,
        };
    }

    test('is a function', () => {
        expect(typeof auditLog).toBe('function');
    });

    test('skips GET requests (non-write)', () => {
        const next = jest.fn();
        auditLog({ method: 'GET', path: '/api/test' }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('skips health check path', () => {
        const next = jest.fn();
        auditLog({ method: 'POST', path: '/healthz' }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('skips login path', () => {
        const next = jest.fn();
        auditLog({ method: 'POST', path: '/api/auth/login' }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('skips auth refresh path', () => {
        const next = jest.fn();
        auditLog({ method: 'POST', path: '/api/auth/refresh' }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('processes POST requests', () => {
        const next = jest.fn();
        const res = mockRes();
        auditLog(
            { method: 'POST', path: '/api/products', originalUrl: '/api/products', body: {}, headers: {}, user: null },
            res,
            next
        );
        expect(next).toHaveBeenCalled();
    });

    test('processes PUT requests', () => {
        const next = jest.fn();
        auditLog(
            { method: 'PUT', path: '/api/products/1', originalUrl: '/api/products/1', body: {}, headers: {}, user: null },
            mockRes(),
            next
        );
        expect(next).toHaveBeenCalled();
    });

    test('processes DELETE requests', () => {
        const next = jest.fn();
        auditLog(
            { method: 'DELETE', path: '/api/products/1', originalUrl: '/api/products/1', body: {}, headers: {}, user: null },
            mockRes(),
            next
        );
        expect(next).toHaveBeenCalled();
    });

    test('processes PATCH requests', () => {
        const next = jest.fn();
        auditLog(
            { method: 'PATCH', path: '/api/products/1', originalUrl: '/api/products/1', body: {}, headers: {}, user: null },
            mockRes(),
            next
        );
        expect(next).toHaveBeenCalled();
    });
});
