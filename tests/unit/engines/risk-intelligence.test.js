const ri = require('../../../server/engines/intelligence/risk-intelligence-infra');
const RIClass = ri.constructor;

let engine;
beforeEach(() => { engine = new RIClass(); });

describe('RiskIntelligenceInfra', () => {
    describe('1. Model Risk Management', () => {
        test('getModelInventory returns model card', () => {
            const m = engine.getModelInventory();
            expect(m.model_id).toBe('TC-RISK-4TIER-v1');
            expect(m.tiers.length).toBe(4);
            expect(m.assumptions.length).toBe(5);
            expect(m.limitations.length).toBe(5);
        });

        test('performance targets defined', () => {
            const m = engine.getModelInventory();
            expect(m.performance_targets.precision_target).toBe(0.92);
            expect(m.performance_targets.latency_p99_ms).toBe(89);
        });
    });

    describe('2. Independent Validation', () => {
        test('runChallengerModel compares scores', () => {
            const entities = [
                { id: 'e1', risk_score: 50, scan_count: 10, partner_trust: 70, days_active: 90, compliance_pct: 80 },
                { id: 'e2', risk_score: 80, scan_count: 2, partner_trust: 30, days_active: 10, compliance_pct: 40 },
            ];
            const r = engine.runChallengerModel(entities);
            expect(r.total_entities).toBe(2);
            expect(r.alignment_rate).toBeDefined();
        });

        test('flags large divergences', () => {
            const entities = [
                { id: 'e1', risk_score: 10, scan_count: 0, partner_trust: 100, days_active: 365, compliance_pct: 100 },
            ];
            const r = engine.runChallengerModel(entities);
            expect(r.results[0].divergence).toBeDefined();
        });

        test('runBackTest requires >=10 samples', () => {
            const r = engine.runBackTest([{ predicted_score: 50, actual_outcome: 'safe' }]);
            expect(r.status).toBe('insufficient_data');
        });

        test('calculates precision/recall/F1', () => {
            const predictions = Array.from({ length: 20 }, (_, i) => ({
                entity_id: `e${i}`,
                predicted_score: i < 10 ? 70 : 30,
                actual_outcome: i < 8 ? 'risky' : 'safe',
            }));
            const r = engine.runBackTest(predictions);
            expect(r.metrics.accuracy).toBeDefined();
            expect(r.metrics.f1_score).toBeDefined();
            expect(r.confusion_matrix.true_positive).toBeDefined();
        });
    });

    describe('3. Stress Testing', () => {
        test('generateStressScenarios returns 5 scenarios', () => {
            const r = engine.generateStressScenarios();
            expect(r.scenarios.length).toBe(5);
            expect(r.scenarios[0].type).toBe('black_swan');
        });

        test('runSensitivityAnalysis with defaults', () => {
            const r = engine.runSensitivityAnalysis();
            expect(r.factors_analyzed).toBe(6);
            expect(r.most_sensitive).toBeDefined();
            expect(r.analyses[0].sensitivity_rank).toBe(1);
        });

        test('custom weights work', () => {
            const r = engine.runSensitivityAnalysis({ factor_a: 0.5, factor_b: 0.3, factor_c: 0.2 });
            expect(r.factors_analyzed).toBe(3);
        });

        test('assessResilience returns grade', () => {
            const r = engine.assessResilience();
            expect(r.resilience_score).toBeGreaterThan(0);
            expect(['A', 'B', 'C', 'F']).toContain(r.grade);
            expect(r.gaps.length).toBeGreaterThan(0);
        });
    });

    describe('4. Explainability', () => {
        test('explainDecision generates narrative', () => {
            const r = engine.explainDecision({
                entity_id: 'e1', score: 75,
                signals: [
                    { pattern: 'route_gaming', score: 25, detail: 'Unusual route changes' },
                    { pattern: 'velocity_anomaly', score: 15, detail: 'Scan burst' },
                ],
                weights: { route_gaming: 0.25, velocity_anomaly: 0.15 },
            });
            expect(r.narrative).toContain('75');
            expect(r.level).toBe('high');
            expect(r.factor_contributions.length).toBe(2);
        });

        test('low score yields healthy narrative', () => {
            const r = engine.explainDecision({ entity_id: 'e2', score: 10, signals: [] });
            expect(r.narrative).toContain('healthy');
        });

        test('generateExplainabilityReport batch', () => {
            const assessments = [
                { entity_id: 'e1', score: 20, signals: [{ pattern: 'f1', score: 5 }] },
                { entity_id: 'e2', score: 75, signals: [{ pattern: 'f1', score: 30 }] },
            ];
            const r = engine.generateExplainabilityReport(assessments);
            expect(r.total_decisions).toBe(2);
            expect(r.score_distribution.low).toBe(1);
            expect(r.score_distribution.high).toBe(1);
        });
    });

    describe('5. Bias & Fairness', () => {
        test('analyzeBiasFairness with fair data', () => {
            const entities = [
                { id: 'e1', region: 'US', industry: 'Tech', risk_score: 50, employee_count: 100 },
                { id: 'e2', region: 'US', industry: 'Tech', risk_score: 51, employee_count: 100 },
                { id: 'e3', region: 'US', industry: 'Tech', risk_score: 50, employee_count: 100 },
                { id: 'e4', region: 'US', industry: 'Tech', risk_score: 49, employee_count: 100 },
            ];
            const r = engine.analyzeBiasFairness(entities);
            expect(r.dimensions_analyzed).toBe(3);
            expect(r.total_entities).toBe(4);
            expect(r.analyses.length).toBe(3);
        });

        test('detects potential bias', () => {
            const entities = [
                { id: 'e1', region: 'A', risk_score: 90 },
                { id: 'e2', region: 'A', risk_score: 85 },
                { id: 'e3', region: 'B', risk_score: 10 },
                { id: 'e4', region: 'B', risk_score: 15 },
            ];
            const r = engine.analyzeBiasFairness(entities);
            expect(r.overall_fairness).toBe('potential_bias_detected');
        });

        test('handles empty entities', () => {
            const r = engine.analyzeBiasFairness([]);
            expect(r.total_entities).toBe(0);
        });
    });
});
