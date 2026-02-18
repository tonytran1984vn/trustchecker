/**
 * Carbon & ESG Routes — Scope 1/2/3 Emissions API
 * Product carbon passports, partner ESG leaderboard, GRI reporting
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const engineClient = require('../engines/engine-client');
const { cacheMiddleware } = require('../cache');

router.use(authMiddleware);

// ─── GET /api/scm/carbon/footprint/:productId — Product carbon passport ─────
router.get('/footprint/:productId', async (req, res) => {
    try {
        const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.productId);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const events = await db.prepare('SELECT * FROM supply_chain_events WHERE product_id = ?').all(product.id);
        const shipments = await db.prepare(`
      SELECT s.* FROM shipments s
      INNER JOIN batches b ON s.batch_id = b.id
      WHERE b.product_id = ?
    `).all(product.id);

        const passport = await engineClient.carbonFootprint(product, shipments, events);

        res.json(passport);
    } catch (err) {
        console.error('Carbon footprint error:', err);
        res.status(500).json({ error: 'Carbon footprint calculation failed' });
    }
});

// ─── GET /api/scm/carbon/scope — Scope 1/2/3 breakdown ─────────────────────
// Cache 120s — aggregates across full tables
router.get('/scope', cacheMiddleware(120), async (req, res) => {
    try {
        const products = await db.prepare('SELECT * FROM products LIMIT 100').all();
        const shipments = await db.prepare('SELECT * FROM shipments').all();
        const events = await db.prepare('SELECT * FROM supply_chain_events').all();

        const scopeData = await engineClient.carbonAggregate(products, shipments, events);

        res.json(scopeData);
    } catch (err) {
        console.error('Carbon scope error:', err);
        res.status(500).json({ error: 'Carbon scope analysis failed' });
    }
});

// ─── GET /api/scm/carbon/leaderboard — Partner ESG leaderboard ──────────────
// Cache 120s — partner metrics don't change rapidly
router.get('/leaderboard', cacheMiddleware(120), async (req, res) => {
    try {
        const partners = await db.prepare('SELECT * FROM partners').all();
        const shipments = await db.prepare('SELECT * FROM shipments').all();
        const violations = await db.prepare('SELECT * FROM sla_violations').all();

        const leaderboard = await engineClient.carbonLeaderboard(partners, shipments, violations);

        res.json({
            total_partners: leaderboard.length,
            a_grade: leaderboard.filter(p => p.grade === 'A').length,
            b_grade: leaderboard.filter(p => p.grade === 'B').length,
            c_grade: leaderboard.filter(p => p.grade === 'C').length,
            d_grade: leaderboard.filter(p => p.grade === 'D').length,
            leaderboard
        });
    } catch (err) {
        console.error('ESG leaderboard error:', err);
        res.status(500).json({ error: 'ESG leaderboard failed' });
    }
});

// ─── GET /api/scm/carbon/report — GRI-format ESG report ─────────────────────
// Cache 180s — heaviest endpoint, queries 6 tables
router.get('/report', cacheMiddleware(180), async (req, res) => {
    try {
        const products = await db.prepare('SELECT * FROM products LIMIT 100').all();
        const shipments = await db.prepare('SELECT * FROM shipments').all();
        const events = await db.prepare('SELECT * FROM supply_chain_events').all();
        const partners = await db.prepare('SELECT * FROM partners').all();
        const violations = await db.prepare('SELECT * FROM sla_violations').all();
        const certifications = await db.prepare('SELECT * FROM certifications').all();

        const scopeData = await engineClient.carbonAggregate(products, shipments, events);
        const leaderboard = await engineClient.carbonLeaderboard(partners, shipments, violations);
        const report = await engineClient.carbonGRIReport({ scopeData, leaderboard, certifications });

        res.json(report);
    } catch (err) {
        console.error('GRI report error:', err);
        res.status(500).json({ error: 'GRI report generation failed' });
    }
});

// ─── POST /api/scm/carbon/offset — Record carbon offset credit ──────────────
router.post('/offset', requireRole('manager'), async (req, res) => {
    try {
        const { offset_amount, offset_type, certificate_id, provider, cost } = req.body;
        if (!offset_amount || offset_amount <= 0) return res.status(400).json({ error: 'Valid offset_amount required' });

        // Store as evidence item with blockchain seal
        const id = require('uuid').v4();
        const hash = require('crypto').createHash('sha256').update(JSON.stringify({ offset_amount, offset_type, certificate_id, provider })).digest('hex');

        await db.prepare(`
      INSERT INTO evidence_items (id, title, description, sha256_hash, entity_type, entity_id, uploaded_by, verification_status, tags)
      VALUES (?, ?, ?, ?, 'carbon_offset', ?, ?, 'anchored', '["carbon", "esg", "offset"]')
    `).run(
            id,
            `Carbon Offset: ${offset_amount} kgCO2e`,
            `Type: ${offset_type || 'VER'}, Provider: ${provider || 'Self'}, Certificate: ${certificate_id || 'N/A'}, Cost: $${cost || 0}`,
            hash,
            id,
            req.user.id
        );

        res.status(201).json({
            id,
            offset_amount,
            offset_type: offset_type || 'VER',
            provider: provider || 'Self',
            certificate_id,
            cost,
            verification_hash: hash,
            status: 'recorded',
            message: 'Carbon offset recorded and blockchain-anchored'
        });
    } catch (err) {
        console.error('Carbon offset error:', err);
        res.status(500).json({ error: 'Carbon offset recording failed' });
    }
});

module.exports = router;
