/**
 * SCM Inventory Management Routes (FR-SCM-003)
 * Stock levels, adjustments, alerts, AI forecast
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const engineClient = require('../engines/engine-client');

const router = express.Router();


// GOV-1: All routes require authentication
router.use(authMiddleware);

// ─── GET /api/scm/inventory – Stock levels ───────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { location, partner_id, product_id } = req.query;
        let query = `
      SELECT i.*, p.name as product_name, p.sku, pt.name as partner_name
      FROM inventory i
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN partners pt ON i.partner_id = pt.id
      WHERE 1=1
    `;
        const params = [];
        if (location) { query += ' AND i.location LIKE ?'; params.push(`%${location}%`); }
        if (partner_id) { query += ' AND i.partner_id = ?'; params.push(partner_id); }
        if (product_id) { query += ' AND i.product_id = ?'; params.push(product_id); }
        query += ' ORDER BY i.updated_at DESC';

        res.json({ inventory: await db.prepare(query).all(...params) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
});

// ─── POST /api/scm/inventory/adjust – Stock adjustment ───────────────────────
router.post('/adjust', authMiddleware, requirePermission('inventory:create'), async (req, res) => {
    try {
        const { product_id, batch_id, partner_id, location, quantity_change, reason } = req.body;
        if (!product_id || quantity_change === undefined) return res.status(400).json({ error: 'product_id and quantity_change required' });

        // Find or create inventory record
        let inv = await db.prepare('SELECT * FROM inventory WHERE product_id = ? AND COALESCE(partner_id, \'\') = ? AND COALESCE(location, \'\') = ?')
            .get(product_id, partner_id || '', location || '');

        if (inv) {
            const newQty = Math.max(0, inv.quantity + quantity_change);
            await db.prepare("UPDATE inventory SET quantity = ?, updated_at = datetime('now') WHERE id = ?").run(newQty, inv.id);
            inv.quantity = newQty;
        } else {
            const id = uuidv4();
            const qty = Math.max(0, quantity_change);
            await db.prepare(`
        INSERT INTO inventory (id, product_id, batch_id, partner_id, location, quantity)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, product_id, batch_id || null, partner_id || null, location || '', qty);
            inv = { id, product_id, quantity: qty };
        }

        res.json({ message: 'Stock adjusted', inventory: inv });
    } catch (err) {
        console.error('Inventory adjust error:', err);
        res.status(500).json({ error: 'Failed to adjust stock' });
    }
});

// ─── GET /api/scm/inventory/alerts – Overstock/understock ────────────────────
router.get('/alerts', async (req, res) => {
    try {
        const understock = await db.prepare(`
      SELECT i.*, p.name as product_name, p.sku, pt.name as partner_name
      FROM inventory i
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN partners pt ON i.partner_id = pt.id
      WHERE i.quantity <= i.min_stock
    `).all();

        const overstock = await db.prepare(`
      SELECT i.*, p.name as product_name, p.sku, pt.name as partner_name
      FROM inventory i
      LEFT JOIN products p ON i.product_id = p.id
      LEFT JOIN partners pt ON i.partner_id = pt.id
      WHERE i.quantity >= i.max_stock
    `).all();

        res.json({
            understock: understock.map(i => ({ ...i, alert_type: 'understock', severity: i.quantity === 0 ? 'critical' : 'high' })),
            overstock: overstock.map(i => ({ ...i, alert_type: 'overstock', severity: 'medium' })),
            total_alerts: understock.length + overstock.length
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
            history = await db.prepare(`
        SELECT quantity, updated_at as date FROM inventory WHERE product_id = ? ORDER BY updated_at ASC
      `).all(product_id);
        } else {
            history = await db.prepare(`
        SELECT SUM(quantity) as quantity, date(updated_at) as date FROM inventory GROUP BY date(updated_at) ORDER BY date ASC
      `).all();
        }

        // If too few data points, create synthetic history from current state
        if (history.length < 3) {
            const current = await db.prepare('SELECT * FROM inventory ORDER BY updated_at DESC LIMIT 10').all();
            history = current.map((c, i) => ({ quantity: c.quantity + Math.floor(Math.random() * 20 - 10), date: `day-${i}` }));
        }

        const forecast = await engineClient.scmForecastInventory(history);
        res.json(forecast);
    } catch (err) {
        console.error('Forecast error:', err);
        res.status(500).json({ error: 'Failed to generate forecast' });
    }
});

module.exports = router;
