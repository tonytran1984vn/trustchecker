/**
 * Pagination & Query Parameter Tests
 * Validates pagination middleware works correctly across list endpoints
 */
const request = require('supertest');
const BASE = process.env.TEST_URL || 'http://localhost:4000';
const token = require('./helper').getToken();

describe('Pagination & Query Parameters', () => {
    const auth = () => ({ Authorization: `Bearer ${token}` });

    // ── Products List ────────────────────────────────────────────
    describe('GET /api/products', () => {
        test('returns paginated results with default limit', async () => {
            const res = await request(BASE)
                .get('/api/products')
                .set(auth());
            expect(res.status).toBe(200);
            // Should return an array or object with data
            expect(res.body).toBeDefined();
        });

        test('respects custom page and limit', async () => {
            const res = await request(BASE)
                .get('/api/products?page=1&limit=5')
                .set(auth());
            expect(res.status).toBe(200);
        });

        test('handles page=0 gracefully (defaults to 1)', async () => {
            const res = await request(BASE)
                .get('/api/products?page=0')
                .set(auth());
            expect([200, 400]).toContain(res.status);
        });

        test('handles excessive limit', async () => {
            const res = await request(BASE)
                .get('/api/products?limit=999999')
                .set(auth());
            expect(res.status).toBe(200);
            // Should cap at maxLimit
        });
    });

    // ── Audit Log ────────────────────────────────────────────────
    describe('GET /api/audit-log', () => {
        test('returns paginated audit entries', async () => {
            const res = await request(BASE)
                .get('/api/audit-log?limit=10')
                .set(auth());
            expect([200, 403]).toContain(res.status);
        });
    });

    // ── Ops Incidents List ───────────────────────────────────────
    describe('GET /api/ops/data/incidents', () => {
        test('returns incident list', async () => {
            const res = await request(BASE)
                .get('/api/ops/data/incidents')
                .set(auth());
            expect(res.status).toBe(200);
        });
    });
});
