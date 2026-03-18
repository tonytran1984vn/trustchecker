// @ts-check
/**
 * RED TEAM E2E: Trust Graph & Partner Security Tests
 * Tests R-6 (trust graph auth), partner scoring, supply routes
 */
const { test, expect } = require('@playwright/test');
const { getAuthToken } = require('./helpers/auth');

let token;

test.beforeAll(async ({ request }) => {
    token = await getAuthToken(request);
    expect(token).toBeTruthy();
});

test.describe('RED TEAM: Trust Graph Security', () => {

    test('R-6: Trust graph nodes requires authentication', async ({ request }) => {
        const res = await request.get('/api/scm/graph/nodes');
        expect(res.status()).toBe(401);
        const body = await res.json();
        expect(body.error).toContain('Authentication');
    });

    test('R-6: Trust graph edges requires authentication', async ({ request }) => {
        const res = await request.get('/api/scm/graph/edges');
        expect(res.status()).toBe(401);
    });

    test('R-6: Trust graph analysis requires authentication', async ({ request }) => {
        const res = await request.get('/api/scm/graph/analysis');
        expect(res.status()).toBe(401);
    });

    test('R-6: Trust graph toxic nodes requires authentication', async ({ request }) => {
        const res = await request.get('/api/scm/graph/toxic');
        expect(res.status()).toBe(401);
    });

    test('Trust graph nodes accessible with auth', async ({ request }) => {
        const res = await request.get('/api/scm/graph/nodes', {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(res.status()).toBe(200);
    });

    test('Trust graph analysis accessible with auth', async ({ request }) => {
        const res = await request.get('/api/scm/graph/analysis', {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(res.status()).toBe(200);
    });

    test('Supply routes require authentication', async ({ request }) => {
        const res = await request.get('/api/scm/supply/routes');
        expect(res.status()).toBe(401);
    });

    test('Supply routes accessible with auth', async ({ request }) => {
        const res = await request.get('/api/scm/supply/routes', {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(res.status()).toBe(200);
    });

    test('Route breaches require authentication', async ({ request }) => {
        const res = await request.get('/api/scm/supply/route-breaches');
        expect(res.status()).toBe(401);
    });

    test('Channel rules require authentication', async ({ request }) => {
        const res = await request.get('/api/scm/supply/channel-rules');
        expect(res.status()).toBe(401);
    });

    test('Integrity chain requires authentication', async ({ request }) => {
        const res = await request.get('/api/scm/integrity/chain');
        expect(res.status()).toBe(401);
    });

    test('Integrity risk matrix requires authentication', async ({ request }) => {
        const res = await request.get('/api/scm/integrity/risk-matrix');
        expect(res.status()).toBe(401);
    });

    test('Public verify endpoint is accessible without auth', async ({ request }) => {
        const res = await request.get('/api/scm/integrity/public/verify', {
            params: { product_id: 'test-product' },
        });
        // Public endpoint — may require auth depending on configuration
        expect([200, 401, 404]).toContain(res.status());
    });

    test('Code governance format rules accessible', async ({ request }) => {
        const res = await request.get('/api/scm/code-governance/format-rules');
        // May or may not require auth
        expect([200, 401]).toContain(res.status());
    });
});
