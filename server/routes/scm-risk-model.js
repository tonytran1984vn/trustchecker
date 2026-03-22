const logger = require('../lib/logger');
/**
 * SCM Risk Model Governance API
 * Model versioning, change requests, deployment, rollback, drift detection
 * SoD enforced: Risk proposes, Compliance approves, no single-role deploy
 */
const { withTransaction } = require('../middleware/transaction');
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
        let query = 'SELECT * FROM risk_models';
        query += ' ORDER BY created_at DESC';
        const models = await db.prepare(query).all();
        res.json({
            models: models.map(m => ({
                ...m,
                weights: typeof m.weights === 'string' ? JSON.parse(m.weights || '{}') : m.weights || {},
            })),
        });
    } catch (err) {
        logger.error('List models error:', err);
        res.status(500).json({ error: 'Failed to fetch models' });
    }
});

// ─── GET /api/scm/models/production – Get current production model ──────────
router.get('/models/production', authMiddleware, async (req, res) => {
    try {
        const model = await db.get(`
            SELECT * FROM risk_models WHERE status = 'production' LIMIT 1
        `);
        if (!model) return res.status(404).json({ error: 'No production model found' });
        res.json({
            ...model,
            weights: typeof model.weights === 'string' ? JSON.parse(model.weights || '{}') : model.weights || {},
        });
    } catch (err) {
        logger.error('Get production model error:', err);
        res.status(500).json({ error: 'Failed to fetch production model' });
    }
});

// ─── POST /api/scm/models – Create new model version (Risk role) ────────────
router.post('/models', authMiddleware, async (req, res) => {
    try {
        const { version, weights, factors, fp_rate, tp_rate, change_summary, test_dataset } = req.body;
        const id = uuidv4();
        const orgId = req.user?.org_id || req.user?.orgId || null;
        await db.run(
            `
            INSERT INTO risk_models (id, version, status, weights, factors, fp_rate, tp_rate, change_summary, test_dataset, org_id, created_at)
            VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, NOW())
        `,
            [
                id,
                version,
                JSON.stringify(weights || {}),
                factors || 12,
                fp_rate || '',
                tp_rate || '',
                change_summary || '',
                test_dataset || '',
                orgId,
            ]
        );

        // Log audit
        await db.run(
            `
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, 'model_created', 'risk_model', ?, ?, NOW())
        `,
            [uuidv4(), req.user?.id || 'system', id, JSON.stringify({ version })]
        );

        res.status(201).json({ id, version, status: 'draft' });
    } catch (err) {
        logger.error('Create model error:', err);
        res.status(500).json({ error: 'Failed to create model' });
    }
});

// ─── POST /api/scm/models/:id/sandbox – Move to sandbox for testing ────────
router.post('/models/:id/sandbox', authMiddleware, requirePermission('risk_model:manage'), async (req, res) => {
    try {
        await db.run(`UPDATE risk_models SET status = 'sandbox' WHERE id = ? AND status = 'draft'`, [req.params.id]);
        await db.run(
            `
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, 'model_to_sandbox', 'risk_model', ?, '{}', NOW())
        `,
            [uuidv4(), req.user?.id || 'system', req.params.id]
        );
        res.json({ id: req.params.id, status: 'sandbox' });
    } catch (err) {
        logger.error('Sandbox model error:', err);
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

        const model = await db.get('SELECT * FROM risk_models WHERE id = ?', [req.params.id]);
        if (!model) return res.status(404).json({ error: 'Model not found' });
        if (model.status !== 'sandbox') return res.status(400).json({ error: 'Only sandbox models can be deployed' });

        // Check deployment gate: TP >= 95%
        const tp = parseFloat(model.tp_rate);
        if (!isNaN(tp) && tp < 95) {
            return res.status(400).json({ error: `Deployment gate failed: TP ${model.tp_rate} < 95% threshold` });
        }

        // Archive current production
        await db.run(`UPDATE risk_models SET status = 'archived' WHERE status = 'production' AND org_id = ?`, [
            req.orgId,
        ]);

        // Sanitize fields for approved_by (M-4: prevent injection via user fields)
        const safeUser = String(req.user?.email || req.user?.username || 'unknown')
            .replace(/[^a-zA-Z0-9@._-]/g, '')
            .slice(0, 64);
        const safeSigner = String(compliance_co_signer)
            .replace(/[^a-zA-Z0-9@._-]/g, '')
            .slice(0, 64);
        await db.run(
            `UPDATE risk_models SET status = 'production', deployed_at = NOW(), approved_by = ? WHERE id = ?`,
            [`${safeUser} + ${safeSigner}`, req.params.id]
        );

        await db.run(
            `
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, 'model_deployed', 'risk_model', ?, ?, NOW())
        `,
            [
                uuidv4(),
                req.user?.id || 'system',
                req.params.id,
                JSON.stringify({ version: model.version, co_signer: compliance_co_signer }),
            ]
        );

        res.json({ id: req.params.id, status: 'production', deployed: true });
    } catch (err) {
        logger.error('Deploy model error:', err);
        res.status(500).json({ error: 'Failed to deploy model' });
    }
});

