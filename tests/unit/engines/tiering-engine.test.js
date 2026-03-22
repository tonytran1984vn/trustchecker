const tiering = require('../../../server/engines/risk-model-engine/tiering');
const TierClass = tiering.constructor;

let engine;
beforeEach(() => { engine = new TierClass(); });

describe('ModelRiskTieringEngine', () => {
    describe('getModelTiers', () => {
        test('returns 3 tiers', () => {
            const r = engine.getModelTiers();
            expect(r.tiers.length).toBe(3);
            expect(r.tiers[0].tier).toBe(1);
            expect(r.tiers[0].name).toContain('Revenue-Impacting');
        });

        test('tier 1 has 4 models', () => {
            const tier1 = engine.getModelTiers().tiers[0];
            expect(tier1.models.length).toBe(4);
            expect(tier1.capital_reserve_pct).toBe(2);
        });

        test('tier 3 has 0% capital reserve', () => {
            const tier3 = engine.getModelTiers().tiers[2];
            expect(tier3.capital_reserve_pct).toBe(0);
        });
    });

    describe('getRevenueSensitivity', () => {
        test('returns 6 scenarios', () => {
            const r = engine.getRevenueSensitivity();
            expect(r.scenarios.length).toBe(6);
        });
    });

    describe('getShutdownCriteria', () => {
        test('returns 6 criteria', () => {
            const r = engine.getShutdownCriteria();
            expect(r.criteria.length).toBe(6);
        });

        test('has fallback procedures', () => {
            const r = engine.getShutdownCriteria();
            expect(r.fallback_procedures.tier_1).toBeDefined();
            expect(r.fallback_procedures.tier_3).toContain('No operational impact');
        });
    });

    describe('getModelGovernance', () => {
        test('returns 4 roles', () => {
            const r = engine.getModelGovernance();
            expect(Object.keys(r.roles).length).toBe(4);
        });

        test('lifecycle has 6 phases', () => {
            expect(engine.getModelGovernance().lifecycle.length).toBe(6);
        });

        test('total capital at risk is $495K', () => {
            expect(engine.getModelGovernance().total_capital_at_risk.total_usd).toBe(495000);
        });
    });

    describe('getModelByName', () => {
        test('finds Dynamic Pricing in tier 1', () => {
            const r = engine.getModelByName('Dynamic Pricing');
            expect(r.tier).toBe(1);
            expect(r.name).toContain('Dynamic Pricing');
        });

        test('finds Fraud Detection in tier 2', () => {
            const r = engine.getModelByName('Fraud');
            expect(r.tier).toBe(2);
        });

        test('finds Network Topology in tier 3', () => {
            const r = engine.getModelByName('Network Topology');
            expect(r.tier).toBe(3);
        });

        test('returns null for unknown model', () => {
            expect(engine.getModelByName('nonexistent')).toBeNull();
        });
    });

    describe('getFullFramework', () => {
        test('returns complete framework', () => {
            const r = engine.getFullFramework();
            expect(r.version).toBe('1.0');
            expect(r.tiers).toBeDefined();
            expect(r.sensitivity).toBeDefined();
            expect(r.shutdown).toBeDefined();
            expect(r.governance).toBeDefined();
        });
    });
});
