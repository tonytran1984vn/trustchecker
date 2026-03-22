const schemas = require('../../../server/lib/schemas');

describe('Zod schemas', () => {
    describe('login', () => {
        test('accepts valid login', () => {
            expect(schemas.login.safeParse({ email: 'a@b.com', password: 'pass' }).success).toBe(true);
        });

        test('rejects invalid email', () => {
            expect(schemas.login.safeParse({ email: 'bad', password: 'pass' }).success).toBe(false);
        });

        test('rejects empty password', () => {
            expect(schemas.login.safeParse({ email: 'a@b.com', password: '' }).success).toBe(false);
        });
    });

    describe('register', () => {
        test('accepts valid registration', () => {
            const r = schemas.register.safeParse({
                email: 'a@b.com', password: 'password8', username: 'user',
            });
            expect(r.success).toBe(true);
        });

        test('rejects short password', () => {
            expect(schemas.register.safeParse({ email: 'a@b.com', password: '12', username: 'u' }).success).toBe(false);
        });
    });

    describe('createProduct', () => {
        test('accepts valid product', () => {
            expect(schemas.createProduct.safeParse({ name: 'Widget', sku: 'W001' }).success).toBe(true);
        });

        test('rejects short name', () => {
            expect(schemas.createProduct.safeParse({ name: 'W', sku: 'W001' }).success).toBe(false);
        });

        test('validates origin_country format (ISO alpha-2)', () => {
            expect(schemas.createProduct.safeParse({ name: 'Widget', sku: 'W001', origin_country: 'VN' }).success).toBe(true);
            expect(schemas.createProduct.safeParse({ name: 'Widget', sku: 'W001', origin_country: 'Vietnam' }).success).toBe(false);
        });
    });

    describe('processScan', () => {
        test('accepts valid scan', () => {
            expect(schemas.processScan.safeParse({ qr_data: 'abc123' }).success).toBe(true);
        });

        test('validates latitude range', () => {
            expect(schemas.processScan.safeParse({ qr_data: 'x', latitude: 200 }).success).toBe(false);
        });

        test('validates longitude range', () => {
            expect(schemas.processScan.safeParse({ qr_data: 'x', longitude: 200 }).success).toBe(false);
        });
    });

    describe('updateOrg', () => {
        test('accepts valid update', () => {
            expect(schemas.updateOrg.safeParse({ name: 'Corp' }).success).toBe(true);
        });

        test('rejects empty update', () => {
            expect(schemas.updateOrg.safeParse({}).success).toBe(false);
        });
    });

    describe('inviteMember', () => {
        test('accepts valid invite', () => {
            expect(schemas.inviteMember.safeParse({ email: 'a@b.com' }).success).toBe(true);
        });

        test('defaults role to viewer', () => {
            const r = schemas.inviteMember.parse({ email: 'a@b.com' });
            expect(r.role).toBe('viewer');
        });

        test('rejects invalid role', () => {
            expect(schemas.inviteMember.safeParse({ email: 'a@b.com', role: 'hacker' }).success).toBe(false);
        });
    });

    describe('createWebhook', () => {
        test('accepts valid webhook', () => {
            expect(schemas.createWebhook.safeParse({ url: 'https://example.com', events: ['scan'] }).success).toBe(true);
        });

        test('rejects invalid URL', () => {
            expect(schemas.createWebhook.safeParse({ url: 'not-url', events: ['e'] }).success).toBe(false);
        });

        test('rejects empty events', () => {
            expect(schemas.createWebhook.safeParse({ url: 'https://x.com', events: [] }).success).toBe(false);
        });
    });

    describe('createIncident', () => {
        test('accepts valid incident', () => {
            expect(schemas.createIncident.safeParse({ title: 'Issue' }).success).toBe(true);
        });

        test('defaults severity to medium', () => {
            const r = schemas.createIncident.parse({ title: 'Issue' });
            expect(r.severity).toBe('medium');
        });

        test('validates severity enum', () => {
            expect(schemas.createIncident.safeParse({ title: 'Issue', severity: 'invalid' }).success).toBe(false);
        });
    });

    describe('createPurchaseOrder', () => {
        test('accepts valid PO', () => {
            const r = schemas.createPurchaseOrder.safeParse({
                supplier: 'Supplier A', product: 'Widget', quantity: 100, unitPrice: 25.5,
            });
            expect(r.success).toBe(true);
        });

        test('rejects 0 quantity', () => {
            expect(schemas.createPurchaseOrder.safeParse({
                supplier: 'S', product: 'P', quantity: 0, unitPrice: 10,
            }).success).toBe(false);
        });
    });

    describe('createQualityCheck', () => {
        test('accepts valid QC', () => {
            expect(schemas.createQualityCheck.safeParse({}).success).toBe(true);
        });

        test('validates checkType enum', () => {
            expect(schemas.createQualityCheck.safeParse({ checkType: 'invalid' }).success).toBe(false);
        });

        test('validates score range (0-100)', () => {
            expect(schemas.createQualityCheck.safeParse({ score: 101 }).success).toBe(false);
        });
    });

    describe('onboardSupplier', () => {
        test('accepts valid supplier', () => {
            expect(schemas.onboardSupplier.safeParse({
                name: 'Supplier X', type: 'manufacturer', country: 'VN',
            }).success).toBe(true);
        });

        test('rejects missing name', () => {
            expect(schemas.onboardSupplier.safeParse({ type: 'x', country: 'VN' }).success).toBe(false);
        });
    });

    describe('paginationQuery', () => {
        test('defaults page=1, limit=20', () => {
            const r = schemas.paginationQuery.parse({});
            expect(r.page).toBe(1);
            expect(r.limit).toBe(20);
        });

        test('caps limit at 100', () => {
            expect(schemas.paginationQuery.safeParse({ limit: 200 }).success).toBe(false);
        });
    });

    describe('uuid', () => {
        test('accepts valid UUID', () => {
            expect(schemas.uuid.safeParse('123e4567-e89b-12d3-a456-426614174000').success).toBe(true);
        });

        test('rejects invalid UUID', () => {
            expect(schemas.uuid.safeParse('not-a-uuid').success).toBe(false);
        });
    });
});
