const ai = require('../../../server/engines/intelligence/advanced-scm-ai');
const AIClass = ai.constructor;

let engine;
beforeEach(() => { engine = new AIClass(); });

describe('AdvancedScmAI', () => {
    describe('holtWintersTriple', () => {
        test('returns insufficient_data for short series', () => {
            const r = engine.holtWintersTriple([1, 2, 3], 7, 7);
            expect(r.trend).toBe('insufficient_data');
            expect(r.confidence).toBe(0.3);
        });

        test('produces forecast for sufficient data', () => {
            const data = Array.from({ length: 28 }, (_, i) => 100 + Math.sin(i / 3.5 * Math.PI) * 20 + i * 0.5);
            const r = engine.holtWintersTriple(data, 7, 7);
            expect(r.forecast.length).toBe(7);
            expect(r.forecast[0].predicted).toBeDefined();
            expect(r.forecast[0].lower).toBeDefined();
            expect(r.forecast[0].upper).toBeDefined();
        });

        test('includes error metrics', () => {
            const data = Array.from({ length: 28 }, (_, i) => 50 + i * 2);
            const r = engine.holtWintersTriple(data, 7, 7);
            expect(r.error_metrics.mae).toBeDefined();
            expect(r.error_metrics.mape).toBeDefined();
        });

        test('detects increasing trend', () => {
            const data = Array.from({ length: 28 }, (_, i) => 10 + i * 5);
            const r = engine.holtWintersTriple(data, 7, 7);
            expect(r.trend).toBe('increasing');
        });

        test('includes seasonal pattern', () => {
            const data = Array.from({ length: 28 }, (_, i) => 100 + (i % 7 === 0 ? 50 : 0));
            const r = engine.holtWintersTriple(data, 7, 7);
            expect(r.seasonal_pattern.length).toBe(7);
        });

        test('confidence is between 0.3 and 0.95', () => {
            const data = Array.from({ length: 28 }, (_, i) => 50 + i);
            const r = engine.holtWintersTriple(data, 7, 7);
            expect(r.confidence).toBeGreaterThanOrEqual(0.3);
            expect(r.confidence).toBeLessThanOrEqual(0.95);
        });
    });

    describe('monteCarloRisk', () => {
        test('runs simulations', () => {
            const r = engine.monteCarloRisk({}, 100);
            expect(r.summary.simulations).toBe(100);
            expect(r.summary.avg_monthly_cost).toBeGreaterThan(0);
            expect(r.risk_quantiles.p50_cost).toBeDefined();
            expect(r.risk_quantiles.p95_cost).toBeDefined();
        });

        test('produces cost and delay histograms', () => {
            const r = engine.monteCarloRisk({}, 50);
            expect(r.distribution.cost_buckets.length).toBe(10);
            expect(r.distribution.delay_buckets.length).toBe(10);
        });

        test('generates recommendations', () => {
            const r = engine.monteCarloRisk({ disruption_prob: 0.2, quality_reject_rate: 0.1 }, 50);
            expect(r.recommendations.length).toBeGreaterThan(0);
        });
    });

    describe('causalDelayAnalysis', () => {
        test('returns insufficient_data for < 3 shipments', () => {
            const r = engine.causalDelayAnalysis([{ id: '1' }]);
            expect(r.root_cause).toBe('insufficient_data');
        });

        test('analyzes delays when deliveries exist', () => {
            const shipments = [
                { actual_delivery: '2024-01-10', estimated_delivery: '2024-01-15', carrier: 'DHL', created_at: '2024-01-05' },
                { actual_delivery: '2024-01-10', estimated_delivery: '2024-01-15', carrier: 'DHL', created_at: '2024-01-05' },
                { actual_delivery: '2024-01-10', estimated_delivery: '2024-01-15', carrier: 'DHL', created_at: '2024-01-05' },
            ];
            const r = engine.causalDelayAnalysis(shipments);
            expect(r.data_points).toBe(3);
            expect(r.root_cause).toBeDefined();
        });

        test('identifies carrier as root cause', () => {
            const shipments = [
                { actual_delivery: '2024-01-20', estimated_delivery: '2024-01-10', carrier: 'SlowCo', created_at: '2024-01-05' },
                { actual_delivery: '2024-01-12', estimated_delivery: '2024-01-10', carrier: 'FastCo', created_at: '2024-01-05' },
                { actual_delivery: '2024-01-25', estimated_delivery: '2024-01-10', carrier: 'SlowCo', created_at: '2024-01-06' },
            ];
            const r = engine.causalDelayAnalysis(shipments);
            expect(r.root_cause).toContain('carrier');
        });
    });

    describe('demandSensing (CUSUM)', () => {
        test('returns stable for < 5 data points', () => {
            const r = engine.demandSensing([1, 2, 3]);
            expect(r.current_trend).toBe('stable');
        });

        test('detects demand surge', () => {
            const data = [100, 100, 100, 100, 100, 100, 100, 200, 300, 400];
            const r = engine.demandSensing(data);
            expect(r.change_points.length).toBeGreaterThan(0);
            expect(['surge', 'increasing']).toContain(r.current_trend);
        });

        test('detects demand drop', () => {
            const data = [100, 100, 100, 100, 100, 100, 100, 20, 10, 5];
            const r = engine.demandSensing(data);
            expect(['drop', 'decreasing']).toContain(r.current_trend);
        });

        test('includes baseline stats', () => {
            const data = [50, 55, 45, 60, 40, 50, 55, 48, 52, 50];
            const r = engine.demandSensing(data);
            expect(r.baseline_mean).toBeDefined();
            expect(r.baseline_stddev).toBeDefined();
        });
    });

    describe('resolveAgenticScenarioDirectives', () => {
        test('simulates partner failure', () => {
            const r = engine.resolveAgenticScenarioDirectives({ type: 'partner_failure' });
            expect(r.impact.revenue_at_risk).toBeDefined();
            expect(r.impact.recovery_days).toBeDefined();
        });

        test('critical severity without backup partners', () => {
            const r = engine.resolveAgenticScenarioDirectives({ type: 'partner_failure' }, { total_partners: 5, redundant_partners: 0 });
            expect(r.impact.severity).toBe('critical');
        });

        test('simulates route blocked', () => {
            const r = engine.resolveAgenticScenarioDirectives({ type: 'route_blocked', duration_days: 14 });
            expect(r.impact.reroute_cost).toBeGreaterThan(0);
        });

        test('simulates demand spike', () => {
            const r = engine.resolveAgenticScenarioDirectives({ type: 'demand_spike', demand_spike_pct: 200, duration_days: 7 }, { current_inventory: 100, daily_demand: 50 });
            expect(r.impact.spiked_daily_demand).toBe(150);
        });

        test('simulates quality recall', () => {
            const r = engine.resolveAgenticScenarioDirectives({ type: 'quality_recall' });
            expect(r.impact.severity).toBe('critical');
            expect(r.impact.units_recalled).toBeGreaterThan(0);
        });

        test('returns error for unknown type', () => {
            const r = engine.resolveAgenticScenarioDirectives({ type: 'alien_invasion' });
            expect(r.impact.error).toContain('Unknown');
        });
    });
});
