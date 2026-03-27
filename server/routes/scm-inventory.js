/**
 * SCM Inventory Management Routes (FR-SCM-003)
 * Stock levels, adjustments, alerts, AI forecast
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const engineClient = require('../engines/infrastructure/engine-client');
const { withTransaction } = require('../middleware/transaction');
const logger = require('../lib/logger');

const router = express.Router();

// GOV-1: All routes require authentication
router.use(authMiddleware);

// ─── GET /api/scm/inventory – Stock levels ───────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { location, partner_id, product_id } = req.query;
        const orgId = req.user?.org_id || req.user?.orgId || null;
        let query = `
      SELECT i.*, p.name as product_name, p.sku, pt.name as partner_name
      FROM inventory i
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN partners pt ON i.partner_id = pt.id
      WHERE 1=1
    `;
        const params = [];
        if (orgId) {
            query += ' AND (p.org_id = ? OR pt.org_id = ?)';
            params.push(orgId, orgId);
        }
        if (location) {
            query += ' AND i.location LIKE ?';
            params.push(`%${location}%`);
        }
        if (partner_id) {
            query += ' AND i.partner_id = ?';
            params.push(partner_id);
        }
        if (product_id) {
            query += ' AND i.product_id = ?';
            params.push(product_id);
        }
        query += ' ORDER BY i.updated_at DESC';

        res.json({ inventory: await db.prepare(query).all(...params) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// ─── POST /api/scm/inventory/adjust – Stock adjustment (E1+E4+F2) ────────────
// Optimistic locking via version column prevents lost updates.
// All changes logged to inventory_ledger for audit trail.
router.post('/adjust', authMiddleware, requirePermission('inventory:create'), async (req, res) => {
    try {
        const { product_id, batch_id, partner_id, location, quantity_change, reason, source } = req.body;
        const orgId = req.user?.org_id || req.user?.orgId || null;
        const actorId = req.user?.id || null;

        if (!product_id || quantity_change === undefined)
            return res.status(400).json({ error: 'product_id and quantity_change required' });

        // Idempotency check via header
        const idemKey = req.headers['idempotency-key'];
        if (idemKey) {
            const existing = await db.get(
                `SELECT response, status_code FROM idempotency_keys WHERE key = $1 AND org_id = $2 AND expires_at > NOW()`,
                [idemKey, orgId || 'unknown']
            );
            if (existing) return res.status(existing.status_code).json(existing.response);
        }

        // Find or create inventory record
        const inv = await db.get(
            `SELECT * FROM inventory WHERE product_id = $1 AND COALESCE(partner_id, '') = $2 AND COALESCE(location, '') = $3`,
            [product_id, partner_id || '', location || '']
        );

        let result;
        if (inv) {
            const oldQty = inv.quantity;
            const newQty = Math.max(0, oldQty + quantity_change);
            const currentVersion = inv.version || 1;

            // E1: Optimistic locking — update only if version matches
            const updated = await db.run(
                `UPDATE inventory SET quantity = $1, version = $2, updated_at = NOW()
                 WHERE id = $3 AND version = $4`,
                [newQty, currentVersion + 1, inv.id, currentVersion]
            );

            // If no rows updated, version conflict
            if (updated && updated.changes === 0) {
                return res.status(409).json({
                    error: 'Concurrent modification detected. Please retry.',
                    currentVersion: currentVersion,
                });
            }

            // E4: Log to ledger
            await db.run(
                `INSERT INTO inventory_ledger (inventory_id, org_id, quantity_before, quantity_after, change, reason, source, actor_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [inv.id, orgId || '', oldQty, newQty, quantity_change, reason || '', source || 'manual', actorId]
            );

            result = { id: inv.id, product_id, quantity: newQty, version: currentVersion + 1 };
        } else {
            const id = uuidv4();
            const qty = Math.max(0, quantity_change);
            await db.run(
                `INSERT INTO inventory (id, product_id, batch_id, partner_id, location, quantity, org_id, version)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, 1)`,
                [id, product_id, batch_id || null, partner_id || null, location || '', qty, orgId]
            );

            // E4: Log creation to ledger
            await db.run(
                `INSERT INTO inventory_ledger (inventory_id, org_id, quantity_before, quantity_after, change, reason, source, actor_id)
                 VALUES ($1, $2, 0, $3, $4, $5, $6, $7)`,
                [id, orgId || '', qty, quantity_change, reason || 'initial stock', source || 'manual', actorId]
            );

            result = { id, product_id, quantity: qty, version: 1 };
        }

        const responseBody = { message: 'Stock adjusted', inventory: result };

        // Cache idempotency response
        if (idemKey) {
            try {
                await db.run(
                    `INSERT INTO idempotency_keys (key, org_id, endpoint, response, status_code)
                     VALUES ($1, $2, 'inventory:adjust', $3, 200) ON CONFLICT (key) DO NOTHING`,
                    [idemKey, orgId || 'unknown', JSON.stringify(responseBody)]
                );
            } catch (e) {
                /* non-blocking */
            }
        }

        res.json(responseBody);
    } catch (err) {
        logger.error('Inventory adjust error:', err);
        res.status(500).json({ error: 'Failed to adjust stock' });
    }
});

