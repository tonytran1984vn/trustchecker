const {
    SOD_CONFLICTS, CA_FORBIDDEN_PERMISSIONS, HIGH_RISK_ROLES,
    isCAForbidden, isHighRiskRole,
    requirePermission, requirePlatformAdmin, requireOrgAdmin,
} = require('../../../server/auth/rbac');

describe('rbac', () => {
    describe('CA_FORBIDDEN_PERMISSIONS', () => {
        test('is a Set', () => {
            expect(CA_FORBIDDEN_PERMISSIONS).toBeInstanceOf(Set);
        });

        test('contains carbon_credit:approve_mint', () => {
            expect(CA_FORBIDDEN_PERMISSIONS.has('carbon_credit:approve_mint')).toBe(true);
        });

        test('contains risk_model:deploy', () => {
            expect(CA_FORBIDDEN_PERMISSIONS.has('risk_model:deploy')).toBe(true);
        });

        test('contains compliance:freeze', () => {
            expect(CA_FORBIDDEN_PERMISSIONS.has('compliance:freeze')).toBe(true);
        });

        test('contains evidence:seal', () => {
            expect(CA_FORBIDDEN_PERMISSIONS.has('evidence:seal')).toBe(true);
        });

        test('contains graph_schema:approve', () => {
            expect(CA_FORBIDDEN_PERMISSIONS.has('graph_schema:approve')).toBe(true);
        });

        test('does not contain product:create', () => {
            expect(CA_FORBIDDEN_PERMISSIONS.has('product:create')).toBe(false);
        });

        test('has more than 10 forbidden permissions', () => {
            expect(CA_FORBIDDEN_PERMISSIONS.size).toBeGreaterThan(10);
        });
    });

    describe('HIGH_RISK_ROLES', () => {
        test('is a Set', () => {
            expect(HIGH_RISK_ROLES).toBeInstanceOf(Set);
        });

        test('contains compliance_officer', () => {
            expect(HIGH_RISK_ROLES.has('compliance_officer')).toBe(true);
        });

        test('contains risk_officer', () => {
            expect(HIGH_RISK_ROLES.has('risk_officer')).toBe(true);
        });

        test('contains company_admin', () => {
            expect(HIGH_RISK_ROLES.has('company_admin')).toBe(true);
        });

        test('contains org_owner', () => {
            expect(HIGH_RISK_ROLES.has('org_owner')).toBe(true);
        });

        test('does not contain operator', () => {
            expect(HIGH_RISK_ROLES.has('operator')).toBe(false);
        });

        test('does not contain viewer', () => {
            expect(HIGH_RISK_ROLES.has('viewer')).toBe(false);
        });
    });

    describe('isCAForbidden', () => {
        test('returns true for CA-forbidden permission', () => {
            expect(isCAForbidden('carbon_credit:approve_mint')).toBe(true);
        });

        test('returns true for platform: prefix', () => {
            expect(isCAForbidden('platform:anything')).toBe(true);
        });

        test('returns false for product:create', () => {
            expect(isCAForbidden('product:create')).toBe(false);
        });

        test('returns false for org:user:create', () => {
            expect(isCAForbidden('org:user:create')).toBe(false);
        });

        test('returns true for evidence:seal', () => {
            expect(isCAForbidden('evidence:seal')).toBe(true);
        });

        test('returns true for lrgf_case:override', () => {
            expect(isCAForbidden('lrgf_case:override')).toBe(true);
        });
    });

    describe('isHighRiskRole', () => {
        test('returns true for compliance_officer', () => {
            expect(isHighRiskRole('compliance_officer')).toBe(true);
        });

        test('returns false for operator', () => {
            expect(isHighRiskRole('operator')).toBe(false);
        });

        test('returns true for carbon_officer', () => {
            expect(isHighRiskRole('carbon_officer')).toBe(true);
        });

        test('returns false for viewer', () => {
            expect(isHighRiskRole('viewer')).toBe(false);
        });
    });

    describe('SOD_CONFLICTS', () => {
        test('is an array', () => {
            expect(Array.isArray(SOD_CONFLICTS)).toBe(true);
        });

        test('has at least 20 conflict pairs', () => {
            expect(SOD_CONFLICTS.length).toBeGreaterThanOrEqual(20);
        });

        test('each entry has exactly 2 elements', () => {
            SOD_CONFLICTS.forEach(pair => {
                expect(pair).toHaveLength(2);
            });
        });

        test('contains fraud_case create/approve pair', () => {
            const found = SOD_CONFLICTS.some(([a, b]) =>
                (a === 'fraud_case:create' && b === 'fraud_case:approve') ||
                (b === 'fraud_case:create' && a === 'fraud_case:approve')
            );
            expect(found).toBe(true);
        });

        test('contains payment create/approve pair', () => {
            const found = SOD_CONFLICTS.some(([a, b]) =>
                (a === 'payment:create' && b === 'payment:approve') ||
                (b === 'payment:create' && a === 'payment:approve')
            );
            expect(found).toBe(true);
        });

        test('contains risk_model create/deploy pair', () => {
            const found = SOD_CONFLICTS.some(([a, b]) =>
                (a === 'risk_model:create' && b === 'risk_model:deploy') ||
                (b === 'risk_model:create' && a === 'risk_model:deploy')
            );
            expect(found).toBe(true);
        });

        test('contains governance propose/approve pair', () => {
            const found = SOD_CONFLICTS.some(([a, b]) =>
                a.includes('governance') && b.includes('governance')
            );
            expect(found).toBe(true);
        });

        test('contains supplier onboard/approve pair', () => {
            const found = SOD_CONFLICTS.some(([a, b]) =>
                (a === 'supplier:onboard' && b === 'supplier:approve_kyc') ||
                (b === 'supplier:onboard' && a === 'supplier:approve_kyc')
            );
            expect(found).toBe(true);
        });

        test('all entries are string pairs', () => {
            SOD_CONFLICTS.forEach(([a, b]) => {
                expect(typeof a).toBe('string');
                expect(typeof b).toBe('string');
            });
        });

        test('all permissions follow resource:action format', () => {
            SOD_CONFLICTS.forEach(([a, b]) => {
                expect(a).toContain(':');
                expect(b).toContain(':');
            });
        });
    });

    describe('requirePermission middleware', () => {
        function mockRes() {
            return { status: jest.fn().mockReturnThis(), json: jest.fn() };
        }

        test('returns a middleware function', () => {
            expect(typeof requirePermission('product:view')).toBe('function');
        });

        test('returns 401 when no user', async () => {
            const res = mockRes();
            await requirePermission('x')({ user: null }, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(401);
        });

        test('bypasses for platform super_admin', async () => {
            const next = jest.fn();
            await requirePermission('anything')(
                { user: { user_type: 'platform', role: 'super_admin', id: '1' } },
                mockRes(), next
            );
            expect(next).toHaveBeenCalled();
        });

        test('bypasses for platform admin', async () => {
            const next = jest.fn();
            await requirePermission('anything')(
                { user: { user_type: 'platform', role: 'admin', id: '1' } },
                mockRes(), next
            );
            expect(next).toHaveBeenCalled();
        });
    });

    describe('requirePlatformAdmin middleware', () => {
        function mockRes() {
            return { status: jest.fn().mockReturnThis(), json: jest.fn() };
        }

        test('returns a middleware function', () => {
            expect(typeof requirePlatformAdmin()).toBe('function');
        });

        test('returns 401 when no user', () => {
            const res = mockRes();
            requirePlatformAdmin()({ user: null }, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(401);
        });

        test('returns 403 for non-platform user', () => {
            const res = mockRes();
            requirePlatformAdmin()({ user: { user_type: 'org' } }, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json.mock.calls[0][0].code).toBe('PLATFORM_ONLY');
        });

        test('passes for platform user', () => {
            const next = jest.fn();
            requirePlatformAdmin()({ user: { user_type: 'platform' } }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('requireOrgAdmin middleware', () => {
        function mockRes() {
            return { status: jest.fn().mockReturnThis(), json: jest.fn() };
        }

        test('returns a middleware function', () => {
            expect(typeof requireOrgAdmin()).toBe('function');
        });

        test('returns 401 when no user', async () => {
            const res = mockRes();
            await requireOrgAdmin()({ user: null }, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(401);
        });

        test('bypasses for platform user', async () => {
            const next = jest.fn();
            await requireOrgAdmin()({ user: { user_type: 'platform' } }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });
    });
});
