const { asyncHandler } = require('../../../server/middleware/asyncHandler');

describe('asyncHandler', () => {
    test('returns a function', () => {
        expect(typeof asyncHandler(() => {})).toBe('function');
    });

    test('calls the handler', async () => {
        const handler = jest.fn().mockResolvedValue(undefined);
        const wrapped = asyncHandler(handler);
        const next = jest.fn();
        await wrapped({}, {}, next);
        expect(handler).toHaveBeenCalled();
    });

    test('catches async errors and passes to next', async () => {
        const err = new Error('async fail');
        const handler = jest.fn().mockRejectedValue(err);
        const next = jest.fn();
        const wrapped = asyncHandler(handler);
        await wrapped({}, {}, next);
        // Give Promise.catch a tick
        await new Promise(r => setTimeout(r, 10));
        expect(next).toHaveBeenCalledWith(err);
    });

    test('handles sync returns', () => {
        const handler = (req, res) => { res.json({ ok: true }); };
        const wrapped = asyncHandler(handler);
        const res = { json: jest.fn() };
        wrapped({}, res, jest.fn());
        expect(res.json).toHaveBeenCalledWith({ ok: true });
    });

    test('passes req/res/next to handler', () => {
        const handler = jest.fn();
        const req = { a: 1 }, res = { b: 2 }, next = jest.fn();
        asyncHandler(handler)(req, res, next);
        expect(handler).toHaveBeenCalledWith(req, res, next);
    });
});
