/**
 * Zod Validation Schemas for V1 API
 * Centralized schema definitions used by validate() middleware.
 */
const { z } = require('zod');

// ── Common ──────────────────────────────────────────────────────────────────
const uuid = z.string().uuid('Must be a valid UUID');
const paginationQuery = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
}).partial();

const idParam = z.object({ id: uuid });

// ── Auth ────────────────────────────────────────────────────────────────────
const login = z.object({
    email: z.string().email('Invalid email format').max(255),
    password: z.string().min(1, 'Password required').max(128),
});

const register = z.object({
    email: z.string().email().max(255),
    password: z.string().min(8, 'Min 8 characters').max(128),
    username: z.string().min(2).max(50),
    inviteCode: z.string().optional(),
});

// ── Products ────────────────────────────────────────────────────────────────
const createProduct = z.object({
    name: z.string().min(2, 'Min 2 chars').max(200),
    sku: z.string().min(1).max(100),
    description: z.string().max(2000).optional(),
    category: z.string().max(100).optional(),
    manufacturer: z.string().min(2).max(200).optional(),
    batch_number: z.string().max(100).optional(),
    origin_country: z.string().regex(/^[A-Z]{2}$/, 'Must be ISO 3166-1 alpha-2 (e.g. VN)').optional(),
});

const updateProduct = createProduct.partial();

const productQuery = paginationQuery.extend({
    search: z.string().max(200).optional(),
    category: z.string().max(100).optional(),
});

// ── Verification ────────────────────────────────────────────────────────────
const generateQR = z.object({
    product_id: uuid,
    batchNumber: z.string().max(100).optional(),
    metadata: z.record(z.any()).optional(),
});

const processScan = z.object({
    qr_data: z.string().min(1).max(5000),
    device_fingerprint: z.string().max(500).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
});

// ── Organization ────────────────────────────────────────────────────────────
const updateOrg = z.object({
    name: z.string().min(2).max(200).optional(),
    domain: z.string().max(200).optional(),
    industry: z.string().max(100).optional(),
    size: z.string().max(50).optional(),
}).refine(data => Object.keys(data).length > 0, 'At least one field required');

const inviteMember = z.object({
    email: z.string().email(),
    role: z.enum(['viewer', 'editor', 'admin', 'company_admin']).default('viewer'),
});

// ── Supply Chain ────────────────────────────────────────────────────────────
const createShipment = z.object({
    product_id: uuid,
    origin: z.string().min(1).max(200),
    destination: z.string().min(1).max(200),
    carrier: z.string().max(100).optional(),
});

const addPartner = z.object({
    name: z.string().min(2).max(200),
    type: z.string().max(50),
    contact_email: z.string().email(),
});

// ── Notifications ───────────────────────────────────────────────────────────
const createWebhook = z.object({
    url: z.string().url('Must be a valid URL'),
    events: z.array(z.string().min(1)).min(1, 'At least one event required'),
    secret: z.string().min(16).max(256).optional(),
});

// ── Compliance ──────────────────────────────────────────────────────────────
const createEvidence = z.object({
    title: z.string().min(2).max(200),
    description: z.string().max(2000).optional(),
});

// ── RBAC ────────────────────────────────────────────────────────────────────
const assignRole = z.object({
    user_id: uuid,
    role_id: uuid,
});

// ── EPCIS ───────────────────────────────────────────────────────────────────
const epcisEvent = z.object({
    type: z.string().min(1),
    epcList: z.array(z.string()).optional(),
    bizStep: z.string().optional(),
    disposition: z.string().optional(),
});

const ingestEPCIS = z.object({
    events: z.array(epcisEvent).min(1).max(1000),
});


// RED-TEAM FIX: Missing qrScan schema (was undefined, caused validate crash)
const qrScan = {
    body: z.object({
        qr_data: z.string().min(1, 'qr_data is required'),
        device_fingerprint: z.string().optional(),
        ip_address: z.string().optional(),
        latitude: z.number().optional().nullable(),
        longitude: z.number().optional().nullable(),
        user_agent: z.string().optional(),
    }),
};

// ── Ops Data ────────────────────────────────────────────────────────────────
const createIncident = z.object({
    title: z.string().min(2, 'Title required').max(200),
    description: z.string().max(2000).optional(),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).default('medium'),
    module: z.string().max(50).optional(),
    assignedTo: z.string().uuid().optional(),
});

const updateIncident = z.object({
    status: z.enum(['open', 'investigating', 'escalated', 'resolved', 'closed']).optional(),
    resolution: z.string().max(2000).optional(),
    rootCause: z.string().max(2000).optional(),
    assigned_to: z.string().uuid().optional(),
    severity: z.enum(['critical', 'high', 'medium', 'low', 'info']).optional(),
    reason: z.string().max(500).optional(),
}).refine(data => Object.keys(data).length > 0, 'At least one field required');

const createPurchaseOrder = z.object({
    supplier: z.string().min(1).max(200),
    product: z.string().min(1).max(200),
    quantity: z.number().int().min(1).max(999999),
    unit: z.string().max(20).default('pcs'),
    unitPrice: z.number().min(0).max(9999999),
    deliveryDate: z.string().max(50).optional(),
    paymentTerms: z.string().max(50).default('NET-30'),
    contractRef: z.string().max(100).optional(),
});

const createQualityCheck = z.object({
    batchId: z.string().uuid().optional(),
    checkType: z.enum(['incoming', 'in_process', 'final', 'random']).default('incoming'),
    checkpoint: z.string().max(200).optional(),
    product: z.string().max(200).optional(),
    result: z.enum(['pass', 'fail', 'conditional']).default('pass'),
    score: z.number().int().min(0).max(100).default(100),
    defectsFound: z.number().int().min(0).default(0),
    notes: z.string().max(2000).optional(),
});

const onboardSupplier = z.object({
    name: z.string().min(2, 'Supplier name required').max(200),
    type: z.string().min(1, 'Type required').max(50),
    country: z.string().min(2, 'Country required').max(100),
    contactEmail: z.string().email().optional().or(z.literal('')),
    contactPhone: z.string().max(30).optional(),
    notes: z.string().max(2000).optional(),
});

module.exports = {
    qrScan,
    uuid, paginationQuery, idParam,
    login, register,
    createProduct, updateProduct, productQuery,
    generateQR, processScan,
    updateOrg, inviteMember,
    createShipment, addPartner,
    createWebhook,
    createEvidence,
    assignRole,
    ingestEPCIS,
    createIncident, updateIncident,
    createPurchaseOrder, createQualityCheck,
    onboardSupplier,
};
