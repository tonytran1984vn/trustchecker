const tl = require('../../../server/engines/economics-engine/treasury-liquidity');
const TLClass = tl.constructor;

let engine;
beforeEach(() => { engine = new TLClass(); });

describe('TreasuryLiquidityEngine', () => {
    describe('calculateLCR', () => {
        test('default values produce healthy LCR', () => {
            const r = engine.calculateLCR();
            expect(r.lcr_pct).toBeGreaterThan(0);
            expect(r.meets_minimum).toBeDefined();
        });

        test('high HQLA meets minimum', () => {
            const r = engine.calculateLCR(
                { level_1: 500000, level_2a: 200000, level_2b: 100000 },
                { settlements: 200000, stake_returns: 50000, sla_credits: 10000, deductibles: 25000, opex_30d: 150000, regulatory: 20000 }
            );
            expect(r.meets_minimum).toBe(true);
            expect(r.status).not.toBe('UNKNOWN');
        });

        test('low HQLA fails minimum', () => {
            const r = engine.calculateLCR(
                { level_1: 50000, level_2a: 10000, level_2b: 5000 },
                { settlements: 200000, stake_returns: 50000, sla_credits: 10000, deductibles: 25000, opex_30d: 150000, regulatory: 20000 }
            );
            expect(r.meets_minimum).toBe(false);
        });

        test('level_2a has 15% haircut', () => {
            const r = engine.calculateLCR(
                { level_1: 0, level_2a: 100000, level_2b: 0 },
                { settlements: 50000 }
            );
            expect(r.hqla_adjusted).toBe(85000); // 100K * 0.85
        });

        test('level_2b has 50% haircut', () => {
            const r = engine.calculateLCR(
                { level_1: 0, level_2a: 0, level_2b: 100000 },
                { settlements: 50000 }
            );
            expect(r.hqla_adjusted).toBe(50000); // 100K * 0.50
        });
    });

    describe('runCashWaterfall', () => {
        test('fully funded waterfall', () => {
            const r = engine.runCashWaterfall(1000000);
            expect(r.stress_mode).toBe(false);
            expect(r.remaining_after_waterfall).toBeGreaterThan(0);
        });

        test('unfunded waterfall triggers stress mode', () => {
            const r = engine.runCashWaterfall(100000);
            expect(r.stress_mode).toBe(true);
        });

        test('priority 1 always funded first', () => {
            const r = engine.runCashWaterfall(200000);
            expect(r.allocation[0].fully_funded).toBe(true);
        });

        test('low priority items have shortfall', () => {
            const r = engine.runCashWaterfall(300000);
            const lastItem = r.allocation[r.allocation.length - 1];
            expect(lastItem.shortfall).toBeGreaterThan(0);
        });
    });

    describe('getLCRModel', () => {
        test('minimum is 100%', () => {
            expect(engine.getLCRModel().minimum_pct).toBe(100);
        });

        test('has 3 HQLA categories', () => {
            expect(Object.keys(engine.getLCRModel().hqla_categories).length).toBe(3);
        });
    });

    describe('getIntradayModel', () => {
        test('has 6 monitoring points', () => {
            expect(engine.getIntradayModel().monitoring_points.length).toBe(6);
        });
    });

    describe('getCashWaterfall', () => {
        test('has 9 priority tiers', () => {
            expect(engine.getCashWaterfall().priority_tiers.length).toBe(9);
        });
    });

    describe('getInvestmentPolicy', () => {
        test('has 4 eligible investment types', () => {
            expect(engine.getInvestmentPolicy().eligible_investments.length).toBe(4);
        });

        test('has 5 prohibited investments', () => {
            expect(engine.getInvestmentPolicy().prohibited.length).toBe(5);
        });
    });

    describe('getFullFramework', () => {
        test('returns version 1.0', () => {
            expect(engine.getFullFramework().version).toBe('1.0');
        });
    });
});
