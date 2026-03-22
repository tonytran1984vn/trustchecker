/**
 * Auth Mock — provides mock middleware and user factories
 *
 * Usage:
 *   const { mockUser, mockAuthMiddleware } = require('../helpers/auth-mock');
 *   app.use(mockAuthMiddleware(mockUser.admin()));
 */

const { v4: uuidv4 } = require('uuid');

const TEST_ORG_ID = '6a2db056-62ec-49ad-8185-16a9021b1b83';

const mockUser = {
    superAdmin: (overrides = {}) => ({
        id: uuidv4(),
        email: 'superadmin@test.com',
        username: 'superadmin',
        role: 'super_admin',
        user_type: 'platform',
        orgId: null,
        ...overrides,
    }),
    admin: (overrides = {}) => ({
        id: uuidv4(),
        email: 'admin@test.com',
        username: 'admin',
        role: 'admin',
        user_type: 'org',
        orgId: TEST_ORG_ID,
        org_id: TEST_ORG_ID,
        ...overrides,
    }),
    companyAdmin: (overrides = {}) => ({
        id: uuidv4(),
        email: 'company-admin@test.com',
        username: 'company_admin',
        role: 'company_admin',
        user_type: 'org',
        orgId: TEST_ORG_ID,
        org_id: TEST_ORG_ID,
        ...overrides,
    }),
    operator: (overrides = {}) => ({
        id: uuidv4(),
        email: 'operator@test.com',
        username: 'operator',
        role: 'operator',
        user_type: 'org',
        orgId: TEST_ORG_ID,
        org_id: TEST_ORG_ID,
        ...overrides,
    }),
    viewer: (overrides = {}) => ({
        id: uuidv4(),
        email: 'viewer@test.com',
        username: 'viewer',
        role: 'viewer',
        user_type: 'org',
        orgId: TEST_ORG_ID,
        org_id: TEST_ORG_ID,
        ...overrides,
    }),
};

/**
 * Creates a mock authMiddleware that injects the given user into req.user
 */
function mockAuthMiddleware(user) {
    return (req, _res, next) => {
        req.user = user;
        next();
    };
}

/**
 * Creates a mock orgGuard middleware
 */
function mockOrgGuard(orgId = TEST_ORG_ID) {
    return () => (req, _res, next) => {
        req.orgId = orgId;
        req.tenantId = orgId;
        next();
    };
}

module.exports = { mockUser, mockAuthMiddleware, mockOrgGuard, TEST_ORG_ID };
