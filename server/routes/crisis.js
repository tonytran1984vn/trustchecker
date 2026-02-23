/**
 * Crisis Governance Routes v1.0
 * Kill-Switch + Crisis Level + Escalation + Drills
 * Mount: /api/crisis
 * Endpoints: 10
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission } = require('../auth');
const crisis = require('../engines/crisis-engine');

router.use(authMiddleware);

// ─── GET /status — Current crisis level + active kill-switches ─────
router.get('/status', (req, res) => {
    res.json(crisis.getStatus());
});

// ─── POST /kill-switch/tenant/:id — Halt specific tenant ───────────
router.post('/kill-switch/tenant/:id', requirePermission('admin:manage'), (req, res) => {
    const result = crisis.killTenant(
        req.params.id,
        req.user?.id || 'unknown',
        req.body.reason || 'No reason provided',
        req.user?.role || 'unknown'
    );
    if (result.error) return res.status(403).json(result);
    res.status(201).json(result);
});

// ─── POST /kill-switch/module/:name — Halt specific module ─────────
router.post('/kill-switch/module/:name', requirePermission('admin:manage'), (req, res) => {
    const result = crisis.killModule(
        req.params.name,
        req.user?.id || 'unknown',
        req.body.reason || 'No reason provided',
        req.user?.role || 'unknown'
    );
    if (result.error) return res.status(403).json(result);
    res.status(201).json(result);
});

// ─── POST /kill-switch/global — System-wide halt (dual-key) ────────
router.post('/kill-switch/global', requirePermission('admin:manage'), (req, res) => {
    const result = crisis.killGlobal(
        req.user?.id || 'unknown',
        req.body.reason || 'No reason provided',
        req.user?.role || 'unknown'
    );
    if (result.error) return res.status(403).json(result);
    const status = result.status === 'awaiting_second_key' ? 202 : 201;
    res.status(status).json(result);
});

// ─── POST /deactivate/:id — Restore from kill-switch ───────────────
router.post('/deactivate/:id', requirePermission('admin:manage'), (req, res) => {
    const result = crisis.deactivate(
        req.params.id,
        req.user?.id || 'unknown',
        req.body.reason || 'No reason provided',
        req.user?.role || 'unknown'
    );
    if (result.error) return res.status(400).json(result);
    res.json(result);
});

// ─── GET /escalation-matrix — View escalation rules ────────────────
router.get('/escalation-matrix', (req, res) => {
    res.json({
        matrix: crisis.getEscalationMatrix(),
        levels: crisis.getCrisisLevels(),
        auto_deactivation: crisis.getAutoDeactivationPolicy(),
    });
});

// ─── POST /escalate — Manual escalation ────────────────────────────
router.post('/escalate', requirePermission('admin:manage'), (req, res) => {
    const { from, to, trigger } = req.body;
    if (!from || !to) return res.status(400).json({ error: 'from and to levels required' });
    const result = crisis.escalate(
        from, to, trigger || 'manual',
        req.user?.id || 'unknown',
        req.user?.role || 'unknown'
    );
    if (result.error) return res.status(400).json(result);
    res.json(result);
});

// ─── GET /audit-trail — Kill-switch history ────────────────────────
router.get('/audit-trail', requirePermission('audit:view'), (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    res.json({
        title: 'Crisis Audit Trail',
        total: crisis.getAuditTrail(limit).length,
        events: crisis.getAuditTrail(limit),
    });
});

// ─── GET /playbooks — Crisis playbook templates ────────────────────
router.get('/playbooks', (req, res) => {
    const playbooks = crisis.getPlaybooks();
    res.json({
        title: 'Crisis Playbooks',
        total: Object.keys(playbooks).length,
        playbooks: Object.entries(playbooks).map(([key, pb]) => ({
            key,
            name: pb.name,
            severity: pb.severity,
            steps_count: pb.steps.length,
            steps: pb.steps,
        })),
    });
});

// ─── POST /drill — Execute crisis drill (simulation) ───────────────
router.post('/drill', requirePermission('admin:manage'), (req, res) => {
    const { action, playbook_key } = req.body;
    if (action === 'end') {
        const result = crisis.endDrill(req.user?.id || 'unknown');
        return res.json(result);
    }
    if (!playbook_key) return res.status(400).json({ error: 'playbook_key required', available: Object.keys(crisis.getPlaybooks()) });
    const result = crisis.startDrill(req.user?.id || 'unknown', playbook_key);
    if (result.error) return res.status(400).json(result);
    res.status(201).json(result);
});

module.exports = router;
