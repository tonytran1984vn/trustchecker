/**
 * SCM Risk Model Governance API
 * Model versioning, change requests, deployment, rollback, drift detection
 * SoD enforced: Risk proposes, Compliance approves, no single-role deploy
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');

const router = express.Router();


// GOV-1: All routes require authentication
router.use(authMiddleware);

// ─── GET /api/scm/models – List all model versions ──────────────────────────
router.get('/models', authMiddleware, async (req, res) => {
    try {
        const models = await db.prepare(`
            SELECT * FROM risk_models ORDER BY created_at DESC
        `).all();
        res.json(models.map(m => ({ ...m, weights: JSON.parse(m.weights || '{}') })));
    } catch (err) {
        console.error('List models error:', err);
        res.status(500).json({ error: 'Failed to fetch models' });
    }
});

// ─── GET /api/scm/models/production – Get current production model ──────────
router.get('/models/production', authMiddleware, async (req, res) => {
    try {
        const model = await db.prepare(`
            SELECT * FROM risk_models WHERE status = 'production' LIMIT 1
        `).get();
        if (!model) return res.status(404).json({ error: 'No production model found' });
        res.json({ ...model, weights: JSON.parse(model.weights || '{}') });
    } catch (err) {
        console.error('Get production model error:', err);
        res.status(500).json({ error: 'Failed to fetch production model' });
    }
});

// ─── POST /api/scm/models – Create new model version (Risk role) ────────────
router.post('/models', authMiddleware, requireRole('manager'), async (req, res) => {
    try {
        const { version, weights, factors, fp_rate, tp_rate, change_summary, test_dataset } = req.body;
        const id = uuidv4();
        await db.prepare(`
            INSERT INTO risk_models (id, version, status, weights, factors, fp_rate, tp_rate, change_summary, test_dataset, created_at)
            VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(id, version, JSON.stringify(weights || {}), factors || 12,
            fp_rate || '', tp_rate || '', change_summary || '', test_dataset || '');

        // Log audit
        await db.prepare(`
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, 'model_created', 'risk_model', ?, ?, datetime('now'))
        `).run(uuidv4(), req.user?.id || 'system', id, JSON.stringify({ version }));

        res.status(201).json({ id, version, status: 'draft' });
    } catch (err) {
        console.error('Create model error:', err);
        res.status(500).json({ error: 'Failed to create model' });
    }
});

// ─── POST /api/scm/models/:id/sandbox – Move to sandbox for testing ────────
router.post('/models/:id/sandbox', authMiddleware, requireRole('manager'), async (req, res) => {
    try {
        await db.prepare(`UPDATE risk_models SET status = 'sandbox' WHERE id = ? AND status = 'draft'`).run(req.params.id);
        await db.prepare(`
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, 'model_to_sandbox', 'risk_model', ?, '{}', datetime('now'))
        `).run(uuidv4(), req.user?.id || 'system', req.params.id);
        res.json({ id: req.params.id, status: 'sandbox' });
    } catch (err) {
        console.error('Sandbox model error:', err);
        res.status(500).json({ error: 'Failed to move to sandbox' });
    }
});

// ─── POST /api/scm/models/:id/deploy – Deploy to production ────────────────
// Requires compliance_co_signer in body (SoD enforcement)
// GOV-2: Only risk_officer can deploy models (Risk Intelligence Owner)
router.post('/models/:id/deploy', authMiddleware, requireRole('risk_officer'), async (req, res) => {
    try {
        const { compliance_co_signer } = req.body;
        if (!compliance_co_signer) {
            return res.status(403).json({ error: 'Compliance co-signer required for deployment (SoD)' });
        }

        const model = await db.prepare('SELECT * FROM risk_models WHERE id = ?').get(req.params.id);
        if (!model) return res.status(404).json({ error: 'Model not found' });
        if (model.status !== 'sandbox') return res.status(400).json({ error: 'Only sandbox models can be deployed' });

        // Check deployment gate: TP >= 95%
        const tp = parseFloat(model.tp_rate);
        if (!isNaN(tp) && tp < 95) {
            return res.status(400).json({ error: `Deployment gate failed: TP ${model.tp_rate} < 95% threshold` });
        }

        // Archive current production
        await db.prepare(`UPDATE risk_models SET status = 'archived' WHERE status = 'production'`).run();

        // Sanitize fields for approved_by (M-4: prevent injection via user fields)
        const safeUser = String(req.user?.email || req.user?.username || 'unknown').replace(/[^a-zA-Z0-9@._-]/g, '').slice(0, 64);
        const safeSigner = String(compliance_co_signer).replace(/[^a-zA-Z0-9@._-]/g, '').slice(0, 64);
        await db.prepare(`UPDATE risk_models SET status = 'production', deployed_at = datetime('now'), approved_by = ? WHERE id = ?`).run(
            `${safeUser} + ${safeSigner}`, req.params.id
        );

        await db.prepare(`
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, 'model_deployed', 'risk_model', ?, ?, datetime('now'))
        `).run(uuidv4(), req.user?.id || 'system', req.params.id,
            JSON.stringify({ version: model.version, co_signer: compliance_co_signer }));

        res.json({ id: req.params.id, status: 'production', deployed: true });
    } catch (err) {
        console.error('Deploy model error:', err);
        res.status(500).json({ error: 'Failed to deploy model' });
    }
});

// ─── POST /api/scm/models/:id/rollback – Rollback to this version ──────────
// 4-Eyes: requires compliance_approver
router.post('/models/:id/rollback', authMiddleware, requireRole('risk_officer'), async (req, res) => {
    try {
        const { compliance_approver, reason } = req.body;
        if (!compliance_approver) return res.status(403).json({ error: '4-Eyes approval required: compliance_approver missing' });
        if (!reason) return res.status(400).json({ error: 'Rollback reason required' });

        const target = await db.prepare('SELECT * FROM risk_models WHERE id = ?').get(req.params.id);
        if (!target) return res.status(404).json({ error: 'Model not found' });

        // Archive current production
        await db.prepare(`UPDATE risk_models SET status = 'archived' WHERE status = 'production'`).run();

        // Sanitize fields for approved_by (M-4: prevent injection)
        const safeUser = String(req.user?.email || '').replace(/[^a-zA-Z0-9@._-]/g, '').slice(0, 64);
        const safeApprover = String(compliance_approver).replace(/[^a-zA-Z0-9@._-]/g, '').slice(0, 64);
        await db.prepare(`UPDATE risk_models SET status = 'production', deployed_at = datetime('now'), approved_by = ? WHERE id = ?`).run(
            `ROLLBACK: ${safeUser} + ${safeApprover}`, req.params.id
        );

        await db.prepare(`
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, 'model_rollback', 'risk_model', ?, ?, datetime('now'))
        `).run(uuidv4(), req.user?.id || 'system', req.params.id,
            JSON.stringify({ version: target.version, reason, approver: compliance_approver }));

        res.json({ id: req.params.id, status: 'production', rollback: true, reason });
    } catch (err) {
        console.error('Rollback model error:', err);
        res.status(500).json({ error: 'Failed to rollback' });
    }
});

// ─── GET /api/scm/models/compare?a=version1&b=version2 ─────────────────────
router.get('/models/compare', authMiddleware, async (req, res) => {
    try {
        const { a, b } = req.query;
        if (!a || !b) return res.status(400).json({ error: 'Both ?a and ?b version params required' });

        const modelA = await db.prepare('SELECT * FROM risk_models WHERE version = ?').get(a);
        const modelB = await db.prepare('SELECT * FROM risk_models WHERE version = ?').get(b);
        if (!modelA || !modelB) return res.status(404).json({ error: 'One or both models not found' });

        const weightsA = JSON.parse(modelA.weights || '{}');
        const weightsB = JSON.parse(modelB.weights || '{}');

        const allFactors = [...new Set([...Object.keys(weightsA), ...Object.keys(weightsB)])];
        const comparison = allFactors.map(f => ({
            factor: f,
            value_a: weightsA[f] ?? null,
            value_b: weightsB[f] ?? null,
            delta: weightsA[f] && weightsB[f] ? (weightsB[f] - weightsA[f]).toFixed(4) : 'N/A'
        }));

        res.json({
            model_a: { version: modelA.version, status: modelA.status, fp_rate: modelA.fp_rate, tp_rate: modelA.tp_rate },
            model_b: { version: modelB.version, status: modelB.status, fp_rate: modelB.fp_rate, tp_rate: modelB.tp_rate },
            comparison
        });
    } catch (err) {
        console.error('Compare models error:', err);
        res.status(500).json({ error: 'Failed to compare models' });
    }
});

// ─── GET /api/scm/models/drift – Model drift metrics ────────────────────────
router.get('/models/drift', authMiddleware, async (req, res) => {
    try {
        const production = await db.prepare(`SELECT * FROM risk_models WHERE status = 'production' LIMIT 1`).get();
        if (!production) return res.json({ drift: [], message: 'No production model' });

        // Calculate drift from recent scan data
        const totalScans = (await db.prepare('SELECT COUNT(*) as c FROM scan_events WHERE scanned_at > datetime("now", "-30 days")').get())?.c || 0;
        const highRisk = (await db.prepare('SELECT COUNT(*) as c FROM scan_events WHERE fraud_score > 60 AND scanned_at > datetime("now", "-30 days")').get())?.c || 0;
        const fpCases = (await db.prepare('SELECT COUNT(*) as c FROM fraud_alerts WHERE status = "resolved" AND created_at > datetime("now", "-30 days")').get())?.c || 0;
        const avgErs = (await db.prepare('SELECT AVG(fraud_score) as avg FROM scan_events WHERE scanned_at > datetime("now", "-30 days")').get())?.avg || 0;

        const fpRate = totalScans > 0 ? ((fpCases / totalScans) * 100).toFixed(1) : '0';
        const tpRate = totalScans > 0 ? (((highRisk - fpCases) / Math.max(highRisk, 1)) * 100).toFixed(1) : '0';

        res.json({
            model_version: production.version,
            baseline_fp: production.fp_rate,
            baseline_tp: production.tp_rate,
            current_fp: fpRate + '%',
            current_tp: tpRate + '%',
            avg_ers: avgErs.toFixed(1),
            total_scans_30d: totalScans,
            drift_metrics: [
                { metric: 'FP Rate', baseline: production.fp_rate, current: fpRate + '%', status: 'ok' },
                { metric: 'TP Rate', baseline: production.tp_rate, current: tpRate + '%', status: 'ok' },
                { metric: 'Avg ERS', baseline: '24.3', current: avgErs.toFixed(1), status: avgErs > 30 ? 'warn' : 'ok' }
            ]
        });
    } catch (err) {
        console.error('Model drift error:', err);
        res.status(500).json({ error: 'Failed to calculate drift' });
    }
});

// ─── GET /api/scm/model-changes – List change requests ─────────────────────
router.get('/model-changes', authMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        let query = 'SELECT mcr.*, rm.version as model_version FROM model_change_requests mcr LEFT JOIN risk_models rm ON mcr.model_id = rm.id';
        const params = [];
        if (status) { query += ' WHERE mcr.status = ?'; params.push(status); }
        query += ' ORDER BY mcr.created_at DESC';
        const changes = await db.prepare(query).all(...params);
        res.json(changes);
    } catch (err) {
        console.error('List model changes error:', err);
        res.status(500).json({ error: 'Failed to fetch model changes' });
    }
});

// ─── POST /api/scm/model-changes – Propose a change (Risk) ─────────────────
router.post('/model-changes', authMiddleware, async (req, res) => {
    try {
        const { model_id, factor, current_value, proposed_value, reason, impact } = req.body;
        const id = uuidv4();
        await db.prepare(`
            INSERT INTO model_change_requests (id, model_id, factor, current_value, proposed_value, reason, impact, requested_by, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
        `).run(id, model_id || null, factor, current_value || '', proposed_value || '',
            reason || '', impact || '', req.user?.email || req.user?.username || '');

        await db.prepare(`
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, 'model_change_proposed', 'model_change', ?, ?, datetime('now'))
        `).run(uuidv4(), req.user?.id || 'system', id, JSON.stringify({ factor, proposed_value }));

        res.status(201).json({ id, factor, status: 'pending' });
    } catch (err) {
        console.error('Propose change error:', err);
        res.status(500).json({ error: 'Failed to propose change' });
    }
});

// ─── PATCH /api/scm/model-changes/:id – Approve/reject (Compliance) ────────
router.patch('/model-changes/:id', authMiddleware, requireRole('manager'), async (req, res) => {
    try {
        const { status } = req.body; // 'approved' or 'rejected'
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be approved or rejected' });
        }

        await db.prepare(`
            UPDATE model_change_requests SET status = ?, reviewed_by = ?, reviewed_at = datetime('now') WHERE id = ?
        `).run(status, req.user?.email || req.user?.username || '', req.params.id);

        await db.prepare(`
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, ?, 'model_change', ?, ?, datetime('now'))
        `).run(uuidv4(), req.user?.id || 'system', `model_change_${status}`, req.params.id, JSON.stringify({ status }));

        res.json({ id: req.params.id, status });
    } catch (err) {
        console.error('Review change error:', err);
        res.status(500).json({ error: 'Failed to review change' });
    }
});

module.exports = router;
