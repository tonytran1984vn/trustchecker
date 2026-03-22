const ug = require('../../../server/engines/governance-module/upgrade-governance');
const UGClass = ug.constructor;

let engine;
beforeEach(() => { engine = new UGClass(); });

describe('UpgradeGovernanceEngine', () => {
    describe('getClassification', () => {
        test('has 4 change classes', () => {
            expect(engine.getClassification().types.length).toBe(4);
        });

        test('Class A requires 75% supermajority', () => {
            const classA = engine.getClassification().types[0];
            expect(classA.quorum).toContain('75%');
        });

        test('Class D is standard engineering', () => {
            const classD = engine.getClassification().types[3];
            expect(classD.quorum).toContain('N/A');
        });
    });

    describe('getCABProcess', () => {
        test('has 7 process steps', () => {
            expect(engine.getCABProcess().process.length).toBe(7);
        });

        test('has change freeze periods', () => {
            expect(engine.getCABProcess().change_freeze.periods.length).toBe(4);
        });
    });

    describe('getRollback', () => {
        test('has 4 requirement categories', () => {
            expect(Object.keys(engine.getRollback().requirements).length).toBe(4);
        });

        test('Class D rollback is < 15 minutes', () => {
            expect(engine.getRollback().rollback_sla.class_d).toContain('15 minutes');
        });
    });

    describe('getVersionGovernance', () => {
        test('current version is 9.4.1', () => {
            expect(engine.getVersionGovernance().current.version).toBe('9.4.1');
        });
    });

    describe('classifyChange', () => {
        test('constitutional change → Class A', () => {
            const r = engine.classifyChange('Modify KS threshold', false, false, false, true);
            expect(r.class).toBe('A');
            expect(r.timeline).toContain('65 days');
        });

        test('scoring change → Class B', () => {
            const r = engine.classifyChange('Update trust weights', true, false, false, false);
            expect(r.class).toBe('B');
        });

        test('settlement change → Class B', () => {
            const r = engine.classifyChange('Change netting window', false, true, false, false);
            expect(r.class).toBe('B');
        });

        test('schema change → Class C', () => {
            const r = engine.classifyChange('Add new table', false, false, true, false);
            expect(r.class).toBe('C');
        });

        test('bug fix → Class D', () => {
            const r = engine.classifyChange('Fix calculation bug', false, false, false, false);
            expect(r.class).toBe('D');
            expect(r.approval).toContain('Engineering Lead');
        });
    });
});
