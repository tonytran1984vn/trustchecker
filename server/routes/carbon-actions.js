/**
 * Carbon Action Items Routes
 * Bridge between Carbon Officer insights → actionable tasks for COO/CFO/Procurement
 *
 * GET    /api/carbon-actions       — List actions (filter by org, status, assignee)
 * GET    /api/carbon-actions/my    — Actions assigned to current user
 * GET    /api/carbon-actions/suggestions — Auto-generated action suggestions from risk data
 * POST   /api/carbon-actions       — Create action (Carbon Officer)
 * PATCH  /api/carbon-actions/:id   — Update status/notes
 * DELETE /api/carbon-actions/:id   — Delete action (creator only)
 */
const router = require('express').Router();
const db = require('../db');
const { authMiddleware } = require('../auth');
const { cacheMiddleware } = require('../cache');
const crypto = require('crypto');

router.use(authMiddleware);

// ─── Init table ────────────────────────────────────────────────────────────────
(async () => {
    try {
        await db.run(`CREATE TABLE IF NOT EXISTS carbon_actions (
            id TEXT PRIMARY KEY,
            org_id TEXT,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            category TEXT DEFAULT 'other',
            priority TEXT DEFAULT 'medium',
            status TEXT DEFAULT 'open',
            assigned_to TEXT,
            assigned_role TEXT DEFAULT '',
            created_by TEXT,
            source_type TEXT DEFAULT 'manual',
            source_ref TEXT DEFAULT '',
            due_date TEXT,
            completed_at TEXT,
            notes TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        )`);
    } catch (e) { console.error('[carbon-actions] Table init:', e.message); }
})();

// ─── GET / — List all actions for this org ─────────────────────────────────────
router.get('/', cacheMiddleware(10), async (req, res) => {
    try {
        const orgId = req.tenantId || req.user?.orgId || req.user?.org_id || null;
        const { status, priority, assigned_to } = req.query;

        let sql = `SELECT ca.*, u1.email as creator_email, u2.email as assignee_email
                    FROM carbon_actions ca
                    LEFT JOIN users u1 ON ca.created_by = u1.id
                    LEFT JOIN users u2 ON ca.assigned_to = u2.id
                    WHERE ca.org_id = ?`;
        const params = [orgId];

        if (status && status !== 'all') { sql += ` AND ca.status = ?`; params.push(status); }
        if (priority) { sql += ` AND ca.priority = ?`; params.push(priority); }
        if (assigned_to) { sql += ` AND ca.assigned_to = ?`; params.push(assigned_to); }

        sql += ` ORDER BY CASE ca.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END, ca.created_at DESC`;

        const actions = await db.all(sql, params).catch(() => []);

        // Stats
        const allActions = await db.all(`SELECT status, COUNT(*) as cnt FROM carbon_actions WHERE org_id = ? GROUP BY status`, [orgId]).catch(() => []);
        const stats = { open: 0, in_progress: 0, done: 0, dismissed: 0, total: 0 };
        allActions.forEach(r => { stats[r.status] = r.cnt; stats.total += r.cnt; });

        res.json({ actions, stats });
    } catch (err) {
        console.error('[carbon-actions] List error:', err);
        res.status(500).json({ error: 'Failed to list actions' });
    }
});

// ─── GET /my — Actions assigned to current user ────────────────────────────────
router.get('/my', async (req, res) => {
    try {
        const userId = req.user?.id || req.user?.userId;
        const actions = await db.all(
            `SELECT ca.*, u.email as creator_email FROM carbon_actions ca
             LEFT JOIN users u ON ca.created_by = u.id
             WHERE ca.assigned_to = ? AND ca.status IN ('open','in_progress')
             ORDER BY CASE ca.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END`,
            [userId]
        ).catch(() => []);
        res.json({ actions, total: actions.length });
    } catch (err) {
        console.error('[carbon-actions] My actions error:', err);
        res.status(500).json({ error: 'Failed to get my actions' });
    }
});