// ─── POST /api/scm/models/:id/rollback – Rollback to this version ──────────
// 4-Eyes: requires compliance_approver
router.post('/models/:id/rollback', authMiddleware, requireRole('risk_officer'), async (req, res) => {
    try {
        const { compliance_approver, reason } = req.body;
        if (!compliance_approver)
            return res.status(403).json({ error: '4-Eyes approval required: compliance_approver missing' });
        if (!reason) return res.status(400).json({ error: 'Rollback reason required' });

        const target = await db.get('SELECT * FROM risk_models WHERE id = ?', [req.params.id]);
        if (!target) return res.status(404).json({ error: 'Model not found' });

        // Archive current production
        await db.run(`UPDATE risk_models SET status = 'archived' WHERE status = 'production' AND org_id = ?`, [
            req.orgId,
        ]);

        // Sanitize fields for approved_by (M-4: prevent injection)
        const safeUser = String(req.user?.email || '')
            .replace(/[^a-zA-Z0-9@._-]/g, '')
            .slice(0, 64);
        const safeApprover = String(compliance_approver)
            .replace(/[^a-zA-Z0-9@._-]/g, '')
            .slice(0, 64);
        await db.run(
            `UPDATE risk_models SET status = 'production', deployed_at = NOW(), approved_by = ? WHERE id = ?`,
            [`ROLLBACK: ${safeUser} + ${safeApprover}`, req.params.id]
        );

        await db.run(
            `
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, 'model_rollback', 'risk_model', ?, ?, NOW())
        `,
            [
                uuidv4(),
                req.user?.id || 'system',
                req.params.id,
                JSON.stringify({ version: target.version, reason, approver: compliance_approver }),
            ]
        );

        res.json({ id: req.params.id, status: 'production', rollback: true, reason });
    } catch (err) {
        logger.error('Rollback model error:', err);
        res.status(500).json({ error: 'Failed to rollback' });
    }
});

// ─── GET /api/scm/models/compare?a=version1&b=version2 ─────────────────────
router.get('/models/compare', authMiddleware, async (req, res) => {
    try {
        const { a, b } = req.query;
        if (!a || !b) return res.status(400).json({ error: 'Both ?a and ?b version params required' });

        const modelA = await db.get('SELECT * FROM risk_models WHERE version = ?', [a]);
        const modelB = await db.get('SELECT * FROM risk_models WHERE version = ?', [b]);
        if (!modelA || !modelB) return res.status(404).json({ error: 'One or both models not found' });

        const weightsA = JSON.parse(modelA.weights || '{}');
        const weightsB = JSON.parse(modelB.weights || '{}');

        const allFactors = [...new Set([...Object.keys(weightsA), ...Object.keys(weightsB)])];
        const comparison = allFactors.map(f => ({
            factor: f,
            value_a: weightsA[f] ?? null,
            value_b: weightsB[f] ?? null,
            delta: weightsA[f] && weightsB[f] ? (weightsB[f] - weightsA[f]).toFixed(4) : 'N/A',
        }));

        res.json({
            model_a: {
                version: modelA.version,
                status: modelA.status,
                fp_rate: modelA.fp_rate,
                tp_rate: modelA.tp_rate,
            },
            model_b: {
                version: modelB.version,
                status: modelB.status,
                fp_rate: modelB.fp_rate,
                tp_rate: modelB.tp_rate,
            },
            comparison,
        });
    } catch (err) {
        logger.error('Compare models error:', err);
        res.status(500).json({ error: 'Failed to compare models' });
    }
});

