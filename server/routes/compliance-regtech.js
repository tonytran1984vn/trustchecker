/**
 * Compliance RegTech Routes — Auto-reports, Jurisdiction, Regulatory Diff
 * Endpoints: 6 | Mount: /api/compliance-regtech
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requirePermission } = require('../auth');
const compliance = require('../engines/compliance-engine');
const { cacheMiddleware } = require('../cache');
router.use(authMiddleware);

// GET /report — Auto-generate compliance report
router.get('/report', cacheMiddleware(120), async (req, res) => {
    try {
        const scope = await db.prepare('SELECT * FROM carbon_simulations LIMIT 1').get().catch(() => null);
        const credits = await db.prepare('SELECT * FROM carbon_credits').all().catch(() => []);
        const products = await db.prepare('SELECT COUNT(*) as cnt FROM products').get().catch(() => ({ cnt: 0 }));
        const partners = await db.prepare('SELECT COUNT(*) as cnt FROM partners').get().catch(() => ({ cnt: 0 }));
        const report = compliance.generateComplianceReport({
            scope_1: 150, scope_2: 80, scope_3: 420, total_emissions: 650,
            products_count: products.cnt, partners_count: partners.cnt,
            region: req.query.region || 'GLOBAL', credits, offsets: [],
            has_blockchain: true, has_gri: true, tenant_id: req.user?.org_id
        });
        res.json(report);
    } catch (err) { res.status(500).json({ error: 'Report generation failed' }); }
});

// GET /frameworks — Applicable frameworks for region
router.get('/frameworks', (req, res) => {
    const region = req.query.region || 'GLOBAL';
    const exports = (req.query.exports || '').split(',').filter(Boolean);
    res.json(compliance.getApplicableFrameworks(region, exports));
});

// GET /diff — Regulatory diff between snapshots
router.get('/diff', async (req, res) => {
    try {
        // Generate current vs baseline (simulated diff)
        const current = compliance.generateComplianceReport({ scope_1: 150, scope_2: 80, scope_3: 420, total_emissions: 650, products_count: 10, partners_count: 5, region: req.query.region || 'GLOBAL', has_blockchain: true, has_gri: true, tenant_id: req.user?.org_id });
        const baseline = compliance.generateComplianceReport({ scope_1: 100, scope_2: null, scope_3: null, total_emissions: 100, products_count: 5, partners_count: 2, region: req.query.region || 'GLOBAL', has_blockchain: false, has_gri: false, tenant_id: req.user?.org_id });
        res.json(compliance.trackRegulatoryDiff(baseline, current));
    } catch (err) { res.status(500).json({ error: 'Diff tracking failed' }); }
});

// GET /gaps — Compliance gaps
router.get('/gaps', cacheMiddleware(120), async (req, res) => {
    try {
        const report = compliance.generateComplianceReport({ scope_1: 150, scope_2: 80, scope_3: 420, total_emissions: 650, products_count: 10, partners_count: 5, region: req.query.region || 'GLOBAL', has_blockchain: true, has_gri: true, tenant_id: req.user?.org_id });
        res.json({ title: 'Compliance Gaps', total_gaps: report.gaps.length, gaps: report.gaps, overall_readiness: report.overall_readiness_pct });
    } catch (err) { res.status(500).json({ error: 'Gap analysis failed' }); }
});

// GET /jurisdictions — Available jurisdictions
router.get('/jurisdictions', (req, res) => { res.json({ jurisdictions: compliance.getJurisdictions(), frameworks: compliance.getFrameworks() }); });

// GET /cbam-status — CBAM impact assessment
router.get('/cbam-status', (req, res) => {
    const region = req.query.region || req.query.origin || 'GLOBAL';
    const exports = (req.query.exports || 'EU').split(',');
    const fw = compliance.getApplicableFrameworks(region, exports);
    res.json({ title: 'CBAM Impact Assessment', cbam_affected: fw.cbam_affected, region, export_destinations: exports, applicable_frameworks: fw.applicable_frameworks.length, total_requirements: fw.total_requirements });
});

module.exports = router;
