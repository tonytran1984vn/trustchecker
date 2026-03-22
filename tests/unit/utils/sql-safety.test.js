const { _safeId, _safeWhere, _safeDate, _safeJoin, _safeOrderBy, _safeLimit } = require('../../../server/utils/sql-safety');

describe('sql-safety', () => {
    describe('_safeId', () => {
        test('allows alphanumeric', () => { expect(_safeId('users')).toBe('users'); });
        test('allows underscores', () => { expect(_safeId('user_name')).toBe('user_name'); });
        test('strips special chars', () => { expect(_safeId('users;--')).toBe('users'); });
        test('strips spaces', () => { expect(_safeId('user name')).toBe('username'); });
        test('returns empty for null', () => { expect(_safeId(null)).toBe(''); });
        test('returns empty for undefined', () => { expect(_safeId(undefined)).toBe(''); });
        test('strips SQL injection', () => { expect(_safeId("users'; DROP TABLE--")).toBe('usersDROPTABLE'); });
    });

    describe('_safeWhere', () => {
        test('returns condition as-is for safe input', () => {
            expect(_safeWhere('status = 1')).toBe('status = 1');
        });
        test('blocks SQL comments (--)', () => {
            expect(_safeWhere('1=1--')).toBe('1=0');
        });
        test('blocks semicolons', () => {
            expect(_safeWhere('1=1;')).toBe('1=0');
        });
        test('blocks /* comments */', () => {
            expect(_safeWhere('1=1/*')).toBe('1=0');
        });
        test('blocks xp_ commands', () => {
            expect(_safeWhere('xp_cmdshell')).toBe('1=0');
        });
        test('returns 1=1 for null', () => {
            expect(_safeWhere(null)).toBe('1=1');
        });
        test('returns 1=1 for empty', () => {
            expect(_safeWhere('')).toBe('1=1');
        });
    });

    describe('_safeDate', () => {
        test('returns ISO string for valid date', () => {
            const r = _safeDate('2024-01-15');
            expect(r).toContain('2024-01-15');
        });
        test('returns null for null', () => {
            expect(_safeDate(null)).toBeNull();
        });
        test('returns null for invalid date', () => {
            expect(_safeDate('not-a-date')).toBeNull();
        });
        test('returns null for empty', () => {
            expect(_safeDate('')).toBeNull();
        });
        test('returns ISO format', () => {
            const r = _safeDate('2024-06-15T10:30:00Z');
            expect(r).toMatch(/\d{4}-\d{2}-\d{2}T/);
        });
    });

    describe('_safeJoin', () => {
        test('allows normal join condition', () => {
            expect(_safeJoin('a.id = b.id')).toBe('a.id = b.id');
        });
        test('returns empty for null', () => {
            expect(_safeJoin(null)).toBe('');
        });
        test('strips dangerous characters', () => {
            const r = _safeJoin('a.id = b.id; DROP TABLE');
            expect(r).not.toContain(';');
        });
    });

    describe('_safeOrderBy', () => {
        test('returns column ASC by default', () => {
            expect(_safeOrderBy('name')).toBe('name ASC');
        });
        test('respects DESC', () => {
            expect(_safeOrderBy('created_at', 'DESC')).toBe('created_at DESC');
        });
        test('defaults to ASC for invalid direction', () => {
            expect(_safeOrderBy('id', 'INVALID')).toBe('id ASC');
        });
        test('sanitizes column name', () => {
            expect(_safeOrderBy('name;--')).toBe('name ASC');
        });
    });

    describe('_safeLimit', () => {
        test('returns valid number', () => {
            expect(_safeLimit(25)).toBe(25);
        });
        test('caps at max', () => {
            expect(_safeLimit(5000)).toBe(1000);
        });
        test('returns fallback for NaN', () => {
            expect(_safeLimit('abc')).toBe(50);
        });
        test('returns fallback for 0', () => {
            expect(_safeLimit(0)).toBe(50);
        });
        test('returns fallback for negative', () => {
            expect(_safeLimit(-5)).toBe(50);
        });
        test('custom max', () => {
            expect(_safeLimit(500, 100)).toBe(100);
        });
        test('custom fallback', () => {
            expect(_safeLimit('x', 1000, 10)).toBe(10);
        });
    });
});
