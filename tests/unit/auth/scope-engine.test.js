const {
    SCOPE_BYPASS_ROLES, _shouldBypassScope,
    requireScope, scopeFilter, clearScopeCache,
} = require('../../../server/auth/scope-engine');

describe('scope-engine', () => {
    describe('SCOPE_BYPASS_ROLES', () => {
        test('is a Set', () => { expect(SCOPE_BYPASS_ROLES).toBeInstanceOf(Set); });
        test('contains super_admin', () => { expect(SCOPE_BYPASS_ROLES.has('super_admin')).toBe(true); });
        test('contains company_admin', () => { expect(SCOPE_BYPASS_ROLES.has('company_admin')).toBe(true); });
        test('contains org_owner', () => { expect(SCOPE_BYPASS_ROLES.has('org_owner')).toBe(true); });
        test('contains compliance_officer', () => { expect(SCOPE_BYPASS_ROLES.has('compliance_officer')).toBe(true); });
        test('contains risk_officer', () => { expect(SCOPE_BYPASS_ROLES.has('risk_officer')).toBe(true); });
        test('does not contain viewer', () => { expect(SCOPE_BYPASS_ROLES.has('viewer')).toBe(false); });
        test('does not contain operator', () => { expect(SCOPE_BYPASS_ROLES.has('operator')).toBe(false); });
    });

    describe('_shouldBypassScope', () => {
        test('bypasses for platform user', () => {
            expect(_shouldBypassScope({ user: { user_type: 'platform' } })).toBe(true);
        });
        test('bypasses for super_admin role', () => {
            expect(_shouldBypassScope({ user: { role: 'super_admin' } })).toBe(true);
        });
        test('bypasses for owner context', () => {
            expect(_shouldBypassScope({ user: {}, membership: { role_context: 'owner' } })).toBe(true);
        });
        test('bypasses for admin context', () => {
            expect(_shouldBypassScope({ user: {}, membership: { role_context: 'admin' } })).toBe(true);
        });
        test('bypasses for array roles with bypass role', () => {
            expect(_shouldBypassScope({ user: { roles: ['company_admin'] } })).toBe(true);
        });
        test('does not bypass for viewer', () => {
            expect(_shouldBypassScope({ user: { roles: ['viewer'], user_type: 'org' } })).toBe(false);
        });
        test('does not bypass for null user', () => {
            expect(_shouldBypassScope({ user: null })).toBe(false);
        });
    });

    describe('requireScope middleware', () => {
        test('returns a function', () => { expect(typeof requireScope('supplier')).toBe('function'); });
        test('middleware is async', () => {
            const fn = requireScope('supplier');
            expect(fn.constructor.name).toBe('AsyncFunction');
        });
    });

    describe('scopeFilter middleware', () => {
        test('returns a function', () => { expect(typeof scopeFilter('supplier')).toBe('function'); });
    });

    describe('clearScopeCache', () => {
        test('does not throw with null', () => {
            expect(() => clearScopeCache(null)).not.toThrow();
        });
        test('does not throw with string', () => {
            expect(() => clearScopeCache('test-id')).not.toThrow();
        });
    });
});