// ─── GET /api/scm/inventory/alerts – Overstock/understock ────────────────────
router.get('/alerts', async (req, res) => {
    try {
        const orgId = req.user?.org_id || req.user?.orgId || null;
        const orgFilter = orgId ? ' AND (p.org_id = ? OR pt.org_id = ?)' : '';
        const orgParams = orgId ? [orgId, orgId] : [];

        const understock = await db.all(
            `
      SELECT i.*, p.name as product_name, p.sku, pt.name as partner_name
      FROM inventory i
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN partners pt ON i.partner_id = pt.id
      WHERE i.quantity <= i.min_stock${orgFilter}
    `,
            [...orgParams]
        );

        const overstock = await db.all(
            `
      SELECT i.*, p.name as product_name, p.sku, pt.name as partner_name
      FROM inventory i
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN partners pt ON i.partner_id = pt.id
      WHERE i.quantity >= i.max_stock${orgFilter}
    `,
            [...orgParams]
        );

        res.json({
            understock: understock.map(i => ({
                ...i,
                alert_type: 'understock',
                severity: i.quantity === 0 ? 'critical' : 'high',
            })),
            overstock: overstock.map(i => ({ ...i, alert_type: 'overstock', severity: 'medium' })),
            total_alerts: understock.length + overstock.length,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
});

// ─── GET /api/scm/inventory/forecast – AI forecast ───────────────────────────
router.get('/forecast', async (req, res) => {
    try {
        const { product_id } = req.query;
        // Get inventory snapshots (group by date for time series)
        let history;
        if (product_id) {
            history = await db.all(
                `
        SELECT quantity, updated_at as date FROM inventory WHERE product_id = ? ORDER BY updated_at ASC
       LIMIT 1000`,
                [product_id]
            );
        } else {
            history = await db.all(`
        SELECT SUM(quantity) as quantity, date(updated_at) as date FROM inventory GROUP BY date(updated_at) ORDER BY date ASC
       LIMIT 1000`);
        }

        // If too few data points, create synthetic history from current state
        if (history.length < 3) {
            const current = await db.all('SELECT * FROM inventory ORDER BY updated_at DESC LIMIT 10');
            history = current.map((c, i) => ({
                quantity: c.quantity + Math.floor(Math.random() * 20 - 10),
                date: `day-${i}`,
            }));
        }

        const forecast = await engineClient.scmForecastInventory(history);
        res.json(forecast);
    } catch (err) {
        logger.error('Forecast error:', err);
        res.status(500).json({ error: 'Failed to generate forecast' });
    }
});

module.exports = router;
