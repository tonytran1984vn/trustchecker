/**
 * Risk Radar Routes — Unified Supply Chain Threat Dashboard
 * 8-dimensional risk assessment with heatmap and trend analysis
 */

function _safeJoin(clause) {
  if (clause && !/^\s*(AND|WHERE)\s+[a-zA-Z_.]+\s*=\s*\?/i.test(clause) && clause.trim() !== '') {
    throw new Error("Invalid join clause");
  }
  return clause || '';
}

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const engineClient = require('../engines/infrastructure/engine-client');
const { cacheMiddleware } = require('../cache');

router.use(authMiddleware);

// ─── GET /api/scm/risk/radar — Full 8-vector risk assessment ─────────────────
// Cache 60s — queries 8 full tables
router.get('/radar', cacheMiddleware(60), async (req, res) => {
    try {
        const orgId = req.user?.org_id || req.user?.orgId || null;
        const orgFilter = orgId ? ' WHERE org_id = ?' : '';
        const orgParams = orgId ? [orgId] : [];
        // NODE-BP-1: Parallelize 8 independent table reads with org_id filter
        const [partners, shipments, violations, leaks, alerts, inventory, certifications, sustainability] = await Promise.all([
            db.prepare('SELECT * FROM partners' + orgFilter).all(...orgParams),
            orgId
                ? db.all('SELECT s.* FROM shipments s LEFT JOIN partners fp ON s.from_partner_id = fp.id LEFT JOIN partners tp ON s.to_partner_id = tp.id WHERE fp.org_id = ? OR tp.org_id = ? LIMIT 1000', [orgId, orgId])
                : db.all('SELECT * FROM shipments'),
            db.all('SELECT * FROM sla_violations'),
            db.all('SELECT * FROM leak_alerts'),
            orgId
                ? db.all('SELECT fa.* FROM fraud_alerts fa LEFT JOIN products p ON fa.product_id = p.id WHERE p.org_id = ? OR p.org_id IS NULL', [orgId])
                : db.all('SELECT * FROM fraud_alerts LIMIT 1000'),
            orgId
                ? db.all('SELECT i.* FROM inventory i LEFT JOIN products p ON i.product_id = p.id WHERE p.org_id = ? OR p.org_id IS NULL', [orgId])
                : db.all('SELECT * FROM inventory LIMIT 1000'),
            db.all('SELECT * FROM certifications'),
            db.all('SELECT * FROM sustainability_scores'),
        ]);

        const radar = await engineClient.riskRadarCompute({
            partners, shipments, violations, leaks, alerts, inventory, certifications, sustainability
        });

        res.json(radar);
    } catch (err) {
        console.error('Risk radar error:', err);
        res.status(500).json({ error: 'Risk radar computation failed' });
    }
});

