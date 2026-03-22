const rbac = require('../../../server/engines/governance-module/constitutional-rbac');
const RBACClass = rbac.constructor;

let engine;
beforeEach(() => { engine = new RBACClass(); });

describe('ConstitutionalRBACEngine', () => {
    describe('enforce - monetization domain', () => {
        test('super_admin can view revenue allocation', () => {
            expect(engine.enforce('super_admin', 'monetization.revenue_allocation.view').allowed).toBe(true);
        });

        test('super_admin CANNOT change revenue allocation (SEP-1)', () => {
            const r = engine.enforce('super_admin', 'monetization.revenue_allocation.change');
            expect(r.allowed).toBe(false);
            expect(r.separation.id).toBe('SEP-1');
        });

        test('ggc_member can change revenue with conditions', () => {
            const r = engine.enforce('ggc_member', 'monetization.revenue_allocation.change');
            expect(r.allowed).toBe(true);
            expect(r.conditional).toBe(true);
            expect(r.requirements.type).toBe('super_majority');
        });

        test('validator incentive change requires constitutional amendment', () => {
            const r = engine.enforce('super_admin', 'monetization.validator_incentive.change');
            expect(r.allowed).toBe(false);
        });

        test('reserve withdrawal requires dual-key', () => {
            const r = engine.enforce('compliance_officer', 'monetization.reserve.withdraw');
            expect(r.allowed).toBe(true);
            expect(r.conditional).toBe(true);
            expect(r.requirements.type).toBe('dual_key');
        });
    });

    describe('enforce - network domain', () => {
        test('blockchain_operator CANNOT admit validators (SEP-2)', () => {
            const r = engine.enforce('blockchain_operator', 'network.validator.admit');
            expect(r.allowed).toBe(false);
            expect(r.separation.id).toBe('SEP-2');
        });

        test('blockchain_operator CAN anchor chain', () => {
            expect(engine.enforce('blockchain_operator', 'network.chain.anchor').allowed).toBe(true);
        });

        test('consensus override is IMMUTABLE', () => {
            const r = engine.enforce('super_admin', 'network.consensus.override');
            expect(r.allowed).toBe(false);
            expect(r.immutable).toBe(true);
        });

        test('chain rewrite is IMMUTABLE', () => {
            expect(engine.enforce('super_admin', 'network.chain.rewrite').immutable).toBe(true);
        });

        test('finality revert is IMMUTABLE', () => {
            expect(engine.enforce('super_admin', 'network.finality.revert').immutable).toBe(true);
        });

        test('ivu_validator CANNOT set weights (SEP-3)', () => {
            const r = engine.enforce('ivu_validator', 'network.scoring_weights.change');
            expect(r.allowed).toBe(false);
        });
    });

    describe('enforce - crisis domain', () => {
        test('yellow alert has 24h max duration', () => {
            const r = engine.enforce('ops_manager', 'crisis.yellow.activate');
            expect(r.allowed).toBe(true);
            expect(r.max_duration_hours).toBe(24);
        });

        test('black alert requires triple-key', () => {
            const r = engine.enforce('super_admin', 'crisis.black.activate');
            expect(r.conditional).toBe(true);
            expect(r.requirements.type).toBe('triple_key');
        });

        test('crisis duration extend is IMMUTABLE', () => {
            expect(engine.enforce('super_admin', 'crisis.duration.extend').immutable).toBe(true);
        });

        test('audit log override is IMMUTABLE', () => {
            expect(engine.enforce('super_admin', 'crisis.audit_log.override').immutable).toBe(true);
        });
    });

    describe('enforce - unknown action', () => {
        test('unknown action returns not allowed', () => {
            expect(engine.enforce('super_admin', 'unknown.action').allowed).toBe(false);
        });
    });

    describe('getRolePowers', () => {
        test('super_admin has can, cannot, conditional', () => {
            const r = engine.getRolePowers('super_admin');
            expect(r.can.length).toBeGreaterThan(0);
            expect(r.cannot.length).toBeGreaterThan(0);
        });

        test('blockchain_operator has separations', () => {
            const r = engine.getRolePowers('blockchain_operator');
            expect(r.separations.length).toBe(1);
            expect(r.separations[0].id).toBe('SEP-2');
        });
    });

    describe('runGovernanceAudit', () => {
        test('all 5 checks enforced', () => {
            const r = engine.runGovernanceAudit();
            expect(r.checks.length).toBe(5);
            expect(r.checks.every(c => c.enforced)).toBe(true);
        });

        test('has 6 critical separations', () => {
            expect(engine.runGovernanceAudit().critical_separations.length).toBe(6);
        });
    });

    describe('getSeparations', () => {
        test('has 6 separations', () => {
            expect(engine.getSeparations().length).toBe(6);
        });
    });

    describe('getDomainPowers', () => {
        test('monetization domain has 8 powers', () => {
            expect(Object.keys(engine.getDomainPowers('monetization')).length).toBe(8);
        });

        test('network domain has multiple powers', () => {
            expect(Object.keys(engine.getDomainPowers('network')).length).toBeGreaterThan(5);
        });

        test('crisis domain has multiple powers', () => {
            expect(Object.keys(engine.getDomainPowers('crisis')).length).toBeGreaterThan(5);
        });
    });
});
