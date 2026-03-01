/**
 * Risk Intelligence Routes — Behavioral AI + Fraud Graph
 * Endpoints: 6 | Mount: /api/risk-graph
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requirePermission } = require('../auth');
const riskGraph = require('../engines/risk-graph-engine');
const { cacheMiddleware } = require('../cache');
router.use(authMiddleware);

// GET /behavior — Behavioral risk analysis
router.get('/behavior', cacheMiddleware(60), async (req, res) => {
    try {
        const shipments = await db.prepare('SELECT * FROM shipments ORDER BY created_at DESC LIMIT 200').all().catch(() => []);
        const credits = await db.prepare('SELECT * FROM carbon_credits LIMIT 100').all().catch(() => []);
        const partners = await db.prepare('SELECT * FROM partners LIMIT 50').all().catch(() => []);
        const scans = await db.prepare('SELECT * FROM scan_events ORDER BY created_at DESC LIMIT 500').all().catch(() => []);
        res.json(riskGraph.analyzeBehavior({ shipments, credits, partners, scans, routes: [] }));
    } catch (err) { res.status(500).json({ error: 'Behavioral analysis failed' }); }
});

// POST /fraud-graph — Build fraud graph from entities
router.post('/fraud-graph', requirePermission('risk:view'), async (req, res) => {
    try { res.json(riskGraph.buildFraudGraph(req.body.entities || [], req.body.relationships || [])); }
    catch (err) { res.status(500).json({ error: 'Fraud graph failed' }); }
});

// GET /hidden-links — Detect hidden connections
router.get('/hidden-links', cacheMiddleware(120), async (req, res) => {
    try {
        const entities = await db.prepare('SELECT id, name FROM partners LIMIT 50').all().catch(() => []);
        const shipments = await db.prepare('SELECT * FROM shipments ORDER BY created_at DESC LIMIT 200').all().catch(() => []);
        const scans = await db.prepare('SELECT * FROM scan_events ORDER BY created_at DESC LIMIT 500').all().catch(() => []);
        res.json(riskGraph.detectHiddenLinks(entities, shipments, scans));
    } catch (err) { res.status(500).json({ error: 'Link analysis failed' }); }
});

// GET /cross-tenant — Cross-tenant fraud patterns (SA only)
router.get('/cross-tenant', requirePermission('admin:manage'), cacheMiddleware(120), async (req, res) => {
    try {
        const orgs = await db.prepare('SELECT * FROM organizations WHERE status = ?').all('active').catch(() => []);
        const tenants = [];
        for (const o of orgs) {
            const scanCount = await db.prepare('SELECT COUNT(*) as c FROM scan_events WHERE product_id IN (SELECT id FROM products WHERE org_id = ?)').get(o.id).catch(() => ({ c: 0 }));
            const fraudCount = await db.prepare('SELECT COUNT(*) as c FROM fraud_alerts WHERE product_id IN (SELECT id FROM products WHERE org_id = ?)').get(o.id).catch(() => ({ c: 0 }));
            const productCount = await db.prepare('SELECT COUNT(*) as c FROM products WHERE org_id = ?').get(o.id).catch(() => ({ c: 0 }));
            const recentScans = await db.prepare('SELECT geo_country, result, fraud_score FROM scan_events WHERE product_id IN (SELECT id FROM products WHERE org_id = ?) ORDER BY scanned_at DESC LIMIT 50').all(o.id).catch(() => []);
            tenants.push({
                id: o.id, name: o.name, slug: o.slug, plan: o.plan,
                scan_count: scanCount.c, fraud_count: fraudCount.c, product_count: productCount.c,
                recent_scans: recentScans, feature_flags: typeof o.feature_flags === 'string' ? JSON.parse(o.feature_flags || '{}') : o.feature_flags,
            });
        }
        res.json(riskGraph.detectCrossTenantPatterns(tenants));
    } catch (err) { res.status(500).json({ error: 'Cross-tenant analysis failed' }); }
});

// GET /patterns — Available behavioral patterns
router.get('/patterns', (req, res) => { res.json({ patterns: riskGraph.getPatterns() }); });

// GET /dashboard — Risk intelligence overview
router.get('/dashboard', cacheMiddleware(60), async (req, res) => {
    try {
        const shipments = await db.prepare('SELECT * FROM shipments ORDER BY created_at DESC LIMIT 100').all().catch(() => []);
        const credits = await db.prepare('SELECT * FROM carbon_credits LIMIT 50').all().catch(() => []);
        const behavior = riskGraph.analyzeBehavior({ shipments, credits, partners: [], scans: [], routes: [] });
        res.json({ title: 'Risk Intelligence Dashboard', behavior, total_shipments: shipments.length, total_credits: credits.length });
    } catch (err) { res.status(500).json({ error: 'Dashboard failed' }); }
});
// GET /fraud-feed — Global fraud alerts feed (SA only)
router.get('/fraud-feed', requirePermission('admin:manage'), async (req, res) => {
    try {
        const alerts = await db.prepare(`
            SELECT fa.id, fa.alert_type, fa.severity, fa.description, fa.status, fa.created_at, fa.details,
                   p.name as product_name, p.sku, p.category, p.org_id,
                   o.name as tenant_name, o.slug as tenant_slug
            FROM fraud_alerts fa
            LEFT JOIN products p ON fa.product_id = p.id
            LEFT JOIN organizations o ON p.org_id = o.id
            ORDER BY fa.created_at DESC LIMIT 100
        `).all().catch(() => []);

        // Build executive summary
        const total = alerts.length;
        const open = alerts.filter(a => a.status === 'open').length;
        const investigating = alerts.filter(a => a.status === 'investigating').length;
        const critical = alerts.filter(a => a.severity === 'critical').length;
        const high = alerts.filter(a => a.severity === 'high').length;

        // Top risk tenants
        const tenantMap = {};
        alerts.forEach(a => {
            const t = a.tenant_name || 'Unknown';
            tenantMap[t] = (tenantMap[t] || 0) + 1;
        });
        const topTenants = Object.entries(tenantMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name, count]) => ({ name, count, pct: Math.round(count / total * 100) }));

        // Type breakdown
        const typeMap = {};
        alerts.forEach(a => { typeMap[a.alert_type] = (typeMap[a.alert_type] || 0) + 1; });
        const topTypes = Object.entries(typeMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([type, count]) => ({ type, count }));

        // Generate executive insights
        const insights = [];
        if (critical > 0) insights.push({ level: 'critical', msg: `${critical} CRITICAL alert${critical > 1 ? 's' : ''} require immediate action — including ${alerts.filter(a => a.severity === 'critical').map(a => a.alert_type).filter((v, i, a) => a.indexOf(v) === i).join(', ')}` });
        if (open > total * 0.5) insights.push({ level: 'warning', msg: `${Math.round(open / total * 100)}% of alerts are Open — resource allocation for investigation needed` });
        if (topTenants[0]?.pct > 30) insights.push({ level: 'warning', msg: `${topTenants[0].name} accounts for ${topTenants[0].pct}% of total alerts — dedicated tenant audit recommended` });
        const counterfeitCount = typeMap['counterfeit'] || 0;
        if (counterfeitCount >= 3) insights.push({ level: 'danger', msg: `${counterfeitCount} counterfeit cases detected — recommend strengthening QR verification` });
        const geoAnom = typeMap['geo_anomaly'] || 0;
        if (geoAnom >= 2) insights.push({ level: 'warning', msg: `${geoAnom} Geo Anomaly — products detected in unauthorized or sanctioned regions` });
        const sanctions = typeMap['sanctions_risk'] || 0;
        if (sanctions > 0) insights.push({ level: 'critical', msg: `${sanctions} Sanctions Risk — OFAC/EU sanctions violation detected, notify Compliance Officer immediately` });
        if (insights.length === 0) insights.push({ level: 'info', msg: 'No critical alerts — system is operating normally' });

        res.json({
            alerts,
            summary: { total, open, investigating, resolved: total - open - investigating, critical, high, medium: total - critical - high },
            topTenants, topTypes, insights,
        });
    } catch (err) { res.status(500).json({ error: 'Fraud feed failed' }); }
});

// GET /risk-analytics — Aggregated analytics for Cases, Analytics, Benchmark tabs
router.get('/risk-analytics', cacheMiddleware(120), requirePermission('admin:manage'), async (req, res) => {
    try {
        // ── Run ALL independent queries in parallel ──
        const [suspRows, regionRows, catRows, patternRows, benchRows] = await Promise.all([

            // Suspicious Tenants (Cases tab) — with top patterns embedded
            db.prepare(`
                SELECT o.id, o.name, o.slug, o.plan,
                       COUNT(fa.id) as fraud_count,
                       SUM(CASE WHEN fa.status='open' THEN 1 ELSE 0 END) as open_count,
                       SUM(CASE WHEN fa.severity='critical' THEN 1 ELSE 0 END) as critical_count,
                       AVG(CASE WHEN se.fraud_score IS NOT NULL THEN se.fraud_score ELSE 0 END) as avg_fraud_score,
                       COUNT(DISTINCT fa.alert_type) as pattern_types
                FROM organizations o
                LEFT JOIN products p ON p.org_id = o.id
                LEFT JOIN fraud_alerts fa ON fa.product_id = p.id
                LEFT JOIN scan_events se ON se.product_id = p.id AND se.result IN ('suspicious','failed')
                WHERE o.status = 'active'
                GROUP BY o.id, o.name, o.slug, o.plan
                HAVING COUNT(fa.id) > 0
                ORDER BY fraud_count DESC
                LIMIT 20
            `).all().catch(() => []),

            // Risk by Region (Analytics tab)
            db.prepare(`
                SELECT geo_country, COUNT(*) as total,
                       SUM(CASE WHEN result IN ('suspicious','failed') THEN 1 ELSE 0 END) as risky
                FROM scan_events WHERE geo_country IS NOT NULL
                GROUP BY geo_country ORDER BY risky DESC LIMIT 20
            `).all().catch(() => []),

            // Risk by Industry / Category — simple single-join (avoids temp file issues)
            db.prepare(`
                SELECT p.category, COUNT(fa.id) as fraud_count, 0 as scan_count
                FROM products p
                LEFT JOIN fraud_alerts fa ON fa.product_id = p.id
                WHERE p.category IS NOT NULL
                GROUP BY p.category ORDER BY fraud_count DESC LIMIT 10
            `).all().catch(() => []),

            // Fraud Pattern Clustering
            db.prepare(`
                SELECT alert_type, COUNT(*) as incidents,
                       SUM(CASE WHEN severity='critical' THEN 1 ELSE 0 END) as critical,
                       SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) as open_count
                FROM fraud_alerts
                GROUP BY alert_type ORDER BY incidents DESC LIMIT 15
            `).all().catch(() => []),

            // Tenant Benchmark Heatmap — simplified, limited
            db.prepare(`
                SELECT o.name, o.slug,
                       COUNT(DISTINCT se.id) as scan_count,
                       SUM(CASE WHEN se.result IN ('suspicious','failed') THEN 1 ELSE 0 END) as bad_scans,
                       COUNT(DISTINCT fa.id) as fraud_count,
                       AVG(ts.score) as avg_trust
                FROM organizations o
                LEFT JOIN products p ON p.org_id = o.id
                LEFT JOIN scan_events se ON se.product_id = p.id
                LEFT JOIN fraud_alerts fa ON fa.product_id = p.id
                LEFT JOIN trust_scores ts ON ts.product_id = p.id
                WHERE o.status = 'active'
                GROUP BY o.name, o.slug
                ORDER BY fraud_count DESC
                LIMIT 15
            `).all().catch(() => []),
        ]);

        // ── Process Suspicious Tenants ──
        const suspiciousTenants = suspRows.map(t => ({
            ...t,
            risk_score: Math.min(99, Math.round(
                t.critical_count * 15 + t.open_count * 5 + t.fraud_count * 2 + (t.avg_fraud_score || 0) * 30
            )),
            top_patterns: []
        }));

        // ── Process Regions ──
        const regionMap = {
            VN: 'Asia-Pacific', SG: 'Asia-Pacific', TH: 'Asia-Pacific', JP: 'Asia-Pacific', KR: 'Asia-Pacific',
            CN: 'Asia-Pacific', IN: 'Asia-Pacific', AU: 'Asia-Pacific', KH: 'Asia-Pacific',
            DE: 'Europe', FR: 'Europe', GB: 'Europe', NL: 'Europe', CH: 'Europe', IT: 'Europe',
            US: 'North America', AE: 'Middle East', IR: 'Middle East'
        };
        const regions = {};
        regionRows.forEach(r => {
            const reg = regionMap[r.geo_country] || 'Other';
            if (!regions[reg]) regions[reg] = { total: 0, risky: 0 };
            regions[reg].total += parseInt(r.total);
            regions[reg].risky += parseInt(r.risky);
        });
        const riskByRegion = Object.entries(regions)
            .map(([name, d]) => ({ name, total: d.total, risky: d.risky, pct: Math.round(d.risky / (d.total || 1) * 100) }))
            .sort((a, b) => b.risky - a.risky);

        // ── Process Heatmap ──
        const heatmap = benchRows.map(t => ({
            name: t.name, industry: '—',
            scans: parseInt(t.scan_count || 0),
            dupRate: t.scan_count ? Math.round(parseInt(t.bad_scans || 0) / parseInt(t.scan_count) * 1000) / 10 : 0,
            fraudCount: parseInt(t.fraud_count || 0),
            avgTrust: t.avg_trust ? Math.round(parseFloat(t.avg_trust)) : 0,
            tier: parseInt(t.fraud_count || 0) >= 8 ? 'High' : parseInt(t.fraud_count || 0) >= 3 ? 'Medium' : 'Low',
        })).sort((a, b) => b.fraudCount - a.fraudCount);

        res.json({
            suspiciousTenants, riskByRegion, riskByCategory: catRows,
            fraudPatterns: patternRows, heatmap,
        });
    } catch (err) { console.error('risk-analytics err:', err); res.status(500).json({ error: 'Risk analytics failed' }); }
});

module.exports = router;

