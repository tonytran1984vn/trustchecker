/**
 * SCM Duplicate Classification & Industry Benchmark API
 * Classify duplicates: curiosity / leakage / counterfeit / unclassified
 * Industry benchmark (Super Admin only)
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');

const router = express.Router();


// GOV-1: All routes require authentication
router.use(authMiddleware);

/**
 * Classification logic:
 * - Curiosity (60%): same device, same city, gap > 24h
 * - Leakage (20%): wrong geo vs assigned distributor zone
 * - Counterfeit (15%): new device + different country + short gap
 * - Unclassified (5%): ambiguous signals
 */
function classifyDuplicate(scanEvent, previousScan, routeGeoFence) {
    const signals = [];
    let classification = 'unclassified';
    let confidence = 0;

    if (!previousScan) return { classification, confidence: 0, signals: ['No previous scan for comparison'] };

    const sameDevice = scanEvent.device_fingerprint === previousScan.device_fingerprint;
    const sameCountry = scanEvent.geo_country === previousScan.geo_country;
    const sameCity = scanEvent.geo_city === previousScan.geo_city;
    const timeGapMs = new Date(scanEvent.scanned_at) - new Date(previousScan.scanned_at);
    const timeGapHours = timeGapMs / (1000 * 60 * 60);

    // Consumer Curiosity: same device, same city, gap > 24h
    if (sameDevice && sameCity && timeGapHours > 24) {
        classification = 'curiosity';
        confidence = 0.85;
        signals.push('Same device', 'Same city', `Gap: ${Math.round(timeGapHours)}h (>24h)`);
    }
    // Counterfeit: different device + different country + short gap
    else if (!sameDevice && !sameCountry && timeGapHours < 2) {
        classification = 'counterfeit';
        confidence = 0.78;
        signals.push('Different device', 'Different country', `Gap: ${Math.round(timeGapHours * 60)}min (<2h)`);
    }
    // Channel Leakage: wrong geo vs distributor zone
    else if (routeGeoFence && !scanEvent.geo_country?.includes(routeGeoFence)) {
        classification = 'leakage';
        confidence = 0.72;
        signals.push(`Scanned in ${scanEvent.geo_country}`, `Expected zone: ${routeGeoFence}`);
    }
    // Same device, different city (likely consumer curiosity traveling)
    else if (sameDevice && !sameCity && timeGapHours > 12) {
        classification = 'curiosity';
        confidence = 0.6;
        signals.push('Same device', 'Different city', `Gap: ${Math.round(timeGapHours)}h`);
    }
    // Ambiguous
    else {
        classification = 'unclassified';
        confidence = 0.3;
        signals.push('Ambiguous pattern', `Gap: ${Math.round(timeGapHours * 60)}min`, sameDevice ? 'Same device' : 'Different device');
    }

    return { classification, confidence, signals };
}

// ─── GET /api/scm/duplicates – List classified duplicates ───────────────────
router.get('/duplicates', authMiddleware, async (req, res) => {
    try {
        const { classification, limit = 50 } = req.query;
        let query = 'SELECT * FROM duplicate_classifications';
        const params = [];
        if (classification) { query += ' WHERE classification = ?'; params.push(classification); }
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(Math.min(parseInt(limit) || 50, 200));

        const dups = await db.prepare(query).all(...params);
        res.json(dups.map(d => ({
            ...d,
            signals: JSON.parse(d.signals || '[]'),
            geo_data: JSON.parse(d.geo_data || '{}')
        })));
    } catch (err) {
        console.error('List duplicates error:', err);
        res.status(500).json({ error: 'Failed to fetch duplicates' });
    }
});

// ─── GET /api/scm/duplicates/stats – Classification breakdown ───────────────
router.get('/duplicates/stats', authMiddleware, async (req, res) => {
    try {
        const total = (await db.prepare('SELECT COUNT(*) as c FROM duplicate_classifications').get())?.c || 0;
        const curiosity = (await db.prepare('SELECT COUNT(*) as c FROM duplicate_classifications WHERE classification = "curiosity"').get())?.c || 0;
        const leakage = (await db.prepare('SELECT COUNT(*) as c FROM duplicate_classifications WHERE classification = "leakage"').get())?.c || 0;
        const counterfeit = (await db.prepare('SELECT COUNT(*) as c FROM duplicate_classifications WHERE classification = "counterfeit"').get())?.c || 0;
        const unclassified = (await db.prepare('SELECT COUNT(*) as c FROM duplicate_classifications WHERE classification = "unclassified"').get())?.c || 0;

        const totalScans = (await db.prepare('SELECT COUNT(*) as c FROM scan_events').get())?.c || 1;
        const rawDupRate = total > 0 ? ((total / totalScans) * 100).toFixed(1) : '0';
        const adjustedRate = total > 0 ? (((counterfeit + leakage) / totalScans) * 100).toFixed(1) : '0';

        res.json({
            total,
            breakdown: {
                curiosity: { count: curiosity, pct: total > 0 ? ((curiosity / total) * 100).toFixed(1) + '%' : '0%', action: 'Exclude from risk KPIs' },
                leakage: { count: leakage, pct: total > 0 ? ((leakage / total) * 100).toFixed(1) + '%' : '0%', action: 'Flag distributor → Ops' },
                counterfeit: { count: counterfeit, pct: total > 0 ? ((counterfeit / total) * 100).toFixed(1) + '%' : '0%', action: 'Lock batch → Risk → CEO' },
                unclassified: { count: unclassified, pct: total > 0 ? ((unclassified / total) * 100).toFixed(1) + '%' : '0%', action: 'Queue for analyst review' }
            },
            raw_duplicate_rate: rawDupRate + '%',
            adjusted_risk_rate: adjustedRate + '%',
            total_scans: totalScans
        });
    } catch (err) {
        console.error('Duplicate stats error:', err);
        res.status(500).json({ error: 'Failed to calculate stats' });
    }
});

