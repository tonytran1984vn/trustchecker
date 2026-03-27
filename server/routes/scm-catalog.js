const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');
const logger = require('../lib/logger');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);

// ─── GET /api/scm/catalog — List all products owned by org ────────────────
router.get('/', async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.orgId || req.user?.org_id;

        // Fetch products
        const products = await db.client.productCatalog.findMany({
            where: { orgId },
        });

        res.json({ products });
    } catch (e) {
        logger.error('Failed to get product catalog', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch catalog' });
    }
});

// ─── GET /api/scm/catalog/supplier-products — List products provided by suppliers ──
router.get('/supplier-products', async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.orgId || req.user?.org_id;

        // Fetch products NOT owned by current org
        const products = await db.client.productCatalog.findMany({
            where: {
                orgId: { not: orgId },
            },
        });

        const enriched = await Promise.all(
            products.map(async p => {
                const org = await db.client.organization.findUnique({ where: { id: p.orgId } });
                return {
                    ...p,
                    supplierName: org?.name || 'Unknown Supplier',
                };
            })
        );

        res.json({ products: enriched });
    } catch (e) {
        logger.error('Failed to get supplier products', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch supplier products' });
    }
});

// ─── GET /api/scm/catalog/:id/bom — Get BOM for a specific product ────────
router.get('/:id/bom', async (req, res) => {
    try {
        const { id } = req.params;

        // Fetch product BOM components including the details of the component product
        const rawBom = await db.client.productBom.findMany({
            where: { parentProductId: id },
        });

        // We need to fetch the component details because Prisma might not have the relation configured explicitly if we didn't define it.
        const bomItems = await Promise.all(
            rawBom.map(async b => {
                const component = await db.client.productCatalog.findUnique({
                    where: { id: b.componentProductId },
                });
                return {
                    ...b,
                    component,
                };
            })
        );

        res.json({ bom: bomItems });
    } catch (e) {
        logger.error('Failed to get product BOM', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch BOM' });
    }
});

// ─── POST /api/scm/catalog — Create a new product ──────────────────────────
router.post('/', async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.orgId || req.user?.org_id;
        const { name, sku, productType, unitCarbonKgCO2e } = req.body;

        if (!name || !sku) {
            return res.status(400).json({ error: 'Name and SKU are required' });
        }

        const product = await db.client.productCatalog.create({
            data: {
                id: uuidv4(),
                orgId,
                name,
                sku,
                productType: productType || 'finished_good',
                unitCarbonKgCO2e: parseFloat(unitCarbonKgCO2e || 0),
            },
        });

        res.json({ success: true, product });
    } catch (e) {
        logger.error('Failed to create product', { error: e.message });
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// ─── POST /api/scm/catalog/:id/bom — Update Bill of Materials ──────────────
router.post('/:id/bom', async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.orgId || req.user?.org_id;
        const parentProductId = req.params.id;
        const { components } = req.body; // Array of { componentProductId, quantity }

        if (!Array.isArray(components)) {
            return res.status(400).json({ error: 'components array is required' });
        }

        // Verify ownership of the parent product
        const parent = await db.client.productCatalog.findFirst({
            where: { id: parentProductId, orgId },
        });

        if (!parent) {
            return res.status(403).json({ error: 'Parent product not found or not owned by your org' });
        }

        // Delete existing BOM for this product
        await db.client.productBom.deleteMany({
            where: { parentProductId },
        });

        // Insert new BOM elements
        const created = await Promise.all(
            components.map(async comp => {
                return db.client.productBom.create({
                    data: {
                        id: uuidv4(),
                        parentProductId,
                        componentProductId: comp.componentProductId,
                        quantity: parseFloat(comp.quantity || 1.0),
                    },
                });
            })
        );

        res.json({ success: true, count: created.length });
    } catch (e) {
        logger.error('Failed to update product BOM', { error: e.message });
        res.status(500).json({ error: 'Failed to update BOM' });
    }
});

module.exports = router;
