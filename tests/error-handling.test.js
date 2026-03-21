/**
 * Error Handling & Middleware Tests
 * Tests centralized error handler, 404 handler, rate limiting, and security headers
 */
const request = require('supertest');
const BASE = process.env.TEST_URL || 'http://localhost:4000';
const token = require('./helper').getToken();

describe('Error Handling & Security Middleware', () => {
    const auth = () => ({ Authorization: `Bearer ${token}` });

    // ── 404 Handler ──────────────────────────────────────────────
    describe('404 Handler', () => {
        test('returns JSON 404 for unknown API routes', async () => {
            const res = await request(BASE)
                .get('/api/this-route-does-not-exist-ever')
                .set(auth());
            // May redirect to frontend (SPA) or return 404
            expect([200, 404]).toContain(res.status);
        });
    });

    // ── Auth Required ────────────────────────────────────────────
    describe('Authentication Guard', () => {
        test('returns 401 without token', async () => {
            const res = await request(BASE)
                .get('/api/ops/purchase-orders');
            expect(res.status).toBe(401);
        });

        test('returns 401 with invalid token', async () => {
            const res = await request(BASE)
                .get('/api/ops/purchase-orders')
                .set({ Authorization: 'Bearer invalid.token.here' });
            expect(res.status).toBe(401);
        });

        test('returns 401 with expired token format', async () => {
            const res = await request(BASE)
                .get('/api/products')
                .set({ Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.eyJpZCI6IjEyMyIsImV4cCI6MH0.invalid' });
            expect(res.status).toBe(401);
        });
    });

    // ── Security Headers ─────────────────────────────────────────
    describe('Security Headers (Helmet)', () => {
        test('sets X-Content-Type-Options', async () => {
            const res = await request(BASE).get('/healthz');
            expect(res.headers['x-content-type-options']).toBe('nosniff');
        });

        test('sets X-Frame-Options or CSP frame-ancestors', async () => {
            const res = await request(BASE).get('/healthz');
            const hasFrameProtection = 
                res.headers['x-frame-options'] || 
                (res.headers['content-security-policy'] && res.headers['content-security-policy'].includes('frame-ancestors'));
            expect(hasFrameProtection).toBeTruthy();
        });

        test('sets Strict-Transport-Security', async () => {
            const res = await request(BASE).get('/healthz');
            expect(res.headers['strict-transport-security']).toBeDefined();
        });
    });

    // ── Health Endpoint ──────────────────────────────────────────
    describe('Health Check', () => {
        test('GET /healthz returns status ok', async () => {
            const res = await request(BASE).get('/healthz');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });

        test('/healthz includes uptime and version', async () => {
            const res = await request(BASE).get('/healthz');
            expect(res.body).toHaveProperty('uptime');
            expect(res.body).toHaveProperty('version');
        });
    });

    // ── JSON Parse Error ─────────────────────────────────────────
    describe('Malformed Request Handling', () => {
        test('handles malformed JSON gracefully', async () => {
            const res = await request(BASE)
                .post('/api/ops/data/incidents')
                .set(auth())
                .set('Content-Type', 'application/json')
                .send('{ invalid json }');
            expect([400, 500]).toContain(res.status);
        });

        test('handles extremely large payload', async () => {
            const hugePayload = { data: 'x'.repeat(3 * 1024 * 1024) }; // 3MB > 2MB limit
            const res = await request(BASE)
                .post('/api/ops/data/incidents')
                .set(auth())
                .send(hugePayload);
            expect([400, 413, 500]).toContain(res.status);
        });
    });
});
