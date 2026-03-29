const logger = require('../lib/logger');
const { dualWriteProduct, dualWriteQR } = require('../lib/dual-write');
// [MIGRATED] Use req.services.product for new logic
const { cacheInvalidate } = require('../middleware/cache-invalidate');

function _safeId(name) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error('Invalid identifier: ' + name);
    return name;
}

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const { eventBus, EVENT_TYPES } = require('../events');
const { validate, schemas } = require('../middleware/validate');
const blockchainEngine = require('../engines/infrastructure/blockchain');
const qrStorage = require('../lib/qr-storage');

const router = express.Router();

router.use((req, res, next) => {
    res.set('X-Deprecation', 'Use /api/v1/products instead');
    next();
});

const PLAN_LIMITS = { free: 50, starter: 500, pro: 5000, enterprise: 100000 };

// ATK-06: Product metadata quality validation
function validateProductQuality(body) {
    const warnings = [];
    if (body.sku && !/^[A-Za-z0-9-_]{3,50}$/.test(body.sku)) warnings.push('SKU format invalid');
    if (body.origin_country && !/^[A-Z]{2}$/.test(body.origin_country))
        warnings.push('origin_country must be ISO 3166-1 alpha-2');
    if (body.manufacturer && body.manufacturer.length < 2) warnings.push('manufacturer name too short');
    if (body.name && body.name.length < 3) warnings.push('product name too short');
    if (body.weight_kg && (body.weight_kg < 0 || body.weight_kg > 100000)) warnings.push('weight_kg out of range');
    if (body.price && body.price < 0) warnings.push('price cannot be negative');
    return warnings;
}

// ─── Auth: all product routes require authentication ─────────────────────────
router.use(authMiddleware);