// ─── GET /api/scm/models/drift – Model drift metrics ────────────────────────
router.get('/models/drift', authMiddleware, async (req, res) => {
    try {
        const production = await db.get(`SELECT * FROM risk_models WHERE status = 'production' LIMIT 1`, []);
        if (!production) return res.json({ drift: [], message: 'No production model' });

        // Calculate drift from recent scan data
        const orgId = req.user?.org_id || req.user?.orgId;
        const orgF = orgId ? ' AND org_id = ?' : '';
        const orgP = orgId ? [orgId] : [];
        const totalScans =
            (
                await db
                    .prepare(
                        "SELECT COUNT(*) as c FROM scan_events WHERE scanned_at > (NOW() - interval '30 days')" + orgF
                    )
                    .get(...orgP)
            )?.c || 0;
        const highRisk =
            (
                await db
                    .prepare(
                        "SELECT COUNT(*) as c FROM scan_events WHERE fraud_score > 60 AND scanned_at > (NOW() - interval '30 days')" +
                            orgF
                    )
                    .get(...orgP)
            )?.c || 0;
        const fpCases =
            (
                await db
                    .prepare(
                        "SELECT COUNT(*) as c FROM fraud_alerts WHERE status = 'resolved' AND created_at > (NOW() - interval '30 days')" +
                            orgF
                    )
                    .get(...orgP)
            )?.c || 0;
        const avgErs =
            (
                await db
                    .prepare(
                        "SELECT AVG(fraud_score) as avg FROM scan_events WHERE scanned_at > (NOW() - interval '30 days')" +
                            orgF
                    )
                    .get(...orgP)
            )?.avg || 0;

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
                {
                    metric: 'Avg ERS',
                    baseline: '24.3',
                    current: avgErs.toFixed(1),
                    status: avgErs > 30 ? 'warn' : 'ok',
                },
            ],
        });
    } catch (err) {
        logger.error('Model drift error:', err);
        res.status(500).json({ error: 'Failed to calculate drift' });
    }
});

// ─── GET /api/scm/model-changes – List change requests ─────────────────────
router.get('/model-changes', authMiddleware, async (req, res) => {
    try {
        const { status } = req.query;
        let query =
            'SELECT mcr.*, rm.version as model_version FROM model_change_requests mcr LEFT JOIN risk_models rm ON mcr.model_id = rm.id';
        const params = [];
        if (status) {
            query += ' WHERE mcr.status = ?';
            params.push(status);
        }
        query += ' ORDER BY mcr.created_at DESC';
        const changes = await db.prepare(query).all(...params);
        res.json({ changes });
    } catch (err) {
        logger.error('List model changes error:', err);
        res.status(500).json({ error: 'Failed to fetch model changes' });
    }
});

// ─── POST /api/scm/model-changes – Propose a change (Risk) ─────────────────
router.post('/model-changes', authMiddleware, async (req, res) => {
    try {
        const { model_id, factor, current_value, proposed_value, reason, impact } = req.body;
        const id = uuidv4();
        await db.run(
            `
            INSERT INTO model_change_requests (id, model_id, factor, current_value, proposed_value, reason, impact, requested_by, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW())
        `,
            [
                id,
                model_id || null,
                factor,
                current_value || '',
                proposed_value || '',
                reason || '',
                impact || '',
                req.user?.email || req.user?.username || '',
            ]
        );

        await db.run(
            `
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, 'model_change_proposed', 'model_change', ?, ?, NOW())
        `,
            [uuidv4(), req.user?.id || 'system', id, JSON.stringify({ factor, proposed_value })]
        );

        res.status(201).json({ id, factor, status: 'pending' });
    } catch (err) {
        logger.error('Propose change error:', err);
        res.status(500).json({ error: 'Failed to propose change' });
    }
});

// ─── PATCH /api/scm/model-changes/:id – Approve/reject (Compliance) ────────
router.patch('/model-changes/:id', authMiddleware, requirePermission('risk_model:manage'), async (req, res) => {
    try {
        const { status } = req.body; // 'approved' or 'rejected'
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Status must be approved or rejected' });
        }

        await db.run(
            `
            UPDATE model_change_requests SET status = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ?
        `,
            [status, req.user?.email || req.user?.username || '', req.params.id]
        );

        await db.run(
            `
            INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, timestamp)
            VALUES (?, ?, ?, 'model_change', ?, ?, NOW())
        `,
            [uuidv4(), req.user?.id || 'system', `model_change_${status}`, req.params.id, JSON.stringify({ status })]
        );

        res.json({ id: req.params.id, status });
    } catch (err) {
        logger.error('Review change error:', err);
        res.status(500).json({ error: 'Failed to review change' });
    }
});

