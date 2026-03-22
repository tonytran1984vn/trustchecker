const jl = require('../../../server/engines/regulatory-engine/jurisdiction-logic');
const JLClass = jl.constructor;

let engine;
beforeEach(() => { engine = new JLClass(); });

describe('JurisdictionLogicEngine', () => {
    describe('getConflictResolution', () => {
        test('has 4 judicial conflicts', () => {
            expect(engine.getConflictResolution().conflicts.length).toBe(4);
        });

        test('LC-01 is GDPR vs US subpoena', () => {
            const lc01 = engine.getConflictResolution().conflicts[0];
            expect(lc01.conflict).toContain('GDPR');
            expect(lc01.conflict).toContain('Subpoena');
        });
    });

    describe('getArbitragePrevention', () => {
        test('has 5 safeguards', () => {
            expect(engine.getArbitragePrevention().safeguards.length).toBe(5);
        });

        test('includes transfer pricing compliance', () => {
            const tp = engine.getArbitragePrevention().safeguards[0];
            expect(tp.safeguard).toContain('Transfer Pricing');
        });
    });

    describe('getLiabilityMap', () => {
        test('has 7 liability events', () => {
            expect(engine.getLiabilityMap().liabilities.length).toBe(7);
        });

        test('settlement failure covered by PI/E&O', () => {
            const sf = engine.getLiabilityMap().liabilities[0];
            expect(sf.insurance).toContain('PI/E&O');
        });
    });

    describe('getGoverningLaw', () => {
        test('has 8 contract types', () => {
            expect(engine.getGoverningLaw().matrix.length).toBe(8);
        });

        test('SaaS governed by Singapore', () => {
            const saas = engine.getGoverningLaw().matrix[0];
            expect(saas.governing_law).toBe('Singapore');
        });

        test('DPA governed by Ireland', () => {
            const dpa = engine.getGoverningLaw().matrix.find(m => m.contract_type.includes('Data Processing'));
            expect(dpa.governing_law).toContain('Ireland');
        });
    });

    describe('getCrossBorderEnforcement', () => {
        test('has 5 enforcement mechanisms', () => {
            expect(engine.getCrossBorderEnforcement().mechanisms.length).toBe(5);
        });

        test('SIAC covers 170+ countries', () => {
            const siac = engine.getCrossBorderEnforcement().mechanisms[0];
            expect(siac.enforceability).toContain('170+');
        });
    });

    describe('resolveConflict', () => {
        test('resolves LC-01', () => {
            const r = engine.resolveConflict('LC-01');
            expect(r.governing_entity).toContain('Data Compliance');
        });

        test('unknown conflict returns error', () => {
            const r = engine.resolveConflict('UNKNOWN');
            expect(r.error).toBeDefined();
        });
    });

    describe('getFullFramework', () => {
        test('returns version 1.0', () => {
            expect(engine.getFullFramework().version).toBe('1.0');
        });
    });
});
