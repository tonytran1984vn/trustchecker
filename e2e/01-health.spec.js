// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('Health Check', () => {
    test('GET /healthz returns ok', async ({ request }) => {
        const res = await request.get('/healthz');
        expect(res.status()).toBe(200);
        const body = await res.json();
        expect(body.status).toBe('ok');
        expect(body).toHaveProperty('uptime');
        expect(body).toHaveProperty('version');
        expect(body).toHaveProperty('memory');
    });

    test('Server responds within 500ms', async ({ request }) => {
        const start = Date.now();
        await request.get('/healthz');
        const elapsed = Date.now() - start;
        expect(elapsed).toBeLessThan(500);
    });
});
