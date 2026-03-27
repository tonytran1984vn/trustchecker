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
        const { search, limit = 50, offset = 0 } = req.query;
        let query = 'SELECT * FROM products WHERE org_id = $1';
        const params = [orgId];

        if (search) {
            query += ' AND (name ILIKE $2 OR sku ILIKE $3)';
            const s = `%${search}%`;
            params.push(s, s);
        }

        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);

        const products = await db.all(query, params);
        const total = await db.get('SELECT COUNT(*) as count FROM products WHERE org_id = $1', [orgId]);

        res.json({ products, total: total.count });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load supplier products' });
    }
});

router.post('/my/products', authMiddleware, requirePermission('product:create'), async function (req, res) {
    try {
        const orgId = req.user.orgId || req.user.org_id;
        const { name, sku, description, category, manufacturer, origin_country, price } = req.body;

        if (!name || !sku) return res.status(400).json({ error: 'Name and SKU required' });

        const existing = await db.get('SELECT id FROM products WHERE sku = $1 AND org_id = $2', [sku, orgId]);
        if (existing) return res.status(409).json({ error: 'SKU already used in your catalog' });

        const productId = uuidv4();
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

        res.status(201).json({ product: { id: productId, name, sku, category } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create product' });
    }
});

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

module.exports = router;
