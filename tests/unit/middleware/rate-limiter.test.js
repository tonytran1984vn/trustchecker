const { RateLimiter } = require('../../../server/middleware/rateLimiter').rateLimiter.constructor === undefined
    ? (() => { const rl = require('../../../server/middleware/rateLimiter'); return rl; })()
    : require('../../../server/middleware/rateLimiter');

// The rateLimiter exports a singleton, so we test the class methods directly
const rateLimiter = require('../../../server/middleware/rateLimiter').rateLimiter;

describe('RateLimiter', () => {
    test('has windows and blocked maps', () => {
        expect(rateLimiter.windows).toBeDefined();
        expect(rateLimiter.blocked).toBeDefined();
    });

    test('getStats returns active window count', () => {
        const s = rateLimiter.getStats();
        expect(s).toHaveProperty('active_windows');
        expect(s).toHaveProperty('active_blocks');
    });

    test('cleanup runs without error', () => {
        expect(() => rateLimiter.cleanup()).not.toThrow();
    });
});

describe('preset middlewares', () => {
    const { apiLimit, authLimit, scanLimit, uploadLimit, exportLimit } = require('../../../server/middleware/rateLimiter');

    test('apiLimit is a function', () => {
        expect(typeof apiLimit).toBe('function');
    });

    test('authLimit is a function', () => {
        expect(typeof authLimit).toBe('function');
    });

    test('scanLimit is a function', () => {
        expect(typeof scanLimit).toBe('function');
    });

    test('uploadLimit is a function', () => {
        expect(typeof uploadLimit).toBe('function');
    });

    test('exportLimit is a function', () => {
        expect(typeof exportLimit).toBe('function');
    });

    // All presets bypass in test env (NODE_ENV=test), so they call next()
    test('apiLimit calls next in test env', () => {
        const next = jest.fn();
        apiLimit({ ip: '1.1.1.1', headers: {}, user: null, connection: {} }, { set: jest.fn() }, next);
        expect(next).toHaveBeenCalled();
    });
});
