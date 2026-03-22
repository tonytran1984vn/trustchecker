const { PLANS, USAGE_PRICING, checkLimit, calculateOverageCost } = require('../../../server/engines/infrastructure/pricing-engine');

describe('PricingEngine', () => {
    describe('PLANS', () => {
        test('has 5 plans', () => {
            expect(Object.keys(PLANS).length).toBe(5);
        });

        test('free plan has no price', () => {
            expect(PLANS.free.price_monthly).toBe(0);
            expect(PLANS.free.overage_enabled).toBe(false);
        });

        test('starter plan costs $49', () => {
            expect(PLANS.starter.price_monthly).toBe(49);
        });

        test('pro plan costs $199', () => {
            expect(PLANS.pro.price_monthly).toBe(199);
        });

        test('business plan costs $499', () => {
            expect(PLANS.business.price_monthly).toBe(499);
        });

        test('enterprise has unlimited limits', () => {
            expect(PLANS.enterprise.limits.scans).toBe(-1);
            expect(PLANS.enterprise.limits.api_calls).toBe(-1);
        });
    });

    describe('checkLimit', () => {
        test('free plan within limit', () => {
            const r = checkLimit('free', 'scans', 50);
            expect(r.allowed).toBe(true);
            expect(r.overage).toBe(0);
        });

        test('free plan exceeds limit — blocked', () => {
            const r = checkLimit('free', 'scans', 200);
            expect(r.allowed).toBe(false);
            expect(r.overage).toBe(100);
        });

        test('starter plan exceeds limit — overage enabled', () => {
            const r = checkLimit('starter', 'scans', 6000);
            expect(r.allowed).toBe(true);
            expect(r.overage).toBe(1000);
        });

        test('enterprise is unlimited', () => {
            const r = checkLimit('enterprise', 'scans', 999999);
            expect(r.allowed).toBe(true);
            expect(r.limit).toBe(-1);
        });

        test('unknown plan defaults to free', () => {
            const r = checkLimit('nonexistent', 'scans', 200);
            expect(r.allowed).toBe(false);
        });

        test('nft_mints limit for free plan', () => {
            const r = checkLimit('free', 'nft_mints', 1);
            expect(r.allowed).toBe(false);
        });
    });

    describe('calculateOverageCost', () => {
        test('scans tier 1 pricing', () => {
            const r = calculateOverageCost('scans', 500);
            expect(r.cost).toBe(5); // 500 × $0.01
        });

        test('zero overage returns 0', () => {
            const r = calculateOverageCost('scans', 0);
            expect(r.cost).toBe(0);
        });

        test('unknown type returns 0', () => {
            const r = calculateOverageCost('unknown', 100);
            expect(r.cost).toBe(0);
        });

        test('nft_mints pricing', () => {
            const r = calculateOverageCost('nft_mints', 50);
            expect(r.cost).toBe(25); // 50 × $0.50
        });
    });

    describe('USAGE_PRICING', () => {
        test('has 4 pricing categories', () => {
            expect(Object.keys(USAGE_PRICING).length).toBe(4);
        });

        test('scans has 4 tiers', () => {
            expect(USAGE_PRICING.scans.tiers.length).toBe(4);
        });

        test('api_calls has 3 tiers', () => {
            expect(USAGE_PRICING.api_calls.tiers.length).toBe(3);
        });
    });
});
