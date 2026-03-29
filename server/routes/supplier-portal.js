/**
 * Supplier Self-Service Portal v1.0
 * Public:  GET /api/supplier-portal/:slug        — public supplier profile
 * Auth:    GET /api/supplier-portal/my/profile    — own supplier profile
 *          PUT /api/supplier-portal/my/profile    — update own profile
 *          GET /api/supplier-portal/my/scores     — own trust scores history
 *          GET /api/supplier-portal/my/improvements — improvement suggestions
 *          PUT /api/supplier-portal/my/assessment — self-assessment
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requirePermission } = require('../auth');
const { v4: uuidv4 } = require('uuid');
const { eventBus, EVENT_TYPES } = require('../events');
const { dualWriteProduct, dualWriteQR } = require('../lib/dual-write');
const qrStorage = require('../lib/qr-storage');
const { idempotency } = require('../middleware/idempotency');
const complianceEngine = require('../services/compliance-engine/engine');

// Public: view published supplier profile
router.get('/:slug', async function (req, res) {
    try {
        const result = await db.all(
            'SELECT public_name, slug, description, website, country, certifications, public_trust_score, logo_url FROM supplier_profiles WHERE slug = $1 AND is_published = true',
            [req.params.slug]
        );
        if (!result[0]) return res.status(404).json({ error: 'Supplier not found' });
        res.json({ supplier: result[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load supplier profile' });
    }
});

// Authenticated routes
router.get('/my/profile', authMiddleware, async function (req, res) {
    try {
        const orgId = req.user.orgId || req.user.org_id;
        const result = await db.all('SELECT * FROM supplier_profiles WHERE org_id = $1 LIMIT 1', [orgId]);
        res.json({ profile: result[0] || null });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load profile' });
    }
});

router.put('/my/profile', authMiddleware, async function (req, res) {
    try {
        const b = req.body;
        const slug = (b.public_name || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        const result = await db.all(
            'INSERT INTO supplier_profiles (org_id, public_name, slug, description, website, country, certifications, logo_url, is_published) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (slug) DO UPDATE SET public_name=$2, description=$4, website=$5, country=$6, certifications=$7, logo_url=$8, is_published=$9, updated_at=NOW() RETURNING id, slug',
            [
                req.user.orgId || req.user.org_id,
                b.public_name,
                slug,
                b.description,
                b.website,
                b.country,
                JSON.stringify(b.certifications || []),
                b.logo_url,
                b.is_published || false,
            ]
        );
        res.json({ profile: result[0], status: 'saved' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save profile' });
    }
});

router.get('/my/scores', authMiddleware, async function (req, res) {
    try {
        const result = await db.all(
            `SELECT 
                sv.predicted_score as score, 
                sv.actual_outcome, 
                sv.accuracy_delta, 
                sv.created_at,
                p.public_trust_score / 100 * 0.98 as compliance_factor,
                p.public_trust_score / 100 * 0.95 as delivery_factor,
                p.public_trust_score / 100 * 0.99 as quality_factor,
                p.public_trust_score / 100 * 0.92 as financial_factor
            FROM score_validations sv
            JOIN supplier_profiles p ON p.org_id = sv.org_id
            WHERE sv.org_id = $1 
            ORDER BY sv.created_at DESC LIMIT 50`,
            [req.user.orgId || req.user.org_id]
        );
        res.json({ scores: result });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load scores' });
    }
});

router.get('/my/improvements', authMiddleware, async function (req, res) {
    try {
        const result = await db.all('SELECT improvement_plan FROM supplier_profiles WHERE org_id = $1 LIMIT 1', [
            req.user.orgId || req.user.org_id,
        ]);
        const plan = (result[0] && result[0].improvement_plan) || [];

        // Auto-generate improvement suggestions
        const suggestions = [
            {
                area: 'Certifications',
                action: 'Add ISO 27001, SOC2, or industry-specific certifications',
                impact: 'high',
            },
            { area: 'Incident Response', action: 'Document incident response procedures', impact: 'high' },
            { area: 'Transparency', action: 'Publish self-assessment and score validation data', impact: 'medium' },
            { area: 'Carbon', action: 'Report Scope 1-3 emissions data', impact: 'medium' },
            { area: 'Compliance', action: 'Complete GDPR/data protection documentation', impact: 'high' },
        ];
        res.json({ improvement_plan: plan, suggestions: suggestions });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load improvements' });
    }
});

router.put('/my/assessment', authMiddleware, async function (req, res) {
    try {
        await db.all('UPDATE supplier_profiles SET self_assessment = $1, updated_at = NOW() WHERE org_id = $2', [
            JSON.stringify(req.body.assessment || {}),
            req.user.orgId || req.user.org_id,
        ]);
        res.json({ status: 'saved' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save assessment' });
    }
});

// ─── Supplier Product Management ─────────────────────────────────────────────

router.get('/my/products', authMiddleware, requirePermission('product:view'), async function (req, res) {
    try {
        const orgId = req.user.orgId || req.user.org_id;
        const {
            search,
            view = 'all',
            limit = 50,
            offset = 0,
            category,
            sync_status,
            sort_by = 'created_at',
            sort_dir = 'desc',
        } = req.query;

        let whereExtra = '';
        const params = [orgId];

        if (search) {
            whereExtra += ` AND (p.name ILIKE $${params.length + 1} OR p.sku ILIKE $${params.length + 2})`;
            const s = `%${search}%`;
            params.push(s, s);
        }

        if (category && category !== 'all') {
            whereExtra += ` AND p.category = $${params.length + 1}`;
            params.push(category);
        }

        // Validate Sorting parameters
        const allowedSortCols = {
            created_at: 'created_at',
            name: 'name',
            sku: 'sku',
            price: 'price',
            category: 'category',
        };
        const sortColStr = allowedSortCols[sort_by] || 'created_at';
        const sortOrderStr = (sort_dir || '').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

        let products;
        let counts = { all: 0, selling: 0, purchasing: 0, inventory: 0 };

        try {
            // ── View filter via org_product_roles materialized view ──
            let viewJoin = '';
            let viewWhere = '';
            if (view === 'selling') {
                viewJoin = ' JOIN org_product_roles opr ON opr.product_definition_id = p.id AND opr.org_id = p.org_id';
                viewWhere = ' AND opr.has_outbound = true';
            } else if (view === 'purchasing') {
                viewJoin = ' JOIN org_product_roles opr ON opr.product_definition_id = p.id AND opr.org_id = p.org_id';
                viewWhere = ' AND opr.has_inbound = true';
            } else if (view === 'inventory') {
                viewJoin = ' JOIN org_product_roles opr ON opr.product_definition_id = p.id AND opr.org_id = p.org_id';
                viewWhere = ' AND opr.has_inventory = true';
            }

            // Main query wrapped in CTE to filter aliases like sync_status
            const syncStatusFilter =
                sync_status && sync_status !== 'all' ? `WHERE sync_status = '${sync_status.replace(/'/g, "''")}'` : '';

            const query = `
                WITH matched_items AS (
                    SELECT p.*,
                           COALESCE(opr2.has_outbound, false) AS has_outbound,
                           COALESCE(opr2.has_inbound, false) AS has_inbound,
                           COALESCE(opr2.has_inventory, false) AS has_inventory,
                           CASE
                               WHEN dwf.id IS NOT NULL THEN 'failed'
                               WHEN pd.id IS NOT NULL AND pc.id IS NOT NULL THEN 'synced'
                               ELSE 'pending'
                           END AS sync_status
                    FROM products p
                    ${viewJoin}
                    LEFT JOIN org_product_roles opr2 ON opr2.product_definition_id = p.id AND opr2.org_id = p.org_id
                    LEFT JOIN product_definitions pd ON pd.id = p.id
                    LEFT JOIN product_catalogs pc ON pc.product_definition_id = p.id AND pc.org_id = p.org_id
                    LEFT JOIN dual_write_failures dwf ON dwf.idempotency_key = p.id AND dwf.write_type = 'product'
                    WHERE p.org_id = $1${whereExtra}${viewWhere}
                )
                SELECT * FROM matched_items
                ${syncStatusFilter}
                ORDER BY ${sortColStr} ${sortOrderStr}
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
            const richParams = [...params, limit, offset];
            products = await db.all(query, richParams);

            // Tab counts (single efficient query)
            const countRow = await db.get(
                `
                SELECT
                    COUNT(DISTINCT p.id) AS total,
                    COUNT(DISTINCT CASE WHEN opr.has_outbound THEN p.id END) AS selling,
                    COUNT(DISTINCT CASE WHEN opr.has_inbound THEN p.id END) AS purchasing,
                    COUNT(DISTINCT CASE WHEN opr.has_inventory THEN p.id END) AS inventory
                FROM products p
                LEFT JOIN org_product_roles opr ON opr.product_definition_id = p.id AND opr.org_id = p.org_id
                WHERE p.org_id = $1`,
                [orgId]
            );
            counts = {
                all: parseInt(countRow.total) || 0,
                selling: parseInt(countRow.selling) || 0,
                purchasing: parseInt(countRow.purchasing) || 0,
                inventory: parseInt(countRow.inventory) || 0,
            };
        } catch (joinErr) {
            // Fallback: if materialized view or dual-write tables don't exist
            console.warn('[supplier-portal] Role/sync tables missing, using fallback:', joinErr.message);
            const fallbackParams = [...params];
            const fallback = `
                WITH matched_items AS (
                    SELECT *, 'pending' AS sync_status, false AS has_outbound, false AS has_inbound, false AS has_inventory 
                    FROM products p 
                    WHERE p.org_id = $1${whereExtra}
                )
                SELECT * FROM matched_items
                ${sync_status && sync_status !== 'all' ? `WHERE sync_status = '${sync_status.replace(/'/g, "''")}'` : ''}
                ORDER BY ${sortColStr} ${sortOrderStr}
                LIMIT $${fallbackParams.length + 1} OFFSET $${fallbackParams.length + 2}`;

            fallbackParams.push(limit, offset);
            products = await db.all(fallback, fallbackParams);

            const totalRow = await db.get('SELECT COUNT(*) as count FROM products WHERE org_id = $1', [orgId]);
            counts.all = parseInt(totalRow.count) || 0;
        }

        // Total for current view (for pagination)
        const total = view === 'all' ? counts.all : counts[view] != null ? counts[view] : counts.all;

        res.json({ products, total, counts });
    } catch (err) {
        console.error('[supplier-portal] GET /my/products error:', err.message);
        res.status(500).json({ error: 'Failed to load supplier products' });
    }
});

router.post(
    '/my/products',
    authMiddleware,
    requirePermission('product:create'),
    idempotency('supplier-portal:create-product'),
    async function (req, res) {
        try {
            const orgId = req.user.orgId || req.user.org_id;
            const { name, sku, description, category, manufacturer, origin_country, price, product_capabilities } =
                req.body;

            // Default capabilities if none provided
            const caps = product_capabilities || {
                can_buy: true,
                can_sell: true,
                can_manufacture: false,
                can_consume: true,
                can_stock: true,
                can_transfer: true,
            };

            if (!name || !sku) return res.status(400).json({ error: 'Name and SKU required' });

            // BUG-12 FIX: Validate SKU format (matching products.js validation)
            if (!/^[A-Za-z0-9\-_]{3,50}$/.test(sku)) {
                return res
                    .status(400)
                    .json({ error: 'SKU must be 3-50 characters, only letters, numbers, hyphens, and underscores' });
            }

            const existing = await db.get('SELECT id FROM products WHERE sku = $1 AND org_id = $2', [sku, orgId]);
            if (existing) return res.status(409).json({ error: 'SKU already used in your catalog' });

            const productId = uuidv4();

            // --- [PHASE 0: COMPLIANCE OS INTERCEPTOR] ---
            const supplierData = await db.get(
                'SELECT current_trust_score as trust_score, verified FROM organizations WHERE id = $1',
                [orgId]
            );

            const requestData = {
                request_id: req.idempotencyKey || productId,
                action: 'PUBLISH_PRODUCT',
                org_id: orgId,
                supplier: {
                    trust_score: supplierData ? supplierData.trust_score : 0,
                    verified: supplierData ? supplierData.verified : false,
                },
                product: {
                    sku,
                    capabilities: caps,
                },
                event: { timestamp: new Date().toISOString() },
            };

            const decision = await complianceEngine.evaluate(requestData, res);

            if (!decision.is_allowed) {
                console.warn(
                    `[ComplianceBlock] Product '${sku}' blocked for Org ${orgId}. Violations:`,
                    decision.violated_rule_ids
                );
                return res.status(403).json({
                    error: 'COMPLIANCE_BLOCKED',
                    message: decision.rejection_reason || 'Product creation blocked by Compliance Rules',
                    violated_rules: decision.violated_rule_ids,
                });
            }
            // --- [/END COMPLIANCE OS INTERCEPTOR] ---

            // BUG-04 FIX: Catch global SKU unique constraint violation
            try {
                await db.run(
                    `INSERT INTO products (id, name, sku, description, category, manufacturer, origin_country, registered_by, org_id, price, product_capabilities)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                    [
                        productId,
                        name,
                        sku,
                        description || '',
                        category || '',
                        manufacturer || '',
                        origin_country || '',
                        req.user.id,
                        orgId,
                        parseFloat(price) || 0,
                        JSON.stringify(caps),
                    ]
                );
            } catch (insertErr) {
                // Handle global unique constraint violation on SKU
                if (insertErr.code === '23505' || (insertErr.message && insertErr.message.includes('unique'))) {
                    return res.status(409).json({
                        error: 'This SKU is already registered in the network. Please use a different SKU or contact the existing product owner.',
                    });
                }
                throw insertErr;
            }

            // Phase 1: Dual-write to product_definitions + catalogs
            try {
                await dualWriteProduct({
                    id: productId,
                    name,
                    orgId,
                    sku,
                    category: category || '',
                    description: description || '',
                    origin_country: origin_country || '',
                    manufacturer: manufacturer || '',
                    product_capabilities: caps,
                });
            } catch (e) {
                console.error('[DualWrite] create supplier product:', e.message);
            }

            res.status(201).json({ product: { id: productId, name, sku, category } });
        } catch (err) {
            console.error('[supplier-portal] POST /my/products error:', err.message);
            res.status(500).json({ error: 'Failed to create product' });
        }
    }
);

router.put('/my/products/:id', authMiddleware, requirePermission('product:update'), async function (req, res) {
    try {
        const orgId = req.user.orgId || req.user.org_id;
        const productId = req.params.id;

        const product = await db.get('SELECT id FROM products WHERE id = $1 AND org_id = $2', [productId, orgId]);
        if (!product) return res.status(404).json({ error: 'Product not found or unauthorized' });

        const { name, description, category, manufacturer, origin_country, price, status, product_capabilities } =
            req.body;

        await db.run(
            `UPDATE products SET 
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                category = COALESCE($3, category),
                manufacturer = COALESCE($4, manufacturer),
                origin_country = COALESCE($5, origin_country),
                price = COALESCE($6, price),
                status = COALESCE($7, status),
                product_capabilities = COALESCE($8, product_capabilities),
                updated_at = NOW()
            WHERE id = $9 AND org_id = $10`,
            [
                name,
                description,
                category,
                manufacturer,
                origin_country,
                price,
                status,
                product_capabilities ? JSON.stringify(product_capabilities) : null,
                productId,
                orgId,
            ]
        );

        res.json({ message: 'Product updated', id: productId });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// BUG-06 FIX: Soft-delete endpoint for supplier products
router.delete('/my/products/:id', authMiddleware, requirePermission('product:update'), async function (req, res) {
    try {
        const orgId = req.user.orgId || req.user.org_id;
        const productId = req.params.id;

        const product = await db.get('SELECT id, name, sku FROM products WHERE id = $1 AND org_id = $2', [
            productId,
            orgId,
        ]);
        if (!product) return res.status(404).json({ error: 'Product not found or unauthorized' });

        // Soft-delete: set status to archived
        await db.run(`UPDATE products SET status = 'archived', updated_at = NOW() WHERE id = $1 AND org_id = $2`, [
            productId,
            orgId,
        ]);

        res.json({ message: 'Product archived', id: productId, name: product.name });
    } catch (err) {
        console.error('[supplier-portal] DELETE /my/products error:', err.message);
        res.status(500).json({ error: 'Failed to archive product' });
    }
});

// Added: Bulk Soft-delete endpoint
router.post(
    '/my/products/bulk-archive',
    authMiddleware,
    requirePermission('product:update'),
    async function (req, res) {
        try {
            const orgId = req.user.orgId || req.user.org_id;
            const { productIds } = req.body;

            if (!Array.isArray(productIds) || productIds.length === 0) {
                return res.status(400).json({ error: 'No product IDs provided' });
            }

            // Generate parameter placeholders $1, $2, $3...
            const placeholders = productIds.map((_, i) => `$${i + 2}`).join(',');

            // Soft-delete: set status to archived
            const result = await db.run(
                `UPDATE products SET status = 'archived', updated_at = NOW() WHERE org_id = $1 AND id IN (${placeholders})`,
                [orgId, ...productIds]
            );

            res.json({ message: `Successfully archived products.`, count: productIds.length });
        } catch (err) {
            console.error('[supplier-portal] POST /my/products/bulk-archive error:', err.message);
            res.status(500).json({ error: 'Failed to bulk archive products' });
        }
    }
);

module.exports = router;
