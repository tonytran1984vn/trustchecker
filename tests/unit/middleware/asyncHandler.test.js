const { asyncHandler } = require('../../../server/middleware/asyncHandler');

describe('asyncHandler', () => {
    test('calls handler and resolves normally', async () => {
        const handler = jest.fn().mockResolvedValue(undefined);
        const wrapped = asyncHandler(handler);
        const req = {}, res = {}, next = jest.fn();
        await wrapped(req, res, next);
        expect(handler).toHaveBeenCalledWith(req, res, next);
    });

    test('catches async errors and calls next(err)', async () => {
        const err = new Error('Async boom');
        const handler = jest.fn().mockRejectedValue(err);
        const wrapped = asyncHandler(handler);
        const next = jest.fn();
        await wrapped({}, {}, next);
        expect(next).toHaveBeenCalledWith(err);
    });

    test('returns a function', () => {
        const wrapped = asyncHandler(() => {});
        expect(typeof wrapped).toBe('function');
    });

    test('wraps the handler with Promise.resolve', async () => {
        const handler = jest.fn().mockResolvedValue('result');
        const wrapped = asyncHandler(handler);
        const next = jest.fn();
        await wrapped({}, {}, next);
        // next should NOT have been called (no error)
        expect(next).not.toHaveBeenCalled();
    });
});
