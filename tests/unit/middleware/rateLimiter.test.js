// rateLimiter bypasses in NODE_ENV=test, so we test the class directly
const RateLimiterClass = (() => {
    // Extract the class from the module's internal constructor
    const mod = require('../../../server/middleware/rateLimiter');
    return mod.rateLimiter.constructor;
})();

describe('RateLimiter', () => {
    let limiter;

    beforeEach(() => {
        limiter = new RateLimiterClass();
    });
    afterEach(() => {
        clearInterval(limiter._cleanupTimer);
    });

    test('_getKey returns ip-based key by default', () => {
        const req = { ip: '1.2.3.4', headers: {} };
        expect(limiter._getKey(req, 'ip')).toBe('ip:1.2.3.4');
    });

    test('_getKey returns user-based key', () => {
        const req = { ip: '1.2.3.4', user: { id: 'u1' }, headers: {} };
        expect(limiter._getKey(req, 'user')).toBe('user:u1');
    });

    test('_getKey returns combined key', () => {
        const req = { ip: '1.2.3.4', user: { id: 'u1' }, headers: {} };
        expect(limiter._getKey(req, 'combined')).toBe('1.2.3.4:u1');
    });

    test('_getKey uses X-Forwarded-For for real IP', () => {
        const req = { ip: '127.0.0.1', headers: { 'x-forwarded-for': '10.0.0.1, proxy' } };
        expect(limiter._getKey(req, 'ip')).toBe('ip:10.0.0.1');
    });

    test('getStats returns window and block counts', () => {
        const stats = limiter.getStats();
        expect(stats.active_windows).toBe(0);
        expect(stats.active_blocks).toBe(0);
    });

    test('cleanup removes expired entries', () => {
        // Add expired block
        limiter.blocked.set('test', Date.now() - 1000);
        limiter.windows.set('test', []);
        limiter.cleanup();
        expect(limiter.blocked.size).toBe(0);
        expect(limiter.windows.size).toBe(0);
    });
});

describe('rateLimiter presets', () => {
    const { apiLimit, authLimit, scanLimit, uploadLimit, exportLimit } = require('../../../server/middleware/rateLimiter');
    
    test('all presets are functions', () => {
        expect(typeof apiLimit).toBe('function');
        expect(typeof authLimit).toBe('function');
        expect(typeof scanLimit).toBe('function');
        expect(typeof uploadLimit).toBe('function');
        expect(typeof exportLimit).toBe('function');
    });

    test('bypasses in test environment', () => {
        const next = jest.fn();
        apiLimit({ ip: '1.2.3.4', headers: {}, user: { id: 'u1' } }, { set: jest.fn() }, next);
        expect(next).toHaveBeenCalled();
    });
});
