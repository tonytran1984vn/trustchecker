/**
 * Supplier Offerings API (A1/A2)
 * Multi-supplier marketplace model — multiple suppliers can offer the same product_definition.
 *
 * GET    /api/scm/offerings              — List offerings for current org
 * GET    /api/scm/offerings/marketplace   — Buyer view: compare offerings across suppliers
 * POST   /api/scm/offerings              — Create offering for a product_definition
 * PUT    /api/scm/offerings/:id          — Update offering (price, stock, etc.)
 * DELETE /api/scm/offerings/:id          — Deactivate offering
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requirePermission } = require('../auth');
const { idempotency } = require('../middleware/idempotency');
const logger = require('../lib/logger');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);

// ─── GET /api/scm/offerings — My offerings ───────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { status, product_def_id } = req.query;

        let query = `
            SELECT so.*, pd.name as product_name, pd.category, pd.brand_org_id,
                   o.name as brand_org_name
            FROM supplier_offerings so
            JOIN product_definitions pd ON pd.id = so.product_def_id
            LEFT JOIN organizations o ON o.id = pd.brand_org_id
            WHERE so.org_id = $1
        `;
        const params = [orgId];

        if (status) {
            query += ` AND so.status = $${params.length + 1}`;
            params.push(status);
        }
        if (product_def_id) {
            query += ` AND so.product_def_id = $${params.length + 1}`;
            params.push(product_def_id);
        }

        query += ' ORDER BY so.updated_at DESC';
        const offerings = await db.all(query, params);

        res.json({ offerings, total: offerings.length });
    } catch (err) {
        logger.error('[offerings] GET / error:', err.message);
        res.status(500).json({ error: 'Failed to fetch offerings' });
    }
});

// ─── GET /api/scm/offerings/marketplace — Buyer: compare suppliers for a product ──
router.get('/marketplace', async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { product_def_id, category } = req.query;

        if (!product_def_id && !category) {
            return res.status(400).json({ error: 'product_def_id or category required' });
        }

        // Only show offerings from connected suppliers
        let query = `
            SELECT so.id, so.sku, so.price, so.currency, so.moq, so.lead_time_days,
                   so.stock_available, so.status, so.updated_at,
                   pd.name as product_name, pd.category, pd.origin_country,
                   o.name as supplier_name,
                   stm.computed_score as supplier_trust_score,
                   stm.orders_fulfilled, stm.defect_rate
            FROM supplier_offerings so
            JOIN product_definitions pd ON pd.id = so.product_def_id
            JOIN organizations o ON o.id = so.org_id
            LEFT JOIN supplier_trust_metrics stm ON stm.org_id = so.org_id
            WHERE so.status = 'active'
              AND so.org_id != $1
              AND so.org_id IN (
                  SELECT DISTINCT network_org_id FROM partners
                  WHERE org_id = $1 AND network_org_id IS NOT NULL
                  UNION
                  SELECT DISTINCT accepted_org_id FROM supplier_invitations
                  WHERE org_id = $1 AND status = 'accepted' AND accepted_org_id IS NOT NULL
              )
        `;
        const params = [orgId];

        if (product_def_id) {
            query += ` AND so.product_def_id = $${params.length + 1}`;
            params.push(product_def_id);
        }
        if (category) {
            query += ` AND pd.category = $${params.length + 1}`;
            params.push(category);
        }

        query += ' ORDER BY so.price ASC, stm.computed_score DESC NULLS LAST';
        const offerings = await db.all(query, params);

        res.json({ offerings, total: offerings.length });
    } catch (err) {
        logger.error('[offerings] GET /marketplace error:', err.message);
        res.status(500).json({ error: 'Failed to fetch marketplace offerings' });
    }
});

// ─── POST /api/scm/offerings — Create offering ──────────────────────────────
router.post('/', requirePermission('product:create'), idempotency('offerings:create'), async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { product_def_id, sku, price, currency, moq, lead_time_days, stock_available } = req.body;

        if (!product_def_id || !sku) {
            return res.status(400).json({ error: 'product_def_id and sku are required' });
        }

        // Validate product_definition exists
        const productDef = await db.get('SELECT id, name FROM product_definitions WHERE id = $1', [product_def_id]);
        if (!productDef) {
            return res.status(404).json({ error: 'Product definition not found' });
        }

        // Check for existing offering (same org + product)
        const existing = await db.get('SELECT id FROM supplier_offerings WHERE org_id = $1 AND product_def_id = $2', [
            orgId,
            product_def_id,
        ]);
        if (existing) {
            return res.status(409).json({ error: 'You already have an offering for this product. Use PUT to update.' });
        }

        // Validate SKU uniqueness within org
        const skuCheck = await db.get('SELECT id FROM supplier_offerings WHERE org_id = $1 AND sku = $2', [orgId, sku]);
        if (skuCheck) {
            return res.status(409).json({ error: 'SKU already used in your offerings' });
        }

        const id = uuidv4();
        await db.run(
            `INSERT INTO supplier_offerings (id, org_id, product_def_id, sku, price, currency, moq, lead_time_days, stock_available)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                id,
                orgId,
                product_def_id,
                sku,
                parseFloat(price) || 0,
                currency || 'USD',
                parseInt(moq) || 1,
                lead_time_days ? parseInt(lead_time_days) : null,
                parseInt(stock_available) || 0,
            ]
        );

        res.status(201).json({
            offering: { id, org_id: orgId, product_def_id, sku, product_name: productDef.name },
        });
    } catch (err) {
        logger.error('[offerings] POST / error:', err.message);
        res.status(500).json({ error: 'Failed to create offering' });
    }
});

// ─── PUT /api/scm/offerings/:id — Update offering (optimistic locking) ──────
router.put('/:id', requirePermission('product:update'), async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { id } = req.params;
        const { price, currency, moq, lead_time_days, stock_available, status, expected_version } = req.body;

        // Ownership check
        const offering = await db.get('SELECT * FROM supplier_offerings WHERE id = $1 AND org_id = $2', [id, orgId]);
        if (!offering) {
            return res.status(404).json({ error: 'Offering not found or unauthorized' });
        }

        // Optimistic locking
        if (expected_version && offering.version !== expected_version) {
            return res.status(409).json({
                error: 'Version conflict. Reload and try again.',
                currentVersion: offering.version,
            });
        }

        await db.run(
            `UPDATE supplier_offerings SET
                price = COALESCE($1, price),
                currency = COALESCE($2, currency),
                moq = COALESCE($3, moq),
                lead_time_days = COALESCE($4, lead_time_days),
                stock_available = COALESCE($5, stock_available),
                status = COALESCE($6, status),
                version = version + 1,
                updated_at = NOW()
             WHERE id = $7 AND org_id = $8`,
            [price, currency, moq, lead_time_days, stock_available, status, id, orgId]
        );

        res.json({ message: 'Offering updated', id, newVersion: offering.version + 1 });
    } catch (err) {
        logger.error('[offerings] PUT /:id error:', err.message);
        res.status(500).json({ error: 'Failed to update offering' });
    }
});

// ─── DELETE /api/scm/offerings/:id — Soft-deactivate ────────────────────────
router.delete('/:id', requirePermission('product:update'), async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { id } = req.params;

        const offering = await db.get('SELECT id, sku FROM supplier_offerings WHERE id = $1 AND org_id = $2', [
            id,
            orgId,
        ]);
        if (!offering) {
            return res.status(404).json({ error: 'Offering not found or unauthorized' });
        }

        await db.run(
            `UPDATE supplier_offerings SET status = 'discontinued', updated_at = NOW() WHERE id = $1 AND org_id = $2`,
            [id, orgId]
        );

        res.json({ message: 'Offering discontinued', id, sku: offering.sku });
    } catch (err) {
        logger.error('[offerings] DELETE /:id error:', err.message);
        res.status(500).json({ error: 'Failed to discontinue offering' });
    }
});

module.exports = router;
