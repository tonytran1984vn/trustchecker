const { safeError } = require('../utils/safe-error');
/**
 * Anomaly Detection Routes
 * Time-series analysis, scan velocity, fraud spikes, trust drops, geo dispersion
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const engineClient = require('../engines/engine-client');

router.use(authMiddleware);

// ─── POST /scan — Run anomaly detection scan ────────────────
router.post('/scan', requireRole('manager'), async (req, res) => {
    try {
        const { hours = 24 } = req.body;
        const safeHours = Math.max(1, Math.min(8760, Math.floor(Number(hours)) || 24));

        // Gather data from last N hours (parameterized)
        const timeModifier = `-${safeHours} hours`;
        const scans = await db.all(`SELECT * FROM scan_events WHERE scanned_at > datetime('now', ?)`, [timeModifier]);
        const fraudAlerts = await db.all(`SELECT * FROM fraud_alerts WHERE created_at > datetime('now', ?)`, [timeModifier]);
        const trustScores = await db.all(`SELECT * FROM trust_scores WHERE calculated_at > datetime('now', ?)`, [timeModifier]);

        const result = await engineClient.anomalyFullScan({ scans, fraudAlerts, trustScores });

        // Persist detected anomalies
        for (const anomaly of result.anomalies) {
            const id = uuidv4();
            await db.prepare(`
        INSERT INTO anomaly_detections (id, source_type, source_id, anomaly_type, severity, score, description, details)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, anomaly.source_type, anomaly.source_id, anomaly.type, anomaly.severity,
                anomaly.score, anomaly.description, JSON.stringify(anomaly.details));
        }

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'ANOMALY_SCAN', 'system', 'anomaly',
                JSON.stringify({ hours, total: result.total, critical: result.critical, warning: result.warning }));

        res.json({
            scan_window_hours: Number(hours),
            data_analyzed: { scans: scans.length, fraud_alerts: fraudAlerts.length, trust_scores: trustScores.length },
            ...result
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET / — List detected anomalies ────────────────────────
// ─── In-memory response cache (60s TTL) ─────────────────────
let _cache = { data: null, expires: 0 };
const CACHE_TTL = 60_000; // 60 seconds

async function fetchAnomalyList(query) {
    const { status = 'open', severity, type, limit = 50 } = query;
    let sql = 'SELECT * FROM anomaly_detections WHERE 1=1';
    const params = [];

    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (severity) { sql += ' AND severity = ?'; params.push(severity); }
    if (type) { sql += ' AND anomaly_type = ?'; params.push(type); }

    sql += ' ORDER BY CASE severity WHEN \'critical\' THEN 1 WHEN \'warning\' THEN 2 ELSE 3 END, detected_at DESC LIMIT ?';
    params.push(Number(limit));

    const anomalies = await db.all(sql, params);
    const stats = {
        open: (await db.get("SELECT COUNT(*) as c FROM anomaly_detections WHERE status = 'open'"))?.c || 0,
        critical: (await db.get("SELECT COUNT(*) as c FROM anomaly_detections WHERE status = 'open' AND severity = 'critical'"))?.c || 0,
        resolved: (await db.get("SELECT COUNT(*) as c FROM anomaly_detections WHERE status = 'resolved'"))?.c || 0,
    };

    return { anomalies, stats, total: anomalies.length };
}

router.get('/', async (req, res) => {
    try {
        const result = await fetchAnomalyList(req.query);
        res.json(result);
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /detections — Cached alias for anomaly list ────────
router.get('/detections', async (req, res) => {
    try {
        const now = Date.now();
        const cacheKey = JSON.stringify(req.query);

        // Return cached response if valid and query matches
        if (_cache.data && _cache.expires > now && _cache.key === cacheKey) {
            return res.json({ ..._cache.data, cached: true });
        }

        const result = await fetchAnomalyList(req.query);

        // Cache the response
        _cache = { data: result, expires: now + CACHE_TTL, key: cacheKey };

        res.json(result);
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── PUT /:id/resolve — Resolve an anomaly ──────────────────
router.put('/:id/resolve', requireRole('manager'), async (req, res) => {
    try {
        const { resolution } = req.body;
        const anomaly = await db.get('SELECT * FROM anomaly_detections WHERE id = ?', [req.params.id]);
        if (!anomaly) return res.status(404).json({ error: 'Anomaly not found' });

        await db.prepare("UPDATE anomaly_detections SET status = 'resolved', resolved_at = datetime('now') WHERE id = ?").run(req.params.id);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'ANOMALY_RESOLVED', 'anomaly', req.params.id, JSON.stringify({ resolution, type: anomaly.anomaly_type }));

        res.json({ id: req.params.id, status: 'resolved', resolution });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /stats — Anomaly statistics ────────────────────────
router.get('/stats', requireRole('manager'), async (req, res) => {
    try {
        const total = (await db.get('SELECT COUNT(*) as c FROM anomaly_detections'))?.c || 0;
        const byType = await db.all('SELECT anomaly_type, COUNT(*) as count FROM anomaly_detections GROUP BY anomaly_type ORDER BY count DESC');
        const bySeverity = await db.all('SELECT severity, COUNT(*) as count FROM anomaly_detections GROUP BY severity');
        const byStatus = await db.all('SELECT status, COUNT(*) as count FROM anomaly_detections GROUP BY status');

        const trend = await db.all(`
      SELECT DATE(detected_at) as date, COUNT(*) as count, SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END) as critical
      FROM anomaly_detections WHERE detected_at > datetime('now', '-30 days')
      GROUP BY date ORDER BY date ASC
    `);

        res.json({ total, by_type: byType, by_severity: bySeverity, by_status: byStatus, trend_30d: trend });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

module.exports = router;
