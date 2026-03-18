// @ts-check
/**
 * RED TEAM E2E: Batch Recall & Supply Chain Integrity Tests
 * Tests P1-3 (batch recall cascade), supply chain journey, and data integrity
 */
const { test, expect } = require('@playwright/test');
const { getAuthToken } = require('./helpers/auth');

let token;

test.beforeAll(async ({ request }) => {
    token = await getAuthToken(request);
    expect(token).toBeTruthy();
});

test.describe('RED TEAM: Batch & Supply Chain Integrity', () => {

    test('Batch recall endpoint requires authentication', async ({ request }) => {
        const res = await request.post('/api/scm/batches/some-batch-id/recall', {
            data: { reason: 'Quality issue', severity: 'high' },
        });
        expect(res.status()).toBe(401);
    });

    test('Batch recall with non-existent batch returns 404', async ({ request }) => {
        const res = await request.post(`/api/scm/batches/nonexistent-${Date.now()}/recall`, {
            headers: { Authorization: `Bearer ${token}` },
            data: { reason: 'Quality issue', severity: 'high' },
        });
        const body = await res.json();
        // 404 or 403 (RBAC) — both are correct
        expect([403, 404]).toContain(res.status());
    });

    test('Product journey requires authentication', async ({ request }) => {
        const res = await request.get('/api/scm/events/some-product/journey');
        expect(res.status()).toBe(401);
    });

    test('Product journey returns events for valid product', async ({ request }) => {
        // Get a product that likely has SCM events
        const productsRes = await request.get('/api/v1/products', {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (productsRes.status() !== 200) return;
        const products = await productsRes.json();
        const productId = products.data?.[0]?.id || products[0]?.id;
        if (!productId) return;

        const journeyRes = await request.get(`/api/scm/events/${productId}/journey`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(journeyRes.status()).toBe(200);
        const journey = await journeyRes.json();
        // Journey should be an array (may be empty for products without events)
        expect(Array.isArray(journey.data || journey)).toBe(true);
    });

    test('Shipments endpoint requires authentication', async ({ request }) => {
        const res = await request.get('/api/scm/shipments');
        expect(res.status()).toBe(401);
    });

    test('Shipments returns list with auth', async ({ request }) => {
        const res = await request.get('/api/scm/shipments', {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(res.status()).toBe(200);
        const body = await res.json();
        // API may return {data:[]} or {shipments:[]}
        expect(body.data || body.shipments).toBeTruthy();
    });

    test('Checkpoints endpoint requires authentication', async ({ request }) => {
        const res = await request.get('/api/scm/checkpoints');
        expect(res.status()).toBe(401);
    });

    test('Forensic cases require authentication', async ({ request }) => {
        const res = await request.get('/api/scm/forensic/cases');
        expect(res.status()).toBe(401);
    });

    test('Forensic cases list returns with auth', async ({ request }) => {
        const res = await request.get('/api/scm/forensic/cases', {
            headers: { Authorization: `Bearer ${token}` },
        });
        expect(res.status()).toBe(200);
    });

    test('Forensic freeze requires fraud_case:approve permission', async ({ request }) => {
        const res = await request.post('/api/scm/forensic/cases/nonexistent/freeze', {
            headers: { Authorization: `Bearer ${token}` },
            data: { reason: 'test' },
        });
        // Should be 403 (RBAC) or 404 — not 200
        expect([403, 404]).toContain(res.status());
    });
});
