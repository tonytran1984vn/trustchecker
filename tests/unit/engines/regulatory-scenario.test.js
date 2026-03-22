const rs = require('../../../server/engines/regulatory-engine/regulatory-scenario');
const RSClass = rs.constructor;

let engine;
beforeEach(() => { engine = new RSClass(); });

describe('RegulatoryScenarioEngine', () => {
    describe('getScenarios', () => {
        test('has 6 regulatory scenarios', () => {
            expect(engine.getScenarios().scenarios.length).toBe(6);
        });

        test('each scenario has mitigation strategies', () => {
            engine.getScenarios().scenarios.forEach(s => {
                expect(s.mitigation.length).toBeGreaterThan(0);
            });
        });
    });

    describe('simulateScenario', () => {
        test('REG-01 MiCA classification', () => {
            const r = engine.simulateScenario('REG-01', 1000000);
            expect(r.scenario.name).toContain('MiCA');
            expect(r.revenue_impact.affected_pct).toBe(35);
        });

        test('REG-02 EU carbon freeze', () => {
            const r = engine.simulateScenario('REG-02', 1000000);
            expect(r.revenue_impact.affected_pct).toBe(25);
        });

        test('REG-05 data localization (high probability)', () => {
            const r = engine.simulateScenario('REG-05');
            expect(r.probability).toContain('30-40%');
        });

        test('unknown scenario returns error', () => {
            const r = engine.simulateScenario('UNKNOWN');
            expect(r.error).toBeDefined();
        });

        test('capital needed includes 20% buffer', () => {
            const r = engine.simulateScenario('REG-01', 1000000);
            expect(r.capital_needed).toBe(Math.round(r.revenue_impact.total_impact * 1.2));
        });
    });

    describe('getReadinessScorecard', () => {
        test('has 5 jurisdiction assessments', () => {
            expect(engine.getReadinessScorecard().jurisdictions.length).toBe(5);
        });

        test('composite score is 68', () => {
            expect(engine.getReadinessScorecard().composite_score).toBe(68);
        });

        test('Singapore has highest readiness', () => {
            const sg = engine.getReadinessScorecard().jurisdictions.find(j => j.jurisdiction === 'Singapore');
            expect(sg.readiness_score).toBe(85);
        });
    });
});
