const { sanitizeValue, containsDangerousPattern, requestSanitizer } = require('../../../server/middleware/request-sanitizer');

describe('sanitizeValue', () => {
    test('passes null/undefined', () => {
        expect(sanitizeValue(null)).toBeNull();
        expect(sanitizeValue(undefined)).toBeUndefined();
    });

    test('passes strings unchanged', () => {
        expect(sanitizeValue('hello')).toBe('hello');
    });

    test('truncates long strings', () => {
        const long = 'x'.repeat(60000);
        expect(sanitizeValue(long).length).toBe(50000);
    });

    test('passes numbers unchanged', () => {
        expect(sanitizeValue(42)).toBe(42);
    });

    test('sanitizes arrays', () => {
        expect(sanitizeValue([1, 'a', null])).toEqual([1, 'a', null]);
    });

    test('truncates long arrays', () => {
        const arr = new Array(1500).fill(1);
        expect(sanitizeValue(arr).length).toBe(1000);
    });

    test('removes prototype pollution key __proto__', () => {
        // Using Object.create to have a polluted proto key in entries
        const obj = JSON.parse('{"__proto__": {"hack": true}, "name": "ok"}');
        const clean = sanitizeValue(obj);
        expect(clean.name).toBe('ok');
        expect(clean.hack).toBeUndefined();
    });

    test('removes constructor key from sanitized output', () => {
        const obj = JSON.parse('{"constructor": "hack", "name": "ok"}');
        const clean = sanitizeValue(obj);
        expect(clean.name).toBe('ok');
        // constructor key should be stripped by sanitizer
        expect(Object.prototype.hasOwnProperty.call(clean, 'constructor')).toBe(false);
    });

    test('removes prototype key', () => {
        const obj = JSON.parse('{"prototype": "hack", "name": "ok"}');
        const clean = sanitizeValue(obj);
        expect(Object.prototype.hasOwnProperty.call(clean, 'prototype')).toBe(false);
    });

    test('handles nested objects', () => {
        const clean = sanitizeValue({ a: { b: { c: 'deep' } } });
        expect(clean.a.b.c).toBe('deep');
    });

    test('returns undefined for too-deep nesting', () => {
        let obj = 'leaf';
        for (let i = 0; i < 15; i++) obj = { nested: obj };
        const clean = sanitizeValue(obj);
        // At depth > MAX_JSON_DEPTH (10), values become undefined
        let curr = clean;
        let hitUndefined = false;
        for (let i = 0; i < 12; i++) {
            if (!curr || curr.nested === undefined) { hitUndefined = true; break; }
            curr = curr.nested;
        }
        expect(hitUndefined).toBe(true);
    });
});

describe('containsDangerousPattern', () => {
    test('detects SQL injection (INSERT INTO)', () => {
        expect(containsDangerousPattern('INSERT INTO users VALUES')).toBe(true);
    });

    test('detects DELETE FROM', () => {
        expect(containsDangerousPattern('DELETE FROM users')).toBe(true);
    });

    test('detects DROP TABLE', () => {
        expect(containsDangerousPattern('DROP TABLE users')).toBe(true);
    });

    test('detects <script> tags', () => {
        expect(containsDangerousPattern('<script>alert(1)</script>')).toBe(true);
    });

    test('detects javascript:', () => {
        expect(containsDangerousPattern('javascript:alert(1)')).toBe(true);
    });

    test('detects onerror=', () => {
        expect(containsDangerousPattern('<img onerror=alert(1)>')).toBe(true);
    });

    test('detects eval(', () => {
        expect(containsDangerousPattern('eval(something)')).toBe(true);
    });

    test('detects document.cookie', () => {
        expect(containsDangerousPattern('document.cookie')).toBe(true);
    });

    test('safe strings pass', () => {
        expect(containsDangerousPattern('Normal safe text')).toBe(false);
    });

    test('detects patterns in nested objects', () => {
        expect(containsDangerousPattern({ a: { b: 'ALTER TABLE users' } })).toBe(true);
    });

    test('detects patterns in arrays', () => {
        expect(containsDangerousPattern(['safe', '<script>'])).toBe(true);
    });

    test('handles null/undefined/numbers', () => {
        expect(containsDangerousPattern(null)).toBe(false);
        expect(containsDangerousPattern(123)).toBe(false);
    });
});

describe('requestSanitizer middleware', () => {
    const mw = requestSanitizer();

    function mockReq(method = 'POST', body = {}, headers = {}) {
        return { method, body, query: {}, headers: { 'content-type': 'application/json', ...headers } };
    }

    function mockRes() {
        return { status: jest.fn().mockReturnThis(), json: jest.fn() };
    }

    test('skips GET requests', () => {
        const next = jest.fn();
        mw({ method: 'GET', query: {} }, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('allows safe POST body', () => {
        const next = jest.fn();
        mw(mockReq('POST', { name: 'safe value' }), mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('blocks dangerous POST body (SQL injection)', () => {
        const res = mockRes();
        mw(mockReq('POST', { query: "INSERT INTO users VALUES" }), res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('rejects unsupported content type', () => {
        const res = mockRes();
        mw(mockReq('POST', { data: 'x' }, { 'content-type': 'text/plain' }), res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(415);
    });

    test('strips prototype pollution keys from body', () => {
        const body = JSON.parse('{"name": "ok", "constructor": "hack", "prototype": "hack"}');
        const req = mockReq('POST', body);
        const next = jest.fn();
        mw(req, mockRes(), next);
        expect(Object.prototype.hasOwnProperty.call(req.body, 'constructor')).toBe(false);
        expect(Object.prototype.hasOwnProperty.call(req.body, 'prototype')).toBe(false);
        expect(req.body.name).toBe('ok');
    });

    test('processes PUT requests', () => {
        const res = mockRes();
        mw({ ...mockReq('PUT', { q: "DROP TABLE users" }) }, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);
    });
});
