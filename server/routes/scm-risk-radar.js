/**
 * Risk Radar Routes — Unified Supply Chain Threat Dashboard
 * 8-dimensional risk assessment with heatmap and trend analysis
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const engineClient = require('../engines/engine-client');
const { cacheMiddleware } = require('../cache');

router.use(authMiddleware);

// ─── GET /api/scm/risk/radar — Full 8-vector risk assessment ─────────────────
// Cache 60s — queries 8 full tables
router.get('/radar', cacheMiddleware(60), async (req, res) => {
    try {
        // NODE-BP-1: Parallelize 8 independent table reads
        const [partners, shipments, violations, leaks, alerts, inventory, certifications, sustainability] = await Promise.all([
            db.prepare('SELECT * FROM partners').all(),
            db.prepare('SELECT * FROM shipments').all(),
            db.prepare('SELECT * FROM sla_violations').all(),
            db.prepare('SELECT * FROM leak_alerts').all(),
            db.prepare('SELECT * FROM fraud_alerts').all(),
            db.prepare('SELECT * FROM inventory').all(),
            db.prepare('SELECT * FROM certifications').all(),
            db.prepare('SELECT * FROM sustainability_scores').all(),
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
        // NODE-BP-1: Parallelize 3 reads
        const [partners, shipments, leaks] = await Promise.all([
            db.prepare('SELECT * FROM partners').all(),
            db.prepare('SELECT * FROM shipments').all(),
            db.prepare('SELECT * FROM leak_alerts').all(),
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

        // Aggregate alerts from multiple sources
        const cappedLimit = Math.min(parseInt(limit) || 50, 200);
        // NODE-BP-1: Parallelize 4 alert queries
        const [fraudAlerts, leakAlerts, slaAlerts, anomalyAlerts] = await Promise.all([
            db.prepare("SELECT id, 'fraud' as source, alert_type, severity, description, status, created_at FROM fraud_alerts WHERE status = 'open' ORDER BY created_at DESC LIMIT ?").all(cappedLimit),
            db.prepare("SELECT id, 'leak' as source, leak_type as alert_type, CASE WHEN risk_score > 0.7 THEN 'high' WHEN risk_score > 0.4 THEN 'medium' ELSE 'low' END as severity, listing_title as description, status, created_at FROM leak_alerts WHERE status = 'open' ORDER BY created_at DESC LIMIT ?").all(cappedLimit),
            db.prepare("SELECT id, 'sla' as source, violation_type as alert_type, CASE WHEN penalty_amount > 1000 THEN 'high' WHEN penalty_amount > 100 THEN 'medium' ELSE 'low' END as severity, violation_type as description, status, created_at FROM sla_violations WHERE status = 'open' ORDER BY created_at DESC LIMIT ?").all(cappedLimit),
            db.prepare("SELECT id, 'anomaly' as source, anomaly_type as alert_type, severity, description, status, detected_at as created_at FROM anomaly_detections WHERE status = 'open' ORDER BY detected_at DESC LIMIT ?").all(cappedLimit),
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
        const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;
        const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

        // NODE-BP-1: Parallelize 3 trend queries
        const [fraudTrend, leakTrend, violationTrend] = await Promise.all([
            db.prepare('SELECT DATE(created_at) as day, COUNT(*) as count FROM fraud_alerts WHERE created_at >= ? GROUP BY DATE(created_at)').all(since),
            db.prepare('SELECT DATE(created_at) as day, COUNT(*) as count FROM leak_alerts WHERE created_at >= ? GROUP BY DATE(created_at)').all(since),
            db.prepare('SELECT DATE(created_at) as day, COUNT(*) as count FROM sla_violations WHERE created_at >= ? GROUP BY DATE(created_at)').all(since),
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
