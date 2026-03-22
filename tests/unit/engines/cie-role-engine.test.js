const cie = require('../../../server/engines/infrastructure/cie-role-engine');

describe('CIE Role Engine', () => {
    describe('getAllRoles', () => {
        test('has all 4 layers', () => {
            const roles = cie.getAllRoles();
            expect(roles.L1_infrastructure).toBeDefined();
            expect(roles.L2_federation).toBeDefined();
            expect(roles.L3_org).toBeDefined();
            expect(roles.L4_capital_market).toBeDefined();
        });

        test('L1 has 7 infrastructure roles', () => {
            expect(Object.keys(cie.getAllRoles().L1_infrastructure).length).toBe(7);
        });

        test('L2 has 4 federation roles', () => {
            expect(Object.keys(cie.getAllRoles().L2_federation).length).toBe(4);
        });

        test('L3 has 15 org roles', () => {
            expect(Object.keys(cie.getAllRoles().L3_org).length).toBe(15);
        });

        test('L4 has 3 capital market roles', () => {
            expect(Object.keys(cie.getAllRoles().L4_capital_market).length).toBe(3);
        });
    });

    describe('getRoleById', () => {
        test('finds L1 role', () => {
            const r = cie.getRoleById('platform_super_admin');
            expect(r.layer).toBe('L1');
            expect(r.can.length).toBeGreaterThan(0);
        });

        test('finds L2 role', () => {
            const r = cie.getRoleById('ivu_validator');
            expect(r.layer).toBe('L2');
            expect(r.federated).toBe(true);
        });

        test('finds L3 role', () => {
            const r = cie.getRoleById('carbon_officer');
            expect(r.layer).toBe('L3');
            expect(r.chain).toBe('operational');
        });

        test('finds L4 role', () => {
            const r = cie.getRoleById('external_auditor');
            expect(r.layer).toBe('L4');
            expect(r.time_bound).toBe(true);
        });

        test('returns null for unknown', () => {
            expect(cie.getRoleById('fake_role')).toBeNull();
        });
    });

    describe('getRoleLayer', () => {
        test('returns correct layer', () => {
            expect(cie.getRoleLayer('platform_super_admin')).toBe('L1');
            expect(cie.getRoleLayer('ivu_validator')).toBe('L2');
            expect(cie.getRoleLayer('carbon_officer')).toBe('L3');
            expect(cie.getRoleLayer('external_auditor')).toBe('L4');
        });

        test('returns null for unknown', () => {
            expect(cie.getRoleLayer('fake')).toBeNull();
        });
    });

    describe('SoD enforcement', () => {
        test('platform_super_admin cannot edit emission data', () => {
            const r = cie.getRoleById('platform_super_admin');
            expect(r.cannot).toContain('edit_emission_data');
        });

        test('emission_engine cannot accept manual override', () => {
            const r = cie.getRoleById('emission_engine');
            expect(r.cannot).toContain('accept_manual_override');
            expect(r.is_system).toBe(true);
        });

        test('ivu_validator cannot be created by org', () => {
            const r = cie.getRoleById('ivu_validator');
            expect(r.cannot).toContain('be_created_by_org');
        });

        test('carbon_officer cannot approve own CIP', () => {
            const r = cie.getRoleById('carbon_officer');
            expect(r.cannot).toContain('approve_cip');
        });

        test('disclosure_officer carries personal liability', () => {
            const r = cie.getRoleById('disclosure_officer');
            expect(r.carries_liability).toBe(true);
        });

        test('board_observer is view-only', () => {
            const r = cie.getRoleById('board_observer');
            expect(r.cannot).toContain('modify_data');
            expect(r.cannot).toContain('approve_cip');
        });
    });

    describe('getAuthorityMatrix', () => {
        test('has 9 actions', () => {
            expect(cie.getAuthorityMatrix().actions.length).toBe(9);
        });

        test('4 layer rows', () => {
            expect(Object.keys(cie.getAuthorityMatrix().layers).length).toBe(4);
        });
    });

    describe('getSoDMatrix', () => {
        test('has 11 actions defined', () => {
            expect(cie.getSoDMatrix().actions.length).toBe(11);
        });
    });

    describe('getCipLifecycle', () => {
        test('has 10 stages', () => {
            expect(cie.getCipLifecycle().length).toBe(10);
        });

        test('starts with ingested', () => {
            expect(cie.getCipLifecycle()[0].stage).toBe('ingested');
        });

        test('ends with disclosed', () => {
            expect(cie.getCipLifecycle()[9].stage).toBe('disclosed');
        });
    });

    describe('getEscalationChain', () => {
        test('has 5 escalation steps', () => {
            expect(cie.getEscalationChain().length).toBe(5);
        });

        test('includes cross-layer escalations', () => {
            expect(cie.getEscalationChain().filter(e => e.cross_layer).length).toBeGreaterThan(0);
        });
    });

    describe('getAccessPrinciples', () => {
        test('has 11 principles', () => {
            expect(cie.getAccessPrinciples().length).toBe(11);
        });
    });

    describe('getLiabilityMatrix', () => {
        test('has responsible and not responsible', () => {
            const m = cie.getLiabilityMatrix();
            expect(m.trustchecker_responsible_for.length).toBeGreaterThan(0);
            expect(m.trustchecker_NOT_responsible_for.length).toBeGreaterThan(0);
        });
    });
});

