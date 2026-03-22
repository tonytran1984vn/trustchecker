const eo = require('../../../server/engines/governance-module/external-oversight');
const EOClass = eo.constructor;

let engine;
beforeEach(() => { engine = new EOClass(); });

describe('ExternalOversightEngine', () => {
    describe('getObserverRoles', () => {
        test('returns 4 observer roles', () => {
            expect(engine.getObserverRoles().observer_roles.length).toBe(4);
        });

        test('all observers are read-only', () => {
            engine.getObserverRoles().observer_roles.forEach(r => {
                expect(r.write_access).toBe(false);
            });
        });

        test('has access controls', () => {
            expect(engine.getObserverRoles().access_controls.authentication).toContain('mutual TLS');
        });
    });

    describe('getAuditAPI', () => {
        test('has 12 endpoints', () => {
            expect(engine.getAuditAPI().endpoints.length).toBe(12);
        });

        test('all endpoints are GET', () => {
            engine.getAuditAPI().endpoints.forEach(ep => {
                expect(ep.method).toBe('GET');
            });
        });
    });

    describe('getTransparencyReports', () => {
        test('has 3 report types', () => {
            expect(engine.getTransparencyReports().report_types.length).toBe(3);
        });

        test('has 4 disclosure principles', () => {
            expect(engine.getTransparencyReports().disclosure_principles.length).toBe(4);
        });
    });

    describe('generateTransparencyReport', () => {
        test('generates report with metrics', () => {
            const r = engine.generateTransparencyReport('Q1-2024', { volume: 100000, car_pct: 12, validators: 20 });
            expect(r.period).toBe('Q1-2024');
            expect(r.summary.platform_volume).toBe(100000);
            expect(r.summary.capital_adequacy_ratio).toBe(12);
        });

        test('uses defaults for missing metrics', () => {
            const r = engine.generateTransparencyReport('Q1-2024');
            expect(r.summary.platform_volume).toBe(0);
            expect(r.summary.settlement_finality_rate).toBe(99.8);
        });
    });

    describe('getFullFramework', () => {
        test('returns version 1.0', () => {
            expect(engine.getFullFramework().version).toBe('1.0');
        });
    });
});
