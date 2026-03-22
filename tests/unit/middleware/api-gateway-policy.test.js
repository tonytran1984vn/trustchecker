const { QuotaManager, APIKeyManager, sanitizeResponse } = require('../../../server/middleware/api-gateway-policy');

describe('QuotaManager', () => {
    let qm;
    beforeEach(() => { qm = new QuotaManager(); });

    test('allows first request', () => {
        const r = qm.check('org-1', 'free');
        expect(r.allowed).toBe(true);
    });

    test('tracks daily count', () => {
        qm.check('org-2', 'free');
        qm.check('org-2', 'free');
        const r = qm.check('org-2', 'free');
        expect(r.daily.used).toBe(3);
    });

    test('blocks when daily limit exceeded', () => {
        // Starter plan: 1000 daily
        for (let i = 0; i < 1000; i++) qm.check('org-limit', 'starter');
        const r = qm.check('org-limit', 'starter');
        expect(r.allowed).toBe(false);
        expect(r.reason).toContain('Daily');
    });

    test('different plans have different limits', () => {
        const free = qm.check('org-f', 'free');
        expect(free.daily.limit).toBe(10000);
        const ent = qm.check('org-e', 'enterprise');
        expect(ent.daily.limit).toBe(100000);
    });

    test('returns remaining count', () => {
        const r = qm.check('org-rem', 'free');
        expect(r.daily.remaining).toBe(10000 - 1);
    });

    test('getUsage returns null for unknown org', () => {
        expect(qm.getUsage('unknown')).toBeNull();
    });

    test('getUsage returns data for tracked org', () => {
        qm.check('org-usage', 'free');
        expect(qm.getUsage('org-usage')).toBeDefined();
    });
});

describe('APIKeyManager', () => {
    let km;
    beforeEach(() => { km = new APIKeyManager(); });

    test('registers key with tc_ prefix', () => {
        const key = km.register('org-1');
        expect(key.startsWith('tc_')).toBe(true);
    });

    test('validates registered key', () => {
        const key = km.register('org-1');
        const r = km.validate(key);
        expect(r.valid).toBe(true);
        expect(r.orgId).toBe('org-1');
    });

    test('rejects invalid key', () => {
        expect(km.validate('fake-key').valid).toBe(false);
    });

    test('default scopes are [read]', () => {
        const key = km.register('org-1');
        expect(km.validate(key).scopes).toEqual(['read']);
    });

    test('custom scopes', () => {
        const key = km.register('org-1', { scopes: ['read', 'write'] });
        expect(km.validate(key).scopes).toContain('write');
    });

    test('IP whitelist blocks', () => {
        const key = km.register('org-1', { ipWhitelist: ['1.1.1.1'] });
        expect(km.validate(key, '2.2.2.2').valid).toBe(false);
    });

    test('IP whitelist allows', () => {
        const key = km.register('org-1', { ipWhitelist: ['1.1.1.1'] });
        expect(km.validate(key, '1.1.1.1').valid).toBe(true);
    });

    test('IP blacklist blocks', () => {
        const key = km.register('org-1', { ipBlacklist: ['3.3.3.3'] });
        expect(km.validate(key, '3.3.3.3').valid).toBe(false);
    });

    test('checkScope validates scope', () => {
        const key = km.register('org-1', { scopes: ['read'] });
        expect(km.checkScope(key, 'read')).toBe(true);
        expect(km.checkScope(key, 'write')).toBe(false);
    });

    test('admin scope bypasses all', () => {
        const key = km.register('org-1', { scopes: ['admin'] });
        expect(km.checkScope(key, 'write')).toBe(true);
    });

    test('revoke deletes key', () => {
        const key = km.register('org-1');
        expect(km.revoke(key)).toBe(true);
        expect(km.validate(key).valid).toBe(false);
    });

    test('getStats', () => {
        km.register('org-1');
        expect(km.getStats().totalKeys).toBe(1);
    });
});

describe('sanitizeResponse', () => {
    test('removes password_hash', () => {
        expect(sanitizeResponse({ name: 'test', password_hash: 'xxx' })).toEqual({ name: 'test' });
    });

    test('removes password', () => {
        expect(sanitizeResponse({ password: 'secret' })).toEqual({});
    });

    test('removes mfa_secret', () => {
        expect(sanitizeResponse({ mfa_secret: 'totp123' })).toEqual({});
    });

    test('removes api_secret', () => {
        expect(sanitizeResponse({ api_secret: 'key' })).toEqual({});
    });

    test('removes refresh_token', () => {
        expect(sanitizeResponse({ refresh_token: 'rt_xxx' })).toEqual({});
    });

    test('keeps _id', () => {
        expect(sanitizeResponse({ _id: '123', name: 'ok' })._id).toBe('123');
    });

    test('removes underscore-prefixed keys (except _id)', () => {
        expect(sanitizeResponse({ _internal: 'hidden', name: 'ok' })._internal).toBeUndefined();
    });

    test('handles arrays', () => {
        const r = sanitizeResponse([{ name: 'a', password: 'x' }, { name: 'b' }]);
        expect(r).toEqual([{ name: 'a' }, { name: 'b' }]);
    });

    test('handles null/undefined', () => {
        expect(sanitizeResponse(null)).toBeNull();
        expect(sanitizeResponse(undefined)).toBeUndefined();
    });

    test('handles nested objects', () => {
        const r = sanitizeResponse({ user: { name: 'x', password_hash: 'y' } });
        expect(r.user.password_hash).toBeUndefined();
    });
});
