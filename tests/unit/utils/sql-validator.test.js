const { isValidTableName, isValidColumnName, buildSafeQuery, buildSafeOrderBy, VALID_TABLES } = require('../../../server/utils/sql-validator');

describe('sql-validator', () => {
    describe('VALID_TABLES', () => {
        test('is a Set', () => { expect(VALID_TABLES).toBeInstanceOf(Set); });
        test('contains products', () => { expect(VALID_TABLES.has('products')).toBe(true); });
        test('contains users', () => { expect(VALID_TABLES.has('users')).toBe(true); });
        test('contains audit_log', () => { expect(VALID_TABLES.has('audit_log')).toBe(true); });
        test('contains organizations', () => { expect(VALID_TABLES.has('organizations')).toBe(true); });
        test('does not contain random_table', () => { expect(VALID_TABLES.has('random_table')).toBe(false); });
        test('has at least 20 tables', () => { expect(VALID_TABLES.size).toBeGreaterThanOrEqual(20); });
    });

    describe('isValidTableName', () => {
        test('returns true for valid table', () => { expect(isValidTableName('products')).toBe(true); });
        test('returns false for invalid table', () => { expect(isValidTableName('drop_table')).toBe(false); });
        test('returns false for null', () => { expect(isValidTableName(null)).toBe(false); });
        test('returns false for empty', () => { expect(isValidTableName('')).toBe(false); });
        test('returns false for number', () => { expect(isValidTableName(123)).toBe(false); });
    });

    describe('isValidColumnName', () => {
        test('allows alphanumeric', () => { expect(isValidColumnName('name')).toBe(true); });
        test('allows underscores', () => { expect(isValidColumnName('created_at')).toBe(true); });
        test('allows leading underscore', () => { expect(isValidColumnName('_id')).toBe(true); });
        test('rejects leading digit', () => { expect(isValidColumnName('1col')).toBe(false); });
        test('rejects special chars', () => { expect(isValidColumnName('col;')).toBe(false); });
        test('rejects spaces', () => { expect(isValidColumnName('col name')).toBe(false); });
        test('rejects null', () => { expect(isValidColumnName(null)).toBe(false); });
        test('rejects empty', () => { expect(isValidColumnName('')).toBe(false); });
        test('rejects SQL injection', () => { expect(isValidColumnName("name'; DROP")).toBe(false); });
    });

    describe('buildSafeQuery', () => {
        test('builds SELECT for valid table', () => {
            const result = buildSafeQuery('products');
            expect(result.sql).toBe('SELECT * FROM products');
            expect(result.params).toEqual([]);
        });

        test('throws for invalid table', () => {
            expect(() => buildSafeQuery('invalid_table')).toThrow('Invalid table name');
        });

        test('adds WHERE for conditions', () => {
            const result = buildSafeQuery('products', { status: 'active' });
            expect(result.sql).toContain('WHERE');
            expect(result.sql).toContain('status = ?');
            expect(result.params).toContain('active');
        });

        test('adds org_id filter', () => {
            const result = buildSafeQuery('products', {}, 'org-123');
            expect(result.sql).toContain('org_id = ?');
            expect(result.params).toContain('org-123');
        });

        test('throws for invalid column', () => {
            expect(() => buildSafeQuery('products', { 'bad;col': 1 })).toThrow('Invalid column name');
        });

        test('combines org_id and conditions', () => {
            const result = buildSafeQuery('products', { name: 'test' }, 'org-1');
            expect(result.params.length).toBe(2);
        });
    });

    describe('buildSafeOrderBy', () => {
        test('builds ASC order', () => {
            expect(buildSafeOrderBy('name')).toContain('ORDER BY name ASC');
        });

        test('builds DESC order', () => {
            expect(buildSafeOrderBy('created_at', 'DESC')).toContain('ORDER BY created_at DESC');
        });

        test('throws for invalid column', () => {
            expect(() => buildSafeOrderBy('bad;col')).toThrow('Invalid column name');
        });

        test('defaults invalid direction to ASC', () => {
            expect(buildSafeOrderBy('name', 'INVALID')).toContain('ASC');
        });
    });
});
