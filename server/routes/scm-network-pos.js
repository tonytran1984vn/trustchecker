const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../auth');
const logger = require('../lib/logger');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);

// ─── GET /api/scm/network/pos — List Purchase Orders ───────────────────────
router.get('/', async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.orgId || req.user?.org_id;

        // Fetch POs where the org is either the buyer or the supplier
        const pos = await db.client.networkPurchaseOrder.findMany({
            where: {
                OR: [{ buyerOrgId: orgId }, { supplierOrgId: orgId }],
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Enrich with product details
        const enriched = await Promise.all(
            pos.map(async po => {
                const product = await db.client.productCatalog.findUnique({
                    where: { id: po.productId },
                });
                return {
                    ...po,
                    product,
                };
            })
        );

        res.json({ pos: enriched });
    } catch (e) {
        logger.error('Failed to list Network POs', { error: e.message });
        res.status(500).json({ error: 'Failed to fetch Purchase Orders' });
    }
});

// ─── POST /api/scm/network/pos — Create Purchase Order ─────────────────────
router.post('/', async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.orgId || req.user?.org_id;
        const { supplierOrgId, productId, quantity } = req.body;

        if (!supplierOrgId || !productId || !quantity) {
            return res.status(400).json({ error: 'supplierOrgId, productId, quantity are required' });
        }

        const po = await db.client.networkPurchaseOrder.create({
            data: {
                id: uuidv4(),
                buyerOrgId: orgId,
                supplierOrgId,
                productId,
                quantity: parseInt(quantity || 1),
                status: 'pending', // pending -> fulfilled
            },
        });

        res.json({ success: true, po });
    } catch (e) {
        logger.error('Failed to create Network PO', { error: e.message });
        res.status(500).json({ error: 'Failed to create Purchase Order' });
    }
});

// ─── POST /api/scm/network/pos/:id/fulfill — Mark as fulfilled ─────────────
router.post('/:id/fulfill', async (req, res) => {
    try {
        const orgId = req.orgId || req.user?.orgId || req.user?.org_id;
        const { id } = req.params;

        const po = await db.client.networkPurchaseOrder.findUnique({
            where: { id },
        });

        if (!po) {
            return res.status(404).json({ error: 'PO not found' });
        }

        // Only the supplier can fulfill the PO (or for demo purposes, let buyer fulfill too)
        if (po.supplierOrgId !== orgId && po.buyerOrgId !== orgId) {
            return res.status(403).json({ error: 'Unauthorized to fulfill this PO' });
        }

        // H-4 FIX: Sync PO Fulfillment with Inventory
        // 1. Mark PO as fulfilled
        const updated = await db.client.networkPurchaseOrder.update({
            where: { id },
            data: {
                status: 'fulfilled',
                fulfilledAt: new Date(),
            },
        });

        // 2. Add inventory to Buyer
        await db
            .run(
                `INSERT INTO inventory (id, product_id, location, quantity, org_id, version)
             VALUES ($1, $2, 'Network Receive', $3, $4, 1)`,
                [uuidv4(), po.productId, po.quantity, po.buyerOrgId]
            )
            .catch(async e => {
                // If conflict (e.g. UK uniqueness on product+location+org fails), update it
                await db.run(
                    `UPDATE inventory SET quantity = quantity + $1, version = version + 1, updated_at = NOW()
                 WHERE product_id = $2 AND org_id = $3 AND location = 'Network Receive'`,
                    [po.quantity, po.productId, po.buyerOrgId]
                );
            });

        // 3. Deduct inventory from Supplier (pick the location with highest stock)
        await db.run(
            `UPDATE inventory SET quantity = GREATEST(0, quantity - $1), version = version + 1, updated_at = NOW()
             WHERE id = (
                 SELECT id FROM inventory 
                 WHERE product_id = $2 AND org_id = $3 
                 ORDER BY quantity DESC LIMIT 1
             )`,
            [po.quantity, po.productId, po.supplierOrgId]
        );

        res.json({ success: true, po: updated });
    } catch (e) {
        logger.error('Failed to fulfill Network PO', { error: e.message });
        res.status(500).json({ error: 'Failed to fulfill Purchase Order' });
    }
});

module.exports = router;
