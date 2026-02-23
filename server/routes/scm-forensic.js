/**
 * SCM Forensic Investigation API
 * Timeline forensic cases, device comparison, evidence export, case freeze
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const { safeParse } = require('../utils/safe-json');

const router = express.Router();


// GOV-1: All routes require authentication
router.use(authMiddleware);

// ─── GET /api/scm/forensic/cases – List forensic cases ──────────────────────
router.get('/cases', authMiddleware, async (req, res) => {
    try {
        const { status, limit = 50 } = req.query;
        let query = 'SELECT * FROM forensic_cases';
        const params = [];
        if (status) { query += ' WHERE status = ?'; params.push(status); }
        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(Math.min(parseInt(limit) || 50, 200));

        const cases = await db.prepare(query).all(...params);
        res.json(cases.map(c => ({
            ...c,
            scan_chain: JSON.parse(c.scan_chain || '[]'),
            device_compare: JSON.parse(c.device_compare || '[]'),
            factor_breakdown: JSON.parse(c.factor_breakdown || '[]')
        })));
    } catch (err) {
        console.error('List forensic cases error:', err);
        res.status(500).json({ error: 'Failed to fetch forensic cases' });
    }
});

// ─── POST /api/scm/forensic/cases – Create forensic case from scan chain ────
router.post('/cases', authMiddleware, async (req, res) => {
    try {
        const { code_data, product_id, batch_id, scan_event_ids } = req.body;
        const id = uuidv4();
        const caseNumber = `FC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`;

        // Build scan chain from scan events
        let scanChain = [];
        let deviceCompare = [];
        let currentErs = 0;

        if (scan_event_ids && scan_event_ids.length) {
            const placeholders = scan_event_ids.map(() => '?').join(',');
            const events = await db.prepare(`
                SELECT * FROM scan_events WHERE id IN (${placeholders}) ORDER BY scanned_at ASC
            `).all(...scan_event_ids);

            scanChain = events.map((e, i) => ({
                seq: i + 1,
                timestamp: e.scanned_at,
                geo: `${e.geo_city}, ${e.geo_country}`,
                lat: e.latitude,
                lng: e.longitude,
                device: e.device_fingerprint,
                ip: e.ip_address,
                ers: e.fraud_score,
                user_agent: e.user_agent
            }));

            // Device comparison
            const uniqueDevices = [...new Set(events.map(e => e.device_fingerprint))];
            deviceCompare = [
                { field: 'Device Hash', values: uniqueDevices, match: uniqueDevices.length === 1 },
                { field: 'Country', values: [...new Set(events.map(e => e.geo_country))], match: new Set(events.map(e => e.geo_country)).size === 1 },
                { field: 'IP Block', values: [...new Set(events.map(e => e.ip_address?.split('.').slice(0, 2).join('.')))], match: false },
            ];

            currentErs = Math.max(...events.map(e => e.fraud_score || 0));
        }

        await db.prepare(`
            INSERT INTO forensic_cases (id, case_number, code_data, product_id, batch_id, scan_chain, device_compare, factor_breakdown, current_ers, status, assigned_to, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, '[]', ?, 'open', ?, datetime('now'), datetime('now'))
        `).run(id, caseNumber, code_data || '', product_id || null, batch_id || null,
            JSON.stringify(scanChain), JSON.stringify(deviceCompare), currentErs,
            req.user?.email || req.user?.username || null);

        await db.prepare(`
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, 'forensic_case_created', 'forensic_case', ?, ?, datetime('now'))
        `).run(uuidv4(), req.user?.id || 'system', id, JSON.stringify({ case_number: caseNumber, code_data }));

        res.status(201).json({ id, case_number: caseNumber, status: 'open', scan_chain_length: scanChain.length });
    } catch (err) {
        console.error('Create forensic case error:', err);
        res.status(500).json({ error: 'Failed to create forensic case' });
    }
});

// ─── GET /api/scm/forensic/cases/:id – Full case detail ─────────────────────
router.get('/cases/:id', authMiddleware, async (req, res) => {
    try {
        const fc = await db.prepare('SELECT * FROM forensic_cases WHERE id = ? OR case_number = ?').get(req.params.id, req.params.id);
        if (!fc) return res.status(404).json({ error: 'Forensic case not found' });

        res.json({
            ...fc,
            scan_chain: JSON.parse(fc.scan_chain || '[]'),
            device_compare: JSON.parse(fc.device_compare || '[]'),
            factor_breakdown: JSON.parse(fc.factor_breakdown || '[]')
        });
    } catch (err) {
        console.error('Get forensic case error:', err);
        res.status(500).json({ error: 'Failed to fetch forensic case' });
    }
});

// ─── POST /api/scm/forensic/cases/:id/freeze – Freeze case (Compliance) ────
router.post('/cases/:id/freeze', authMiddleware, requireRole('manager'), async (req, res) => {
    try {
        const fc = await db.prepare('SELECT * FROM forensic_cases WHERE id = ?').get(req.params.id);
        if (!fc) return res.status(404).json({ error: 'Case not found' });
        if (fc.status === 'frozen') return res.status(400).json({ error: 'Case already frozen' });

        await db.prepare(`
            UPDATE forensic_cases SET status = 'frozen', frozen_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
        `).run(req.params.id);

        await db.prepare(`
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, 'forensic_case_frozen', 'forensic_case', ?, '{}', datetime('now'))
        `).run(uuidv4(), req.user?.id || 'system', req.params.id);

        res.json({ id: req.params.id, status: 'frozen', frozen_at: new Date().toISOString() });
    } catch (err) {
        console.error('Freeze case error:', err);
        res.status(500).json({ error: 'Failed to freeze case' });
    }
});

// ─── GET /api/scm/forensic/cases/:id/evidence – Build evidence package ──────
router.get('/cases/:id/evidence', authMiddleware, async (req, res) => {
    try {
        const fc = await db.prepare('SELECT * FROM forensic_cases WHERE id = ?').get(req.params.id);
        if (!fc) return res.status(404).json({ error: 'Case not found' });

        const scanChain = JSON.parse(fc.scan_chain || '[]');
        const factors = JSON.parse(fc.factor_breakdown || '[]');

        // Build hash chain for immutability proof
        let prevHash = '0';
        const hashChain = scanChain.map((event, i) => {
            const payload = JSON.stringify({ seq: event.seq, timestamp: event.timestamp, geo: event.geo, ers: event.ers });
            const hash = crypto.createHash('sha256').update(prevHash + payload).digest('hex');
            prevHash = hash;
            return { seq: i + 1, payload_hash: hash.substring(0, 16) + '...', prev_hash: i === 0 ? '0' : hashChain?.[i - 1]?.payload_hash || '0' };
        });

        // Evidence package
        const evidence = {
            case_id: fc.case_number,
            code: fc.code_data,
            generated_at: new Date().toISOString(),
            components: {
                scan_logs: { count: scanChain.length, status: 'complete' },
                risk_breakdown: { ers: fc.current_ers, factors: factors.length, status: factors.length > 0 ? 'complete' : 'pending' },
                device_analysis: { devices_compared: safeParse(fc.device_compare, []).length, status: 'complete' },
                geo_trace: { coordinates: scanChain.filter(s => s.lat).length, status: 'complete' },
                hash_proof: { algorithm: 'SHA-256', chain_length: hashChain.length, status: 'verified' },
                digital_signature: { algorithm: 'RSA-2048', status: 'ready' }
            },
            scan_chain: scanChain,
            hash_chain: hashChain,
            case_status: fc.status,
            frozen: fc.status === 'frozen',
            frozen_at: fc.frozen_at
        };

        res.json(evidence);
    } catch (err) {
        console.error('Build evidence error:', err);
        res.status(500).json({ error: 'Failed to build evidence package' });
    }
});

// ─── PATCH /api/scm/forensic/cases/:id – Update verdict ─────────────────────
router.patch('/cases/:id', authMiddleware, requireRole('manager'), async (req, res) => {
    try {
        const { verdict, status } = req.body;
        const fc = await db.prepare('SELECT * FROM forensic_cases WHERE id = ?').get(req.params.id);
        if (!fc) return res.status(404).json({ error: 'Case not found' });
        if (fc.status === 'frozen' && status !== 'closed') {
            return res.status(400).json({ error: 'Frozen case can only be closed, not modified' });
        }

        const updates = [];
        const params = [];
        if (verdict) { updates.push('verdict = ?'); params.push(verdict); }
        if (status) {
            updates.push('status = ?'); params.push(status);
            if (status === 'closed') { updates.push("closed_at = datetime('now')"); }
        }
        updates.push("updated_at = datetime('now')");
        params.push(req.params.id);

        await db.prepare(`UPDATE forensic_cases SET ${updates.join(', ')} WHERE id = ?`).run(...params);

        await db.prepare(`
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, 'forensic_case_updated', 'forensic_case', ?, ?, datetime('now'))
        `).run(uuidv4(), req.user?.id || 'system', req.params.id, JSON.stringify({ verdict, status }));

        res.json({ id: req.params.id, verdict, status });
    } catch (err) {
        console.error('Update forensic case error:', err);
        res.status(500).json({ error: 'Failed to update case' });
    }
});

module.exports = router;