// ─── GET /api/products ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { search, status, category, limit = 50, offset = 0 } = req.query;
        let query = 'SELECT * FROM products WHERE 1=1';
        const params = [];

        // BUG-03 FIX: Normalize org_id (snake_case from DB) vs orgId (camelCase from JWT)
        const orgId = req.user.orgId || req.user.org_id;

        // Org scoping: non-super_admin only sees their org's products
        if (req.user.role !== 'super_admin' && orgId) {
            query += ' AND org_id = ?';
            params.push(orgId);
        }

        if (search) {
            query += ' AND (name LIKE ? OR sku LIKE ? OR manufacturer LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Math.max(Number(offset) || 0, 0));

        const products = await db.all(query, params);
        /* ATK-03 + BUG-03 FIX */ const totalQ =
            req.user.role !== 'super_admin' && orgId
                ? 'SELECT COUNT(*) as count FROM products WHERE org_id = ?'
                : 'SELECT COUNT(*) as count FROM products';
        const totalP = req.user.role !== 'super_admin' && orgId ? [orgId] : [];
        const total = await db.get(totalQ, totalP);

        res.json({ products, total: total.count });
    } catch (err) {
        logger.error('Get products error:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// ─── GET /api/products/generation-history — Products with QR code counts ─────
// MUST be before /:id route or Express will match 'generation-history' as :id
router.get('/generation-history', authMiddleware, async (req, res) => {
    try {
        let orgFilter = '';
        const params = [];

        if (req.user.role !== 'super_admin' && req.user.orgId) {
            orgFilter = 'AND p.org_id = ?';
            params.push(req.user.orgId);
        }

        const history = await db.all(
            `
            SELECT p.id, p.name, p.sku, p.category,
                   COUNT(qc.id) as total_codes,
                   MAX(qc.generated_at) as last_generated,
                   GROUP_CONCAT(qr_data, ', ') as recent_codes
            FROM products p
            INNER JOIN qr_codes qc ON qc.product_id = p.id AND qc.status != 'deleted'
            WHERE 1=1 ${orgFilter}
            GROUP BY p.id, p.name, p.sku, p.category
            ORDER BY last_generated DESC
            LIMIT 20
        `,
            params
        );

        res.json({ history });
    } catch (err) {
        logger.error('Generation history error:', err.message, '\nSQL details:', err.meta || '');
        res.status(500).json({ error: 'Failed to fetch generation history', detail: err.message });
    }
});

// ─── GET /api/products/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        // BUG-01 FIX: Org-scoped product access — non-super_admin can only view own org's products
        const orgId = req.user.orgId || req.user.org_id;
        let product;
        if (req.user.role !== 'super_admin' && orgId) {
            product = await db.get('SELECT * FROM products WHERE id = ? AND org_id = ?', [req.params.id, orgId]);
        } else {
            product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        }
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const qrCodes = await db.all('SELECT * FROM qr_codes WHERE product_id = ?', [req.params.id]);
        const recentScans = await db.all(
            `
      SELECT * FROM scan_events WHERE product_id = ? ORDER BY scanned_at DESC LIMIT 10
    `,
            [req.params.id]
        );
        const trustHistory = await db.all(
            `
      SELECT * FROM trust_scores WHERE product_id = ? ORDER BY calculated_at DESC LIMIT 10
    `,
            [req.params.id]
        );

        res.json({ product, qr_codes: qrCodes, recent_scans: recentScans, trust_history: trustHistory });
    } catch (err) {
        logger.error('Get product error:', err);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// DB schema properties natively defined in Prisma

// ─── POST /api/products/ensure (Create or Reuse) ──────────────────────────────
router.post('/ensure', requirePermission('product:create'), validate(schemas.createProduct), async (req, res) => {
    try {
        const { name, sku, description, category, manufacturer, origin_country, weight_kg, price } = req.body;
        if (!name || !sku) {
            return res.status(400).json({ error: 'Name and SKU are required' });
        }

        // 1. Try to find existing product by SKU (scoped by org if applicable)
        let query = 'SELECT id, name, sku FROM products WHERE sku = ?';
        const params = [sku];
        // If not super_admin, only find within their org
        if (req.user.role !== 'super_admin' && req.user.orgId) {
            query += ' AND org_id = ?';
            params.push(req.user.orgId);
        }

        const existing = await db.get(query, params);
        if (existing) {
            return res.json({
                message: 'Product reused',
                product_id: existing.id,
                product: existing,
                reused: true,
            });
        }

        // 2. Not found -> Validate and Create
        const qualityWarnings = validateProductQuality(req.body);
        const productId = uuidv4();

        await db.run(
            `INSERT INTO products (id, name, sku, description, category, manufacturer, origin_country, registered_by, org_id, weight_kg, price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                productId,
                name,
                sku,
                description || '',
                category || '',
                manufacturer || '',
                origin_country || '',
                req.user.id,
                req.user.orgId || null,
                parseFloat(weight_kg) || 0,
                parseFloat(price) || 0,
            ]
        );

        // ── Phase 1: Dual-write to product_definitions + product_catalogs ──
        dualWriteProduct({
            id: productId,
            name,
            orgId: req.user.orgId,
            sku,
            category: category || '',
            description: description || '',
            origin_country: origin_country || '',
            manufacturer: manufacturer || '',
        }).catch(e => logger.error('[DualWrite] ensure product:', e.message));

        res.json({
            message: 'Product created',
            product_id: productId,
            product: { id: productId, name, sku },
            reused: false,
            warnings: qualityWarnings.length ? qualityWarnings : undefined,
        });
    } catch (err) {
        logger.error('Ensure product error:', err);
        res.status(500).json({ error: 'Failed to ensure product' });
    }
});

// ─── POST /api/products ─────────────────────────────────────────────────────
router.post('/', requirePermission('product:create'), validate(schemas.createProduct), async (req, res) => {
    try {
        const qualityWarnings = validateProductQuality(req.body);
        const {
            name,
            sku,
            description,
            category,
            manufacturer,
            batch_number,
            origin_country,
            weight_kg,
            quantity,
            price,
        } = req.body;

        if (!name || !sku) {
            return res.status(400).json({ error: 'Name and SKU are required' });
        }

        // v9.5.0: Anti-gaming — validate product metadata quality
        const ISO_COUNTRIES = new Set([
            'AF',
            'AL',
            'DZ',
            'AS',
            'AD',
            'AO',
            'AG',
            'AR',
            'AM',
            'AU',
            'AT',
            'AZ',
            'BS',
            'BH',
            'BD',
            'BB',
            'BY',
            'BE',
            'BZ',
            'BJ',
            'BT',
            'BO',
            'BA',
            'BW',
            'BR',
            'BN',
            'BG',
            'BF',
            'BI',
            'KH',
            'CM',
            'CA',
            'CV',
            'CF',
            'TD',
            'CL',
            'CN',
            'CO',
            'KM',
            'CG',
            'CD',
            'CR',
            'CI',
            'HR',
            'CU',
            'CY',
            'CZ',
            'DK',
            'DJ',
            'DM',
            'DO',
            'EC',
            'EG',
            'SV',
            'GQ',
            'ER',
            'EE',
            'SZ',
            'ET',
            'FJ',
            'FI',
            'FR',
            'GA',
            'GM',
            'GE',
            'DE',
            'GH',
            'GR',
            'GD',
            'GT',
            'GN',
            'GW',
            'GY',
            'HT',
            'HN',
            'HU',
            'IS',
            'IN',
            'ID',
            'IR',
            'IQ',
            'IE',
            'IL',
            'IT',
            'JM',
            'JP',
            'JO',
            'KZ',
            'KE',
            'KI',
            'KP',
            'KR',
            'KW',
            'KG',
            'LA',
            'LV',
            'LB',
            'LS',
            'LR',
            'LY',
            'LI',
            'LT',
            'LU',
            'MG',
            'MW',
            'MY',
            'MV',
            'ML',
            'MT',
            'MH',
            'MR',
            'MU',
            'MX',
            'FM',
            'MD',
            'MC',
            'MN',
            'ME',
            'MA',
            'MZ',
            'MM',
            'NA',
            'NR',
            'NP',
            'NL',
            'NZ',
            'NI',
            'NE',
            'NG',
            'MK',
            'NO',
            'OM',
            'PK',
            'PW',
            'PA',
            'PG',
            'PY',
            'PE',
            'PH',
            'PL',
            'PT',
            'QA',
            'RO',
            'RU',
            'RW',
            'KN',
            'LC',
            'VC',
            'WS',
            'SM',
            'ST',
            'SA',
            'SN',
            'RS',
            'SC',
            'SL',
            'SG',
            'SK',
            'SI',
            'SB',
            'SO',
            'ZA',
            'SS',
            'ES',
            'LK',
            'SD',
            'SR',
            'SE',
            'CH',
            'SY',
            'TW',
            'TJ',
            'TZ',
            'TH',
            'TL',
            'TG',
            'TO',
            'TT',
            'TN',
            'TR',
            'TM',
            'TV',
            'UG',
            'UA',
            'AE',
            'GB',
            'US',
            'UY',
            'UZ',
            'VU',
            'VE',
            'VN',
            'YE',
            'ZM',
            'ZW',
        ]);
        if (origin_country && origin_country.trim() !== '' && !ISO_COUNTRIES.has(origin_country.toUpperCase().trim())) {
            return res
                .status(400)
                .json({ error: `Invalid country code: ${origin_country}. Use ISO 3166-1 alpha-2 (e.g., US, VN, SG)` });
        }
        if (manufacturer && manufacturer.trim().length < 3) {
            return res.status(400).json({ error: 'Manufacturer name must be at least 3 characters' });
        }
        if (name.trim().length < 3) {
            return res.status(400).json({ error: 'Product name must be at least 3 characters' });
        }

        const existing = await db.get('SELECT id FROM products WHERE sku = ?', [sku]);
        if (existing) {
            return res.status(409).json({ error: 'Product with this SKU already exists' });
        }

        const productId = uuidv4();
        const qrCodeId = uuidv4();
        const qrCode = `TC:${productId}:${sku}:${Date.now()}`;
        // QR encodes a public verification URL so phone scanners can open it
        const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
        const qrData = `${baseUrl}/check?code=${encodeURIComponent(qrCode)}`;

        // Generate QR code image → save to disk
        const batchTimestamp = Date.now();
        const imageKey = qrStorage.buildImageKey(req.user.orgId, batchTimestamp, qrCodeId);
        await qrStorage.saveQrImage(qrData, imageKey);

        // Insert product (with carbon fields)
        await db.run(
            `
      INSERT INTO products (id, name, sku, description, category, manufacturer, batch_number, origin_country, registered_by, org_id, weight_kg, quantity, price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
            [
                productId,
                name,
                sku,
                description || '',
                category || '',
                manufacturer || '',
                batch_number || '',
                origin_country || '',
                req.user.id,
                req.user.orgId || null,
                parseFloat(weight_kg) || 0,
                parseInt(quantity) || 1,
                parseFloat(price) || 0,
            ]
        );

        // Insert QR code with image_key (no base64 in DB)
        await db.run(
            `
      INSERT INTO qr_codes (id, product_id, qr_data, image_key, org_id)
      VALUES (?, ?, ?, ?, ?)
    `,
            [qrCodeId, productId, qrData, imageKey, req.user.orgId || null]
        );

        // ── Phase 1: Dual-write product + QR to new schema ──
        dualWriteProduct({
            id: productId,
            name,
            orgId: req.user.orgId,
            sku,
            category: category || '',
            description: description || '',
            origin_country: origin_country || '',
            manufacturer: manufacturer || '',
        }).catch(e => logger.error('[DualWrite] create product:', e.message));
        dualWriteQR({ qrId: qrCodeId, serialNumber: `TC:${productId}:${sku}:0001:${Date.now()}` }).catch(e =>
            logger.error('[DualWrite] create QR:', e.message)
        );

        // Audit log
        try {
            await db
                .prepare(
                    `INSERT INTO audit_log (id, actor_id, action, resource, resource_id, details) VALUES (?, ?, ?, ?, ?, ?)`
                )
                .run(
                    uuidv4(),
                    req.user.id,
                    'PRODUCT_REGISTERED',
                    'product',
                    productId,
                    JSON.stringify({ name, sku, weight_kg, quantity })
                );

            // FIX-9-AUDIT: Log product creation to audit trail
            await db.run(
                'INSERT INTO audit_log (id, actor_id, actor_email, action, resource, resource_id, org_id, details, ip_address) VALUES (?,?,?,?,?,?,?,?,?)',
                [
                    uuidv4(),
                    req.user?.id,
                    req.user?.email,
                    'PRODUCT_CREATED',
                    'product',
                    productId,
                    req.user?.orgId || req.user?.org_id,
                    JSON.stringify({ name, sku, manufacturer, origin_country, weight_kg, quantity }),
                    req.ip,
                ]
            );
        } catch (auditErr) {
            logger.error('[Audit]', auditErr.message);
        }
        // ATK-02-SEAL: Seal product creation into blockchain
        try {
            await blockchainEngine.seal('ProductCreated', productId, { sku, name, manufacturer, origin_country });
        } catch (e) {
            logger.error('[ATK-02-SEAL]', e.message);
        }
        eventBus.emitEvent(EVENT_TYPES.PRODUCT_REGISTERED, {
            product_id: productId,
            name,
            sku,
            registered_by: req.user.username,
        });

        res.status(201).json({
            product: {
                id: productId,
                name,
                sku,
                trust_score: 100,
                weight_kg: parseFloat(weight_kg) || 0,
                quantity: parseInt(quantity) || 1,
            },
            qr_code: { id: qrCodeId, qr_data: qrData, image_key: imageKey },
        });
    } catch (err) {
        logger.error('Create product error:', err);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// ─── PUT /api/products/:id ───────────────────────────────────────────────────
router.put('/:id', authMiddleware, requirePermission('product:update'), async (req, res) => {
    try {
        // BUG-02 FIX: Org-scoped product update — non-super_admin can only modify own org's products
        const orgId = req.user.orgId || req.user.org_id;
        let product;
        if (req.user.role !== 'super_admin' && orgId) {
            product = await db.get('SELECT * FROM products WHERE id = ? AND org_id = ?', [req.params.id, orgId]);
        } else {
            product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        }
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const {
            name,
            description,
            category,
            manufacturer,
            batch_number,
            origin_country,
            status,
            version,
            carbon_footprint_kgco2e,
        } = req.body;

        // BUG-17 FIX: Require version for optimistic locking to prevent lost updates
        if (!version) {
            return res.status(400).json({ error: 'version is required for optimistic locking' });
        }

        // BUG-02 FIX: Also add org_id to UPDATE WHERE for defense-in-depth
        // BUG-17 FIX: Added optimistic locking via version increment
        const updateQuery =
            req.user.role !== 'super_admin' && orgId
                ? `UPDATE products SET 
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                category = COALESCE(?, category),
                manufacturer = COALESCE(?, manufacturer),
                batch_number = COALESCE(?, batch_number),
                origin_country = COALESCE(?, origin_country),
                status = COALESCE(?, status),
                carbon_footprint_kgco2e = COALESCE(?, carbon_footprint_kgco2e),
                version = version + 1,
                updated_at = NOW()
              WHERE id = ? AND org_id = ? AND version = ?`
                : `UPDATE products SET 
                name = COALESCE(?, name),
                description = COALESCE(?, description),
                category = COALESCE(?, category),
                manufacturer = COALESCE(?, manufacturer),
                batch_number = COALESCE(?, batch_number),
                origin_country = COALESCE(?, origin_country),
                status = COALESCE(?, status),
                carbon_footprint_kgco2e = COALESCE(?, carbon_footprint_kgco2e),
                version = version + 1,
                updated_at = NOW()
              WHERE id = ? AND version = ?`;

        const updateParams = [
            name,
            description,
            category,
            manufacturer,
            batch_number,
            origin_country,
            status,
            carbon_footprint_kgco2e,
            req.params.id,
        ];

        if (req.user.role !== 'super_admin' && orgId) {
            updateParams.push(orgId);
        }

        // Append version for optimistic lock WHERE clause
        updateParams.push(version);

        const updated = await db.run(updateQuery, updateParams);

        if (updated.changes === 0) {
            return res
                .status(409)
                .json({ error: 'Conflict: Product was updated by another user or version mismatch.' });
        }

        // BUG 2 & 3 FIX: ESG Event Sourcing Ledger (Record Carbon change lineage)
        if (carbon_footprint_kgco2e !== undefined && product.carbon_footprint_kgco2e !== carbon_footprint_kgco2e) {
            await db.client.auditLog.create({
                data: {
                    actorId: req.user.id || 'system',
                    action: 'CARBON_FOOTPRINT_UPDATED',
                    entityType: 'product',
                    entityId: req.params.id,
                    details: {
                        oldValue: product.carbon_footprint_kgco2e,
                        newValue: carbon_footprint_kgco2e,
                        reason: req.body.update_reason || 'Manual user adjustment',
                        version: version + 1,
                    },
                    ipAddress: req.ip || '0.0.0.0',
                },
            });
        }

        res.json({ message: 'Product updated', id: req.params.id });
    } catch (err) {
        logger.error('Update product error:', err);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// ─── GET /api/products/codes/all (Global QR List) ───────────────────────────
router.get('/codes/all', authMiddleware, requirePermission('product:view'), async (req, res) => {
    try {
        const { search, batch_id, status, limit = 50, offset = 0 } = req.query;
        let whereClause = ' WHERE 1=1';
        const params = [];

        // Org scoping
        if (req.user.role !== 'super_admin' && req.user.orgId) {
            whereClause += ' AND q.org_id = ?';
            params.push(req.user.orgId);
        }

        if (search) {
            whereClause += ' AND (q.id LIKE ? OR q.qr_data LIKE ? OR p.name LIKE ? OR p.sku LIKE ?)';
            const qSearch = `%${search}%`;
            params.push(qSearch, qSearch, qSearch, qSearch);
        }
        if (batch_id) {
            whereClause += ' AND q.batch_id = ?';
            params.push(batch_id);
        }
        if (status) {
            if (status === 'deleted') {
                whereClause += ' AND q.deleted_at IS NOT NULL';
            } else if (status === 'scanned' || status === 'not_scanned') {
                whereClause += ' AND q.deleted_at IS NULL';
            } else {
                whereClause += ' AND q.status = ? AND q.deleted_at IS NULL';
                params.push(status);
            }
        } else {
            whereClause += ' AND q.deleted_at IS NULL';
        }

        let havingClause = '';
        if (status === 'scanned') {
            havingClause = ' HAVING COUNT(se.id) > 0';
        } else if (status === 'not_scanned') {
            havingClause = ' HAVING COUNT(se.id) = 0';
        }

        const innerQuery = `
            SELECT q.*, p.name as product_name, p.sku as product_sku,
                   COUNT(se.id) as scan_count
            FROM qr_codes q
            LEFT JOIN products p ON q.product_id = p.id
            LEFT JOIN scan_events se ON se.qr_code_id = q.id
            ${whereClause}
            GROUP BY q.id, p.name, p.sku
            ${havingClause}
        `;

        // Count total via subquery
        const countRes = await db.get(`SELECT COUNT(*) as total FROM (${innerQuery}) AS sub`, params);

        const finalQuery = innerQuery + ' ORDER BY q.generated_at DESC LIMIT ? OFFSET ?';
        const finalParams = [...params, parseInt(limit), parseInt(offset)];

        const codes = await db.all(finalQuery, finalParams);
        res.json({ codes, total: countRes?.total || 0 });
    } catch (err) {
        logger.error('Get all QR codes error:', err);
        res.status(500).json({ error: 'Failed to fetch QR codes' });
    }
});

// ─── POST /api/products/generate-code ────────────────────────────────────────
// Generate unique printable verification codes for products
router.post('/generate-code', authMiddleware, requirePermission('product:create'), async (req, res) => {
    try {
        const { product_id, format = 'random', brand_prefix, quantity = 1, batch_id } = req.body;
        const qty = Math.min(Math.max(1, parseInt(quantity) || 1), 100000);
        if (qty < 1) {
            return res.status(400).json({ error: 'Quantity must be between 1 and 100,000' });
        }

        const product = await db.get('SELECT * FROM products WHERE id = ?', [product_id]);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // ── Async path: qty > 500 → background job ──
        if (qty > 500) {
            const qrJobWorker = require('../lib/qr-job-worker');
            const jobId = await qrJobWorker.createJob({
                product_id,
                product_name: product.name,
                product_sku: product.sku,
                quantity: qty,
                org_id: req.user.orgId || null,
                created_by: req.user.id,
                batch_id: batch_id || null,
            });
            return res.status(202).json({
                async: true,
                job_id: jobId,
                message: `Created job to process ${qty.toLocaleString()} QR codes. Track progress at /api/products/jobs/${jobId}`,
                quantity: qty,
                product: { id: product.id, name: product.name, sku: product.sku },
            });
        }

        const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
        const generatedCodes = [];
        const batchTimestamp = Date.now();

        for (let i = 0; i < qty; i++) {
            // Each QR gets a unique code: TC:productId:SKU:serialIndex:timestamp
            const serialCode = `TC:${product_id}:${product.sku}:${String(i + 1).padStart(4, '0')}:${batchTimestamp}`;
            // QR encodes a verification URL so phone scanners open check page
            const qrData = `${baseUrl}/check?code=${encodeURIComponent(serialCode)}`;

            const qrId = uuidv4();
            const qrImageKey = qrStorage.buildImageKey(req.user.orgId, batchTimestamp, qrId);
            try {
                await qrStorage.saveQrImage(qrData, qrImageKey);
            } catch (imgErr) {
                logger.error(`[QR-Storage] Image save failed for ${qrId}:`, imgErr.message);
            }

            try {
                await db.run(
                    `INSERT INTO qr_codes (id, product_id, qr_data, image_key, org_id, generated_by, batch_id)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [qrId, product_id, qrData, qrImageKey, req.user.orgId || null, req.user.id, batch_id || null]
                );

                // ── Phase 1: Dual-write QR serial_number + qr_state ──
                dualWriteQR({ qrId, serialNumber: serialCode }).catch(e =>
                    logger.error('[DualWrite] generate-code QR:', e.message)
                );

                generatedCodes.push({
                    id: qrId,
                    code: serialCode,
                    qr_data: qrData,
                    image_key: qrImageKey,
                    serial: i + 1,
                });
            } catch (dupErr) {
                continue; // Skip duplicates
            }
        }

        // Audit log
        try {
            await db
                .prepare(
                    `INSERT INTO audit_log (id, actor_id, action, resource, resource_id, details) VALUES (?, ?, ?, ?, ?, ?)`
                )
                .run(
                    uuidv4(),
                    req.user.id,
                    'CODES_GENERATED',
                    'product',
                    product_id,
                    JSON.stringify({ quantity: qty, format, codes: generatedCodes.map(c => c.code) })
                );
        } catch (auditErr) {
            logger.error('[Audit]', auditErr.message);
        }

        eventBus.emitEvent(EVENT_TYPES.PRODUCT_REGISTERED, {
            product_id,
            product_name: product.name,
            action: 'codes_generated',
            quantity,
        });

        res.status(201).json({
            message: `Generated ${generatedCodes.length} verification codes`,
            product: { id: product.id, name: product.name, sku: product.sku },
            codes: generatedCodes,
            instructions:
                'Print these codes and attach to products. Customers can verify at /check or scan the QR code.',
        });
    } catch (err) {
        logger.error('Generate code error:', err);
        res.status(500).json({ error: 'Failed to generate codes' });
    }
});

// ─── GET /api/products/jobs — List QR generation jobs ────────────────────────
router.get('/jobs', authMiddleware, async (req, res) => {
    try {
        const qrJobWorker = require('../lib/qr-job-worker');
        const jobs = await qrJobWorker.listJobs(req.user.orgId || null, 20);
        res.json({ jobs });
    } catch (err) {
        logger.error('List jobs error:', err);
        res.status(500).json({ error: 'Failed to list jobs' });
    }
});

// ─── GET /api/products/jobs/:jobId — Poll job progress ───────────────────────
router.get('/jobs/:jobId', authMiddleware, async (req, res) => {
    try {
        const qrJobWorker = require('../lib/qr-job-worker');
        const job = await qrJobWorker.getJob(req.params.jobId);
        if (!job) return res.status(404).json({ error: 'Job not found' });
        res.json({ job });
    } catch (err) {
        logger.error('Get job error:', err);
        res.status(500).json({ error: 'Failed to get job' });
    }
});

// ─── POST /api/products/jobs/:jobId/cancel — Cancel a pending job ────────────
router.post('/jobs/:jobId/cancel', authMiddleware, async (req, res) => {
    try {
        const job = await db.get('SELECT * FROM qr_generation_jobs WHERE id = ?', [req.params.jobId]);
        if (!job) return res.status(404).json({ error: 'Job not found' });
        if (job.status !== 'pending') return res.status(409).json({ error: 'Can only cancel pending jobs' });
        await db.run("UPDATE qr_generation_jobs SET status = 'cancelled' WHERE id = ?", [req.params.jobId]);
        res.json({ message: 'Job cancelled' });
    } catch (err) {
        logger.error('Cancel job error:', err);
        res.status(500).json({ error: 'Failed to cancel job' });
    }
});

// ─── GET /api/products/:id/codes — List codes for a product (paginated) ──────
router.get('/:id/codes', authMiddleware, async (req, res) => {
    try {
        const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        // Pagination params
        const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 200);
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const offset = (page - 1) * limit;

        // Get total count
        const countResult = await db.get(
            'SELECT COUNT(*) as total FROM qr_codes WHERE product_id = ? AND status != ?',
            [req.params.id, 'deleted']
        );
        const total = countResult?.total || 0;

        // Get paginated codes
        const codes = await db.all(
            `
            SELECT qc.id, qc.qr_data as code, qc.status, qc.generated_at,
                   COUNT(se.id) as scan_count,
                   MAX(se.scanned_at) as last_scanned
            FROM qr_codes qc
            LEFT JOIN scan_events se ON se.qr_code_id = qc.id
            WHERE qc.product_id = ? AND qc.status != 'deleted'
            GROUP BY qc.id, qc.qr_data, qc.status, qc.generated_at
            ORDER BY qc.generated_at DESC
            LIMIT ? OFFSET ?
        `,
            [req.params.id, limit, offset]
        );

        res.json({
            product: { id: product.id, name: product.name, sku: product.sku },
            total,
            page,
            limit,
            total_pages: Math.ceil(total / limit),
            codes,
        });
    } catch (err) {
        logger.error('Get product codes error:', err);
        res.status(500).json({ error: 'Failed to fetch product codes' });
    }
});

// ─── DELETE /api/products/codes/:codeId — Soft-delete a code ─────────────────
// Rules: Cannot delete a code that has been scanned. Records deletion in audit_log.
router.delete('/codes/:codeId', authMiddleware, requirePermission('product:delete'), async (req, res) => {
    try {
        const codeId = req.params.codeId;

        // Find the code
        const code = await db.get('SELECT * FROM qr_codes WHERE id = ?', [codeId]);
        if (!code) {
            return res.status(404).json({ error: 'Code not found' });
        }

        // Org check: admin can only delete their org's codes
        const orgId = req.user.orgId || req.user.org_id;
        if (req.user.role !== 'super_admin' && orgId && code.org_id && code.org_id !== orgId) {
            return res.status(403).json({ error: 'Not authorized to delete codes from another organization' });
        }

        // Already deleted?
        if (code.status === 'deleted') {
            return res.status(409).json({ error: 'Code has already been deleted' });
        }

        // Check if code has been scanned
        const scanCount = await db.get('SELECT COUNT(*) as count FROM scan_events WHERE qr_code_id = ?', [codeId]);
        if (scanCount && scanCount.count > 0) {
            return res.status(409).json({
                error: 'Cannot delete scanned codes',
                scan_count: scanCount.count,
                message:
                    'This code has been scanned ' +
                    scanCount.count +
                    ' times. Scanned codes cannot be deleted to ensure data integrity.',
            });
        }

        // Soft-delete
        await db
            .prepare("UPDATE qr_codes SET status = 'deleted', deleted_at = NOW(), deleted_by = ? WHERE id = ?")
            .run(req.user.id, codeId);

        // Audit log
        try {
            await db
                .prepare(
                    `INSERT INTO audit_log (id, actor_id, action, resource, resource_id, details) VALUES (?, ?, ?, ?, ?, ?)`
                )
                .run(
                    uuidv4(),
                    req.user.id,
                    'CODE_DELETED',
                    'qr_code',
                    codeId,
                    JSON.stringify({ code: code.qr_data, product_id: code.product_id })
                );
        } catch (auditErr) {
            logger.error('[Audit]', auditErr.message);
        }

        res.json({
            message: 'Code deleted successfully',
            code_id: codeId,
            code: code.qr_data,
            deleted_by: req.user.username,
        });
    } catch (err) {
        logger.error('Delete code error:', err);
        res.status(500).json({ error: 'Failed to delete code' });
    }
});

// ─── GET /api/products/codes/deletion-history — Get deletion history ─────────
router.get('/codes/deletion-history', authMiddleware, requirePermission('product:view'), async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        let query = `
            SELECT al.*, u.username as deleted_by_username
            FROM audit_log al
            LEFT JOIN users u ON u.id = al.actor_id
            WHERE al.action = 'CODE_DELETED'
        `;
        const params = [];

        // Org scoping
        if (req.user.role !== 'super_admin' && req.user.orgId) {
            query += ` AND al.actor_id IN (SELECT id FROM users WHERE org_id = ?)`;
            params.push(req.user.orgId);
        }

        query += ' ORDER BY al.timestamp DESC LIMIT ?';
        params.push(Math.min(Number(limit) || 50, 200));

        const history = await db.prepare(query).all(...params);
        res.json({ deletion_history: history, total: history.length });
    } catch (err) {
        logger.error('Deletion history error:', err);
        res.status(500).json({ error: 'Failed to fetch deletion history' });
    }
});

// ─── GET /api/products/:id/codes/export — Export QR codes as CSV or PDF ──────
router.get('/:id/codes/export', authMiddleware, async (req, res) => {
    try {
        const { format = 'csv' } = req.query;
        const product = await db.get('SELECT * FROM products WHERE id = ?', [req.params.id]);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        // Org scoping
        if (req.user.role !== 'super_admin' && req.user.orgId && product.org_id && product.org_id !== req.user.orgId) {
            return res.status(403).json({ error: 'Not authorized to access this product' });
        }

        const codes = await db.all(
            `
            SELECT qc.id, qc.qr_data as code, qc.image_key, qc.status, qc.generated_at,
                   COUNT(se.id) as scan_count,
                   MAX(se.scanned_at) as last_scanned
            FROM qr_codes qc
            LEFT JOIN scan_events se ON se.qr_code_id = qc.id
            WHERE qc.product_id = ? AND qc.status != 'deleted'
            GROUP BY qc.id, qc.qr_data, qc.image_key, qc.status, qc.generated_at
            ORDER BY qc.generated_at DESC
        `,
            [req.params.id]
        );

        if (codes.length === 0) {
            return res.status(404).json({ error: 'No QR codes found for this product' });
        }

        const safeFileName = product.name
            .replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF ]/g, '')
            .replace(/\s+/g, '_');
        const dateStr = new Date().toISOString().slice(0, 10);

        // ── CSV Format (comma-separated, all fields quoted for Excel) ──
        if (format === 'csv') {
            const BOM = '\uFEFF';
            const q = v => `"${String(v).replace(/"/g, '""')}"`; // Quote & escape
            const header = ['No.', 'Code', 'Product', 'SKU', 'Status', 'Created Date', 'Scan Count', 'Last Scanned'];
            const rows = codes.map((c, i) => [
                q(i + 1),
                q(c.code || ''),
                q(product.name),
                q(product.sku),
                q(c.status || 'active'),
                q(c.generated_at ? new Date(c.generated_at).toISOString().replace('T', ' ').substring(0, 16) : ''),
                q(c.scan_count || 0),
                q(
                    c.last_scanned
                        ? new Date(c.last_scanned).toISOString().replace('T', ' ').substring(0, 16)
                        : 'Not scanned'
                ),
            ]);

            const csvContent = BOM + 'sep=,\n' + header.map(q).join(',') + '\n' + rows.map(r => r.join(',')).join('\n');

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}_codes_${dateStr}.csv"`);
            return res.send(csvContent);
        }

        // ── PDF Format (QR code images in grid layout for printing) ──
        if (format === 'pdf') {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ size: 'A4', margin: 30 });
            const buffers = [];

            doc.on('data', chunk => buffers.push(chunk));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}_QR_${dateStr}.pdf"`);
                res.send(pdfData);
            });

            const pageWidth = doc.page.width - 60;
            const pageHeight = doc.page.height - 60;

            // Grid layout: 3 columns × N rows
            const cols = 3;
            const cellW = Math.floor(pageWidth / cols);
            const cellH = 180; // Height per QR cell
            const qrSize = 100; // QR image size
            const rowsPerPage = Math.floor((pageHeight - 60) / cellH); // Reserve 60 for header
            const codesPerPage = cols * rowsPerPage;
            const totalPages = Math.ceil(codes.length / codesPerPage);

            for (let page = 0; page < totalPages; page++) {
                if (page > 0) doc.addPage();

                // ── Page Header ──
                doc.fontSize(12)
                    .font('Helvetica-Bold')
                    .fillColor('#111')
                    .text(product.name, 30, 30, { width: pageWidth });
                doc.fontSize(7)
                    .font('Helvetica')
                    .fillColor('#666')
                    .text(
                        `SKU: ${product.sku}  |  Export: ${dateStr}  |  Total: ${codes.length} codes  |  Page ${page + 1}/${totalPages}`,
                        30,
                        46
                    );
                doc.moveTo(30, 58)
                    .lineTo(30 + pageWidth, 58)
                    .stroke('#ccc');

                // ── QR Grid ──
                const startIdx = page * codesPerPage;
                const pageCodes = codes.slice(startIdx, startIdx + codesPerPage);

                for (let i = 0; i < pageCodes.length; i++) {
                    const col = i % cols;
                    const row = Math.floor(i / cols);
                    const x = 30 + col * cellW;
                    const y = 65 + row * cellH;

                    // Cell border (light dashed for cutting guides)
                    doc.save()
                        .rect(x, y, cellW - 4, cellH - 4)
                        .dash(3, { space: 3 })
                        .stroke('#ddd')
                        .undash()
                        .restore();

                    // Generate QR image buffer inline
                    try {
                        const qrBuffer = await QRCode.toBuffer(pageCodes[i].code || pageCodes[i].qr_data || '', {
                            type: 'png',
                            width: qrSize * 2, // 2x for sharpness
                            margin: 1,
                            color: { dark: '#000000', light: '#ffffff' },
                        });
                        const imgX = x + (cellW - 4 - qrSize) / 2;
                        doc.image(qrBuffer, imgX, y + 6, { width: qrSize, height: qrSize });
                    } catch (qrErr) {
                        // Fallback: just show text
                        doc.fontSize(7)
                            .fillColor('#999')
                            .text('[QR Error]', x + 10, y + 40, { width: cellW - 20, align: 'center' });
                    }

                    // Product name (centered under QR)
                    doc.fontSize(7)
                        .font('Helvetica-Bold')
                        .fillColor('#333')
                        .text(product.name, x + 4, y + qrSize + 12, { width: cellW - 12, align: 'center' });
                }
            }

            doc.end();
            return;
        }

        return res.status(400).json({ error: 'Invalid format. Use: csv or pdf' });
    } catch (err) {
        logger.error('Export codes error:', err);
        res.status(500).json({ error: 'Failed to export QR codes' });
    }
});

module.exports = router;