// ─── GET /suggestions — Auto-generated action suggestions ──────────────────────
router.get('/suggestions', cacheMiddleware(120), async (req, res) => {
    try {
        const orgId = req.tenantId || req.user?.orgId || req.user?.org_id || null;
        const suggestions = [];

        // Check for low-grade partners
        const lowPartners = await db.all(
            `SELECT id, name, trust_score FROM partners WHERE org_id = ? AND trust_score < 50`, [orgId]
        ).catch(() => []);
        lowPartners.forEach(p => {
            suggestions.push({
                title: `Review partner: ${p.name}`,
                description: `Trust score ${p.trust_score}/100 — below threshold. Consider requiring ESG improvement plan or evaluating alternatives.`,
                category: 'partner_risk',
                priority: p.trust_score < 30 ? 'critical' : 'high',
                assigned_role: 'procurement',
                source_type: 'auto_risk',
                source_ref: `partner:${p.id}`
            });
        });

        // Check for high Scope 3 concentration
        const products = await db.all(
            orgId ? `SELECT * FROM products WHERE org_id = ? OR registered_by IN (SELECT id FROM users WHERE org_id = ?)` : `SELECT * FROM products LIMIT 200`,
            orgId ? [orgId, orgId] : []
        ).catch(() => []);

        const totalKg = products.reduce((s, p) => s + (p.carbon_footprint_kgco2e || 0), 0);
        if (totalKg > 0) {
            const s3Est = totalKg * 0.55;
            if (s3Est / totalKg > 0.6) {
                suggestions.push({
                    title: 'Optimize transport emissions (Scope 3)',
                    description: `Scope 3 estimated at ${Math.round(s3Est / totalKg * 100)}% of total emissions. Consider shifting air freight to sea/rail, consolidating shipments, or selecting lower-emission carriers.`,
                    category: 'scope_reduction',
                    priority: 'high',
                    assigned_role: 'coo',
                    source_type: 'auto_threshold',
                    source_ref: 'scope:3'
                });
            }
        }

        // Check data confidence — products without carbon data
        const noData = products.filter(p => !p.carbon_footprint_kgco2e || p.carbon_footprint_kgco2e === 0);
        if (noData.length > 3) {
            suggestions.push({
                title: `Upgrade data for ${noData.length} products`,
                description: `${noData.length} products have no carbon footprint data. Upgrade from proxy estimates to supplier-reported or measured values to improve confidence score.`,
                category: 'compliance',
                priority: 'medium',
                assigned_role: 'carbon_officer',
                source_type: 'auto_threshold',
                source_ref: 'confidence:low'
            });
        }

        // Check offset coverage
        let offsetTotal = 0, emissionT = totalKg / 1000;
        try {
            const off = await db.get(`SELECT COALESCE(SUM(quantity_tco2e),0) as r FROM carbon_offsets WHERE org_id = ? AND status = 'retired'`, [orgId]);
            offsetTotal = off?.r || 0;
        } catch (_) { }
        if (emissionT > 0 && offsetTotal / emissionT < 0.3) {
            suggestions.push({
                title: 'Increase carbon offset coverage',
                description: `Current offset coverage: ${Math.round(offsetTotal / emissionT * 100)}%. Consider purchasing additional carbon credits to improve ESG grade and regulatory readiness.`,
                category: 'offset',
                priority: 'medium',
                assigned_role: 'cfo',
                source_type: 'auto_threshold',
                source_ref: 'offset:low'
            });
        }

        // Filter out suggestions that already exist as actions
        const existing = await db.all(`SELECT source_ref FROM carbon_actions WHERE org_id = ? AND status != 'done'`, [orgId]).catch(() => []);
        const existingRefs = new Set(existing.map(e => e.source_ref));
        const filtered = suggestions.filter(s => !existingRefs.has(s.source_ref));

        res.json({ suggestions: filtered, total: filtered.length });
    } catch (err) {
        console.error('[carbon-actions] Suggestions error:', err);
        res.json({ suggestions: [], total: 0 });
    }
});

