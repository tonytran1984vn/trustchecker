const fd = require('../../../server/engines/economics-engine/fee-distribution');
const FDClass = fd.constructor;

let engine;
beforeEach(() => { engine = new FDClass(); });

describe('FeeDistributionEngine', () => {
    describe('getDistributionPolicy', () => {
        test('splits sum to 100%', () => {
            const p = engine.getDistributionPolicy();
            expect(p.platform_pct + p.validator_pool_pct + p.reserve_pct).toBe(100);
        });

        test('min payout is $10', () => {
            expect(engine.getDistributionPolicy().min_payout).toBe(10);
        });
    });

    describe('getPartnerTiers', () => {
        test('returns 4 tiers', () => {
            expect(Object.keys(engine.getPartnerTiers()).length).toBe(4);
        });
    });

    describe('getRegionScarcity', () => {
        test('Africa has highest scarcity', () => {
            const rs = engine.getRegionScarcity();
            expect(rs['af-south']).toBe(2.0);
            expect(rs['us-east']).toBe(0.7);
        });
    });

    describe('calculateValidatorDistribution', () => {
        const validators = [
            { node_id: 'v1', name: 'V1', trust_score: 90, rounds_participated: 500, uptime_pct: 99, region: 'ap-southeast' },
            { node_id: 'v2', name: 'V2', trust_score: 70, rounds_participated: 200, uptime_pct: 95, region: 'eu-west' },
            { node_id: 'v3', name: 'V3', trust_score: 85, rounds_participated: 800, uptime_pct: 98, region: 'af-south' },
        ];

        test('distributes 20% of revenue', () => {
            const r = engine.calculateValidatorDistribution(10000, validators);
            expect(r.pool).toBe(2000);
            expect(r.validators_count).toBe(3);
        });

        test('total distribution adds up', () => {
            const r = engine.calculateValidatorDistribution(10000, validators);
            const total = r.distributions.reduce((a, d) => a + d.amount, 0);
            expect(total).toBeCloseTo(2000, 0);
        });

        test('african validator gets region bonus', () => {
            const r = engine.calculateValidatorDistribution(10000, validators);
            const v3 = r.distributions.find(d => d.node_id === 'v3');
            expect(v3.region_weight).toBe(2.0);
        });

        test('no validators returns empty', () => {
            const r = engine.calculateValidatorDistribution(10000, []);
            expect(r.message).toContain('No eligible');
        });

        test('updates validator balances', () => {
            engine.calculateValidatorDistribution(10000, validators);
            const bals = engine.getValidatorBalances();
            expect(bals.total_earned).toBeGreaterThan(0);
        });
    });

    describe('calculatePartnerRevenue', () => {
        test('bronze tier for low volume', () => {
            const r = engine.calculatePartnerRevenue('p1', 10, 1000);
            expect(r.tier).toBe('bronze');
            expect(r.total_payout).toBe(100); // 10%
        });

        test('silver tier with bonus', () => {
            const r = engine.calculatePartnerRevenue('p1', 100, 1000);
            expect(r.tier).toBe('silver');
            expect(r.bonus).toBeGreaterThan(0);
        });

        test('platinum tier for high volume', () => {
            const r = engine.calculatePartnerRevenue('p1', 2000, 10000);
            expect(r.tier).toBe('platinum');
            expect(r.total_payout).toBeGreaterThan(2000);
        });
    });

    describe('getRevenueBreakdown', () => {
        test('splits $100K correctly', () => {
            const r = engine.getRevenueBreakdown(100000);
            expect(r.platform.amount).toBe(70000);
            expect(r.validator_pool.amount).toBe(20000);
            expect(r.reserve.amount).toBe(10000);
        });
    });

    describe('processPayout', () => {
        test('pays out validator balance', () => {
            engine.calculateValidatorDistribution(10000, [
                { node_id: 'v1', trust_score: 90, rounds_participated: 500, uptime_pct: 99, region: 'us-east' },
            ]);
            const r = engine.processPayout('validator', 'v1');
            expect(r.status).toBe('payout_processed');
            expect(r.payout.amount).toBeGreaterThan(0);
        });

        test('rejects below minimum', () => {
            engine.calculateValidatorDistribution(10, [
                { node_id: 'v1', trust_score: 90, rounds_participated: 500, uptime_pct: 99, region: 'us-east' },
            ]);
            const r = engine.processPayout('validator', 'v1');
            expect(r.error).toContain('below minimum');
        });

        test('rejects unknown entity', () => {
            const r = engine.processPayout('validator', 'unknown');
            expect(r.error).toBeDefined();
        });
    });
});
