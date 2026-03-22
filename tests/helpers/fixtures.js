/**
 * Test Fixtures — reusable test data
 */
const { v4: uuidv4 } = require('uuid');

const TEST_ORG_ID = '6a2db056-62ec-49ad-8185-16a9021b1b83';

const fixtures = {
    org: (overrides = {}) => ({
        id: TEST_ORG_ID,
        name: 'Test Org',
        slug: 'test-org',
        plan: 'enterprise',
        status: 'active',
        settings: '{}',
        feature_flags: '{}',
        created_at: new Date().toISOString(),
        ...overrides,
    }),

    user: (overrides = {}) => ({
        id: uuidv4(),
        username: 'testuser',
        email: 'test@example.com',
        password_hash: '$2a$12$hash',
        role: 'operator',
        user_type: 'org',
        org_id: TEST_ORG_ID,
        company: 'Test Org',
        mfa_enabled: false,
        created_at: new Date().toISOString(),
        last_login: null,
        failed_attempts: 0,
        locked_until: null,
        ...overrides,
    }),

    product: (overrides = {}) => ({
        id: uuidv4(),
        name: 'Test Product',
        category: 'electronics',
        sku: 'TP-001',
        org_id: TEST_ORG_ID,
        status: 'active',
        created_at: new Date().toISOString(),
        ...overrides,
    }),

    partner: (overrides = {}) => ({
        id: uuidv4(),
        name: 'Test Partner',
        type: 'supplier',
        org_id: TEST_ORG_ID,
        trust_score: 85,
        kyc_status: 'verified',
        country: 'VN',
        ...overrides,
    }),

    session: (overrides = {}) => ({
        id: uuidv4(),
        user_id: uuidv4(),
        ip_address: '127.0.0.1',
        user_agent: 'Jest Test Agent',
        revoked: false,
        ...overrides,
    }),

    auditEntry: (overrides = {}) => ({
        id: uuidv4(),
        actor_id: uuidv4(),
        action: 'TEST_ACTION',
        entity_type: 'test',
        entity_id: uuidv4(),
        details: '{}',
        ip_address: '127.0.0.1',
        timestamp: new Date().toISOString(),
        prev_hash: '0',
        entry_hash: null,
        ...overrides,
    }),
};

module.exports = { fixtures, TEST_ORG_ID };
