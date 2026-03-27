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
        const { search, view = 'all', limit = 50, offset = 0 } = req.query;

        let whereExtra = '';
        const params = [orgId];

        if (search) {
            whereExtra = ' AND (p.name ILIKE $2 OR p.sku ILIKE $3)';
            const s = `%${search}%`;
            params.push(s, s);
        }

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

            // Main query with role data + sync status
            const query = `
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
                ORDER BY p.created_at DESC
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
            let fallback = `SELECT *, 'pending' AS sync_status, false AS has_outbound, false AS has_inbound, false AS has_inventory FROM products WHERE org_id = $1${whereExtra.replace(/p\./g, '')}`;
            fallback += ` ORDER BY created_at DESC LIMIT $${fallbackParams.length + 1} OFFSET $${fallbackParams.length + 2}`;
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
            const { name, sku, description, category, manufacturer, origin_country, price, product_type } = req.body;

            if (!name || !sku) return res.status(400).json({ error: 'Name and SKU required' });

            // BUG-12 FIX: Validate SKU format (matching products.js validation)
            if (!/^[A-Za-z0-9\-_]{3,50}$/.test(sku)) {
                return res
                    .status(400)
                    .json({ error: 'SKU must be 3-50 characters, only letters, numbers, hyphens, and underscores' });
            }

            // BUG-08 FIX: Validate product_type
            const validTypes = ['sell', 'buy', 'both'];
            const pType = validTypes.includes(product_type) ? product_type : 'sell';

            const existing = await db.get('SELECT id FROM products WHERE sku = $1 AND org_id = $2', [sku, orgId]);
            if (existing) return res.status(409).json({ error: 'SKU already used in your catalog' });

            const productId = uuidv4();
            // BUG-04 FIX: Catch global SKU unique constraint violation
            try {
                await db.run(
                    `INSERT INTO products (id, name, sku, description, category, manufacturer, origin_country, registered_by, org_id, price)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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
                });
            } catch (e) {
                console.error('[DualWrite] create supplier product:', e.message);
            }

            res.status(201).json({ product: { id: productId, name, sku, category, product_type: pType } });
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

        const { name, description, category, manufacturer, origin_country, price, status } = req.body;

        await db.run(
            `UPDATE products SET 
                name = COALESCE($1, name),
                description = COALESCE($2, description),
                category = COALESCE($3, category),
                manufacturer = COALESCE($4, manufacturer),
                origin_country = COALESCE($5, origin_country),
                price = COALESCE($6, price),
                status = COALESCE($7, status),
                updated_at = NOW()
            WHERE id = $8 AND org_id = $9`,
            [name, description, category, manufacturer, origin_country, price, status, productId, orgId]
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

module.exports = router;
