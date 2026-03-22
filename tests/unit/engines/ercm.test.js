const ercm = require('../../../server/engines/regulatory-engine/ercm');
const ERCMClass = ercm.constructor;

let engine;
beforeEach(() => { engine = new ERCMClass(); });

describe('ERCMEngine', () => {
    describe('getThreeLines', () => {
        test('has 3 lines of defense', () => {
            const r = engine.getThreeLines();
            expect(r.total_roles).toBe(11);
        });

        test('Line 1 has 5 business roles', () => {
            expect(engine.getThreeLines().line1.roles.length).toBe(5);
        });

        test('Line 2 has 4 oversight roles', () => {
            expect(engine.getThreeLines().line2.roles.length).toBe(4);
        });

        test('Line 3 has 2 assurance roles', () => {
            expect(engine.getThreeLines().line3.roles.length).toBe(2);
        });
    });

    describe('getGovernanceBodies', () => {
        test('has 4 governance bodies', () => {
            expect(engine.getGovernanceBodies().total).toBe(4);
        });
    });

    describe('getRiskRegistry', () => {
        test('has 32 risks', () => {
            expect(engine.getRiskRegistry().total_risks).toBe(32);
        });

        test('has 7 domains', () => {
            const domains = Object.keys(engine.getRiskRegistry().domains);
            expect(domains.length).toBe(7);
        });

        test('risks sorted by score descending', () => {
            const risks = engine.getRiskRegistry().risks;
            for (let i = 1; i < risks.length; i++) {
                expect(risks[i - 1].risk_score).toBeGreaterThanOrEqual(risks[i].risk_score);
            }
        });

        test('risk score = likelihood × impact × CE', () => {
            const risk = engine.getRiskRegistry().risks[0];
            const expected = Math.round(risk.likelihood * risk.impact * risk.control_effectiveness * 10) / 10;
            expect(risk.risk_score).toBe(expected);
        });
    });

    describe('generateHeatmap', () => {
        test('has 25 grid cells (5x5)', () => {
            expect(engine.generateHeatmap().grid.length).toBe(25);
        });

        test('zone counts sum to 32', () => {
            const z = engine.generateHeatmap().zones;
            expect(z.critical + z.high + z.medium + z.low).toBe(32);
        });

        test('top 10 risks returned', () => {
            expect(engine.generateHeatmap().top_10_residual.length).toBe(10);
        });
    });

    describe('getControlMatrix', () => {
        test('total controls is 32', () => {
            expect(engine.getControlMatrix().total_controls).toBe(32);
        });

        test('preventive + detective + corrective = 32', () => {
            const b = engine.getControlMatrix().breakdown;
            expect(b.preventive.count + b.detective.count + b.corrective.count).toBe(32);
        });
    });

    describe('getRiskAppetite', () => {
        test('has 7 domain appetites', () => {
            expect(engine.getRiskAppetite().appetite.length).toBe(7);
        });

        test('Technology has Very Low tolerance', () => {
            const tech = engine.getRiskAppetite().appetite.find(a => a.domain === 'Technology');
            expect(tech.tolerance).toBe('Very Low');
        });
    });

    describe('getBoardDashboard', () => {
        test('has top 10 residual risks', () => {
            expect(engine.getBoardDashboard().top_10_residual_risks.length).toBe(10);
        });

        test('has domain scores', () => {
            expect(engine.getBoardDashboard().domain_scores.length).toBe(7);
        });
    });

    describe('getControlTests', () => {
        test('has 6 quarterly tests', () => {
            expect(engine.getControlTests().total_quarterly).toBe(6);
        });

        test('has 3 annual tests', () => {
            expect(engine.getControlTests().total_annual).toBe(3);
        });
    });

    describe('recordTestResult', () => {
        test('records a quarterly test result', () => {
            const r = engine.recordTestResult({ test_id: 'CT-Q1', passed: true, tester_id: 'T1' });
            expect(r.passed).toBe(true);
            expect(r.hash).toBeDefined();
        });

        test('unknown test returns error', () => {
            const r = engine.recordTestResult({ test_id: 'UNKNOWN' });
            expect(r.error).toBeDefined();
        });
    });

    describe('submitAttestation', () => {
        test('CEO attestation accepted', () => {
            const r = engine.submitAttestation({ attester_id: 'A1', role: 'CEO' });
            expect(r.attestation_id).toBeDefined();
            expect(r.hash).toBeDefined();
        });

        test('invalid role rejected', () => {
            const r = engine.submitAttestation({ attester_id: 'A1', role: 'Engineer' });
            expect(r.error).toBeDefined();
        });
    });

    describe('getIPOGapAnalysis', () => {
        test('has 6 gap items', () => {
            expect(engine.getIPOGapAnalysis().gaps.length).toBe(6);
        });

        test('most items implemented', () => {
            expect(engine.getIPOGapAnalysis().closed).toBeGreaterThan(engine.getIPOGapAnalysis().open);
        });
    });

    describe('assessMaturity', () => {
        test('overall score between 2-5', () => {
            expect(engine.assessMaturity().overall_score).toBeGreaterThan(2);
            expect(engine.assessMaturity().overall_score).toBeLessThan(5);
        });
    });
});
