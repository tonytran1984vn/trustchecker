const inst = require('../../../server/engines/intelligence/institutional-engine');
const InstClass = inst.constructor;

let engine;
beforeEach(() => { engine = new InstClass(); });

describe('InstitutionalEngine', () => {
    describe('Pillar I — Risk Appetite', () => {
        test('getRiskAppetite returns board-approved statement', () => {
            const r = engine.getRiskAppetite();
            expect(r.title).toContain('Risk Appetite');
            expect(r.zero_tolerance.length).toBe(5);
            expect(r.domain_appetite.length).toBe(6);
        });

        test('checkAppetiteBreach — all clear with defaults', () => {
            const r = engine.checkAppetiteBreach();
            expect(r.all_clear).toBe(true);
            expect(r.breaches).toBe(0);
        });

        test('detects strategic breach (>30% concentration)', () => {
            const r = engine.checkAppetiteBreach({ revenue_top_industry_pct: 45 });
            expect(r.all_clear).toBe(false);
            expect(r.board_action_required).toBe(true);
        });

        test('detects technology breach (unlogged privileged)', () => {
            const r = engine.checkAppetiteBreach({ unlogged_privileged: 3 });
            expect(r.all_clear).toBe(false);
        });

        test('detects carbon breach (unanchored credits)', () => {
            const r = engine.checkAppetiteBreach({ unanchored_credits: 1 });
            expect(r.all_clear).toBe(false);
        });
    });

    describe('Pillar II — Board KPI Dashboard', () => {
        test('getBoardKPISpec returns 16 KPIs', () => {
            const r = engine.getBoardKPISpec();
            expect(r.total_kpis).toBe(16);
            expect(Object.keys(r.layers).length).toBe(4);
        });

        test('generateBoardDashboard with defaults', () => {
            const r = engine.generateBoardDashboard();
            expect(r.summary.total_kpis).toBe(16);
            expect(r.summary.overall).toBe('SATISFACTORY');
        });

        test('red KPIs trigger ACTION REQUIRED', () => {
            const r = engine.generateBoardDashboard({ tamper_alerts: 5 });
            expect(r.summary.red).toBeGreaterThan(0);
            expect(r.summary.overall).toBe('ACTION REQUIRED');
        });
    });

    describe('Pillar III — Internal Audit', () => {
        test('getAuditCharter returns IPO-grade charter', () => {
            const r = engine.getAuditCharter();
            expect(r.title).toContain('IPO');
            expect(r.independence.length).toBe(5);
            expect(r.scope.length).toBe(6);
        });

        test('getAuditPlan returns 4-quarter plan', () => {
            const r = engine.getAuditPlan();
            expect(r.plan.length).toBe(4);
            expect(r.total_annual).toBe(1);
        });

        test('submitAuditFinding creates finding', () => {
            const r = engine.submitAuditFinding({ area: 'Access Control', description: 'SoD violation detected', severity: 'high' });
            expect(r.status).toBe('open');
            expect(r.hash).toMatch(/^[a-f0-9]{64}$/);
        });

        test('rejects finding without area', () => {
            const r = engine.submitAuditFinding({});
            expect(r.error).toContain('area');
        });

        test('getAuditFindings tracks registered findings', () => {
            engine.submitAuditFinding({ area: 'A', description: 'D', severity: 'critical' });
            engine.submitAuditFinding({ area: 'B', description: 'E', severity: 'low' });
            const r = engine.getAuditFindings();
            expect(r.total).toBe(2);
            expect(r.by_severity.critical).toBe(1);
        });
    });

    describe('Pillar IV — Risk Capital', () => {
        test('getExposureModels returns 5 models', () => {
            const r = engine.getExposureModels();
            expect(r.total_domains).toBe(5);
        });

        test('calculateExposure — normal scenario', () => {
            const r = engine.calculateExposure({ stress_scenario: 'normal' });
            expect(r.stress_factor).toBe(1.0);
            expect(r.total_base_exposure).toBeGreaterThan(0);
        });

        test('calculateExposure — severe scenario multiplies', () => {
            const normal = engine.calculateExposure({ stress_scenario: 'normal' });
            const severe = engine.calculateExposure({ stress_scenario: 'severe' });
            expect(severe.total_stressed_exposure).toBeGreaterThan(normal.total_base_exposure);
        });

        test('calculateEconomicCapital provides coverage', () => {
            const r = engine.calculateEconomicCapital();
            expect(r.coverage_ratio).toBeGreaterThan(0);
            expect(r.coverage_grade).toBeDefined();
            expect(r.board_view).toBeDefined();
        });

        test('deficient coverage when capital is low', () => {
            const r = engine.calculateEconomicCapital({ current_capital: 100 });
            expect(r.coverage_grade).toBe('Deficient');
        });
    });

    describe('Institutional Maturity', () => {
        test('assessInstitutionalMaturity returns scored dimensions', () => {
            // Using the original module's overridden method
            const r = inst.assessInstitutionalMaturity();
            expect(r.overall_score).toBeDefined();
            expect(r.dimensions.length).toBe(7);
            expect(r.label).toBeDefined();
        });
    });
});