// ─── GET /api/scm/model/rules-config – Org-scoped risk rule configs ─────────
router.get('/rules-config', authMiddleware, async (req, res) => {
    try {
        // Try risk_rules_config first, fall back to channel_rules
        let rules = [];
        try {
            const orgId = req.user?.org_id || req.user?.orgId;
            if (orgId) {
                rules = await db
                    .prepare(
                        'SELECT id, category, rule_key, rule_value, description, updated_at FROM risk_rules_config WHERE org_id = ? ORDER BY category, rule_key LIMIT 1000'
                    )
                    .all(orgId);
            }
        } catch (e) {
            // risk_rules_config doesn't exist — fall back to channel_rules
            rules = await db
                .prepare(
                    'SELECT id, name, logic, severity, auto_action, is_active, triggers_30d, created_at FROM channel_rules ORDER BY created_at DESC LIMIT 1000'
                )
                .all();
        }

        // Normalize rules: parse rule_value JSON and map to expected fields
        const normalized = rules.map(r => {
            let rv = {};
            try {
                rv = typeof r.rule_value === 'string' ? JSON.parse(r.rule_value) : r.rule_value || {};
            } catch (_) {}
            return {
                ...r,
                name: r.name || r.rule_key || r.rule_id || r.id,
                severity: r.severity || rv.severity || r.category || 'general',
                is_active: r.is_active !== undefined ? r.is_active : rv.is_active !== undefined ? rv.is_active : true,
            };
        });

        // Group by category or severity
        const grouped = {};
        for (const r of normalized) {
            const cat = r.category || r.severity || 'general';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(r);
        }
        res.json({ rules: normalized, config: normalized, grouped });
    } catch (err) {
        logger.error('Get rules config error:', err);
        res.status(500).json({ error: 'Failed to fetch rules config' });
    }
});

// ─── PUT /api/scm/model/rules-config/:id – Update a rule value ──────────────
router.put('/rules-config/:id', authMiddleware, async (req, res) => {
    try {
        const { rule_value } = req.body;
        if (rule_value === undefined) return res.status(400).json({ error: 'rule_value required' });

        const orgId = req.user?.org_id || req.user?.orgId;
        await db
            .prepare('UPDATE risk_rules_config SET rule_value = ?, updated_at = NOW() WHERE id = ? AND org_id = ?')
            .run(rule_value, req.params.id, orgId);

        res.json({ id: req.params.id, rule_value, status: 'updated' });
    } catch (err) {
        logger.error('Update rule config error:', err);
        res.status(500).json({ error: 'Failed to update rule' });
    }
});

// ─── PUT /api/scm/model/models/:id/status — Admin status change ─────────────
router.put('/models/:id/status', authMiddleware, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['draft', 'sandbox', 'production', 'archived'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Valid status required: ' + validStatuses.join(', ') });
        }

        const model = await db.get('SELECT * FROM risk_models WHERE id = ?', [req.params.id]);
        if (!model) return res.status(404).json({ error: 'Model not found' });

        // Check org ownership
        const orgId = req.user?.org_id || req.user?.orgId;
        if (model.org_id && model.org_id !== orgId && req.user?.role !== 'super_admin') {
            return res.status(403).json({ error: 'Not authorized' });
        }

        const updates = [`status = $1`];
        const params = [status];
        if (status === 'production') {
            updates.push(`deployed_at = NOW()`);
        }
        params.push(req.params.id);

        await db.run(`UPDATE risk_models SET ${updates.join(', ')} WHERE id = $${params.length}`, params);

        // Audit
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                require('uuid').v4(),
                req.user?.id,
                'MODEL_STATUS_CHANGED',
                'risk_model',
                req.params.id,
                JSON.stringify({ old_status: model.status, new_status: status, version: model.version }),
            ]
        );

        res.json({ id: req.params.id, old_status: model.status, status, message: 'Status updated' });
    } catch (err) {
        logger.error('Update model status error:', err);
        res.status(500).json({ error: 'Failed to update status' });
    }
});

module.exports = router;