// ─── POST / — Create action ────────────────────────────────────────────────────
router.post('/', async (req, res) => {
    try {
        const orgId = req.tenantId || req.user?.orgId || req.user?.org_id || null;
        const userId = req.user?.id || req.user?.userId;
        const { title, description, category, priority, assigned_to, assigned_role, due_date, source_type, source_ref } = req.body;

        if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });

        const id = crypto.randomUUID();
        await db.run(
            `INSERT INTO carbon_actions (id, org_id, title, description, category, priority, assigned_to, assigned_role, created_by, source_type, source_ref, due_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, orgId, title.trim(), description || '', category || 'other', priority || 'medium',
                assigned_to || null, assigned_role || '', userId, source_type || 'manual', source_ref || '', due_date || null]
        );

        const action = await db.get(`SELECT ca.*, u1.email as creator_email, u2.email as assignee_email
            FROM carbon_actions ca LEFT JOIN users u1 ON ca.created_by = u1.id LEFT JOIN users u2 ON ca.assigned_to = u2.id
            WHERE ca.id = ?`, [id]);

        res.status(201).json({ action, message: 'Action created' });
    } catch (err) {
        console.error('[carbon-actions] Create error:', err);
        res.status(500).json({ error: 'Failed to create action' });
    }
});

// ─── PATCH /:id — Update action ────────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, notes, priority, assigned_to, due_date } = req.body;

        const existing = await db.get(`SELECT * FROM carbon_actions WHERE id = ?`, [id]);
        if (!existing) return res.status(404).json({ error: 'Action not found' });

        const updates = [];
        const params = [];
        if (status) { updates.push('status = ?'); params.push(status); }
        if (notes !== undefined) { updates.push('notes = ?'); params.push(notes); }
        if (priority) { updates.push('priority = ?'); params.push(priority); }
        if (assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(assigned_to || null); }
        if (due_date !== undefined) { updates.push('due_date = ?'); params.push(due_date || null); }
        if (status === 'done') { updates.push("completed_at = datetime('now')"); }
        updates.push("updated_at = datetime('now')");

        params.push(id);
        await db.run(`UPDATE carbon_actions SET ${updates.join(', ')} WHERE id = ?`, params);

        const action = await db.get(`SELECT ca.*, u1.email as creator_email, u2.email as assignee_email
            FROM carbon_actions ca LEFT JOIN users u1 ON ca.created_by = u1.id LEFT JOIN users u2 ON ca.assigned_to = u2.id
            WHERE ca.id = ?`, [id]);

        res.json({ action, message: 'Action updated' });
    } catch (err) {
        console.error('[carbon-actions] Update error:', err);
        res.status(500).json({ error: 'Failed to update action' });
    }
});

// ─── DELETE /:id — Delete action (creator only) ────────────────────────────────
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id || req.user?.userId;

        const existing = await db.get(`SELECT * FROM carbon_actions WHERE id = ?`, [id]);
        if (!existing) return res.status(404).json({ error: 'Action not found' });
        if (existing.created_by !== userId) return res.status(403).json({ error: 'Only the creator can delete this action' });

        await db.run(`DELETE FROM carbon_actions WHERE id = ?`, [id]);
        res.json({ message: 'Action deleted' });
    } catch (err) {
        console.error('[carbon-actions] Delete error:', err);
        res.status(500).json({ error: 'Failed to delete action' });
    }
});

// ─── GET /users — List org users for assignment dropdown ───────────────────────
router.get('/users', cacheMiddleware(60), async (req, res) => {
    try {
        const orgId = req.tenantId || req.user?.orgId || req.user?.org_id || null;
        const users = await db.all(
            `SELECT u.id, u.email, u.username, u.role FROM users u WHERE u.org_id = ? ORDER BY u.email`, [orgId]
        ).catch(() => []);
        res.json({ users });
    } catch (err) {
        res.json({ users: [] });
    }
});

module.exports = router;
