/**
 * Ops Monitoring Routes v2.0 — Incident Escalation Framework
 * Pipeline Health, Incidents (full lifecycle), Runbooks, War Room, Post-Mortem, Metrics
 * Endpoints: 16 | Mount: /api/ops
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requirePermission } = require('../auth');
const opsEngine = require('../engines/ops-monitoring-engine');
const { v4: uuidv4 } = require('uuid');
router.use(authMiddleware);

// ─── GET /health — Pipeline health (SLO-based) ─────────────────
router.get('/health', async (req, res) => {
    try { res.json(opsEngine.checkPipelineHealth()); }
    catch (err) { res.status(500).json({ error: 'Health check failed' }); }
});

// ─── POST /incidents — Create incident ──────────────────────────
router.post('/incidents', requirePermission('risk:view'), async (req, res) => {
    try {
        const result = opsEngine.createIncident({
            ...req.body,
            triggered_by: req.user?.id || 'system'
        });
        if (result.error) return res.status(400).json(result);
        // Persist to DB
        const orgId = req.user?.org_id || req.user?.orgId || null;
        try {
            await db.prepare('INSERT INTO ops_incidents (id,incident_id,title,description,severity,status,runbook_key,triggered_by,org_id,hash,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,NOW())')
                .run(uuidv4(), result.incident_id, result.title, result.description, req.body.severity || 'SEV3', 'open', req.body.runbook_key, req.user?.id, orgId, result.hash);
        } catch (dbErr) { console.warn('[ops] DB persist failed:', dbErr.message); }
        res.status(201).json(result);
    } catch (err) { res.status(500).json({ error: 'Incident creation failed' }); }
});

// ─── GET /incidents — List incidents ────────────────────────────
router.get('/incidents', async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const orgId = req.user?.org_id || req.user?.orgId;

        // Try DB first
        try {
            const params = [];
            let sql = 'SELECT * FROM ops_incidents';
            const conditions = [];
            if (orgId && req.user?.role !== 'super_admin') {
                conditions.push('org_id = ?');
                params.push(orgId);
            }
            if (req.query.status) {
                conditions.push('status = ?');
                params.push(req.query.status);
            }
            if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
            sql += ' ORDER BY created_at DESC LIMIT ?';
            params.push(limit);

            const incidents = await db.all(sql, params);
            return res.json({ title: 'Ops Incidents', total: incidents.length, incidents });
        } catch (dbErr) {
            // DB table might not exist — fall back to in-memory engine
            console.warn('[ops] DB query failed, using in-memory:', dbErr.message);
            const incidents = opsEngine.getAllIncidents(limit);
            return res.json({ title: 'Ops Incidents', total: incidents.length, incidents });
        }
    } catch (err) { res.status(500).json({ error: 'Incidents query failed' }); }
});

// ─── POST /incidents/:id/escalate — Manual escalation ───────────
router.post('/incidents/:id/escalate', requirePermission('risk:view'), (req, res) => {
    const { reason, new_severity } = req.body;
    const result = opsEngine.escalateIncident(
        req.params.id,
        req.user?.id || 'unknown',
        reason || 'Manual escalation',
        new_severity
    );
    if (result.error) return res.status(400).json(result);
    res.json(result);
});

// ─── PUT /incidents/:id — Update status/fields ─────────────────
router.put('/incidents/:id', requirePermission('risk:view'), async (req, res) => {
    try {
        const { status, assignee, severity } = req.body;
        const orgId = req.user?.org_id || req.user?.orgId;
        const updates = [];
        const params = [];

        if (status) { updates.push('status = ?'); params.push(status); }
        if (assignee) { updates.push('assignee = ?'); params.push(assignee); }
        if (severity) { updates.push('severity = ?'); params.push(severity); }
        if (status === 'resolved') { updates.push('resolved_at = NOW()'); }
        updates.push('updated_at = NOW()');

        if (updates.length === 1) return res.status(400).json({ error: 'No fields to update' });

        let sql = `UPDATE ops_incidents SET ${updates.join(', ')} WHERE id = ?`;
        params.push(req.params.id);
        if (orgId && req.user?.role !== 'super_admin') {
            sql += ' AND org_id = ?';
            params.push(orgId);
        }

        await db.run(sql, params);
        res.json({ ok: true, id: req.params.id, status: status || 'unchanged' });
    } catch (err) {
        console.error('[ops] Update incident error:', err.message);
        res.status(500).json({ error: 'Update failed' });
    }
});

// ─── DELETE /incidents/:id — Remove incident ───────────────────
router.delete('/incidents/:id', requirePermission('risk:view'), async (req, res) => {
    try {
        const orgId = req.user?.org_id || req.user?.orgId;
        let sql = 'DELETE FROM ops_incidents WHERE id = ?';
        const params = [req.params.id];
        if (orgId && req.user?.role !== 'super_admin') {
            sql += ' AND org_id = ?';
            params.push(orgId);
        }
        await db.run(sql, params);
        res.json({ ok: true, deleted: req.params.id });
    } catch (err) {
        console.error('[ops] Delete incident error:', err.message);
        res.status(500).json({ error: 'Delete failed' });
    }
});


router.put('/incidents/:id/assign', requirePermission('risk:view'), (req, res) => {
    const { assigned_to } = req.body;
    if (!assigned_to) return res.status(400).json({ error: 'assigned_to required' });
    const result = opsEngine.assignIncident(req.params.id, assigned_to, req.user?.id || 'unknown');
    if (result.error) return res.status(400).json(result);
    res.json(result);
});

// ─── PUT /incidents/:id/resolve — Resolve + attach RCA ──────────
router.put('/incidents/:id/resolve', requirePermission('risk:view'), (req, res) => {
    const { resolution, root_cause } = req.body;
    if (!resolution) return res.status(400).json({ error: 'resolution required' });
    const result = opsEngine.resolveIncident(
        req.params.id,
        req.user?.id || 'unknown',
        resolution,
        root_cause || 'TBD'
    );
    if (result.error) return res.status(400).json(result);
    res.json(result);
});

// ─── POST /incidents/:id/war-room — Activate war room ───────────
router.post('/incidents/:id/war-room', requirePermission('admin:manage'), (req, res) => {
    const result = opsEngine.activateWarRoom(req.params.id, req.user?.id || 'unknown');
    if (result.error) return res.status(400).json(result);
    res.status(201).json(result);
});

// ─── GET /incidents/:id/timeline — Event timeline ───────────────
router.get('/incidents/:id/timeline', (req, res) => {
    const result = opsEngine.getIncidentTimeline(req.params.id);
    if (result.error) return res.status(404).json(result);
    res.json(result);
});

// ─── POST /incidents/:id/post-mortem — Create post-mortem ───────
router.post('/incidents/:id/post-mortem', requirePermission('compliance:review'), (req, res) => {
    const result = opsEngine.createPostMortem(
        req.params.id,
        req.user?.id || 'unknown',
        req.body
    );
    if (result.error) return res.status(400).json(result);
    res.status(201).json(result);
});

// ─── GET /sla/violations — SLA breach tracking ─────────────────
router.get('/sla/violations', (req, res) => {
    res.json(opsEngine.getSLAViolations());
});

// ─── GET /incidents/correlation — Cross-module correlation ──────
router.get('/incidents/correlation', (req, res) => {
    res.json(opsEngine.getCorrelation());
});

// ─── GET /metrics/mttr — Mean Time to Resolve / Acknowledge ─────
router.get('/metrics/mttr', (req, res) => {
    res.json(opsEngine.getMTTR());
});

// ─── GET /metrics/frequency — Incident frequency analysis ───────
router.get('/metrics/frequency', (req, res) => {
    res.json(opsEngine.getFrequency());
});

// ─── GET /runbooks — Available runbooks ─────────────────────────
router.get('/runbooks', (req, res) => {
    res.json({ title: 'Standardized Runbooks', runbooks: opsEngine.getRunbooks() });
});

// ─── GET /boundary — Ops role boundary ──────────────────────────
router.get('/boundary', (req, res) => {
    res.json(opsEngine.getOpsBoundary());
});

// ─── GET /slos — SLO thresholds ─────────────────────────────────
router.get('/slos', (req, res) => {
    res.json({ title: 'SLO Thresholds', slos: opsEngine.getSLOs(), severities: opsEngine.getSeverities() });
});

module.exports = router;
