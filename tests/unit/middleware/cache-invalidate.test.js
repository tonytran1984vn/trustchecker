const { INVALIDATION_MAP } = require('../../../server/middleware/cache-invalidate');

describe('cache-invalidate', () => {
    describe('INVALIDATION_MAP', () => {
        test('products invalidates /api/products and /api/trust', () => {
            expect(INVALIDATION_MAP.products).toContain('/api/products');
            expect(INVALIDATION_MAP.products).toContain('/api/trust');
        });

        test('incidents invalidates /api/ops, /api/trust, /api/risk', () => {
            expect(INVALIDATION_MAP.incidents).toContain('/api/ops');
            expect(INVALIDATION_MAP.incidents).toContain('/api/trust');
            expect(INVALIDATION_MAP.incidents).toContain('/api/risk');
        });

        test('fraud invalidates /api/fraud, /api/trust, /api/risk', () => {
            expect(INVALIDATION_MAP.fraud).toContain('/api/fraud');
        });

        test('evidence invalidates /api/evidence and /api/compliance', () => {
            expect(INVALIDATION_MAP.evidence).toEqual(['/api/evidence', '/api/compliance']);
        });

        test('partners invalidates /api/scm/partners', () => {
            expect(INVALIDATION_MAP.partners).toContain('/api/scm/partners');
        });

        test('billing invalidates /api/billing', () => {
            expect(INVALIDATION_MAP.billing).toEqual(['/api/billing']);
        });

        test('users invalidates /api/admin', () => {
            expect(INVALIDATION_MAP.users).toContain('/api/admin');
        });

        test('risk invalidates /api/risk, /api/trust, /api/scm/models', () => {
            expect(INVALIDATION_MAP.risk).toContain('/api/scm/models');
        });
    });
});
