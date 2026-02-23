/**
 * Carbon & ESG Routes v3.0 — Cross-Cutting ESG Governance Intelligence
 * Product carbon passports, partner ESG leaderboard, GRI reporting,
 * Risk factor mapping, regulatory alignment, maturity assessment
 * 
 * Endpoints: 11 (5 original + 6 new v3.0)
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const engineClient = require('../engines/engine-client');
const carbonEngine = require('../engines/carbon-engine');
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
router.post('/offset', requirePermission('esg:manage'), async (req, res) => {
    try {
        const { offset_amount, offset_type, certificate_id, provider, cost } = req.body;
        if (!offset_amount || offset_amount <= 0) return res.status(400).json({ error: 'Valid offset_amount required' });

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

// ═══════════════════════════════════════════════════════════════════════════════
// v3.0 ENDPOINTS — Cross-Cutting ESG Governance Intelligence
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /api/scm/carbon/risk-factors — Carbon → Risk factor mapping ────────
router.get('/risk-factors', cacheMiddleware(120), async (req, res) => {
    try {
        const products = await db.prepare('SELECT * FROM products LIMIT 100').all();
        const shipments = await db.prepare('SELECT * FROM shipments').all();
        const events = await db.prepare('SELECT * FROM supply_chain_events').all();
        const partners = await db.prepare('SELECT * FROM partners').all();
        const violations = await db.prepare('SELECT * FROM sla_violations').all();

        const scopeData = await engineClient.carbonAggregate(products, shipments, events);
        const leaderboard = await engineClient.carbonLeaderboard(partners, shipments, violations);
        const riskFactors = carbonEngine.calculateRiskFactors(scopeData, leaderboard);

        res.json(riskFactors);
    } catch (err) {
        console.error('Carbon risk factors error:', err);
        res.status(500).json({ error: 'Carbon risk factor analysis failed' });
    }
});

// ─── GET /api/scm/carbon/regulatory — Regulatory alignment status ───────────
router.get('/regulatory', cacheMiddleware(120), async (req, res) => {
    try {
        const products = await db.prepare('SELECT * FROM products LIMIT 100').all();
        const shipments = await db.prepare('SELECT * FROM shipments').all();
        const events = await db.prepare('SELECT * FROM supply_chain_events').all();
        const partners = await db.prepare('SELECT * FROM partners').all();
        const violations = await db.prepare('SELECT * FROM sla_violations').all();

        const scopeData = await engineClient.carbonAggregate(products, shipments, events);
        const leaderboard = await engineClient.carbonLeaderboard(partners, shipments, violations);
        const offsets = (await db.prepare("SELECT COUNT(*) as c FROM evidence_items WHERE entity_type = 'carbon_offset'").get())?.c || 0;

        const alignment = carbonEngine.assessRegulatory(scopeData, leaderboard, offsets);

        res.json({
            title: 'Regulatory Alignment Assessment (v3.0)',
            checked_at: new Date().toISOString(),
            total_frameworks: alignment.length,
            ready: alignment.filter(r => r.readiness === 'ready').length,
            partial: alignment.filter(r => r.readiness === 'partial').length,
            frameworks: alignment
        });
    } catch (err) {
        console.error('Regulatory alignment error:', err);
        res.status(500).json({ error: 'Regulatory alignment assessment failed' });
    }
});

// ─── GET /api/scm/carbon/maturity — Carbon maturity level ───────────────────
router.get('/maturity', async (req, res) => {
    try {
        const products = (await db.prepare('SELECT COUNT(*) as c FROM products').get())?.c || 0;
        const offsets = (await db.prepare("SELECT COUNT(*) as c FROM evidence_items WHERE entity_type = 'carbon_offset'").get())?.c || 0;
        const partners = (await db.prepare('SELECT COUNT(*) as c FROM partners').get())?.c || 0;

        // Detect implemented features
        const features = ['scope_calculation']; // Always have this
        if (offsets > 0) features.push('offset_recording');
        features.push('gri_reporting'); // Always available
        features.push('blockchain_anchor'); // Always available via integrity module
        if (partners > 0) features.push('partner_esg_scoring');
        // Level 3
        features.push('risk_integration'); // v2.0 added this
        // cross_tenant_benchmark is SA-only feature, check if more than 1 org
        const orgs = (await db.prepare('SELECT COUNT(*) as c FROM organizations').get())?.c || 0;
        if (orgs > 1) features.push('cross_tenant_benchmark');

        const maturity = carbonEngine.assessMaturity(features);

        res.json({
            ...maturity,
            features_detected: features,
            products_count: products,
            offsets_count: offsets,
            partners_count: partners,
            eas_version: '3.0'
        });
    } catch (err) {
        console.error('Carbon maturity error:', err);
        res.status(500).json({ error: 'Carbon maturity assessment failed' });
    }
});

// ─── GET /api/scm/carbon/governance-flow — Governance flow definition ───────
router.get('/governance-flow', (req, res) => {
    try {
        const flow = carbonEngine.getGovernanceFlow();
        res.json(flow);
    } catch (err) {
        console.error('Governance flow error:', err);
        res.status(500).json({ error: 'Governance flow retrieval failed' });
    }
});

// ─── GET /api/scm/carbon/role-matrix — Role × Carbon permission matrix ──────
router.get('/role-matrix', (req, res) => {
    try {
        const matrix = carbonEngine.getRoleMatrix();
        res.json({
            ...matrix,
            current_user_role: req.user?.role || 'viewer',
            eas_version: '3.0'
        });
    } catch (err) {
        console.error('Role matrix error:', err);
        res.status(500).json({ error: 'Role matrix retrieval failed' });
    }
});

// ─── GET /api/scm/carbon/benchmark — Cross-tenant industry benchmark (SA) ───
router.get('/benchmark', cacheMiddleware(180), async (req, res) => {
    try {
        const products = await db.prepare('SELECT * FROM products LIMIT 100').all();
        const shipments = await db.prepare('SELECT * FROM shipments').all();
        const events = await db.prepare('SELECT * FROM supply_chain_events').all();

        const scopeData = await engineClient.carbonAggregate(products, shipments, events);

        // Industry benchmark (simulated cross-tenant)
        const industryBenchmarks = {
            'F&B': { avg_kgCO2e: 8.5, best: 3.2, worst: 22.0, median_grade: 'B' },
            'Electronics': { avg_kgCO2e: 35.0, best: 12.0, worst: 85.0, median_grade: 'C' },
            'Fashion': { avg_kgCO2e: 18.0, best: 6.0, worst: 45.0, median_grade: 'B' },
            'Healthcare': { avg_kgCO2e: 12.0, best: 4.5, worst: 30.0, median_grade: 'B' },
            'Industrial': { avg_kgCO2e: 55.0, best: 20.0, worst: 120.0, median_grade: 'D' },
            'Agriculture': { avg_kgCO2e: 5.0, best: 1.5, worst: 15.0, median_grade: 'A' }
        };

        // Calculate per-category stats from own data
        const categoryStats = {};
        for (const p of (scopeData.product_rankings || [])) {
            const cat = p.category || 'General';
            if (!categoryStats[cat]) categoryStats[cat] = { products: 0, total_kgCO2e: 0, grades: [] };
            categoryStats[cat].products++;
            categoryStats[cat].total_kgCO2e += p.total;
            categoryStats[cat].grades.push(p.grade);
        }

        const comparison = Object.entries(categoryStats).map(([cat, stats]) => {
            const avg = stats.total_kgCO2e / stats.products;
            const benchmark = industryBenchmarks[cat] || industryBenchmarks['F&B'];
            return {
                category: cat,
                your_avg_kgCO2e: Math.round(avg * 100) / 100,
                industry_avg_kgCO2e: benchmark.avg_kgCO2e,
                industry_best: benchmark.best,
                industry_worst: benchmark.worst,
                performance: avg <= benchmark.best ? 'top_performer' : avg <= benchmark.avg_kgCO2e ? 'above_average' : avg <= benchmark.worst ? 'below_average' : 'critical',
                gap_pct: Math.round((avg - benchmark.avg_kgCO2e) / benchmark.avg_kgCO2e * 100)
            };
        });

        res.json({
            title: 'Industry Carbon Benchmark (v3.0)',
            your_total_kgCO2e: scopeData.total_emissions_kgCO2e,
            your_products: scopeData.products_assessed,
            industry_benchmarks: industryBenchmarks,
            your_comparison: comparison,
            insight: comparison.some(c => c.performance === 'top_performer') ? '✅ Top performer in some categories' :
                comparison.some(c => c.performance === 'above_average') ? '🟡 Above industry average' :
                    '⚠️ Below industry average — improvement needed'
        });
    } catch (err) {
        console.error('Carbon benchmark error:', err);
        res.status(500).json({ error: 'Carbon benchmark analysis failed' });
    }
});

module.exports = router;