// ─── POST /api/scm/duplicates/classify – Auto-classify a duplicate scan ─────
router.post('/duplicates/classify', authMiddleware, async (req, res) => {
    try {
        const { scan_event_id, code_data, geo_fence } = req.body;
        const id = uuidv4();

        // Get scan event
        const scan = await db.prepare('SELECT * FROM scan_events WHERE id = ?').get(scan_event_id);
        if (!scan) return res.status(404).json({ error: 'Scan event not found' });

        // Get previous scan of same QR code
        const prevScan = await db.prepare(`
            SELECT * FROM scan_events WHERE qr_code_id = ? AND id != ? ORDER BY scanned_at DESC LIMIT 1
        `).get(scan.qr_code_id, scan_event_id);

        const result = classifyDuplicate(scan, prevScan, geo_fence || '');
        const timeGap = prevScan ? Math.round((new Date(scan.scanned_at) - new Date(prevScan.scanned_at)) / 1000) : 0;

        await db.prepare(`
            INSERT INTO duplicate_classifications (id, scan_event_id, code_data, classification, confidence, signals, geo_data, device_hash, time_gap, classified_by, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'system', datetime('now'))
        `).run(id, scan_event_id, code_data || scan.qr_code_id || '',
            result.classification, result.confidence, JSON.stringify(result.signals),
            JSON.stringify({ city: scan.geo_city, country: scan.geo_country, lat: scan.latitude, lng: scan.longitude }),
            scan.device_fingerprint || '', timeGap);

        res.status(201).json({ id, ...result, time_gap_seconds: timeGap });
    } catch (err) {
        console.error('Classify duplicate error:', err);
        res.status(500).json({ error: 'Failed to classify duplicate' });
    }
});

// ─── PATCH /api/scm/duplicates/:id – Manual reclassify by analyst ───────────
router.patch('/duplicates/:id', authMiddleware, requireRole('manager'), async (req, res) => {
    try {
        const { classification, signals } = req.body;
        if (!['curiosity', 'leakage', 'counterfeit', 'unclassified'].includes(classification)) {
            return res.status(400).json({ error: 'Invalid classification' });
        }
        await db.prepare(`
            UPDATE duplicate_classifications SET classification = ?, signals = ?, classified_by = 'analyst', reviewed_by = ?
            WHERE id = ?
        `).run(classification, JSON.stringify(signals || []), req.user?.email || '', req.params.id);

        await db.prepare(`
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, 'duplicate_reclassified', 'duplicate', ?, ?, datetime('now'))
        `).run(uuidv4(), req.user?.id || 'system', req.params.id, JSON.stringify({ classification }));

        res.json({ id: req.params.id, classification, status: 'reclassified' });
    } catch (err) {
        console.error('Reclassify error:', err);
        res.status(500).json({ error: 'Failed to reclassify' });
    }
});

// ─── GET /api/scm/benchmark – Industry benchmark (Super Admin only) ────────
router.get('/benchmark', authMiddleware, requireRole('superadmin'), async (req, res) => {
    try {
        // Cross-tenant aggregated metrics (anonymized)
        const totalOrgs = (await db.prepare('SELECT COUNT(*) as c FROM organizations').get())?.c || 0;
        const totalScans = (await db.prepare('SELECT COUNT(*) as c FROM scan_events').get())?.c || 0;
        const totalFraud = (await db.prepare('SELECT COUNT(*) as c FROM fraud_alerts').get())?.c || 0;
        const avgErs = (await db.prepare('SELECT AVG(fraud_score) as avg FROM scan_events').get())?.avg || 0;

        // Duplicate breakdown
        const totalDups = (await db.prepare('SELECT COUNT(*) as c FROM duplicate_classifications').get())?.c || 0;
        const curiosity = (await db.prepare('SELECT COUNT(*) as c FROM duplicate_classifications WHERE classification = "curiosity"').get())?.c || 0;
        const leakage = (await db.prepare('SELECT COUNT(*) as c FROM duplicate_classifications WHERE classification = "leakage"').get())?.c || 0;
        const counterfeit = (await db.prepare('SELECT COUNT(*) as c FROM duplicate_classifications WHERE classification = "counterfeit"').get())?.c || 0;

        // Active model
        const model = await db.prepare('SELECT version, fp_rate, tp_rate FROM risk_models WHERE status = "production" LIMIT 1').get();

        res.json({
            platform_overview: {
                total_tenants: totalOrgs,
                total_scans: totalScans,
                total_fraud_alerts: totalFraud,
                avg_ers: avgErs.toFixed(1)
            },
            duplicate_breakdown: {
                total: totalDups,
                curiosity, leakage, counterfeit,
                raw_rate: totalScans > 0 ? ((totalDups / totalScans) * 100).toFixed(1) + '%' : '0%',
                adjusted_rate: totalScans > 0 ? (((counterfeit + leakage) / totalScans) * 100).toFixed(1) + '%' : '0%'
            },
            model: model || { version: 'N/A', fp_rate: 'N/A', tp_rate: 'N/A' }
        });
    } catch (err) {
        console.error('Benchmark error:', err);
        res.status(500).json({ error: 'Failed to generate benchmark' });
    }
});

module.exports = router;
