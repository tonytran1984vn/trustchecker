/**
 * Audit Log API — Read-only audit trail for auditor + compliance roles
 * 
 * GET /api/audit-log         — Paginated audit log entries
 * GET /api/audit-log/stats   — Summary stats
 * GET /api/audit-log/export  — CSV export (compliance_officer only)
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requirePermission } = require('../auth');

// All routes require auth + audit_log:view permission
router.use(authMiddleware, requirePermission('audit_log:view'));

/**
 * GET /api/audit-log — Paginated audit entries
 * Query: ?page=1&limit=50&action=login&actor=user@example.com&from=2026-01-01&to=2026-02-01
 */
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
        const offset = (page - 1) * limit;

        let where = ['1=1'];
        const params = [];

        // Tenant isolation — non-platform users only see their tenant's logs
        if (req.user.user_type !== 'platform') {
            where.push('(tenant_id = ? OR tenant_id IS NULL)');
            params.push(req.user.tenant_id);
        }

        // Filters
        if (req.query.action) {
            where.push('action LIKE ?');
            params.push(`%${req.query.action}%`);
        }
        if (req.query.actor) {
            where.push('(actor_email LIKE ? OR actor_id = ?)');
            params.push(`%${req.query.actor}%`, req.query.actor);
        }
        if (req.query.from) {
            where.push('created_at >= ?');
            params.push(req.query.from);
        }
        if (req.query.to) {
            where.push('created_at <= ?');
            params.push(req.query.to);
        }
        if (req.query.severity) {
            where.push('severity = ?');
            params.push(req.query.severity);
        }

        const whereClause = where.join(' AND ');

        // Count total
        const countRow = await db.get(
            `SELECT COUNT(*) as total FROM audit_log WHERE ${whereClause}`, params
        );
        const total = countRow?.total || 0;

        // Fetch page
        const entries = await db.all(
            `SELECT id, actor_id, actor_email, actor_role, action, resource, resource_id,
                    details, ip_address, user_agent, severity, tenant_id, created_at
             FROM audit_log
             WHERE ${whereClause}
             ORDER BY created_at DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            entries,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        });
    } catch (err) {
        console.error('[audit-log] List error:', err);
        res.status(500).json({ error: 'Failed to load audit log' });
    }
});

/**
 * GET /api/audit-log/stats — Summary statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const tenantFilter = req.user.user_type !== 'platform'
            ? 'AND (tenant_id = ? OR tenant_id IS NULL)' : '';
        const params = req.user.user_type !== 'platform' ? [req.user.tenant_id] : [];

        const [total, today, byAction, bySeverity] = await Promise.all([
            db.get(`SELECT COUNT(*) as count FROM audit_log WHERE 1=1 ${tenantFilter}`, params),
            db.get(`SELECT COUNT(*) as count FROM audit_log WHERE created_at >= date('now') ${tenantFilter}`, params),
            db.all(`SELECT action, COUNT(*) as count FROM audit_log WHERE 1=1 ${tenantFilter} GROUP BY action ORDER BY count DESC LIMIT 10`, params),
            db.all(`SELECT severity, COUNT(*) as count FROM audit_log WHERE 1=1 ${tenantFilter} GROUP BY severity ORDER BY count DESC`, params),
        ]);

        res.json({
            total: total?.count || 0,
            today: today?.count || 0,
            by_action: byAction || [],
            by_severity: bySeverity || [],
        });
    } catch (err) {
        console.error('[audit-log] Stats error:', err);
        res.status(500).json({ error: 'Failed to load audit stats' });
    }
});

/**
 * GET /api/audit-log/export — CSV export (requires compliance role)
 */
router.get('/export', requirePermission('compliance:manage'), async (req, res) => {
    try {
        const tenantFilter = req.user.user_type !== 'platform'
            ? 'AND (tenant_id = ? OR tenant_id IS NULL)' : '';
        const params = req.user.user_type !== 'platform' ? [req.user.tenant_id] : [];

        if (req.query.from) { params.push(req.query.from); }
        if (req.query.to) { params.push(req.query.to); }

        const entries = await db.all(
            `SELECT * FROM audit_log WHERE 1=1 ${tenantFilter}
             ${req.query.from ? 'AND created_at >= ?' : ''}
             ${req.query.to ? 'AND created_at <= ?' : ''}
             ORDER BY created_at DESC LIMIT 10000`,
            params
        );

        // CSV header
        const header = 'timestamp,actor_email,actor_role,action,resource,resource_id,severity,ip_address\n';
        const csv = entries.map(e =>
            `${e.created_at},${e.actor_email || ''},${e.actor_role || ''},${e.action},${e.resource || ''},${e.resource_id || ''},${e.severity || ''},${e.ip_address || ''}`
        ).join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit-log-${new Date().toISOString().slice(0, 10)}.csv`);
        res.send(header + csv);
    } catch (err) {
        console.error('[audit-log] Export error:', err);
        res.status(500).json({ error: 'Failed to export audit log' });
    }
});

module.exports = router;