describe('CIE Role Engine - Functions', () => {
    describe('canPerform', () => {
        test('carbon_officer can submit emission data', () => {
            expect(cie.canPerform('carbon_officer', 'submit_emission_data')).toBe(true);
        });

        test('carbon_officer cannot approve CIP', () => {
            expect(cie.canPerform('carbon_officer', 'approve_cip')).toBe(false);
        });

        test('compliance_officer can approve CIP', () => {
            expect(cie.canPerform('compliance_officer', 'approve_cip')).toBe(true);
        });

        test('platform_super_admin can manage infra', () => {
            expect(cie.canPerform('platform_super_admin', 'manage_infra')).toBe(true);
        });

        test('external_auditor can read snapshot', () => {
            expect(cie.canPerform('external_auditor', 'read_snapshot_capsule')).toBe(true);
        });

        test('unknown role returns false', () => {
            expect(cie.canPerform('fake_role', 'anything')).toBe(false);
        });

        test('ivu_validator can validate CIP', () => {
            expect(cie.canPerform('ivu_validator', 'validate_cip')).toBe(true);
        });

        test('blockchain_operator can anchor hash', () => {
            expect(cie.canPerform('blockchain_operator', 'anchor_hash')).toBe(true);
        });
    });

    describe('isBlocked', () => {
        test('carbon_officer blocked from approving CIP', () => {
            expect(cie.isBlocked('carbon_officer', 'approve_cip')).toBe(true);
        });

        test('carbon_officer NOT blocked from submitting data', () => {
            expect(cie.isBlocked('carbon_officer', 'submit_emission_data')).toBe(false);
        });

        test('platform_super_admin blocked from editing emission data', () => {
            expect(cie.isBlocked('platform_super_admin', 'edit_emission_data')).toBe(true);
        });

        test('emission_engine blocked from manual override', () => {
            expect(cie.isBlocked('emission_engine', 'accept_manual_override')).toBe(true);
        });

        test('unknown role is blocked', () => {
            expect(cie.isBlocked('fake', 'anything')).toBe(true);
        });
    });

    describe('isFederated', () => {
        test('ivu_validator is federated', () => {
            expect(cie.isFederated('ivu_validator')).toBe(true);
        });

        test('blockchain_operator is federated', () => {
            expect(cie.isFederated('blockchain_operator')).toBe(true);
        });

        test('mgb_member is federated', () => {
            expect(cie.isFederated('mgb_member')).toBe(true);
        });

        test('carbon_officer is NOT federated', () => {
            expect(cie.isFederated('carbon_officer')).toBe(false);
        });

        test('platform_super_admin is NOT federated', () => {
            expect(cie.isFederated('platform_super_admin')).toBe(false);
        });

        test('unknown role is NOT federated', () => {
            expect(cie.isFederated('fake')).toBe(false);
        });
    });

    describe('getReplayLevel', () => {
        test('ivu_validator has replay level 3', () => {
            expect(cie.getReplayLevel('ivu_validator')).toBe(3);
        });

        test('carbon_officer has replay level 1', () => {
            expect(cie.getReplayLevel('carbon_officer')).toBe(1);
        });

        test('external_auditor has replay level 2', () => {
            expect(cie.getReplayLevel('external_auditor')).toBe(2);
        });

        test('supplier_contributor has replay level 0', () => {
            expect(cie.getReplayLevel('supplier_contributor')).toBe(0);
        });

        test('platform_super_admin L1 non-system has replay level 0', () => {
            expect(cie.getReplayLevel('platform_super_admin')).toBe(0);
        });

        test('unknown role returns 0', () => {
            expect(cie.getReplayLevel('fake')).toBe(0);
        });
    });

    describe('validateTransition', () => {
        test('ingested → draft by carbon_officer is ALLOWED', () => {
            const r = cie.validateTransition('ingested', 'draft', 'carbon_officer');
            expect(r.allowed).toBe(true);
            expect(r.stage).toBe('draft');
        });

        test('draft → pre_validated by data_steward is ALLOWED', () => {
            expect(cie.validateTransition('draft', 'pre_validated', 'data_steward').allowed).toBe(true);
        });

        test('pre_validated → calculated by emission_engine is ALLOWED', () => {
            expect(cie.validateTransition('pre_validated', 'calculated', 'emission_engine').allowed).toBe(true);
        });

        test('validated → approved by compliance_officer is ALLOWED', () => {
            expect(cie.validateTransition('validated', 'approved', 'compliance_officer').allowed).toBe(true);
        });

        test('carbon_officer CANNOT do pre_validated → calculated (wrong role)', () => {
            const r = cie.validateTransition('pre_validated', 'calculated', 'carbon_officer');
            expect(r.allowed).toBe(false);
        });

        test('skipping stages is NOT allowed', () => {
            const r = cie.validateTransition('ingested', 'calculated', 'carbon_officer');
            expect(r.allowed).toBe(false);
        });

        test('invalid stage returns not allowed', () => {
            expect(cie.validateTransition('fake', 'draft', 'x').allowed).toBe(false);
        });
    });

    describe('getReplayAccessLevels', () => {
        test('has 4 levels', () => {
            expect(cie.getReplayAccessLevels().length).toBe(4);
        });
    });

    describe('getMethodologyChangeFlow', () => {
        test('has 5 steps', () => {
            expect(cie.getMethodologyChangeFlow().length).toBe(5);
        });
    });
});
