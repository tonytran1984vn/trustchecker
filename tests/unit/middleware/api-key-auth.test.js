const { generateKey, hashKey, requireScope } = require('../../../server/middleware/api-key-auth');

describe('api-key-auth', () => {
    describe('generateKey', () => {
        test('returns key with tc_ prefix', () => {
            const { key } = generateKey();
            expect(key.startsWith('tc_')).toBe(true);
        });

        test('key is 67 chars (3 prefix + 64 hex)', () => {
            const { key } = generateKey();
            expect(key.length).toBe(67);
        });

        test('keyPrefix is first 8 chars', () => {
            const { key, keyPrefix } = generateKey();
            expect(keyPrefix).toBe(key.substring(0, 8));
        });

        test('keyHash is SHA-256 hex', () => {
            const { keyHash } = generateKey();
            expect(keyHash).toMatch(/^[a-f0-9]{64}$/);
        });

        test('different calls produce different keys', () => {
            const k1 = generateKey();
            const k2 = generateKey();
            expect(k1.key).not.toBe(k2.key);
        });
    });

    describe('hashKey', () => {
        test('produces hex hash', () => {
            expect(hashKey('test-key')).toMatch(/^[a-f0-9]{64}$/);
        });

        test('same input produces same hash', () => {
            expect(hashKey('same')).toBe(hashKey('same'));
        });

        test('different input produces different hash', () => {
            expect(hashKey('a')).not.toBe(hashKey('b'));
        });
    });

    describe('requireScope middleware', () => {
        function mockRes() {
            return { status: jest.fn().mockReturnThis(), json: jest.fn() };
        }

        test('passes through non-api_key auth', () => {
            const next = jest.fn();
            requireScope('read')({ authMethod: 'jwt', user: {} }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('allows wildcard scope (*)', () => {
            const next = jest.fn();
            requireScope('read')({ authMethod: 'api_key', user: { scopes: ['*'] } }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('allows matching scope', () => {
            const next = jest.fn();
            requireScope('read')({ authMethod: 'api_key', user: { scopes: ['read', 'write'] } }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('blocks missing scope', () => {
            const res = mockRes();
            requireScope('admin')({ authMethod: 'api_key', user: { scopes: ['read'] } }, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('blocks empty scopes', () => {
            const res = mockRes();
            requireScope('read')({ authMethod: 'api_key', user: { scopes: [] } }, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
});
