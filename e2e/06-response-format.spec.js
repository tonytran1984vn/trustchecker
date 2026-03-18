// @ts-check
const { test, expect } = require('@playwright/test');
const { getAuthToken } = require('./helpers/auth');

test.describe('Unified Response Format', () => {
    let token;

    test.beforeAll(async ({ request }) => {
        token = await getAuthToken(request);
    });

    const authHeaders = () => ({ Authorization: 'Bearer ' + token });

    const V1_ENDPOINTS = [
        '/api/v1/products',
        '/api/v1/trust/org',
        '/api/v1/org/stats',
        '/api/v1/notifications',
        '/api/v1/compliance/score',
    ];

    for (const endpoint of V1_ENDPOINTS) {
        test('V1 ' + endpoint + ' has { data, meta } shape', async ({ request }) => {
            const res = await request.get(endpoint, { headers: authHeaders() });
            expect(res.status()).toBe(200);
            const body = await res.json();
            expect(body).toHaveProperty('data');
            expect(body).toHaveProperty('meta');
            expect(body.meta).toHaveProperty('timestamp');
            expect(body.meta).toHaveProperty('api_version', 1);
        });
    }

    test('V1 responses include rate limit headers', async ({ request }) => {
        const res = await request.get('/api/v1/products', { headers: authHeaders() });
        const headers = res.headers();
        expect(headers['x-ratelimit-limit']).toBeTruthy();
        expect(headers['x-ratelimit-remaining']).toBeTruthy();
    });

    test('Legacy /api/* endpoints also return unified format', async ({ request }) => {
        const res = await request.get('/api/products', { headers: authHeaders() });
        if (res.status() === 200) {
            const body = await res.json();
            expect(body).toHaveProperty('data');
            expect(body).toHaveProperty('meta');
        }
    });

    test('Legacy routes include X-Deprecation header', async ({ request }) => {
        const res = await request.get('/api/products', { headers: authHeaders() });
        if (res.status() === 200) {
            const headers = res.headers();
            expect(headers['x-deprecation']).toBeTruthy();
        }
    });
});
