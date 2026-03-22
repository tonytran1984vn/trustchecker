const rm = require('../../../server/engines/regulatory-engine/regulatory-map');
const RMClass = rm.constructor;

let engine;
beforeEach(() => { engine = new RMClass(); });

describe('RegulatoryMapEngine', () => {
    describe('getLicenseRequirements', () => {
        test('EU has multiple required licenses', () => {
            const r = engine.getLicenseRequirements('EU');
            expect(r.required_licenses.length).toBeGreaterThan(2);
            expect(r.total_estimated_cost).toBeGreaterThan(100000);
        });

        test('SG has required licenses', () => {
            const r = engine.getLicenseRequirements('SG');
            expect(r.required_licenses.length).toBeGreaterThan(0);
        });

        test('unknown jurisdiction returns empty', () => {
            const r = engine.getLicenseRequirements('XX');
            // May get GLOBAL licenses
            expect(r.jurisdiction).toBe('XX');
        });

        test('sanctioned country flagged', () => {
            const r = engine.getLicenseRequirements('RU');
            expect(r.sanctioned).toBe(true);
        });
    });

    describe('routeCrossBorder', () => {
        test('EU→US allowed with DPF', () => {
            const r = engine.routeCrossBorder('EU', 'US');
            expect(r.allowed).toBe(true);
            expect(r.mechanism).toBe('EU-US DPF');
        });

        test('US→RU blocked', () => {
            const r = engine.routeCrossBorder('US', 'RU');
            expect(r.allowed).toBe(false);
        });

        test('any→KP blocked', () => {
            const r = engine.routeCrossBorder('SG', 'KP');
            expect(r.allowed).toBe(false);
        });

        test('SG→VN allowed via RCEP', () => {
            const r = engine.routeCrossBorder('SG', 'VN');
            expect(r.allowed).toBe(true);
            expect(r.mechanism).toBe('RCEP + Contract');
        });

        test('unsanctioned unknown pair uses standard contract', () => {
            const r = engine.routeCrossBorder('AU', 'NZ');
            expect(r.allowed).toBe(true);
            expect(r.mechanism).toBe('Standard Contract');
        });
    });

    describe('checkSanctions', () => {
        test('RU is sanctioned', () => {
            const r = engine.checkSanctions('RU');
            expect(r.sanctioned).toBe(true);
            expect(r.action).toContain('BLOCK');
        });

        test('SG is not sanctioned', () => {
            const r = engine.checkSanctions('SG');
            expect(r.sanctioned).toBe(false);
            expect(r.action).toBe('ALLOW');
        });

        test('sanctions list has 7 countries', () => {
            expect(engine.getSanctionedJurisdictions().length).toBe(7);
        });
    });

    describe('getLicensingMatrix', () => {
        test('returns 5 license types', () => {
            const r = engine.getLicensingMatrix();
            expect(r.license_types).toBe(5);
        });

        test('includes multiple jurisdictions', () => {
            const r = engine.getLicensingMatrix();
            expect(r.jurisdictions.length).toBeGreaterThan(5);
        });
    });

    describe('getLicenseTypes', () => {
        test('digital_asset has MiCA for EU', () => {
            const lt = engine.getLicenseTypes();
            expect(lt.digital_asset.jurisdictions.EU.framework).toContain('MiCA');
        });
    });
});
