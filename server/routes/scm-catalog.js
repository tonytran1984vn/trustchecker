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

// ─── GET /api/scm/catalog/supplier-products — List products from CONNECTED suppliers only ──
// B1 FIX: Previously returned ALL non-self catalog entries (full catalog leak).
// Now scoped to only orgs linked via partners.network_org_id or supplier_invitations.
router.get('/supplier-products', async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.orgId || req.user?.org_id;

        // Only show products from orgs connected to this org via partners or accepted invitations
        const connectedOrgs = await db.all(
            `SELECT DISTINCT network_org_id AS connected_org_id FROM partners
             WHERE org_id = $1 AND network_org_id IS NOT NULL
             UNION
             SELECT DISTINCT accepted_org_id FROM supplier_invitations
             WHERE org_id = $1 AND status = 'accepted' AND accepted_org_id IS NOT NULL`,
            [orgId]
        );

        const connectedOrgIds = connectedOrgs.map(r => r.connected_org_id).filter(Boolean);

        if (connectedOrgIds.length === 0) {
            return res.json({ products: [] });
        }

        // Fetch products only from connected supplier orgs
        const products = await db.client.productCatalog.findMany({
            where: {
                orgId: { in: connectedOrgIds },
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
// B2 FIX: Verify parent product ownership before returning BOM
router.get('/:id/bom', async (req, res) => {
    try {
        const { id } = req.params;
        const orgId = req.orgId || req.user?.orgId || req.user?.org_id;

        // Verify the requesting org owns the parent product
        const parent = await db.client.productCatalog.findFirst({
            where: { id, orgId },
        });
        if (!parent) {
            return res.status(404).json({ error: 'Product not found or not owned by your organization' });
        }

        // Fetch product BOM components
        const rawBom = await db.client.productBom.findMany({
            where: { parentProductId: id },
        });

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

        // BUG 3: BOM Component Isolation (Prevent Fake/Adversarial Attachments)
        // Ensure components belong to self OR connected suppliers
        const componentIds = components.map(c => c.componentProductId).filter(Boolean);
        if (componentIds.length > 0) {
            const connectedOrgs = await db.all(
                `SELECT DISTINCT network_org_id AS connected_org_id FROM partners
                 WHERE org_id = $1 AND network_org_id IS NOT NULL
                 UNION
                 SELECT DISTINCT accepted_org_id FROM supplier_invitations
                 WHERE org_id = $1 AND status = 'accepted' AND accepted_org_id IS NOT NULL`,
                [orgId]
            );
            const validOrgIds = connectedOrgs.map(r => r.connected_org_id).filter(Boolean);
            validOrgIds.push(orgId); // Include self

            const validComponentsCount = await db.client.productCatalog.count({
                where: {
                    id: { in: componentIds },
                    orgId: { in: validOrgIds },
                },
            });
            if (validComponentsCount !== componentIds.length) {
                return res
                    .status(403)
                    .json({ error: 'One or more components are invalid or belong to an unauthorized organization' });
            }
        }

        // Use a transaction to ensure atomic replacement (Bug 18 Fix)
        const created = await db.client.$transaction(async tx => {
            // Delete existing BOM for this product
            await tx.productBom.deleteMany({
                where: { parentProductId },
            });

            // Insert new BOM elements
            return await Promise.all(
                components.map(async comp => {
                    return tx.productBom.create({
                        data: {
                            id: uuidv4(),
                            parentProductId,
                            componentProductId: comp.componentProductId,
                            quantity: parseFloat(comp.quantity || 1.0),
                        },
                    });
                })
            );
        });

        res.json({ success: true, count: created.length });
    } catch (e) {
        logger.error('Failed to update product BOM', { error: e.message });
        res.status(500).json({ error: 'Failed to update BOM' });
    }
});

module.exports = router;
