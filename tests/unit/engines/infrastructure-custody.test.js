const ic = require('../../../server/engines/platform-ops-engine/infrastructure-custody');
const ICClass = ic.constructor;

let engine;
beforeEach(() => { engine = new ICClass(); });

describe('InfrastructureCustodyEngine', () => {
    describe('assessSecurityPosture', () => {
        test('default config returns grade A/B', () => {
            const r = engine.assessSecurityPosture();
            expect(['A+', 'A', 'B']).toContain(r.grade);
            expect(r.checks.length).toBe(12);
        });

        test('perfect config returns A+', () => {
            const r = engine.assessSecurityPosture({ tls_enabled: true, encryption_at_rest: true, key_rotation_days: 30, hsm_enabled: true, multi_region: true, org_isolation: true, zero_trust: true, audit_immutable: true, hash_chain_verified: true, mfa_enforced: true, ip_whitelist: true });
            expect(r.grade).toBe('A+');
            expect(r.status).toBe('compliant');
        });

        test('critical failures make non-compliant', () => {
            const r = engine.assessSecurityPosture({ tls_enabled: false, encryption_at_rest: false });
            expect(r.status).toBe('non_compliant');
            expect(r.critical_failures.length).toBeGreaterThan(0);
        });
    });

    describe('checkOrgIsolation', () => {
        test('reports isolation for given orgs', () => {
            const r = engine.checkOrgIsolation([{ org_id: 'O1', name: 'Org1' }, { org_id: 'O2', name: 'Org2' }]);
            expect(r.total_orgs).toBe(2);
            expect(r.all_isolated).toBe(true);
        });

        test('empty orgs returns 0', () => {
            expect(engine.checkOrgIsolation([]).total_orgs).toBe(0);
        });
    });

    describe('verifyHashChain', () => {
        test('empty chain is valid', () => {
            const r = engine.verifyHashChain([]);
            expect(r.chain_valid).toBe(true);
        });

        test('entries get verified', () => {
            const r = engine.verifyHashChain([{ hash: 'abc', data: 'x' }, { hash: 'def', data: 'y' }]);
            expect(r.verified).toBe(1);
        });
    });

    describe('getKeyManagementStatus', () => {
        test('has 5 managed keys', () => {
            expect(engine.getKeyManagementStatus().total_keys).toBe(5);
        });

        test('rotation policy is 90 days', () => {
            expect(engine.getKeyManagementStatus().rotation_policy).toBe('90 days');
        });
    });

    describe('checkDisasterRecovery', () => {
        test('RPO is 1 hour', () => {
            expect(engine.checkDisasterRecovery().rpo_hours).toBe(1);
        });

        test('RTO is 4 hours', () => {
            expect(engine.checkDisasterRecovery().rto_hours).toBe(4);
        });
    });

    describe('verifySeparationOfPowers', () => {
        test('no single point of control', () => {
            expect(engine.verifySeparationOfPowers().no_single_point_of_control).toBe(true);
        });

        test('all collapse points blocked', () => {
            expect(engine.verifySeparationOfPowers().all_collapse_points_blocked).toBe(true);
        });
    });

    describe('getITBoundary', () => {
        test('has 8 can-do actions', () => {
            expect(engine.getITBoundary().can_do.length).toBe(8);
        });

        test('has 5 cannot-do restrictions', () => {
            expect(engine.getITBoundary().cannot_do.length).toBe(5);
        });
    });
});
