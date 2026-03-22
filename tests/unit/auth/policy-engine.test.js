const { KYC_APPROVER_ROLES, IDENTITY_SOD_RULES } = require('../../../server/auth/policy-engine');

describe('policy-engine', () => {
    describe('KYC_APPROVER_ROLES', () => {
        test('includes org_owner', () => {
            expect(KYC_APPROVER_ROLES).toContain('org_owner');
        });

        test('includes company_admin', () => {
            expect(KYC_APPROVER_ROLES).toContain('company_admin');
        });

        test('includes executive', () => {
            expect(KYC_APPROVER_ROLES).toContain('executive');
        });

        test('includes compliance_officer', () => {
            expect(KYC_APPROVER_ROLES).toContain('compliance_officer');
        });

        test('has 4 roles', () => {
            expect(KYC_APPROVER_ROLES.length).toBe(4);
        });
    });

    describe('IDENTITY_SOD_RULES', () => {
        test('supplier:approve_kyc has SoD rule', () => {
            expect(IDENTITY_SOD_RULES['supplier:approve_kyc']).toBeDefined();
            expect(IDENTITY_SOD_RULES['supplier:approve_kyc'].table).toBe('partners');
        });

        test('supplier:reject_kyc has SoD rule', () => {
            expect(IDENTITY_SOD_RULES['supplier:reject_kyc']).toBeDefined();
        });

        test('SoD rules have correct structure', () => {
            const rule = IDENTITY_SOD_RULES['supplier:approve_kyc'];
            expect(rule).toHaveProperty('table');
            expect(rule).toHaveProperty('id_col');
            expect(rule).toHaveProperty('creator_col');
        });

        test('creator column is created_by', () => {
            expect(IDENTITY_SOD_RULES['supplier:approve_kyc'].creator_col).toBe('created_by');
        });
    });
});
