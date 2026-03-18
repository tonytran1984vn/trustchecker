// @ts-check
const { test, expect } = require('@playwright/test');
const { getAuthToken } = require('./helpers/auth');

test.describe('V1 API Endpoints', () => {
    let token;

    test.beforeAll(async ({ request }) => {
        token = await getAuthToken(request);
    });

    const authHeaders = () => ({ Authorization: 'Bearer ' + token });

    // ── Products ──────────────────────────────────────
    test('GET /api/v1/products returns unified format', async ({ request }) => {
        const res = await request.get('/api/v1/products', { headers: authHeaders() });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('data');
        expect(body).toHaveProperty('meta');
        expect(body.meta).toHaveProperty('api_version', 1);
        expect(body.meta).toHaveProperty('timestamp');
    });

    test('GET /api/v1/products supports pagination', async ({ request }) => {
        const res = await request.get('/api/v1/products?page=1&limit=5', { headers: authHeaders() });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.meta).toHaveProperty('page');
    });

    // ── Trust ─────────────────────────────────────────
    test('GET /api/v1/trust/dashboard returns trust data', async ({ request }) => {
        const res = await request.get('/api/v1/trust/dashboard', { headers: authHeaders() });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('data');
    });

    test('GET /api/v1/trust/org returns org trust score', async ({ request }) => {
        const res = await request.get('/api/v1/trust/org', { headers: authHeaders() });
        expect(res.status()).toBe(200);
    });

    // ── Organization ──────────────────────────────────
    test('GET /api/v1/org returns org info', async ({ request }) => {
        const res = await request.get('/api/v1/org', { headers: authHeaders() });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('data');
    });

    test('GET /api/v1/org/members returns members', async ({ request }) => {
        const res = await request.get('/api/v1/org/members', { headers: authHeaders() });
        expect(res.status()).toBe(200);
    });

    test('GET /api/v1/org/stats returns stats', async ({ request }) => {
        const res = await request.get('/api/v1/org/stats', { headers: authHeaders() });
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body).toHaveProperty('data');
    });

    // ── Risk ──────────────────────────────────────────
    test('GET /api/v1/risk/anomalies returns paginated', async ({ request }) => {
        const res = await request.get('/api/v1/risk/anomalies', { headers: authHeaders() });
        expect(res.status()).toBe(200);
    });

    // ── Compliance ────────────────────────────────────
    test('GET /api/v1/compliance/score returns score', async ({ request }) => {
        const res = await request.get('/api/v1/compliance/score', { headers: authHeaders() });
        expect(res.status()).toBe(200);
    });

    // ── Supply Chain ──────────────────────────────────
    test('GET /api/v1/supply-chain/partners returns partners', async ({ request }) => {
        const res = await request.get('/api/v1/supply-chain/partners', { headers: authHeaders() });
        expect(res.status()).toBe(200);
    });

    // ── Notifications ─────────────────────────────────
    test('GET /api/v1/notifications returns paginated', async ({ request }) => {
        const res = await request.get('/api/v1/notifications', { headers: authHeaders() });
        expect(res.status()).toBe(200);
    });

    // ── Platform ──────────────────────────────────────
    test('GET /api/v1/platform/features returns feature flags', async ({ request }) => {
        const res = await request.get('/api/v1/platform/features', { headers: authHeaders() });
        expect(res.status()).toBe(200);
    });

    // ── RBAC ──────────────────────────────────────────
    test('GET /api/v1/rbac/roles returns roles', async ({ request }) => {
        const res = await request.get('/api/v1/rbac/roles', { headers: authHeaders() });
        expect(res.status()).toBe(200);
    });
});
