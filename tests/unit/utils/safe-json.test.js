const { safeParse } = require('../../../server/utils/safe-json');

describe('safeParse', () => {
    test('parses valid JSON string', () => {
        expect(safeParse('{"key":"value"}')).toEqual({ key: 'value' });
    });

    test('parses valid JSON array', () => {
        expect(safeParse('[1,2,3]')).toEqual([1, 2, 3]);
    });

    test('parses JSON number', () => {
        expect(safeParse('42')).toBe(42);
    });

    test('parses JSON boolean', () => {
        expect(safeParse('true')).toBe(true);
        expect(safeParse('false')).toBe(false);
    });

    test('parses JSON null', () => {
        expect(safeParse('null')).toBeNull();
    });

    test('returns fallback for invalid JSON', () => {
        expect(safeParse('{invalid}')).toBeNull();
        expect(safeParse('not json')).toBeNull();
        expect(safeParse('{key: value}')).toBeNull();
    });

    test('returns custom fallback for invalid JSON', () => {
        expect(safeParse('{invalid}', {})).toEqual({});
        expect(safeParse('{invalid}', [])).toEqual([]);
        expect(safeParse('{invalid}', 'default')).toBe('default');
    });

    test('returns fallback for null input', () => {
        expect(safeParse(null)).toBeNull();
        expect(safeParse(null, 'default')).toBe('default');
    });

    test('returns fallback for undefined input', () => {
        expect(safeParse(undefined)).toBeNull();
        expect(safeParse(undefined, 42)).toBe(42);
    });

    test('parses empty object', () => {
        expect(safeParse('{}')).toEqual({});
    });

    test('parses empty array', () => {
        expect(safeParse('[]')).toEqual([]);
    });

    test('parses nested JSON', () => {
        const input = '{"a":{"b":{"c":1}}}';
        expect(safeParse(input)).toEqual({ a: { b: { c: 1 } } });
    });
});
