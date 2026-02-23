/**
 * SCM Leak Monitoring Routes (FR-LEAK-001 → 004)
 * Marketplace scanning, unauthorized sales detection, gray market alerts
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const { eventBus } = require('../events');

const router = express.Router();


// GOV-1: All routes require authentication
router.use(authMiddleware);

const PLATFORMS = ['Shopee', 'Lazada', 'Amazon', 'eBay', 'Alibaba'];

// ─── POST /api/scm/leaks/scan – Trigger marketplace scan ────────────────────
router.post('/scan', authMiddleware, requirePermission('leak_monitor:create'), async (req, res) => {
    try {
        const { product_id, platforms } = req.body;
        const scanPlatforms = platforms || PLATFORMS;

        const product = product_id ? await db.prepare('SELECT * FROM products WHERE id = ?').get(product_id) : null;
        const products = product ? [product] : await db.prepare('SELECT * FROM products WHERE status = \'active\' LIMIT 20').all();

        // Get authorized regions for products
        const authorizedRegions = ['VN', 'SG', 'US', 'JP'];
        const results = [];

        for (const p of products) {
            for (const platform of scanPlatforms) {
                // Simulated crawler scan
                const detected = _simulateMarketplaceScan(p, platform, authorizedRegions);
                for (const leak of detected) {
                    const id = uuidv4();
                    await db.prepare(`
            INSERT INTO leak_alerts (id, product_id, platform, url, listing_title, listing_price, authorized_price, region_detected, authorized_regions, leak_type, risk_score)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, p.id, platform, leak.url, leak.listing_title, leak.listing_price, leak.authorized_price, leak.region, JSON.stringify(authorizedRegions), leak.type, leak.risk_score);
                    results.push({ id, ...leak, product_name: p.name });
                }
            }
        }

        eventBus.emitEvent('LeakScan', { products_scanned: products.length, platforms: scanPlatforms, leaks_found: results.length });

        res.json({
            scan_id: uuidv4(),
            products_scanned: products.length,
            platforms_scanned: scanPlatforms,
            leaks_found: results.length,
            results,
            scanned_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('Leak scan error:', err);
        res.status(500).json({ error: 'Scan failed' });
    }
});

// ─── GET /api/scm/leaks/alerts – Leak alerts ────────────────────────────────
router.get('/alerts', async (req, res) => {
    try {
        const { status = 'open', platform, limit = 50 } = req.query;
        let query = `
      SELECT la.*, p.name as product_name, p.sku
      FROM leak_alerts la
      LEFT JOIN products p ON la.product_id = p.id
      WHERE la.status = ?
    `;
        const params = [status];
        if (platform) { query += ' AND la.platform = ?'; params.push(platform); }
        query += ' ORDER BY la.risk_score DESC, la.created_at DESC LIMIT ?';
        params.push(Math.min(Number(limit) || 50, 200));

        const alerts = await db.prepare(query).all(...params);

        const byPlatform = {};
        alerts.forEach(a => {
            byPlatform[a.platform] = (byPlatform[a.platform] || 0) + 1;
        });

        const byType = {};
        alerts.forEach(a => {
            byType[a.leak_type] = (byType[a.leak_type] || 0) + 1;
        });

        res.json({ alerts, total: alerts.length, by_platform: byPlatform, by_type: byType });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch leak alerts' });
    }
});

// ─── GET /api/scm/leaks/stats – Leak statistics ─────────────────────────────
router.get('/stats', async (req, res) => {
    try {
        const total = (await db.prepare('SELECT COUNT(*) as c FROM leak_alerts').get())?.c || 0;
        const open = (await db.prepare("SELECT COUNT(*) as c FROM leak_alerts WHERE status = 'open'").get())?.c || 0;
        const resolved = (await db.prepare("SELECT COUNT(*) as c FROM leak_alerts WHERE status = 'resolved'").get())?.c || 0;

        const byPlatform = await db.prepare('SELECT platform, COUNT(*) as count, AVG(risk_score) as avg_risk FROM leak_alerts GROUP BY platform ORDER BY count DESC').all();
        const byType = await db.prepare('SELECT leak_type, COUNT(*) as count FROM leak_alerts GROUP BY leak_type').all();
        const topProducts = await db.prepare(`
      SELECT la.product_id, p.name as product_name, COUNT(*) as leak_count, AVG(la.risk_score) as avg_risk
      FROM leak_alerts la LEFT JOIN products p ON la.product_id = p.id
      GROUP BY la.product_id ORDER BY leak_count DESC LIMIT 10
    `).all();

        // Distributor risk scoring based on leaks
        const distributorRisk = await db.prepare(`
      SELECT pt.id, pt.name, COUNT(la.id) as leak_count, AVG(la.risk_score) as avg_risk
      FROM partners pt
      LEFT JOIN supply_chain_events sce ON pt.id = sce.partner_id
      LEFT JOIN leak_alerts la ON sce.product_id = la.product_id
      WHERE la.id IS NOT NULL
      GROUP BY pt.id
      ORDER BY leak_count DESC
    `).all();

        res.json({
            total, open, resolved,
            by_platform: byPlatform,
            by_type: byType,
            top_products: topProducts,
            distributor_risk: distributorRisk
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// ── Simulated marketplace crawler ────────────────────────────────────────────
function _simulateMarketplaceScan(product, platform, authorizedRegions) {
    const leaks = [];
    const rand = Math.random();

    // ~30% chance of finding a leak
    if (rand < 0.3) {
        const leakTypes = [
            { type: 'unauthorized_region', regions: ['CN', 'TH', 'KR', 'IN', 'RU'] },
            { type: 'price_dumping', regions: authorizedRegions },
            { type: 'gray_market', regions: ['HK', 'TW', 'MY'] },
            { type: 'parallel_import', regions: authorizedRegions }
        ];

        const leakType = leakTypes[Math.floor(Math.random() * leakTypes.length)];
        const region = leakType.regions[Math.floor(Math.random() * leakType.regions.length)];
        const basePrice = 50 + Math.random() * 200;
        const listingPrice = leakType.type === 'price_dumping' ? basePrice * 0.4 : basePrice * (0.7 + Math.random() * 0.5);

        leaks.push({
            platform,
            url: `https://${platform.toLowerCase()}.com/item/${Math.floor(Math.random() * 9999999)}`,
            listing_title: `${product.name} - ${leakType.type === 'price_dumping' ? 'SALE' : 'Original'}`,
            listing_price: Math.round(listingPrice * 100) / 100,
            authorized_price: Math.round(basePrice * 100) / 100,
            region,
            type: leakType.type,
            risk_score: leakType.type === 'unauthorized_region' ? 0.85 : leakType.type === 'price_dumping' ? 0.9 : 0.65
        });
    }

    return leaks;
}

// ─── PUT /alerts/:id/resolve — Resolve or dismiss a leak alert ──────────────
router.put('/alerts/:id/resolve', authMiddleware, requireRole('manager'), async (req, res) => {
    try {
        const { resolution, action_taken } = req.body;
        const alert = await db.get('SELECT * FROM leak_alerts WHERE id = ?', [req.params.id]);
        if (!alert) return res.status(404).json({ error: 'Leak alert not found' });

        await db.prepare(`UPDATE leak_alerts SET status = 'resolved' WHERE id = ?`).run(req.params.id);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'LEAK_RESOLVED', 'leak_alert', req.params.id,
                JSON.stringify({ resolution: resolution || 'resolved', action_taken: action_taken || 'none', platform: alert.platform, product_id: alert.product_id }));

        res.json({ alert_id: req.params.id, status: 'resolved', resolution: resolution || 'resolved' });
    } catch (err) {
        console.error('Leak scan error:', err);
        res.status(500).json({ error: 'Failed to scan for leaks' });
    }
});

// ─── POST /alerts/:id/takedown — Generate C&D takedown notice ───────────────
router.post('/alerts/:id/takedown', authMiddleware, requireRole('manager'), async (req, res) => {
    try {
        const alert = await db.get(`
      SELECT la.*, p.name as product_name, p.sku, p.manufacturer
      FROM leak_alerts la LEFT JOIN products p ON la.product_id = p.id
      WHERE la.id = ?
    `, [req.params.id]);
        if (!alert) return res.status(404).json({ error: 'Leak alert not found' });

        const takedownId = uuidv4();
        const notice = {
            takedown_id: takedownId,
            type: 'cease_and_desist',
            platform: alert.platform,
            listing_url: alert.url,
            listing_title: alert.listing_title,
            product: { name: alert.product_name, sku: alert.sku, manufacturer: alert.manufacturer },
            violation: alert.leak_type,
            notice_text: `CEASE AND DESIST NOTICE\n\nTo: ${alert.platform} Trust & Safety Team\nRe: Unauthorized listing of "${alert.product_name}" (SKU: ${alert.sku})\nURL: ${alert.url}\n\nDear Trust & Safety Team,\n\nWe have identified an unauthorized listing of our product on your platform. This listing violates our distribution agreements and intellectual property rights.\n\nViolation Type: ${alert.leak_type.replace(/_/g, ' ').toUpperCase()}\nDetected Region: ${alert.region_detected}\nListing Price: $${alert.listing_price} (Authorized: $${alert.authorized_price})\n\nWe request immediate removal of this listing. Failure to comply may result in further legal action.\n\nGenerated by TrustChecker Anti-Counterfeiting Platform`,
            generated_at: new Date().toISOString(),
            status: 'sent'
        };

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'TAKEDOWN_SENT', 'leak_alert', req.params.id, JSON.stringify({ takedown_id: takedownId, platform: alert.platform }));

        res.json(notice);
    } catch (err) {
        console.error('Distribution analysis error:', err);
        res.status(500).json({ error: 'Failed to analyze distribution' });
    }
});

// ─── GET /trends — Leak trend analysis over time ────────────────────────────
router.get('/trends', async (req, res) => {
    try {
        const { weeks = 12 } = req.query;
        const safeWeeks = Math.max(1, Math.min(52, Math.floor(Number(weeks)) || 12));
        const weeksDaysModifier = `-${safeWeeks * 7} days`;

        const weeklyTrend = await db.all(`
      SELECT strftime('%Y-W%W', created_at) as week, COUNT(*) as count, AVG(risk_score) as avg_risk
      FROM leak_alerts
      WHERE created_at > datetime('now', ?)
      GROUP BY week ORDER BY week ASC
    `, [weeksDaysModifier]);

        const platformTrend = await db.all(`
      SELECT platform, strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM leak_alerts GROUP BY platform, month ORDER BY month ASC
    `);

        const typeTrend = await db.all(`
      SELECT leak_type, strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM leak_alerts GROUP BY leak_type, month ORDER BY month ASC
    `);

        const resolutionRate = await db.get(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved,
        ROUND(SUM(CASE WHEN status = 'resolved' THEN 1.0 ELSE 0 END) / MAX(COUNT(*), 1) * 100, 1) as rate
      FROM leak_alerts
    `);

        res.json({
            weekly_trend: weeklyTrend,
            platform_trend: platformTrend,
            type_trend: typeTrend,
            resolution_rate: resolutionRate,
            period_weeks: Number(weeks)
        });
    } catch (err) {
        console.error('Leak dashboard error:', err);
        res.status(500).json({ error: 'Failed to load leak dashboard' });
    }
});

module.exports = router;

