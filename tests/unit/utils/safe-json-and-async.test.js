const { safeParse } = require('../../../server/utils/safe-json');
const { asyncHandler } = require('../../../server/utils/async-wrap');

describe('safe-json', () => {
    describe('safeParse', () => {
        test('parses valid JSON', () => {
            expect(safeParse('{"a":1}')).toEqual({ a: 1 });
        });
        test('returns fallback for invalid JSON', () => {
            expect(safeParse('not json')).toBeNull();
        });
        test('returns null by default for invalid JSON', () => {
            expect(safeParse('{bad')).toBeNull();
        });
        test('returns custom fallback for invalid JSON', () => {
            expect(safeParse('bad', {})).toEqual({});
        });
        test('returns fallback for null input', () => {
            expect(safeParse(null, 'default')).toBe('default');
        });
        test('returns fallback for undefined input', () => {
            expect(safeParse(undefined, [])).toEqual([]);
        });
        test('parses array JSON', () => {
            expect(safeParse('[1,2,3]')).toEqual([1, 2, 3]);
        });
        test('parses nested JSON', () => {
            expect(safeParse('{"a":{"b":2}}')).toEqual({ a: { b: 2 } });
        });
        test('parses string JSON', () => {
            expect(safeParse('"hello"')).toBe('hello');
        });
        test('parses number JSON', () => {
            expect(safeParse('42')).toBe(42);
        });
        test('parses boolean JSON', () => {
            expect(safeParse('true')).toBe(true);
        });
        test('parses null JSON', () => {
            expect(safeParse('null')).toBeNull();
        });
    });
});

describe('async-wrap', () => {
    describe('asyncHandler', () => {
        test('returns a function', () => {
            expect(typeof asyncHandler(() => {})).toBe('function');
        });
        test('returned function has 3 params (req, res, next)', () => {
            expect(asyncHandler(() => {}).length).toBe(3);
        });
        test('calls next on rejection', async () => {
            const error = new Error('test error');
            const fn = asyncHandler(async () => { throw error; });
            const next = jest.fn();
            await fn({}, {}, next);
            expect(next).toHaveBeenCalledWith(error);
        });
        test('resolves without calling next on success', async () => {
            const fn = asyncHandler(async (req, res) => { res.json({ ok: true }); });
            const res = { json: jest.fn() };
            const next = jest.fn();
            await fn({}, res, next);
            expect(res.json).toHaveBeenCalledWith({ ok: true });
            expect(next).not.toHaveBeenCalled();
        });
        test('passes req, res, next to handler', async () => {
            const handler = jest.fn().mockResolvedValue(undefined);
            const fn = asyncHandler(handler);
            const req = { a: 1 }, res = { b: 2 }, next = jest.fn();
            await fn(req, res, next);
            expect(handler).toHaveBeenCalledWith(req, res, next);
        });
    });
});
