/**
 * Zod Schema Unit Tests
 * Tests validation schemas directly without HTTP
 */
const schemas = require('../server/lib/schemas');

describe('Zod Validation Schemas', () => {

    // ── UUID ─────────────────────────────────────────────────────
    describe('uuid', () => {
        test('accepts valid UUID', () => {
            expect(schemas.uuid.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
        });
        test('rejects invalid UUID', () => {
            expect(schemas.uuid.safeParse('not-a-uuid').success).toBe(false);
        });
        test('rejects empty string', () => {
            expect(schemas.uuid.safeParse('').success).toBe(false);
        });
    });

    // ── Login ────────────────────────────────────────────────────
    describe('login', () => {
        test('accepts valid login', () => {
            expect(schemas.login.safeParse({ email: 'test@example.com', password: 'pass123' }).success).toBe(true);
        });
        test('rejects missing email', () => {
            expect(schemas.login.safeParse({ password: 'pass123' }).success).toBe(false);
        });
        test('rejects invalid email format', () => {
            expect(schemas.login.safeParse({ email: 'not-email', password: 'pass' }).success).toBe(false);
        });
    });

    // ── Create Product ───────────────────────────────────────────
    describe('createProduct', () => {
        test('accepts valid product', () => {
            const result = schemas.createProduct.safeParse({ name: 'Widget', sku: 'W001' });
            expect(result.success).toBe(true);
        });
        test('rejects name < 2 chars', () => {
            expect(schemas.createProduct.safeParse({ name: 'X', sku: 'S1' }).success).toBe(false);
        });
        test('validates origin_country ISO format', () => {
            expect(schemas.createProduct.safeParse({ name: 'Widget', sku: 'W1', origin_country: 'VN' }).success).toBe(true);
            expect(schemas.createProduct.safeParse({ name: 'Widget', sku: 'W1', origin_country: 'vietnam' }).success).toBe(false);
        });
    });

    // ── Create Incident ──────────────────────────────────────────
    describe('createIncident', () => {
        test('accepts valid incident', () => {
            const result = schemas.createIncident.safeParse({ title: 'Server Down', severity: 'critical' });
            expect(result.success).toBe(true);
        });
        test('rejects invalid severity', () => {
            expect(schemas.createIncident.safeParse({ title: 'Test', severity: 'extreme' }).success).toBe(false);
        });
        test('defaults severity to medium', () => {
            const result = schemas.createIncident.safeParse({ title: 'Test Incident' });
            expect(result.success).toBe(true);
            expect(result.data.severity).toBe('medium');
        });
    });

    // ── Update Incident ──────────────────────────────────────────
    describe('updateIncident', () => {
        test('accepts valid status update', () => {
            const result = schemas.updateIncident.safeParse({ status: 'investigating' });
            expect(result.success).toBe(true);
        });
        test('rejects invalid status', () => {
            expect(schemas.updateIncident.safeParse({ status: 'INVALID' }).success).toBe(false);
        });
    });

    // ── Create PO ────────────────────────────────────────────────
    describe('createPurchaseOrder', () => {
        test('accepts valid PO', () => {
            const result = schemas.createPurchaseOrder.safeParse({
                supplier: 'Acme', product: 'Widgets', quantity: 100, unitPrice: 9.99
            });
            expect(result.success).toBe(true);
        });
        test('rejects quantity = 0', () => {
            expect(schemas.createPurchaseOrder.safeParse({
                supplier: 'Acme', product: 'Widgets', quantity: 0, unitPrice: 10
            }).success).toBe(false);
        });
        test('rejects negative unitPrice', () => {
            expect(schemas.createPurchaseOrder.safeParse({
                supplier: 'Acme', product: 'Widgets', quantity: 1, unitPrice: -5
            }).success).toBe(false);
        });
    });

    // ── Supplier Onboarding ──────────────────────────────────────
    describe('onboardSupplier', () => {
        test('accepts valid supplier', () => {
            const result = schemas.onboardSupplier.safeParse({ name: 'Foxconn', type: 'manufacturer', country: 'TW' });
            expect(result.success).toBe(true);
        });
        test('rejects empty name', () => {
            expect(schemas.onboardSupplier.safeParse({ name: '', type: 'mfg', country: 'VN' }).success).toBe(false);
        });
    });

    // ── Pagination Query ─────────────────────────────────────────
    describe('paginationQuery', () => {
        test('defaults page=1, limit=20', () => {
            const result = schemas.paginationQuery.safeParse({});
            expect(result.success).toBe(true);
            expect(result.data.page).toBe(1);
            expect(result.data.limit).toBe(20);
        });
        test('caps limit at 100', () => {
            const result = schemas.paginationQuery.safeParse({ limit: 500 });
            expect(result.success).toBe(false);
        });
        test('coerces string values', () => {
            const result = schemas.paginationQuery.safeParse({ page: '3', limit: '25' });
            expect(result.success).toBe(true);
            expect(result.data.page).toBe(3);
        });
    });
});
