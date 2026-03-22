/**
 * Network Intelligence API v1.0 (Cross-Org)
 * GET  /api/network/supplier/:name  — supplier intelligence
 * GET  /api/network/search          — search suppliers
 * GET  /api/network/benchmarks      — industry benchmarks
 * POST /api/network/refresh         — refresh data (admin)
 */
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth');
const engine = require('../engines/core/network-intelligence-engine');

router.use(authMiddleware);

router.get('/supplier/:name', async function (req, res) {
    try {
        const intel = await engine.getSupplierIntelligence(decodeURIComponent(req.params.name));
        if (!intel) return res.json({ message: 'No network data available for this supplier', data: null });
        res.json({ intelligence: intel });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load intelligence' });
    }
});

router.get('/search', async function (req, res) {
    try {
        if (!req.query.q) return res.status(400).json({ error: 'query parameter q required' });
        const results = await engine.searchSuppliers(req.query.q, { limit: parseInt(req.query.limit) || 20 });
        res.json({ suppliers: results, count: results.length });
    } catch (err) {
        res.status(500).json({ error: 'Search failed' });
    }
});

router.get('/benchmarks', async function (req, res) {
    try {
        const benchmarks = await engine.getIndustryBenchmarks();
        res.json({ benchmarks: benchmarks });
    } catch (err) {
        res.status(500).json({ error: 'Failed to load benchmarks' });
    }
});

router.post('/refresh', async function (req, res) {
    try {
        const result = await engine.refreshIntelligence();
        res.json({ status: 'refreshed', duration_ms: result.duration_ms, suppliers: result.row_count });
    } catch (err) {
        res.status(500).json({ error: 'Refresh failed: ' + err.message });
    }
});

module.exports = router;
