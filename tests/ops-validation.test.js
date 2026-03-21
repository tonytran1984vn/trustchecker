/**
 * Ops Data Validation Tests
 * Tests Zod validation middleware on write endpoints
 */
const request = require('supertest');
const BASE = process.env.TEST_URL || 'http://localhost:4000';
const token = require('./helper').getToken();

describe('Ops Data — Input Validation', () => {
    const auth = () => ({ Authorization: `Bearer ${token}` });

    // ── Incident Creation ──────────────────────────────────────────
    describe('POST /api/ops/data/incidents', () => {
        test('rejects empty body', async () => {
            const res = await request(BASE)
                .post('/api/ops/data/incidents')
                .set(auth())
                .send({});
            expect([400, 422]).toContain(res.status);
        });

        test('rejects title < 2 chars', async () => {
            const res = await request(BASE)
                .post('/api/ops/data/incidents')
                .set(auth())
                .send({ title: 'X', severity: 'low' });
            expect([400, 422]).toContain(res.status);
        });

        test('rejects invalid severity', async () => {
            const res = await request(BASE)
                .post('/api/ops/data/incidents')
                .set(auth())
                .send({ title: 'Test Incident', severity: 'EXTREME' });
            expect([400, 422]).toContain(res.status);
        });

        test('accepts valid incident', async () => {
            const res = await request(BASE)
                .post('/api/ops/data/incidents')
                .set(auth())
                .send({ title: 'Validation Test Incident', severity: 'low', module: 'test' });
            // Should succeed or hit rate limit (both acceptable)
            expect([200, 201, 429]).toContain(res.status);
        });
    });

    // ── Incident Update ────────────────────────────────────────────
    describe('PUT /api/ops/data/incidents/:id', () => {
        test('rejects empty update body', async () => {
            const res = await request(BASE)
                .put('/api/ops/data/incidents/00000000-0000-0000-0000-000000000001')
                .set(auth())
                .send({});
            expect([400, 422]).toContain(res.status);
        });

        test('rejects invalid status transition value', async () => {
            const res = await request(BASE)
                .put('/api/ops/data/incidents/00000000-0000-0000-0000-000000000001')
                .set(auth())
                .send({ status: 'INVALID_STATUS' });
            expect([400, 422]).toContain(res.status);
        });
    });

    // ── Supplier Onboarding ────────────────────────────────────────
    describe('POST /api/ops/suppliers/onboard', () => {
        test('rejects missing required fields', async () => {
            const res = await request(BASE)
                .post('/api/ops/suppliers/onboard')
                .set(auth())
                .send({ name: 'Test' });
            expect([400, 403, 422]).toContain(res.status);
        });

        test('rejects name < 2 chars', async () => {
            const res = await request(BASE)
                .post('/api/ops/suppliers/onboard')
                .set(auth())
                .send({ name: 'X', type: 'manufacturer', country: 'VN' });
            expect([400, 403, 422]).toContain(res.status);
        });
    });

    // ── Purchase Orders ────────────────────────────────────────────
    describe('POST /api/ops/purchase-orders', () => {
        test('rejects negative quantity', async () => {
            const res = await request(BASE)
                .post('/api/ops/purchase-orders')
                .set(auth())
                .send({ supplier: 'Test', product: 'Widget', quantity: -1, unitPrice: 10 });
            expect([400, 403, 422]).toContain(res.status);
        });

        test('rejects missing supplier', async () => {
            const res = await request(BASE)
                .post('/api/ops/purchase-orders')
                .set(auth())
                .send({ product: 'Widget', quantity: 10, unitPrice: 10 });
            expect([400, 403, 422]).toContain(res.status);
        });
    });
});
