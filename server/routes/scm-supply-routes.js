/**
 * SCM Supply Route Engine API
 * Route definition, channel integrity rules, route breaches
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const { safeParse } = require('../utils/safe-json');

const router = express.Router();


// GOV-1: All routes require authentication
router.use(authMiddleware);

// ─── GET /api/scm/routes – List all supply routes ────────────────────────────
router.get('/routes', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user?.org_id;
        let routes;
        if (orgId) {
            routes = await db.prepare(`
                SELECT * FROM supply_routes WHERE org_id = ? ORDER BY created_at DESC
            `).all(orgId);
        } else {
            routes = await db.prepare(`
                SELECT * FROM supply_routes ORDER BY created_at DESC
            `).all();
        }
        res.json(routes.map(r => ({
            ...r,
            chain: typeof r.chain === 'string' ? JSON.parse(r.chain || '[]') : (r.chain || []),
            products: typeof r.products === 'string' ? JSON.parse(r.products || '[]') : (r.products || [])
        })));
    } catch (err) {
        console.error('List supply routes error:', err);
        res.status(500).json({ error: 'Failed to fetch supply routes' });
    }
});

// ─── POST /api/scm/routes – Create supply route (Admin only) ────────────────
router.post('/routes', authMiddleware, requireRole('admin', 'company_admin'), async (req, res) => {
    try {
        const { name, chain, products, geo_fence, status } = req.body;
        const id = uuidv4();
        const orgId = req.user?.org_id || null;
        await db.prepare(`
            INSERT INTO supply_routes (id, name, chain, products, geo_fence, status, created_by, org_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `).run(id, name, JSON.stringify(chain || []), JSON.stringify(products || []),
            geo_fence || '', status || 'active', req.user?.id || null, orgId);

        res.status(201).json({ id, name, status: 'created' });
    } catch (err) {
        console.error('Create supply route error:', err);
        res.status(500).json({ error: 'Failed to create supply route' });
    }
});

// ─── GET /api/scm/routes/:id – Get single route with breaches ────────────────
router.get('/routes/:id', authMiddleware, async (req, res) => {
    try {
        const route = await db.prepare('SELECT * FROM supply_routes WHERE id = ?').get(req.params.id);
        if (!route) return res.status(404).json({ error: 'Route not found' });

        const breaches = await db.prepare(`
            SELECT rb.*, cr.name as rule_name FROM route_breaches rb
            LEFT JOIN channel_rules cr ON rb.rule_id = cr.id
            WHERE rb.route_id = ? ORDER BY rb.created_at DESC LIMIT 50
        `).all(req.params.id);

        res.json({
            ...route,
            chain: JSON.parse(route.chain || '[]'),
            products: JSON.parse(route.products || '[]'),
            breaches: breaches.map(b => ({ ...b, details: JSON.parse(b.details || '{}') }))
        });
    } catch (err) {
        console.error('Get route error:', err);
        res.status(500).json({ error: 'Failed to fetch route' });
    }
});

// ─── PUT /api/scm/routes/:id – Update supply route ──────────────────────────
router.put('/routes/:id', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { name, chain, products, geo_fence, status } = req.body;
        await db.prepare(`
            UPDATE supply_routes SET name = ?, chain = ?, products = ?, geo_fence = ?, status = ?, updated_at = datetime('now')
            WHERE id = ?
        `).run(name, JSON.stringify(chain || []), JSON.stringify(products || []),
            geo_fence || '', status || 'active', req.params.id);
        res.json({ id: req.params.id, status: 'updated' });
    } catch (err) {
        console.error('Update route error:', err);
        res.status(500).json({ error: 'Failed to update route' });
    }
});

// ─── GET /api/scm/channel-rules – List channel integrity rules ───────────────
router.get('/channel-rules', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user?.org_id;
        let rules;
        if (orgId && req.user?.role !== 'super_admin') {
            rules = await db.prepare('SELECT * FROM channel_rules WHERE org_id = ? ORDER BY created_at DESC').all(orgId);
        } else {
            rules = await db.prepare('SELECT * FROM channel_rules ORDER BY created_at DESC').all();
        }
        res.json(rules);
    } catch (err) {
        console.error('List channel rules error:', err);
        res.status(500).json({ error: 'Failed to fetch channel rules' });
    }
});

// ─── POST /api/scm/channel-rules – Create channel rule (Admin) ──────────────
router.post('/channel-rules', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { name, logic, severity, auto_action } = req.body;
        const id = uuidv4();
        await db.prepare(`
            INSERT INTO channel_rules (id, name, logic, severity, auto_action, is_active, triggers_30d, created_at)
            VALUES (?, ?, ?, ?, ?, 1, 0, datetime('now'))
        `).run(id, name, logic || '', severity || 'medium', auto_action || '');
        res.status(201).json({ id, name, status: 'created' });
    } catch (err) {
        console.error('Create channel rule error:', err);
        res.status(500).json({ error: 'Failed to create channel rule' });
    }
});

// ─── GET /api/scm/route-breaches – List route breaches ───────────────────────
router.get('/route-breaches', authMiddleware, async (req, res) => {
    try {
        const { route_id, severity, limit = 50 } = req.query;
        const orgId = req.user?.org_id;
        let query = `
            SELECT rb.*, sr.name as route_name, cr.name as rule_name
            FROM route_breaches rb
            LEFT JOIN supply_routes sr ON rb.route_id = sr.id
            LEFT JOIN channel_rules cr ON rb.rule_id = cr.id
        `;
        const conditions = [];
        const params = [];
        if (orgId && req.user?.role !== 'super_admin') { conditions.push('sr.org_id = ?'); params.push(orgId); }
        if (route_id) { conditions.push('rb.route_id = ?'); params.push(route_id); }
        if (severity) { conditions.push('rb.severity = ?'); params.push(severity); }
        if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
        query += ` ORDER BY rb.created_at DESC LIMIT ?`;
        params.push(Math.min(parseInt(limit) || 50, 200));

        const breaches = await db.prepare(query).all(...params);
        res.json(breaches.map(b => ({ ...b, details: safeParse(b.details, {}) })));
    } catch (err) {
        console.error('List breaches error:', err);
        res.status(500).json({ error: 'Failed to fetch breaches' });
    }
});

// ─── POST /api/scm/route-breaches – Record a breach ─────────────────────────
router.post('/route-breaches', authMiddleware, async (req, res) => {
    try {
        const { route_id, rule_id, scan_event_id, code_data, scanned_in, severity, action, details } = req.body;
        const id = uuidv4();
        await db.prepare(`
            INSERT INTO route_breaches (id, route_id, rule_id, scan_event_id, code_data, scanned_in, severity, action, details, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(id, route_id, rule_id || null, scan_event_id || null,
            code_data || '', scanned_in || '', severity || 'medium', action || '', JSON.stringify(details || {}));

        // Update route integrity status
        if (severity === 'critical' || severity === 'high') {
            await db.prepare(`UPDATE supply_routes SET integrity = 'breach' WHERE id = ?`).run(route_id);
        }
        // Increment rule trigger count
        if (rule_id) {
            await db.prepare(`UPDATE channel_rules SET triggers_30d = triggers_30d + 1 WHERE id = ?`).run(rule_id);
        }
        res.status(201).json({ id, status: 'recorded' });
    } catch (err) {
        console.error('Record breach error:', err);
        res.status(500).json({ error: 'Failed to record breach' });
    }
});

// ═══════════════════════════════════════════════════════════
// TACTICAL DEPTH — Simulation, Replay, Integrity Scoring
// ═══════════════════════════════════════════════════════════

// ─── POST /api/scm/supply/routes/:id/simulate – What-if simulation ──────────
router.post('/routes/:id/simulate', authMiddleware, async (req, res) => {
    try {
        const route = await db.prepare('SELECT * FROM supply_routes WHERE id = ?').get(req.params.id);
        if (!route) return res.status(404).json({ error: 'Route not found' });

        const { test_scan_geo, test_device, test_code } = req.body;
        const chain = JSON.parse(route.chain || '[]');

        // Simulate breach detection
        const geoInRoute = chain.some(node => {
            const nodeLocation = (node.location || '').toLowerCase();
            return (test_scan_geo || '').toLowerCase().includes(nodeLocation);
        });

        const rules = await db.prepare('SELECT * FROM channel_rules WHERE is_active = 1').all();
        const triggeredRules = [];

        for (const rule of rules) {
            const logic = (rule.logic || '').toLowerCase();
            if (logic.includes('geo') && !geoInRoute) {
                triggeredRules.push({ rule_id: rule.id, rule_name: rule.name, severity: rule.severity, reason: `Scan geo "${test_scan_geo}" outside route chain` });
            }
            if (logic.includes('reverse') && test_scan_geo) {
                // Check for reverse flow: scan location matches earlier node than expected
                const scanIdx = chain.findIndex(n => (n.location || '').toLowerCase().includes((test_scan_geo || '').toLowerCase()));
                if (scanIdx >= 0 && scanIdx < chain.length - 1) {
                    triggeredRules.push({ rule_id: rule.id, rule_name: rule.name, severity: 'high', reason: 'Reverse flow detected — scan at upstream node' });
                }
            }
        }

        // Save simulation
        const simId = uuidv4();
        await db.prepare(`
            INSERT INTO route_simulations (id, route_id, scenario, input_data, results, breaches_predicted, created_by, created_at)
            VALUES (?, ?, 'what_if', ?, ?, ?, ?, datetime('now'))
        `).run(simId, req.params.id, JSON.stringify({ test_scan_geo, test_device, test_code }),
            JSON.stringify({ geo_in_route: geoInRoute, triggered_rules: triggeredRules }),
            triggeredRules.length, req.user?.email || '');

        res.json({
            simulation_id: simId,
            route: route.name,
            test_input: { geo: test_scan_geo, device: test_device, code: test_code },
            geo_in_route: geoInRoute,
            breaches_predicted: triggeredRules.length,
            triggered_rules: triggeredRules,
            recommendation: triggeredRules.length === 0 ? 'No breaches predicted — scan is within expected route' :
                `${triggeredRules.length} rule(s) would trigger — review route or update rules`
        });
    } catch (err) {
        console.error('Route simulation error:', err);
        res.status(500).json({ error: 'Failed to simulate' });
    }
});

// ─── GET /api/scm/supply/routes/:id/replay – Historical route replay ────────
router.get('/routes/:id/replay', authMiddleware, async (req, res) => {
    try {
        const route = await db.prepare('SELECT * FROM supply_routes WHERE id = ?').get(req.params.id);
        if (!route) return res.status(404).json({ error: 'Route not found' });

        const { days = 30 } = req.query;
        const chain = JSON.parse(route.chain || '[]');
        const products = JSON.parse(route.products || '[]');

        // Get scan events for products on this route
        let scanEvents = [];
        if (products.length > 0) {
            const placeholders = products.map(() => '?').join(',');
            scanEvents = await db.prepare(`
                SELECT se.*, p.name as product_name FROM scan_events se
                LEFT JOIN products p ON se.product_id = p.id
                WHERE se.product_id IN (${placeholders})
                AND se.scanned_at > datetime('now', '-${parseInt(days)} days')
                ORDER BY se.scanned_at ASC
            `).all(...products);
        }

        // Get breaches in period
        const breaches = await db.prepare(`
            SELECT * FROM route_breaches WHERE route_id = ?
            AND created_at > datetime('now', '-${parseInt(days)} days')
            ORDER BY created_at ASC
        `).all(req.params.id);

        // Build timeline
        const timeline = [];
        for (const se of scanEvents) {
            timeline.push({
                type: 'scan',
                timestamp: se.scanned_at,
                geo: `${se.geo_city || ''}, ${se.geo_country || ''}`,
                product: se.product_name,
                ers: se.fraud_score,
                device: se.device_fingerprint?.substring(0, 8) || 'unknown'
            });
        }
        for (const b of breaches) {
            timeline.push({
                type: 'breach',
                timestamp: b.created_at,
                geo: b.scanned_in,
                severity: b.severity,
                code: b.code_data
            });
        }
        timeline.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        res.json({
            route: route.name,
            chain,
            period_days: parseInt(days),
            total_scans: scanEvents.length,
            total_breaches: breaches.length,
            timeline
        });
    } catch (err) {
        console.error('Route replay error:', err);
        res.status(500).json({ error: 'Failed to replay route' });
    }
});

// ─── GET /api/scm/supply/integrity-index – Route Integrity Scoring Index ────
router.get('/integrity-index', authMiddleware, async (req, res) => {
    try {
        const routes = await db.prepare('SELECT * FROM supply_routes ORDER BY name').all();

        const index = [];
        for (const route of routes) {
            const totalBreaches = (await db.prepare('SELECT COUNT(*) as c FROM route_breaches WHERE route_id = ?').get(route.id))?.c || 0;
            const recentBreaches = (await db.prepare(`SELECT COUNT(*) as c FROM route_breaches WHERE route_id = ? AND created_at > datetime('now', '-30 days')`).get(route.id))?.c || 0;
            const criticalBreaches = (await db.prepare(`SELECT COUNT(*) as c FROM route_breaches WHERE route_id = ? AND severity IN ('critical', 'high')`).get(route.id))?.c || 0;
            const chain = JSON.parse(route.chain || '[]');

            // Composite Integrity Score (0-100, 100 = perfect)
            let score = 100;
            score -= Math.min(recentBreaches * 5, 30);    // -5 per recent breach, max -30
            score -= Math.min(criticalBreaches * 10, 40);  // -10 per critical, max -40
            if (route.integrity === 'breach') score -= 20;
            score = Math.max(0, score);

            const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : score >= 40 ? 'D' : 'F';

            index.push({
                route_id: route.id,
                route_name: route.name,
                nodes: chain.length,
                status: route.integrity,
                total_breaches: totalBreaches,
                recent_breaches_30d: recentBreaches,
                critical_breaches: criticalBreaches,
                integrity_score: score,
                grade,
                recommendation: score >= 90 ? 'Route operating normally' :
                    score >= 60 ? 'Review channel rules and recent breaches' :
                        'Route compromised — consider route suspension or rule hardening'
            });
        }

        // Platform averages
        const avgScore = index.length > 0 ? (index.reduce((s, r) => s + r.integrity_score, 0) / index.length).toFixed(1) : 0;

        res.json({
            total_routes: index.length,
            avg_integrity_score: parseFloat(avgScore),
            routes_at_risk: index.filter(r => r.grade === 'D' || r.grade === 'F').length,
            index
        });
    } catch (err) {
        console.error('Integrity index error:', err);
        res.status(500).json({ error: 'Failed to calculate integrity index' });
    }
});

// ─── GET /api/scm/supply/reverse-flow – Detect reverse flow anomalies ───────
router.get('/reverse-flow', authMiddleware, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        const routes = await db.prepare('SELECT * FROM supply_routes').all();
        const anomalies = [];

        for (const route of routes) {
            const chain = JSON.parse(route.chain || '[]');
            if (chain.length < 2) continue;

            // Check for scans that appear at earlier nodes after being at later nodes
            const breaches = await db.prepare(`
                SELECT * FROM route_breaches WHERE route_id = ? AND severity IN ('high', 'critical')
                AND created_at > datetime('now', '-${parseInt(days)} days')
                ORDER BY created_at DESC LIMIT 10
            `).all(route.id);

            for (const b of breaches) {
                const details = safeParse(b.details, {});
                if (details.reverse_flow || (b.action || '').includes('reverse')) {
                    anomalies.push({
                        route: route.name,
                        breach_id: b.id,
                        code: b.code_data,
                        scanned_in: b.scanned_in,
                        severity: b.severity,
                        timestamp: b.created_at,
                        type: 'reverse_flow'
                    });
                }
            }
        }

        res.json({
            period_days: parseInt(days),
            reverse_flow_anomalies: anomalies.length,
            anomalies
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to detect reverse flow' });
    }
});

// ─── GET /api/scm/supply/simulations – List past simulations ────────────────
router.get('/simulations', authMiddleware, async (req, res) => {
    try {
        const sims = await db.prepare('SELECT * FROM route_simulations ORDER BY created_at DESC LIMIT 30').all();
        res.json(sims.map(s => ({
            ...s,
            input_data: JSON.parse(s.input_data || '{}'),
            results: JSON.parse(s.results || '{}')
        })));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch simulations' });
    }
});

module.exports = router;
