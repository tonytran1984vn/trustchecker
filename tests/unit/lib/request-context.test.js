const { getContext, updateContext, runInContext, runWithSystemContext, requestContextMiddleware } = require('../../../server/lib/request-context');

describe('request-context', () => {
    describe('getContext', () => {
        test('returns empty object outside request', () => {
            expect(getContext()).toEqual({});
        });

        test('returns context inside runWithSystemContext', async () => {
            let ctx;
            await runWithSystemContext('test:unit', () => {
                ctx = getContext();
            });
            expect(ctx.requestId).toMatch(/^sys-/);
            expect(ctx.method).toBe('SYSTEM');
            expect(ctx.path).toBe('test:unit');
        });
    });

    describe('updateContext', () => {
        test('updates context inside run', async () => {
            await runWithSystemContext('test:update', () => {
                updateContext({ orgId: 'org-1', userId: 'user-1' });
                const ctx = getContext();
                expect(ctx.orgId).toBe('org-1');
                expect(ctx.userId).toBe('user-1');
            });
        });

        test('no-op outside context', () => {
            expect(() => updateContext({ orgId: 'x' })).not.toThrow();
        });
    });

    describe('runInContext', () => {
        test('propagates context to callback', async () => {
            await runWithSystemContext('test:propagate', () => {
                updateContext({ orgId: 'org-prop' });
                const wrapped = runInContext(() => getContext().orgId);
                expect(wrapped()).toBe('org-prop');
            });
        });

        test('returns fn as-is outside context', () => {
            const fn = () => 42;
            expect(runInContext(fn)).toBe(fn);
        });
    });

    describe('runWithSystemContext', () => {
        test('provides system context', async () => {
            let ctx;
            await runWithSystemContext('cron:cleanup', () => { ctx = getContext(); });
            expect(ctx.requestId).toMatch(/^sys-/);
            expect(ctx.orgId).toBeNull();
            expect(ctx.userId).toBeNull();
        });

        test('nested contexts are isolated', async () => {
            await runWithSystemContext('outer', async () => {
                updateContext({ orgId: 'outer-org' });
                await runWithSystemContext('inner', () => {
                    expect(getContext().orgId).toBeNull(); // inner context
                });
                expect(getContext().orgId).toBe('outer-org'); // restored
            });
        });
    });

    describe('requestContextMiddleware', () => {
        test('creates context with requestId', () => {
            const req = { headers: {}, originalUrl: '/api/test', method: 'GET' };
            const res = { setHeader: jest.fn() };
            const next = jest.fn();
            requestContextMiddleware(req, res, next);
            expect(req._context).toBeDefined();
            expect(req._context.requestId).toBeDefined();
        });

        test('uses incoming x-request-id', () => {
            const req = { headers: { 'x-request-id': 'ext-123' }, originalUrl: '/api/test', method: 'GET' };
            const res = { setHeader: jest.fn() };
            requestContextMiddleware(req, res, jest.fn());
            expect(req._context.requestId).toBe('ext-123');
        });

        test('sets response header', () => {
            const req = { headers: {}, originalUrl: '/api/test', method: 'GET' };
            const res = { setHeader: jest.fn() };
            requestContextMiddleware(req, res, jest.fn());
            expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
        });
    });
});
