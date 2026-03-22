const compliance = require('../../../server/engines/core/compliance-engine');

describe('ComplianceEngine', () => {
    describe('getFrameworks / getJurisdictions', () => {
        test('returns 6 frameworks', () => {
            const fw = compliance.getFrameworks();
            expect(Object.keys(fw).length).toBe(6);
            expect(fw.EU_CBAM).toBeDefined();
            expect(fw.SEC_CLIMATE).toBeDefined();
            expect(fw.VN_GREEN).toBeDefined();
        });

        test('each framework has requirements', () => {
            for (const fw of Object.values(compliance.getFrameworks())) {
                expect(fw.requirements.length).toBeGreaterThan(0);
                expect(fw.name).toBeDefined();
                expect(fw.region).toBeDefined();
                expect(fw.penalty).toBeDefined();
            }
        });

        test('returns 4 jurisdictions', () => {
            const j = compliance.getJurisdictions();
            expect(Object.keys(j)).toEqual(expect.arrayContaining(['EU', 'US', 'VN', 'GLOBAL']));
        });

        test('EU jurisdiction includes CBAM', () => {
            expect(compliance.getJurisdictions().EU.cbam_affected).toBe(true);
        });
    });

    describe('generateComplianceReport', () => {
        test('generates report with defaults', () => {
            const report = compliance.generateComplianceReport({});
            expect(report.title).toContain('Compliance Report');
            expect(report.frameworks.length).toBeGreaterThan(0);
            expect(report.overall_readiness_pct).toBeDefined();
            expect(report.generated_at).toBeDefined();
        });

        test('EU region includes CBAM/CSRD frameworks', () => {
            const report = compliance.generateComplianceReport({ region: 'EU', scope_1: 100, scope_2: 50 });
            const names = report.frameworks.map(f => f.framework);
            expect(names).toContain('EU Carbon Border Adjustment Mechanism');
            expect(names).toContain('EU Corporate Sustainability Reporting Directive');
            expect(report.cbam_affected).toBe(true);
        });

        test('US region includes SEC Climate', () => {
            const report = compliance.generateComplianceReport({ region: 'US', scope_1: 100, scope_2: 50 });
            const names = report.frameworks.map(f => f.framework);
            expect(names).toContain('SEC Climate Disclosure Rule');
        });

        test('VN region includes VN Green', () => {
            const report = compliance.generateComplianceReport({ region: 'VN', scope_1: 100, scope_2: 50 });
            const names = report.frameworks.map(f => f.framework);
            expect(names).toContain('Vietnam Green Growth Strategy');
        });

        test('fully compliant when all data provided', () => {
            const report = compliance.generateComplianceReport({
                region: 'VN', scope_1: 100, scope_2: 50, scope_3: 200,
                total_emissions: 350, products_count: 10, partners_count: 5,
                has_blockchain: true, has_sbt: true,
                credits: [1], offsets: [1], board_oversight: true,
            });
            expect(report.overall_readiness_pct).toBeGreaterThanOrEqual(80);
        });

        test('identifies gaps for incomplete data', () => {
            const report = compliance.generateComplianceReport({ region: 'EU' });
            expect(report.gaps.length).toBeGreaterThan(0);
            expect(report.gaps[0].requirement).toBeDefined();
        });

        test('status reflects readiness percentage', () => {
            const low = compliance.generateComplianceReport({ region: 'EU' });
            expect(['non_compliant', 'partially_compliant']).toContain(low.overall_status);
        });

        test('next_review is ~90 days in future', () => {
            const report = compliance.generateComplianceReport({});
            const nextReview = new Date(report.next_review);
            const now = new Date();
            const diffDays = (nextReview - now) / (1000 * 60 * 60 * 24);
            expect(diffDays).toBeGreaterThan(85);
            expect(diffDays).toBeLessThan(95);
        });
    });

    describe('trackRegulatoryDiff', () => {
        test('detects readiness improvement', () => {
            const prev = compliance.generateComplianceReport({ region: 'VN' });
            const curr = compliance.generateComplianceReport({ region: 'VN', scope_1: 100, scope_2: 50 });
            const diff = compliance.trackRegulatoryDiff(prev, curr);
            expect(diff.total_changes).toBeGreaterThan(0);
        });

        test('detects new framework', () => {
            const prev = { frameworks: [], generated_at: '2024-01-01' };
            const curr = compliance.generateComplianceReport({ region: 'VN' });
            const diff = compliance.trackRegulatoryDiff(prev, curr);
            expect(diff.changes.filter(c => c.type === 'new_framework').length).toBeGreaterThan(0);
        });

        test('returns empty for identical reports', () => {
            const report = compliance.generateComplianceReport({ region: 'GLOBAL' });
            const diff = compliance.trackRegulatoryDiff(report, report);
            expect(diff.total_changes).toBe(0);
        });

        test('includes trend direction', () => {
            const diff = compliance.trackRegulatoryDiff(
                { frameworks: [], generated_at: '2024-01-01' },
                { frameworks: [], generated_at: '2024-02-01' }
            );
            expect(['improving', 'degrading']).toContain(diff.trend);
        });
    });

    describe('getApplicableFrameworks', () => {
        test('returns frameworks for EU region', () => {
            const result = compliance.getApplicableFrameworks('EU');
            expect(result.applicable_frameworks.length).toBeGreaterThan(2);
            expect(result.cbam_affected).toBe(true);
            expect(result.strictness).toBe('high');
        });

        test('adds CBAM when exporting to EU', () => {
            const result = compliance.getApplicableFrameworks('VN', ['EU']);
            expect(result.cbam_affected).toBe(true);
        });

        test('adds SEC when exporting to US', () => {
            const result = compliance.getApplicableFrameworks('VN', ['US']);
            const keys = result.applicable_frameworks.map(f => f.key);
            expect(keys).toContain('SEC_CLIMATE');
        });

        test('GLOBAL is default fallback', () => {
            const result = compliance.getApplicableFrameworks('UNKNOWN');
            expect(result.applicable_frameworks.length).toBeGreaterThan(0);
        });

        test('counts total requirements', () => {
            const result = compliance.getApplicableFrameworks('EU');
            expect(result.total_requirements).toBeGreaterThan(10);
        });
    });
});