// ─── GET /api/scm/risk/heatmap — Regional risk heatmap ──────────────────────
// Cache 120s — relatively static data
router.get('/heatmap', cacheMiddleware(120), async (req, res) => {
    try {
        const orgId = req.user?.org_id || req.user?.orgId || null;
        const orgFilter = orgId ? ' WHERE org_id = ?' : '';
        const orgParams = orgId ? [orgId] : [];
        // NODE-BP-1: Parallelize 3 reads
        const [partners, shipments, leaks] = await Promise.all([
            db.prepare('SELECT * FROM partners' + orgFilter).all(...orgParams),
            orgId
                ? db.all('SELECT s.* FROM shipments s LEFT JOIN partners fp ON s.from_partner_id = fp.id LEFT JOIN partners tp ON s.to_partner_id = tp.id WHERE fp.org_id = ? OR tp.org_id = ? LIMIT 1000', [orgId, orgId])
                : db.all('SELECT * FROM shipments'),
            db.all('SELECT * FROM leak_alerts'),
        ]);

        const heatmap = await engineClient.riskRadarHeatmap(partners, shipments, leaks);

        res.json({
            type: 'risk_heatmap',
            regions: heatmap,
            total_regions: heatmap.length,
            hot_zones: heatmap.filter(r => r.risk_level === 'hot').length,
            generated_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('Heatmap error:', err);
        res.status(500).json({ error: 'Heatmap generation failed' });
    }
});

// ─── GET /api/scm/risk/alerts — Active risk alerts ───────────────────────────
router.get('/alerts', async (req, res) => {
    try {
        const { severity, limit = 50 } = req.query;
        const orgId = req.user?.org_id || req.user?.orgId || null;

        // Aggregate alerts from multiple sources with org_id filtering
        const cappedLimit = Math.min(parseInt(limit) || 50, 200);
        const orgJoin = orgId ? ' AND p.org_id = ?' : '';
        const orgP = orgId ? [orgId] : [];
        // NODE-BP-1: Parallelize 4 alert queries (each with .catch to prevent one failure from killing all)
        const [fraudAlerts, leakAlerts, slaAlerts, anomalyAlerts] = await Promise.all([
            db.all(`SELECT fa.id, 'fraud' as source, fa.alert_type, fa.severity, fa.description, fa.status, fa.created_at FROM fraud_alerts fa LEFT JOIN products p ON fa.product_id = p.id WHERE fa.status = 'open'${_safeJoin(orgJoin)} ORDER BY fa.created_at DESC LIMIT ?`, [...orgP, cappedLimit]).catch(() => []),
            db.prepare("SELECT id, 'leak' as source, leak_type as alert_type, CASE WHEN risk_score > 0.7 THEN 'high' WHEN risk_score > 0.4 THEN 'medium' ELSE 'low' END as severity, listing_title as description, status, created_at FROM leak_alerts WHERE status = 'open' ORDER BY created_at DESC LIMIT ?").all(cappedLimit).catch(() => []),
            db.prepare("SELECT id, 'sla' as source, violation_type as alert_type, CASE WHEN penalty_amount > 1000 THEN 'high' WHEN penalty_amount > 100 THEN 'medium' ELSE 'low' END as severity, violation_type as description, status, created_at FROM sla_violations WHERE status = 'open' ORDER BY created_at DESC LIMIT ?").all(cappedLimit).catch(() => []),
            db.prepare("SELECT id, 'anomaly' as source, anomaly_type as alert_type, severity, description, status, detected_at as created_at FROM anomaly_detections WHERE status = 'open' ORDER BY detected_at DESC LIMIT ?").all(cappedLimit).catch(() => []),
        ]);

        let allAlerts = [...fraudAlerts, ...leakAlerts, ...slaAlerts, ...anomalyAlerts]
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (severity) {
            allAlerts = allAlerts.filter(a => a.severity === severity);
        }

        res.json({
            total_active: allAlerts.length,
            by_severity: {
                critical: allAlerts.filter(a => a.severity === 'critical').length,
                high: allAlerts.filter(a => a.severity === 'high').length,
                medium: allAlerts.filter(a => a.severity === 'medium').length,
                low: allAlerts.filter(a => a.severity === 'low').length
            },
            by_source: {
                fraud: fraudAlerts.length,
                leak: leakAlerts.length,
                sla: slaAlerts.length,
                anomaly: anomalyAlerts.length
            },
            alerts: allAlerts.slice(0, cappedLimit)
        });
    } catch (err) {
        console.error('Risk alerts error:', err);
        res.status(500).json({ error: 'Risk alerts failed' });
    }
});

// ─── GET /api/scm/risk/trends — Risk trend over time ────────────────────────
router.get('/trends', async (req, res) => {
    try {
        const { period = '30d' } = req.query;
        const orgId = req.user?.org_id || req.user?.orgId || null;
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

        const orgJoin = orgId ? ' AND p.org_id = ?' : '';
        const orgP = orgId ? [orgId] : [];
        // NODE-BP-1: Parallelize 3 trend queries with org_id
        const [fraudTrend, leakTrend, violationTrend] = await Promise.all([
            db.all(`SELECT DATE(fa.created_at) as day, COUNT(*)::int as count FROM fraud_alerts fa LEFT JOIN products p ON fa.product_id = p.id WHERE fa.created_at >= ?${_safeJoin(orgJoin)} GROUP BY DATE(fa.created_at) ORDER BY day LIMIT 1000`, [since, ...orgP]),
            orgId
                ? db.all('SELECT DATE(la.created_at) as day, COUNT(*)::int as count FROM leak_alerts la LEFT JOIN products p ON la.product_id = p.id WHERE la.created_at >= ? AND p.org_id = ? GROUP BY DATE(la.created_at) ORDER BY day LIMIT 1000', [since, orgId])
                : db.all('SELECT DATE(created_at) as day, COUNT(*)::int as count FROM leak_alerts WHERE created_at >= ? GROUP BY DATE(created_at) ORDER BY day LIMIT 1000', [since]),
            orgId
                ? db.all('SELECT DATE(sv.created_at) as day, COUNT(*)::int as count FROM sla_violations sv LEFT JOIN partners p ON sv.partner_id = p.id WHERE sv.created_at >= ? AND p.org_id = ? GROUP BY DATE(sv.created_at) ORDER BY day LIMIT 1000', [since, orgId])
                : db.all('SELECT DATE(created_at) as day, COUNT(*)::int as count FROM sla_violations WHERE created_at >= ? GROUP BY DATE(created_at) ORDER BY day LIMIT 1000', [since]),
        ]);

        res.json({
            period,
            days,
            trends: {
                fraud_alerts: fraudTrend,
                leak_alerts: leakTrend,
                sla_violations: violationTrend
            },
            summary: {
                total_fraud: fraudTrend.reduce((s, d) => s + d.count, 0),
                total_leaks: leakTrend.reduce((s, d) => s + d.count, 0),
                total_violations: violationTrend.reduce((s, d) => s + d.count, 0)
            }
        });
    } catch (err) {
        console.error('Risk trends error:', err);
        res.status(500).json({ error: 'Risk trends failed' });
    }
});

module.exports = router;
