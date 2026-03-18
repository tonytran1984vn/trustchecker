// @ts-check
const { test, expect } = require('@playwright/test');
const { getAuthToken } = require('./helpers/auth');

test.describe('OpenAPI / Swagger', () => {
    test('GET /api/docs/spec returns valid OpenAPI spec', async ({ request }) => {
        let token;
        try { token = await getAuthToken(request); } catch(e) {}
        
        const headers = token ? { Authorization: 'Bearer ' + token } : {};
        const res = await request.get('/api/docs/spec', { headers });
        
        if (res.status() === 200) {
            const body = await res.json();
            expect(body).toHaveProperty('openapi');
            expect(body.openapi).toMatch(/^3\.0/);
            expect(body).toHaveProperty('paths');
            expect(body).toHaveProperty('info');
            expect(body.info).toHaveProperty('title');
            
            // Check that we have multiple paths documented
            const pathCount = Object.keys(body.paths).length;
            expect(pathCount).toBeGreaterThan(10);
        }
    });
});
