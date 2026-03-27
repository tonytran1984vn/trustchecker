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

// ─── POST /api/scm/offerings — Create offering (TRANSACTION-SAFE) ──────────
// Invariant: offering + v1 version created atomically on same connection.
router.post('/', requirePermission('product:create'), idempotency('offerings:create'), async (req, res) => {
    try {
        const orgId = req.user?.orgId || req.user?.org_id;
        const { product_def_id, sku, price, currency, moq, lead_time_days, stock_available } = req.body;

        if (!product_def_id || !sku) {
            return res.status(400).json({ error: 'product_def_id and sku are required' });
        }

        // Validate product_definition exists (outside tx — read-only)
        const productDef = await db.get('SELECT id, name FROM product_definitions WHERE id = $1', [product_def_id]);
        if (!productDef) {
            return res.status(404).json({ error: 'Product definition not found' });
        }

        const id = uuidv4();
        const parsedPrice = parseFloat(price) || 0;
        const parsedCurrency = currency || 'USD';
        const parsedMoq = parseInt(moq) || 1;
        const parsedLead = lead_time_days ? parseInt(lead_time_days) : null;
        const parsedStock = parseInt(stock_available) || 0;

        const result = await db.withTransaction(async tx => {
            // Check for existing offering (inside tx for consistency)
            const existing = await tx.get(
                'SELECT id FROM supplier_offerings WHERE org_id = $1 AND product_def_id = $2',
                [orgId, product_def_id]
            );
            if (existing) {
                return {
                    status: 409,
                    body: { error: 'You already have an offering for this product. Use PUT to update.' },
                };
            }

            // Validate SKU uniqueness within org
            const skuCheck = await tx.get('SELECT id FROM supplier_offerings WHERE org_id = $1 AND sku = $2', [
                orgId,
                sku,
            ]);
            if (skuCheck) {
                return { status: 409, body: { error: 'SKU already used in your offerings' } };
            }

            // Insert offering + v1 atomically
            await tx.run(
                `INSERT INTO supplier_offerings (id, org_id, product_def_id, sku, price, currency, moq, lead_time_days, stock_available)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [id, orgId, product_def_id, sku, parsedPrice, parsedCurrency, parsedMoq, parsedLead, parsedStock]
            );

            const versionId = uuidv4();
            await tx.run(
                `INSERT INTO supplier_offering_versions (id, offering_id, price, currency, moq, lead_time_days, stock_snapshot, version, valid_from, created_by)
                 VALUES ($1, $2::uuid, $3, $4, $5, $6, $7, 1, NOW(), $8)`,
                [
                    versionId,
                    id,
                    parsedPrice,
                    parsedCurrency,
                    parsedMoq,
                    parsedLead,
                    parsedStock,
                    req.user?.email || 'system',
                ]
            );

            return {
                status: 201,
                body: {
                    offering: {
                        id,
                        org_id: orgId,
                        product_def_id,
                        sku,
                        product_name: productDef.name,
                        version_id: versionId,
                    },
                },
            };
        });

        return res.status(result.status).json(result.body);
    } catch (err) {
        logger.error('[offerings] POST / error:', err.message);
        res.status(500).json({ error: 'Failed to create offering' });
    }
});

// ─── PUT /api/scm/offerings/:id — Immutable version rotation (TRANSACTION-SAFE) ──
// Invariant: 1 offering → exactly 1 active version. No gap, no overlap.
// Flow: withTransaction(tx => lock root FOR UPDATE → SELECT now() → close old → insert new → verify)
// On conflict: exponential backoff (100ms, 200ms, 400ms), max 3 retries.
router.put('/:id', requirePermission('product:update'), async (req, res) => {
    const MAX_RETRIES = 3;
    const BASE_DELAY_MS = 100;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const orgId = req.user?.orgId || req.user?.org_id;
            const { id } = req.params;
            const { price, currency, moq, lead_time_days, stock_available, status } = req.body;

            const result = await db.withTransaction(async tx => {
                // 1. Lock root offering (prevents concurrent version creation)
                const offering = await tx.get(
                    'SELECT * FROM supplier_offerings WHERE id = $1 AND org_id = $2 FOR UPDATE',
                    [id, orgId]
                );
                if (!offering) {
                    return { status: 404, body: { error: 'Offering not found or unauthorized' } };
                }

                // 2. Shared timestamp (guarantees old.valid_to == new.valid_from)
                const tsResult = await tx.get('SELECT NOW() as ts', []);
                const ts = tsResult.ts;

                // 3. Get current active version
                const currentVersion = await tx.get(
                    'SELECT * FROM supplier_offering_versions WHERE offering_id = $1 AND valid_to IS NULL',
                    [id]
                );
                const nextVersionNum = (currentVersion?.version || 0) + 1;

                // 4. Close old version (if exists)
                if (currentVersion) {
                    await tx.run('UPDATE supplier_offering_versions SET valid_to = $1 WHERE id = $2', [
                        ts,
                        currentVersion.id,
                    ]);
                }

                // 5. Insert new version
                const versionId = uuidv4();
                await tx.run(
                    `INSERT INTO supplier_offering_versions
                     (id, offering_id, price, currency, moq, lead_time_days, stock_snapshot, version, valid_from, created_by)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        versionId,
                        id,
                        parseFloat(price) || currentVersion?.price || offering.price || 0,
                        currency || currentVersion?.currency || offering.currency || 'USD',
                        parseInt(moq) || currentVersion?.moq || offering.moq || 1,
                        lead_time_days != null
                            ? parseInt(lead_time_days)
                            : currentVersion?.lead_time_days || offering.lead_time_days,
                        parseInt(stock_available) || currentVersion?.stock_snapshot || offering.stock_available || 0,
                        nextVersionNum,
                        ts,
                        req.user?.email || 'system',
                    ]
                );

                // 6. RUNTIME INVARIANT: exactly 1 active version (valid_to IS NULL)
                const activeCount = await tx.get(
                    'SELECT COUNT(*)::int as cnt FROM supplier_offering_versions WHERE offering_id = $1 AND valid_to IS NULL',
                    [id]
                );
                if (activeCount?.cnt !== 1) {
                    // Throw to trigger auto-ROLLBACK
                    throw Object.assign(
                        new Error(`INVARIANT VIOLATION: ${activeCount?.cnt} active versions for ${id}`),
                        { isInvariant: true }
                    );
                }

                // 7. Update root offering record (backward compat)
                await tx.run(
                    `UPDATE supplier_offerings SET
                        price = COALESCE($1, price), currency = COALESCE($2, currency),
                        moq = COALESCE($3, moq), lead_time_days = COALESCE($4, lead_time_days),
                        stock_available = COALESCE($5, stock_available), status = COALESCE($6, status),
                        version = $7, updated_at = $8
                     WHERE id = $9 AND org_id = $10`,
                    [price, currency, moq, lead_time_days, stock_available, status, nextVersionNum, ts, id, orgId]
                );

                return {
                    status: 200,
                    body: {
                        message: 'Offering updated (new version created)',
                        id,
                        version_id: versionId,
                        version: nextVersionNum,
                        valid_from: ts,
                    },
                };
            });

            return res.status(result.status).json(result.body);
        } catch (err) {
            // withTransaction auto-rolled back already

            // Retry on EXCLUSION constraint violation (concurrent version conflict)
            if (err.code === '23P01' && attempt < MAX_RETRIES) {
                const delay = BASE_DELAY_MS * Math.pow(2, attempt);
                logger.warn(`[offerings] Version conflict on attempt ${attempt + 1}, retrying in ${delay}ms`);
                await new Promise(r => setTimeout(r, delay));
                continue;
            }

            if (err.isInvariant) {
                logger.error(`[offerings] ${err.message}`);
                return res.status(500).json({ error: 'Version invariant violated — rolled back' });
            }

            logger.error('[offerings] PUT /:id error:', err.message);
            return res.status(500).json({ error: 'Failed to update offering' });
        }
    }
});

// ─── DELETE /api/scm/offerings/:id — Soft-deactivate (TRANSACTION-SAFE) ─────
// FIX H-1: Close active version atomically to maintain version table invariant
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

        // Atomic: discontinue offering + close active version
        await db.withTransaction(async tx => {
            await tx.run(
                `UPDATE supplier_offerings SET status = 'discontinued', updated_at = NOW() WHERE id = $1 AND org_id = $2`,
                [id, orgId]
            );
            await tx.run(
                `UPDATE supplier_offering_versions SET valid_to = NOW() WHERE offering_id = $1 AND valid_to IS NULL`,
                [id]
            );
        });

        res.json({ message: 'Offering discontinued', id, sku: offering.sku });
    } catch (err) {
        logger.error('[offerings] DELETE /:id error:', err.message);
        res.status(500).json({ error: 'Failed to discontinue offering' });
    }
});

module.exports = router;
