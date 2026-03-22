const im = require('../../../server/engines/platform-ops-engine/infrastructure-metrics');
const IMClass = im.constructor;

let engine;
beforeEach(() => { engine = new IMClass(); });

describe('InfrastructureMetricsEngine', () => {
    describe('getNetworkMetrics', () => {
        test('has 4 network metrics', () => {
            expect(engine.getNetworkMetrics().metrics.length).toBe(4);
        });

        test('Network Integrity Index target >98%', () => {
            const nim01 = engine.getNetworkMetrics().metrics[0];
            expect(nim01.target).toContain('98');
        });
    });

    describe('getOperationalMetrics', () => {
        test('has 6 operational metrics', () => {
            expect(engine.getOperationalMetrics().metrics.length).toBe(6);
        });

        test('Settlement Success Rate target >99.8%', () => {
            const oqm03 = engine.getOperationalMetrics().metrics.find(m => m.id === 'OQM-03');
            expect(oqm03.target).toContain('99.8');
        });
    });

    describe('getFinancialMetrics', () => {
        test('has 5 financial metrics', () => {
            expect(engine.getFinancialMetrics().metrics.length).toBe(5);
        });

        test('CAR target >12%', () => {
            const fhm01 = engine.getFinancialMetrics().metrics[0];
            expect(fhm01.target).toContain('12');
        });
    });

    describe('getGovernanceSurveillance', () => {
        test('has 6 governance surveillance metrics', () => {
            expect(engine.getGovernanceSurveillance().metrics.length).toBe(6);
        });

        test('Silent Governance Drift Score exists', () => {
            const gsm06 = engine.getGovernanceSurveillance().metrics.find(m => m.id === 'GSM-06');
            expect(gsm06.name).toContain('Silent Governance Drift');
        });
    });

    describe('calculateComposite', () => {
        test('default values give Excellent', () => {
            const r = engine.calculateComposite();
            expect(r.interpretation).toBe('Excellent');
            expect(r.composite_score).toBeGreaterThan(90);
        });

        test('low values give Warning/Critical', () => {
            const r = engine.calculateComposite(50, 50, 50, 50, 50);
            expect(r.composite_score).toBe(50);
            expect(r.interpretation).toBe('Critical');
        });

        test('formula: 25/25/20/15/15 weights', () => {
            const r = engine.calculateComposite(100, 100, 100, 100, 100);
            expect(r.composite_score).toBe(100);
        });
    });

    describe('getCompositeScore', () => {
        test('has 5 components', () => {
            expect(Object.keys(engine.getCompositeScore().components).length).toBe(5);
        });
    });

    describe('getFullFramework', () => {
        test('returns version 2.0', () => {
            expect(engine.getFullFramework().version).toBe('2.0');
        });
    });
});
