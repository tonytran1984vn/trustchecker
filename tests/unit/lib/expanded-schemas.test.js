const {
    uuid, paginationQuery, idParam, login, register,
    createProduct, updateProduct, productQuery,
    generateQR, processScan, updateOrg, inviteMember,
    createShipment, addPartner, createWebhook,
    createEvidence, assignRole, ingestEPCIS, qrScan,
    createIncident, updateIncident, createPurchaseOrder,
    createQualityCheck, onboardSupplier
} = require('../../../server/lib/schemas');

// Helper to quickly check valid vs invalid
const assertValid = (schema, data) => expect(schema.safeParse(data).success).toBe(true);
const assertInvalid = (schema, data) => expect(schema.safeParse(data).success).toBe(false);

describe('Zod Validation Schemas (expanded)', () => {
    describe('uuid & idParam', () => {
        const validUUID = '123e4567-e89b-12d3-a456-426614174000';
        test('uuid accepts valid UUID', () => assertValid(uuid, validUUID));
        test('uuid rejects invalid string', () => assertInvalid(uuid, 'not-uuid'));
        test('uuid rejects empty', () => assertInvalid(uuid, ''));
        test('idParam accepts valid id', () => assertValid(idParam, { id: validUUID }));
        test('idParam rejects missing id', () => assertInvalid(idParam, {}));
    });

    describe('paginationQuery', () => {
        test('accepts empty (uses defaults)', () => assertValid(paginationQuery, {}));
        test('accepts valid page/limit', () => assertValid(paginationQuery, { page: 2, limit: 50 }));
        test('coerces strings to numbers', () => {
            const r = paginationQuery.safeParse({ page: '2', limit: '50' });
            expect(r.success).toBe(true);
            expect(r.data.page).toBe(2);
        });
        test('rejects negative page', () => assertInvalid(paginationQuery, { page: -1 }));
        test('rejects limit > 100', () => assertInvalid(paginationQuery, { limit: 101 }));
    });

    describe('login', () => {
        test('accepts valid credentials', () => assertValid(login, { email: 'a@b.com', password: 'pw' }));
        test('rejects invalid email', () => assertInvalid(login, { email: 'not-email', password: 'pw' }));
        test('rejects missing password', () => assertInvalid(login, { email: 'a@b.com' }));
        test('rejects missing email', () => assertInvalid(login, { password: 'pw' }));
        test('rejects extra long email', () => assertInvalid(login, { email: 'a'.repeat(256) + '@b.com', password: 'pw' }));
    });

    describe('register', () => {
        test('accepts valid data', () => assertValid(register, { email: 'a@b.com', password: 'password123', username: 'user' }));
        test('accepts with inviteCode', () => assertValid(register, { email: 'a@b.com', password: 'password123', username: 'user', inviteCode: 'CODE123' }));
        test('rejects short password', () => assertInvalid(register, { email: 'a@b.com', password: 'short', username: 'user' }));
        test('rejects short username', () => assertInvalid(register, { email: 'a@b.com', password: 'password123', username: 'u' }));
        test('rejects missing fields', () => assertInvalid(register, { email: 'a@b.com' }));
    });

    describe('createProduct & updateProduct', () => {
        const validProd = { name: 'Item', sku: 'SKU123' };
        test('create accepts required', () => assertValid(createProduct, validProd));
        test('create accepts all options', () => assertValid(createProduct, { ...validProd, origin_country: 'VN', batch_number: 'B1' }));
        test('create rejects invalid country', () => assertInvalid(createProduct, { ...validProd, origin_country: 'USA' })); // must be 2 chars
        test('create rejects short name', () => assertInvalid(createProduct, { name: 'A', sku: 'SKU' }));
        test('update accepts partial', () => assertValid(updateProduct, { name: 'New Name' }));
        test('update accepts empty', () => assertValid(updateProduct, {}));
    });

    describe('generateQR & processScan', () => {
        const validUUID = '123e4567-e89b-12d3-a456-426614174000';
        test.skip('generateQR accepts valid', () => assertValid(generateQR, { product_id: validUUID, metadata: { info: 'x' } }));
        test.skip('generateQR rejects invalid uuid', () => assertInvalid(generateQR, { product_id: 'bad' }));
        test.skip('processScan accepts valid', () => assertValid(processScan, { qr_data: '123', latitude: 10, longitude: 20 }));
        test.skip('processScan rejects bad lat', () => assertInvalid(processScan, { qr_data: '123', latitude: 100 }));
        test.skip('processScan rejects missing data', () => assertInvalid(processScan, { latitude: 10 }));
    });

    describe('updateOrg', () => {
        test('accepts valid update', () => assertValid(updateOrg, { name: 'New Org', industry: 'Tech' }));
        test('rejects empty object (refine fails)', () => assertInvalid(updateOrg, {}));
        test('rejects too long industry', () => assertInvalid(updateOrg, { name: 'Org', industry: 'A'.repeat(101) }));
    });

    describe('inviteMember', () => {
        test('accepts default role', () => {
            const r = inviteMember.safeParse({ email: 'a@b.com' });
            expect(r.success).toBe(true);
            expect(r.data.role).toBe('viewer');
        });
        test('accepts valid role', () => assertValid(inviteMember, { email: 'a@b.com', role: 'admin' }));
        test('rejects invalid role', () => assertInvalid(inviteMember, { email: 'a@b.com', role: 'super_admin' }));
        test('rejects missing email', () => assertInvalid(inviteMember, {}));
    });

    describe('createShipment & addPartner', () => {
        const validUUID = '123e4567-e89b-12d3-a456-426614174000';
        test('createShipment accepts valid', () => assertValid(createShipment, { product_id: validUUID, origin: 'A', destination: 'B' }));
        test('createShipment rejects missing origin', () => assertInvalid(createShipment, { product_id: validUUID, destination: 'B' }));
        test('addPartner accepts valid', () => assertValid(addPartner, { name: 'Supplier A', type: 'Manufacturer', contact_email: 'a@b.com' }));
        test('addPartner rejects bad email', () => assertInvalid(addPartner, { name: 'Supplier A', type: 'Manufacturer', contact_email: 'not-an-email' }));
    });

    describe('createWebhook & createEvidence', () => {
        test('createWebhook accepts valid', () => assertValid(createWebhook, { url: 'https://example.com', events: ['user.created'] }));
        test('createWebhook rejects empty events', () => assertInvalid(createWebhook, { url: 'https://example.com', events: [] }));
        test('createEvidence accepts valid', () => assertValid(createEvidence, { title: 'Audit Report' }));
        test('createEvidence rejects short title', () => assertInvalid(createEvidence, { title: 'A' }));
    });

    describe('assignRole & ingestEPCIS', () => {
        const u = '123e4567-e89b-12d3-a456-426614174000';
        test('assignRole accepts valid', () => assertValid(assignRole, { user_id: u, role_id: u }));
        test('ingestEPCIS accepts valid', () => assertValid(ingestEPCIS, { events: [{ type: 'ObjectEvent' }] }));
        test('ingestEPCIS rejects empty events', () => assertInvalid(ingestEPCIS, { events: [] }));
        test('ingestEPCIS rejects >1000 events', () => assertInvalid(ingestEPCIS, { events: Array(1001).fill({ type: 'x' }) }));
    });

    describe('ops schemas (Incident, PO, QC, Supplier)', () => {
        test('createIncident valid', () => assertValid(createIncident, { title: 'Bug' }));
        test('updateIncident valid', () => assertValid(updateIncident, { status: 'resolved' }));
        test('createPurchaseOrder valid', () => assertValid(createPurchaseOrder, { supplier: 'A', product: 'B', quantity: 10, unitPrice: 5 }));
        test('createPurchaseOrder negative qty', () => assertInvalid(createPurchaseOrder, { supplier: 'A', product: 'B', quantity: -1, unitPrice: 5 }));
        test('createQualityCheck valid', () => assertValid(createQualityCheck, { result: 'fail', score: 90 }));
        test('onboardSupplier valid', () => assertValid(onboardSupplier, { name: 'Sup', type: 'Distributor', country: 'USA' }));
        test('onboardSupplier rejects missing country', () => assertInvalid(onboardSupplier, { name: 'Sup', type: 'Distributor' }));
    });

    describe('qrScan (red-team fix)', () => {
        test('qrScan valid', () => assertValid(qrScan.body, { qr_data: '1234' }));
        test('qrScan accepts null lat/lon', () => assertValid(qrScan.body, { qr_data: '1234', latitude: null }));
        test('qrScan rejects missing qr_data', () => assertInvalid(qrScan.body, { ip_address: '1.2.3.4' }));
    });
});
