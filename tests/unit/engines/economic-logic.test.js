const el = require('../../../server/engines/economics-engine/economic-logic');
const ELClass = el.constructor;

let engine;
beforeEach(() => { engine = new ELClass(); });

describe('EconomicLogicEngine', () => {
    describe('getMechanismDesign', () => {
        test('returns 3 participant mechanisms', () => {
            const r = engine.getMechanismDesign();
            expect(r.mechanisms.length).toBe(3);
            expect(r.mechanisms[0].participant).toBe('Validator');
        });
    });

    describe('getGameTheory', () => {
        test('returns 3 games', () => {
            const r = engine.getGameTheory();
            expect(r.games.length).toBe(3);
        });
    });

    describe('getSustainability', () => {
        test('includes anti-death-spiral mechanisms', () => {
            const r = engine.getSustainability();
            expect(r.anti_death_spiral.mechanisms.length).toBeGreaterThan(0);
        });
    });

    describe('getValueFairness', () => {
        test('returns 5 stakeholder distributions', () => {
            const r = engine.getValueFairness();
            expect(r.distribution.length).toBe(5);
        });
    });

    describe('analyzeIncentive', () => {
        test('defaults produce honest-dominant', () => {
            const r = engine.analyzeIncentive();
            expect(r.honesty_is_dominant).toBe(true);
            expect(r.expected_cheat_value_usd).toBeLessThan(0);
        });

        test('high stake makes honesty dominant', () => {
            const r = engine.analyzeIncentive('validator', 50000, 90, 1000);
            expect(r.honesty_is_dominant).toBe(true);
        });

        test('low stake may not be incentive compatible', () => {
            const r = engine.analyzeIncentive('validator', 100, 10, 5000);
            expect(r.honesty_is_dominant).toBe(false);
            expect(r.recommendation).toContain('WARNING');
        });
    });

    describe('getFullFramework', () => {
        test('returns complete framework', () => {
            const r = engine.getFullFramework();
            expect(r.version).toBe('1.0');
            expect(r.mechanism_design).toBeDefined();
            expect(r.game_theory).toBeDefined();
        });
    });
});
