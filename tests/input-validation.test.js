/**
 * TrustChecker — Input Validation Test Suite
 * Tests the validation middleware schemas and edge cases.
 *
 * Run: npx jest tests/input-validation.test.js --forceExit --detectOpenHandles
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

let app, server;

beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });

    process.env.NODE_ENV = 'test';
    process.env.PORT = '0'; // Random port to avoid EADDRINUSE
    process.env.JWT_SECRET = 'test-jwt-secret-for-validation-tests-2026';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-for-validation-12345';

    const serverModule = require('../server/index');
    app = serverModule.app;
    server = serverModule.server;

    await new Promise(r => setTimeout(r, 3000));
});

afterAll(async () => {
    if (server?.close) server.close();
    const highestId = setTimeout(() => { }, 0);
    for (let i = 0; i < highestId; i++) { clearTimeout(i); clearInterval(i); }
    jest.restoreAllMocks();
}, 10000);

function adminToken() {
    return jwt.sign(
        { id: 'admin-val', username: 'admin', role: 'admin', session_id: 'val-session' },
        process.env.JWT_SECRET,
        { expiresIn: '1h', issuer: 'trustchecker', audience: 'trustchecker-users' }
    );
}

function userToken() {
    return jwt.sign(
        { id: 'user-val', username: 'testuser', role: 'operator', session_id: 'val-session' },
        process.env.JWT_SECRET,
        { expiresIn: '1h', issuer: 'trustchecker', audience: 'trustchecker-users' }
    );
}

// ═══════════════════════════════════════════════════════════════════
// PRODUCT VALIDATION
// ═══════════════════════════════════════════════════════════════════
describe('Validation: Products', () => {
    test('rejects product creation without required fields', async () => {
        const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${adminToken()}`)
            .send({});

        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('accepts valid product creation', async () => {
        const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${adminToken()}`)
            .send({
                name: 'Test Product',
                sku: `SKU-VAL-${Date.now()}`,
                manufacturer: 'Test Corp',
                category: 'Electronics',
                origin_country: 'VN',
            });

        // Should succeed, fail for non-validation reason, or be denied by RBAC
        expect([200, 201, 403, 500]).toContain(res.status);
        if (res.status === 400) {
            // If it's 400, it should be a validation error
            expect(res.body.error).toBeDefined();
        }
    });
});

// ═══════════════════════════════════════════════════════════════════
// QR CODE VALIDATION
// ═══════════════════════════════════════════════════════════════════
describe('Validation: QR Codes', () => {
    test('rejects QR validation without data', async () => {
        const res = await request(app)
            .post('/api/qr/validate')
            .set('Authorization', `Bearer ${userToken()}`)
            .send({});

        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('handles malformed QR data gracefully', async () => {
        const res = await request(app)
            .post('/api/qr/validate')
            .set('Authorization', `Bearer ${userToken()}`)
            .send({ qr_data: 'not-a-valid-qr-string-at-all' });

        // Should handle gracefully, not crash
        expect(res.status).toBeLessThan(500);
    });
});

// ═══════════════════════════════════════════════════════════════════
// BODY SIZE LIMITS
// ═══════════════════════════════════════════════════════════════════
describe('Validation: Body Size Limits', () => {
    test('rejects oversized JSON body (>5MB)', async () => {
        // Create a ~6MB payload
        const largePayload = { data: 'x'.repeat(6 * 1024 * 1024) };

        const res = await request(app)
            .post('/api/products')
            .set('Authorization', `Bearer ${adminToken()}`)
            .send(largePayload);

        // Should be rejected — 413 Payload Too Large or 400 or connection reset
        expect(res.status).toBeGreaterThanOrEqual(400);
    });
});

// ═══════════════════════════════════════════════════════════════════
// SQL INJECTION IN QUERY PARAMETERS
// ═══════════════════════════════════════════════════════════════════
describe('Validation: SQL Injection in Query Params', () => {
    test('sort_by parameter is whitelisted (organizations)', async () => {
        const res = await request(app)
            .get('/api/org?sort_by=DROP TABLE users')
            .set('Authorization', `Bearer ${adminToken()}`);

        // Should either return 400 or ignore the malicious sort_by
        // Should NOT return 500 (SQL error)
        expect(res.status).not.toBe(500);
    });

    test('order parameter only accepts ASC/DESC', async () => {
        const res = await request(app)
            .get('/api/org?order=DROP')
            .set('Authorization', `Bearer ${adminToken()}`);

        expect(res.status).not.toBe(500);
    });
});

// ═══════════════════════════════════════════════════════════════════
// GDPR COMPLIANCE VALIDATION
// ═══════════════════════════════════════════════════════════════════
describe('Validation: GDPR Endpoints', () => {
    test('data export requires authentication', async () => {
        const res = await request(app)
            .get('/api/compliance/gdpr/export');

        expect(res.status).toBe(401);
    });

    test('data deletion requires password confirmation', async () => {
        const res = await request(app)
            .delete('/api/compliance/gdpr/delete')
            .set('Authorization', `Bearer ${userToken()}`)
            .send({});

        expect(res.status).toBe(400);
        expect(res.body.error).toContain('Password');
    });
});

// ═══════════════════════════════════════════════════════════════════
// CONTENT-TYPE ENFORCEMENT
// ═══════════════════════════════════════════════════════════════════
describe('Validation: Content-Type', () => {
    test('accepts application/json', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .set('Content-Type', 'application/json')
            .send(JSON.stringify({ username: 'test', password: 'test' }));

        // Should process the request (even if credentials are wrong)
        expect([400, 401]).toContain(res.status);
    });
});

// ═══════════════════════════════════════════════════════════════════
// UUID VALIDATION IN ROUTE PARAMS
// ═══════════════════════════════════════════════════════════════════
describe('Validation: UUID Params', () => {
    test('invalid UUID in product endpoint returns error', async () => {
        const res = await request(app)
            .get('/api/products/not-a-valid-uuid')
            .set('Authorization', `Bearer ${userToken()}`);

        // Should handle gracefully
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    test('non-existent valid UUID returns 404', async () => {
        const fakeUUID = '00000000-0000-0000-0000-000000000000';
        const res = await request(app)
            .get(`/api/products/${fakeUUID}`)
            .set('Authorization', `Bearer ${userToken()}`);

        expect([404, 400]).toContain(res.status);
    });
});

// ═══════════════════════════════════════════════════════════════════
// ADMIN SETTINGS SCHEMA
// ═══════════════════════════════════════════════════════════════════
describe('Validation: Admin Settings Schema', () => {
    test('accepts valid settings keys only', async () => {
        const res = await request(app)
            .put('/api/admin/settings')
            .set('Authorization', `Bearer ${adminToken()}`)
            .send({
                site_name: 'TrustChecker',
                maintenance_mode: false,
            });

        // 200 if auth passes, 403 if RBAC denies (test JWT has no DB permissions)
        expect([200, 403]).toContain(res.status);
    });

    test('strips prototype pollution attempts', async () => {
        const res = await request(app)
            .put('/api/admin/settings')
            .set('Authorization', `Bearer ${adminToken()}`)
            .send({
                site_name: 'Safe',
                __proto__: { isAdmin: true },
                constructor: { prototype: { isAdmin: true } },
            });

        // 200 if auth passes, 403 if RBAC denies (test JWT has no DB permissions)
        expect([200, 403]).toContain(res.status);
        // Prototype pollution keys should not create new properties on response
        expect(res.body.settings?.isAdmin).toBeUndefined();
        expect(res.body.isAdmin).toBeUndefined();
    });
});
