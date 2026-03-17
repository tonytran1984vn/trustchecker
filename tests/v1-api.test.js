/**
 * V1 API Integration Tests
 * Tests all 11 v1 domain controllers against the live API.
 *
 * Run: npx jest tests/v1-api.test.js --forceExit
 */
const request = require('supertest');
const BASE = process.env.TEST_URL || 'http://localhost:4000';

// Auth helper — login once, reuse token
let authToken = null;
async function getToken() {
    if (authToken) return authToken;
    const res = await request(BASE)
        .post('/api/auth/login')
        .send({ email: 'owner@tonyisking.com', password: '123qaz12' })
        .set('Content-Type', 'application/json');
    authToken = res.body?.token || res.body?.data?.token;
    return authToken;
}

function api() {
    return request(BASE);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Health Check
// ═══════════════════════════════════════════════════════════════════════════════
describe('Health Check', () => {
    it('GET /healthz should return ok', async () => {
        const res = await api().get('/healthz');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V1 Products
// ═══════════════════════════════════════════════════════════════════════════════
describe('V1 Products', () => {
    it('GET /api/v1/products should return unified format', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/products')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('meta');
        expect(res.body.meta).toHaveProperty('api_version', 1);
    });

    it('GET /api/v1/products with pagination', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/products?page=1&limit=5')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.meta).toHaveProperty('page');
        expect(res.body.meta).toHaveProperty('total');
    });

    it('GET /api/v1/products without auth should 401', async () => {
        const res = await api().get('/api/v1/products');
        expect(res.status).toBe(401);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V1 Trust
// ═══════════════════════════════════════════════════════════════════════════════
describe('V1 Trust', () => {
    it('GET /api/v1/trust/dashboard should return dashboard data', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/trust/dashboard')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });

    it('GET /api/v1/trust/org should return org trust score', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/trust/org')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V1 Organization
// ═══════════════════════════════════════════════════════════════════════════════
describe('V1 Organization', () => {
    it('GET /api/v1/org should return org info', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/org')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });

    it('GET /api/v1/org/members should return paginated members', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/org/members')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('meta');
    });

    it('GET /api/v1/org/stats should return org stats', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/org/stats')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V1 Risk
// ═══════════════════════════════════════════════════════════════════════════════
describe('V1 Risk', () => {
    it('GET /api/v1/risk/graph should return risk graph', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/risk/graph')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });

    it('GET /api/v1/risk/anomalies should return paginated', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/risk/anomalies')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });

    it('GET /api/v1/risk/fraud-alerts should return paginated', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/risk/fraud-alerts')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V1 Compliance
// ═══════════════════════════════════════════════════════════════════════════════
describe('V1 Compliance', () => {
    it('GET /api/v1/compliance/evidence should return paginated', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/compliance/evidence')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });

    it('GET /api/v1/compliance/score should return compliance score', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/compliance/score')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V1 Supply Chain
// ═══════════════════════════════════════════════════════════════════════════════
describe('V1 Supply Chain', () => {
    it('GET /api/v1/supply-chain/shipments should return paginated', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/supply-chain/shipments')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });

    it('GET /api/v1/supply-chain/partners should return paginated', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/supply-chain/partners')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V1 Notifications
// ═══════════════════════════════════════════════════════════════════════════════
describe('V1 Notifications', () => {
    it('GET /api/v1/notifications should return paginated', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/notifications')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V1 Platform
// ═══════════════════════════════════════════════════════════════════════════════
describe('V1 Platform', () => {
    it('GET /api/v1/platform/features should return feature flags', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/platform/features')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });

    it('GET /api/v1/platform/billing should return billing info', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/platform/billing')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V1 RBAC
// ═══════════════════════════════════════════════════════════════════════════════
describe('V1 RBAC', () => {
    it('GET /api/v1/rbac/my-permissions should return user permissions', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/rbac/my-permissions')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });

    it('GET /api/v1/rbac/roles should return roles', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/rbac/roles')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V1 Verification
// ═══════════════════════════════════════════════════════════════════════════════
describe('V1 Verification', () => {
    it('GET /api/v1/verification/history should return scan history', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/verification/history')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('data');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// V1 Engines (admin only)
// ═══════════════════════════════════════════════════════════════════════════════
describe('V1 Engines', () => {
    it('GET /api/v1/engines/health should return engine status', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/v1/engines/health')
            .set('Authorization', `Bearer ${token}`);
        // May be 200 (super_admin) or 403 (not super_admin)
        expect([200, 403]).toContain(res.status);
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Response Format Consistency
// ═══════════════════════════════════════════════════════════════════════════════
describe('Unified Response Format', () => {
    it('All v1 endpoints should have { data, meta } shape', async () => {
        const token = await getToken();
        const endpoints = [
            '/api/v1/products',
            '/api/v1/trust/org',
            '/api/v1/org/stats',
            '/api/v1/notifications',
        ];

        for (const ep of endpoints) {
            const res = await api()
                .get(ep)
                .set('Authorization', `Bearer ${token}`);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('meta');
            expect(res.body.meta).toHaveProperty('timestamp');
            expect(res.body.meta).toHaveProperty('api_version', 1);
        }
    });

    it('Legacy /api/* endpoints should also return unified format', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/products')
            .set('Authorization', `Bearer ${token}`);
        // Response wrapper should transform
        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('meta');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// API Docs
// ═══════════════════════════════════════════════════════════════════════════════
describe('API Documentation', () => {
    it('GET /api/docs/spec should return OpenAPI spec', async () => {
        const token = await getToken();
        const res = await api()
            .get('/api/docs/spec')
            .set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('openapi');
        expect(res.body).toHaveProperty('paths');
        expect(res.body.openapi).toMatch(/^3\.0/);
    });
});
