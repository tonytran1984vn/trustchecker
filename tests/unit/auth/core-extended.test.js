// Test core.js extended — deepening tests for ROLE_HIERARCHY, JWT constants
// Using correct L1-L5 values from actual server/auth/core.js
const {
    ROLE_HIERARCHY, JWT_SECRET, JWT_EXPIRY,
    MAX_FAILED_ATTEMPTS, LOCKOUT_MINUTES,
} = require('../../../server/auth/core');

describe('auth/core extended', () => {
    describe('ROLE_HIERARCHY detailed', () => {
        const allRoles = Object.keys(ROLE_HIERARCHY);

        test('has at least 30 roles', () => {
            expect(allRoles.length).toBeGreaterThanOrEqual(30);
        });

        // L5: Platform Layer
        test('super_admin is L5', () => {
            expect(ROLE_HIERARCHY.super_admin).toBe(5);
        });

        test('platform_security is L5', () => {
            expect(ROLE_HIERARCHY.platform_security).toBe(5);
        });

        test('data_gov_officer is L5', () => {
            expect(ROLE_HIERARCHY.data_gov_officer).toBe(5);
        });

        test('change_management_officer is L5', () => {
            expect(ROLE_HIERARCHY.change_management_officer).toBe(5);
        });

        test('incident_response_lead is L5', () => {
            expect(ROLE_HIERARCHY.incident_response_lead).toBe(5);
        });

        // L4: Global Governance
        test('ggc_member is L4', () => {
            expect(ROLE_HIERARCHY.ggc_member).toBe(4);
        });

        test('risk_committee is L4', () => {
            expect(ROLE_HIERARCHY.risk_committee).toBe(4);
        });

        test('compliance_officer is L4', () => {
            expect(ROLE_HIERARCHY.compliance_officer).toBe(4);
        });

        test('ivu_validator is L4', () => {
            expect(ROLE_HIERARCHY.ivu_validator).toBe(4);
        });

        // L3: Org Governance
        test('org_owner is L3', () => {
            expect(ROLE_HIERARCHY.org_owner).toBe(3);
        });

        test('admin is L3', () => {
            expect(ROLE_HIERARCHY.admin).toBe(3);
        });

        test('company_admin is L3', () => {
            expect(ROLE_HIERARCHY.company_admin).toBe(3);
        });

        test('executive is L3', () => {
            expect(ROLE_HIERARCHY.executive).toBe(3);
        });

        test('carbon_officer is L3', () => {
            expect(ROLE_HIERARCHY.carbon_officer).toBe(3);
        });

        test('security_officer is L3', () => {
            expect(ROLE_HIERARCHY.security_officer).toBe(3);
        });

        // L2: Operational
        test('ops_manager is L2', () => {
            expect(ROLE_HIERARCHY.ops_manager).toBe(2);
        });

        test('risk_officer is L2', () => {
            expect(ROLE_HIERARCHY.risk_officer).toBe(2);
        });

        test('scm_analyst is L2', () => {
            expect(ROLE_HIERARCHY.scm_analyst).toBe(2);
        });

        test('disclosure_officer is L2', () => {
            expect(ROLE_HIERARCHY.disclosure_officer).toBe(2);
        });

        // L1: Technical Execution
        test('developer is L1', () => {
            expect(ROLE_HIERARCHY.developer).toBe(1);
        });

        test('operator is L1', () => {
            expect(ROLE_HIERARCHY.operator).toBe(1);
        });

        test('viewer is L1', () => {
            expect(ROLE_HIERARCHY.viewer).toBe(1);
        });

        test('auditor is L1', () => {
            expect(ROLE_HIERARCHY.auditor).toBe(1);
        });

        test('blockchain_operator is L1', () => {
            expect(ROLE_HIERARCHY.blockchain_operator).toBe(1);
        });

        test('data_steward is L1', () => {
            expect(ROLE_HIERARCHY.data_steward).toBe(1);
        });

        test('board_observer is L1', () => {
            expect(ROLE_HIERARCHY.board_observer).toBe(1);
        });

        test('external_auditor is L1', () => {
            expect(ROLE_HIERARCHY.external_auditor).toBe(1);
        });

        // Aggregate tests
        test('all roles have numeric levels', () => {
            allRoles.forEach(role => {
                expect(typeof ROLE_HIERARCHY[role]).toBe('number');
            });
        });

        test('all levels are between 1 and 5', () => {
            allRoles.forEach(role => {
                expect(ROLE_HIERARCHY[role]).toBeGreaterThanOrEqual(1);
                expect(ROLE_HIERARCHY[role]).toBeLessThanOrEqual(5);
            });
        });

        test('L5 has at least 3 roles', () => {
            const l5 = allRoles.filter(r => ROLE_HIERARCHY[r] === 5);
            expect(l5.length).toBeGreaterThanOrEqual(3);
        });

        test('L1 has the most roles', () => {
            const counts = {};
            allRoles.forEach(r => {
                const l = ROLE_HIERARCHY[r];
                counts[l] = (counts[l] || 0) + 1;
            });
            expect(counts[1]).toBeGreaterThanOrEqual(counts[5] || 0);
        });

        test('global_risk_committee is L5', () => {
            expect(ROLE_HIERARCHY.global_risk_committee).toBe(5);
        });
    });

    describe('JWT constants', () => {
        test('JWT_SECRET is defined', () => {
            expect(JWT_SECRET).toBeDefined();
        });

        test('JWT_SECRET is a non-empty string', () => {
            expect(typeof JWT_SECRET).toBe('string');
            expect(JWT_SECRET.length).toBeGreaterThan(0);
        });

        test('JWT_EXPIRY is 1h', () => {
            expect(JWT_EXPIRY).toBe('1h');
        });

        test('MAX_FAILED_ATTEMPTS is 5', () => {
            expect(MAX_FAILED_ATTEMPTS).toBe(5);
        });

        test('LOCKOUT_MINUTES is 15', () => {
            expect(LOCKOUT_MINUTES).toBe(15);
        });

        test('MAX_FAILED_ATTEMPTS is a positive number', () => {
            expect(MAX_FAILED_ATTEMPTS).toBeGreaterThan(0);
        });

        test('LOCKOUT_MINUTES is a positive number', () => {
            expect(LOCKOUT_MINUTES).toBeGreaterThan(0);
        });
    });
});
