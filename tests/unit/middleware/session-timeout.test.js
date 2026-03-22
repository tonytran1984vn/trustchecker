const { sessionTimeout } = require('../../../server/middleware/session-timeout');

describe('sessionTimeout', () => {
    const mw = sessionTimeout();

    function mockRes() {
        return { status: jest.fn().mockReturnThis(), json: jest.fn() };
    }

    test('passes through when no user', () => {
        const next = jest.fn();
        mw({ user: null }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('passes through for fresh regular user session', () => {
        const next = jest.fn();
        mw({ user: { id: '1', iat: Math.floor(Date.now() / 1000) - 60 } }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('passes through for fresh platform admin session', () => {
        const next = jest.fn();
        mw({ user: { id: '1', user_type: 'platform', iat: Math.floor(Date.now() / 1000) - 60 } }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('expires platform admin after 15 min', () => {
        const res = mockRes();
        mw({
            user: { id: '1', user_type: 'platform', iat: Math.floor(Date.now() / 1000) - 16 * 60 },
        }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json.mock.calls[0][0].code).toBe('SESSION_TIMEOUT');
    });

    test('expires super_admin after 15 min', () => {
        const res = mockRes();
        mw({
            user: { id: '1', role: 'super_admin', iat: Math.floor(Date.now() / 1000) - 16 * 60 },
        }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('regular user 24h timeout', () => {
        const next = jest.fn();
        mw({
            user: { id: '1', iat: Math.floor(Date.now() / 1000) - 23 * 60 * 60 },
        }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('regular user expired after 24h', () => {
        const res = mockRes();
        mw({
            user: { id: '1', iat: Math.floor(Date.now() / 1000) - 25 * 60 * 60 },
        }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(401);
    });

    test('platform admin message mentions 15 minutes', () => {
        const res = mockRes();
        mw({
            user: { user_type: 'platform', iat: Math.floor(Date.now() / 1000) - 20 * 60 },
        }, res, jest.fn());
        expect(res.json.mock.calls[0][0].message).toContain('15 minutes');
    });
});
