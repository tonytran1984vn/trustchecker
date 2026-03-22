const er = require('../../../server/engines/economics-engine/economic-risk');
const ERClass = er.constructor;

let engine;
beforeEach(() => { engine = new ERClass(); });

describe('EconomicRiskEngine', () => {
    describe('scoreOrg', () => {
        test('high-performer gets Platinum', () => {
            const r = engine.scoreOrg(95, 98, 99, 15, 90, 85);
            expect(r.tier).toBe('Platinum');
            expect(r.org_credit_score).toBeGreaterThanOrEqual(85);
        });

        test('average performer gets Silver', () => {
            const r = engine.scoreOrg(55, 80, 85, 3, 50, 40);
            expect(r.tier).toBe('Silver');
        });

        test('defaults produce Gold or Silver', () => {
            const r = engine.scoreOrg();
            expect(['Silver', 'Gold']).toContain(r.tier);
        });

        test('poor performer gets Restricted', () => {
            const r = engine.scoreOrg(10, 20, 30, 0, 10, 5);
            expect(['Bronze', 'Restricted']).toContain(r.tier);
        });

        test('settlement limit varies by tier', () => {
            const platinum = engine.scoreOrg(95, 98, 99, 15, 90, 85);
            const bronze = engine.scoreOrg(30, 60, 70, 1, 30, 20);
            expect(platinum.settlement_limit_multiplier).toBeGreaterThan(bronze.settlement_limit_multiplier);
        });
    });

    describe('getRevenueRisk', () => {
        test('returns 4 exposure streams', () => {
            expect(engine.getRevenueRisk().exposures.length).toBe(4);
        });
    });

    describe('getOrgCredit', () => {
        test('has 6 scoring factors summing to 100%', () => {
            const r = engine.getOrgCredit();
            const total = r.scoring_model.factors.reduce((a, f) => a + f.weight_pct, 0);
            expect(total).toBe(100);
        });

        test('has 5 credit tiers', () => {
            expect(engine.getOrgCredit().tiers.length).toBe(5);
        });
    });

    describe('getCostAllocation', () => {
        test('returns 5 categories', () => {
            expect(engine.getCostAllocation().categories.length).toBe(5);
        });
    });

    describe('getTokenEconomics', () => {
        test('has staking requirements', () => {
            const r = engine.getTokenEconomics();
            expect(r.fee_structure.staking_requirement.minimum_stake_usd).toBe(10000);
        });
    });

    describe('getFinancialTrustFeedback', () => {
        test('has bidirectional signals', () => {
            const r = engine.getFinancialTrustFeedback();
            expect(r.trust_to_financial.length).toBe(4);
            expect(r.financial_to_trust.length).toBe(4);
        });
    });

    describe('getFullFramework', () => {
        test('returns version 1.0', () => {
            expect(engine.getFullFramework().version).toBe('1.0');
        });
    });
});
