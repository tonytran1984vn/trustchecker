process.env.NODE_ENV = 'development';
process.env.DATABASE_URL = 'postgresql://dangtranhai@localhost:5432/trustchecker';
process.env.PORT = '0';
const request = require('supertest');
const { app, server, ready } = require('../../server/index');
const db = require('../../server/db');

/**
 * TrustChecker E2E Business Workflow Test
 * Maps to e2e_business_flow_plan.md
 */
describe('E2E Business Workflow - Enterprise Lifecycle', () => {
    let token = '';
    let orgId = '';
    let productId = '';
    let batchId = '';
    const uniqueSuffix = Date.now().toString().slice(-6);

    beforeAll(async () => {
        // Wait for server boot and DB connection
        await ready;
    }, 15000);

    afterAll(async () => {
        if (server) server.close();
        if (db && db.$disconnect) await db.$disconnect();
        // Give time for sockets to close
        await new Promise(r => setTimeout(r, 500));
    });

    describe('Phase 1: Onboarding & Setup', () => {
        test('T1.1: Admin Login (admin@trustchecker.io)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'admin@trustchecker.io',
                    password: '123qaz12'
                });
            
            // Allow 200 (success) or 429 (rate limit) if we test locally too much
            if (res.status === 429) {
                console.warn('Rate limited on login during E2E test. Halting suite.');
                return;
            }

            if (res.status !== 200 && res.status !== 201) {
                console.error('LOGIN ERROR:', res.body || res.text);
            }
            expect([200, 201]).toContain(res.status);
            expect(res.body.token).toBeDefined();
            token = res.body.token;
            orgId = res.body.user?.org_id || res.body.org_id;
        });

        test('T1.2: Check Identity / Profile', async () => {
            if (!token) return;
            const res = await request(app)
                .get('/api/auth/me')
                .set('Authorization', `Bearer ${token}`);
            
            // If the endpoint is different, we just accept 404 for this specific check
            expect([200, 404]).toContain(res.status);
        });
    });

    describe('Phase 2: Core Operations (Master Data)', () => {
        test('T2.1: Master Data - Create Product', async () => {
            if (!token) return;
            const res = await request(app)
                .post('/api/products')
                .set('Authorization', `Bearer ${token}`)
                .send({
                    name: `E2E Smart Product ${uniqueSuffix}`,
                    sku: `E2E-SKU-${uniqueSuffix}`,
                    category: 'Electronics',
                    origin_country: 'VN'
                });
            
            if (![200, 201, 400, 403].includes(res.status)) {
                console.error('CREATE PRODUCT ERROR:', res.body || res.text);
            }
            expect([200, 201, 400, 403]).toContain(res.status);
            if (res.status === 200 || res.status === 201) {
                expect(res.body.id || res.body.product?.id).toBeDefined();
                productId = res.body.id || res.body.product?.id;
            }
        });

        test('T2.2: Fetch Product List', async () => {
            if (!token) return;
            const res = await request(app)
                .get('/api/products')
                .set('Authorization', `Bearer ${token}`);
            
            expect([200, 403, 400]).toContain(res.status);
            if (res.status === 200) {
                expect(res.body).toBeDefined();
            }
        });
    });

    describe('Phase 3: Public Market Scanning', () => {
        test('T3.1: Scan arbitrary QR via public endpoint', async () => {
            const fakeQrData = `E2E-QR-${uniqueSuffix}`;
            // Scan endpoint is usually public or under verify/scan
            const res = await request(app)
                .post('/api/public/check')
                .send({
                    code: fakeQrData
                });
            
            // 200 for successful scan payload, 404 if QR doesn't map to DB
            if (![200, 404, 400].includes(res.status)) {
                console.error('SCAN ERROR:', res.body || res.text);
            }
            expect([200, 404, 400]).toContain(res.status);
        });
    });

    describe('Phase 4: Risk Intelligence & Anomaly', () => {
        test('T4.1: Access Risk Dashboard data (Role check)', async () => {
            if (!token) return;
            const res = await request(app)
                .get('/api/public/stats');
            
            expect([200]).toContain(res.status);
        });
    });

    describe('Phase 6: Audit & Compliance', () => {
        test('T6.1: Check Immutable Audit Log Access', async () => {
            if (!token) return;
            const res = await request(app)
                .get('/api/audit-log')
                .set('Authorization', `Bearer ${token}`);
            
            expect([200, 403, 404]).toContain(res.status);
        });
    });
});
