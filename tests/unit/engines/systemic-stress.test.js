const ss = require('../../../server/engines/crisis-module/systemic-stress');
const SSClass = ss.constructor;

let engine;
beforeEach(() => { engine = new SSClass(); });

describe('SystemicStressEngine', () => {
    describe('getScenarios', () => {
        test('returns 12 extreme scenarios', () => {
            expect(engine.getScenarios().scenarios.length).toBe(12);
        });

        test('includes market, technical, regulatory, adversarial, financial, model, governance, and combined', () => {
            const cats = new Set(engine.getScenarios().scenarios.map(s => s.category));
            expect(cats.has('Market')).toBe(true);
            expect(cats.has('Technical')).toBe(true);
            expect(cats.has('Regulatory')).toBe(true);
            expect(cats.has('Adversarial')).toBe(true);
            expect(cats.has('Financial')).toBe(true);
            expect(cats.has('Model')).toBe(true);
            expect(cats.has('Governance')).toBe(true);
            expect(cats.has('Security')).toBe(true);
            expect(cats.has('Combined')).toBe(true);
        });
    });

    describe('runStressTest', () => {
        test('carbon price collapse (ES-01)', () => {
            const r = engine.runStressTest('ES-01', 12, 1000000);
            expect(r.scenario.name).toContain('Carbon Price Collapse');
            expect(r.post_stress.car_pct).toBeLessThan(12);
            expect(r.post_stress.annual_revenue).toBeLessThan(1000000);
        });

        test('CAR breach triggered below 8%', () => {
            const r = engine.runStressTest('ES-01', 10, 1000000); // 10% - 8% = 2%
            expect(r.car_breached).toBe(true);
        });

        test('perfect storm (ES-21) triggers kill-switches', () => {
            const r = engine.runStressTest('ES-21', 12, 1000000);
            expect(r.kill_switches_triggered.length).toBeGreaterThan(0);
            expect(r.severity).toBe('Existential');
        });

        test('unknown scenario returns error', () => {
            const r = engine.runStressTest('UNKNOWN');
            expect(r.error).toBeDefined();
        });

        test('cloud failure (ES-03) has low CAR impact', () => {
            const r = engine.runStressTest('ES-03', 12, 1000000);
            expect(r.post_stress.car_pct).toBeGreaterThan(8);
        });

        test('regulatory revocation (ES-05) most severe', () => {
            const r = engine.runStressTest('ES-05', 12, 1000000);
            expect(r.post_stress.annual_revenue).toBe(400000);
            expect(r.kill_switches_triggered).toContain('KS-05');
        });

        test('default CAR and revenue used', () => {
            const r = engine.runStressTest('ES-01');
            expect(r.pre_stress.car_pct).toBe(12);
            expect(r.pre_stress.annual_revenue).toBe(1000000);
        });
    });

    describe('getDecisionLatency', () => {
        test('has 5 event types', () => {
            expect(engine.getDecisionLatency().events.length).toBe(5);
        });

        test('has latency SLA', () => {
            expect(engine.getDecisionLatency().latency_sla.auto_response).toContain('10 seconds');
        });
    });

    describe('getNetworkCollapse', () => {
        test('has 3 collapse scenarios', () => {
            expect(engine.getNetworkCollapse().scenarios.length).toBe(3);
        });
    });

    describe('getFullFramework', () => {
        test('returns version 1.0', () => {
            expect(engine.getFullFramework().version).toBe('1.0');
        });
    });
});
