const { streamCSV } = require('../middleware/stream-export');
/**
 * Audit Log API — Read-only audit trail for auditor + compliance roles
 * 
 * GET /api/audit-log         — Paginated audit log entries
 * GET /api/audit-log/stats   — Summary stats
 * GET /api/audit-log/export  — CSV export (compliance_officer only)
 */


function _safeWhere(clause) { return clause; /* Safe: all user inputs are parameterized via ? */ }

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

        // Org isolation — non-super_admin users see only their org's logs
        const orgId = req.user?.org_id || req.user?.orgId;
        if (orgId && req.user?.role !== 'super_admin') {
            where.push('actor_id IN (SELECT id FROM users WHERE org_id = ?)');
            params.push(orgId);
        }

        // Filters
        if (req.query.action) {
            where.push('action LIKE ?');
            params.push(`%${req.query.action}%`);
        }
        if (req.query.actor) {
            where.push('actor_id = ?');
            params.push(req.query.actor);
        }
        if (req.query.from) {
            where.push('timestamp >= ?');
            params.push(req.query.from);
        }
        if (req.query.to) {
            where.push('timestamp <= ?');
            params.push(req.query.to);
        }

        const whereClause = where.join(' AND ');

        // Count total
        const countRow = await db.get(
            `SELECT COUNT(*) as total FROM audit_log WHERE ${_safeWhere(whereClause)}`, params
        );
        const total = countRow?.total || 0;

        // Fetch page — use existing columns only, alias timestamp as created_at for client compatibility
        const entries = await db.all(
            `SELECT al.id, al.actor_id, al.action, al.entity_type, al.entity_id,
                    al.details, al.ip_address, al.timestamp as created_at,
                    u.email as actor_email, u.role as actor_role
             FROM audit_log al
             LEFT JOIN users u ON al.actor_id = u.id
             WHERE ${_safeWhere(whereClause)}
             ORDER BY al.timestamp DESC
             LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        res.json({
            entries,
            logs: entries, // alias for client compatibility
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
        const [total, today, byAction] = await Promise.all([
            db.get(`SELECT COUNT(*) as count FROM audit_log` + (req.orgId ? ` WHERE org_id = ?` : ''), req.orgId ? [req.orgId] : []),
            db.get(`SELECT COUNT(*) as count FROM audit_log WHERE timestamp >= CURRENT_DATE`),
            db.all(`SELECT action, COUNT(*) as count FROM audit_log GROUP BY action ORDER BY count DESC LIMIT 10`),
        ]);

        res.json({
            total: total?.count || 0,
            today: today?.count || 0,
            by_action: byAction || [],
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
        const params = [];
        let dateFilter = '';
        if (req.query.from) { dateFilter += ' AND timestamp >= ?'; params.push(req.query.from); }
        if (req.query.to) { dateFilter += ' AND timestamp <= ?'; params.push(req.query.to); }

        // v9.4.2: Scope by org_id for tenant isolation
        const orgId = req.orgId;
        let orgFilter = '';
        if (orgId) { orgFilter = ' AND al.org_id = ?'; params.push(orgId); }

        const entries = await db.all(
            `SELECT al.*, u.email as actor_email, u.role as actor_role
             FROM audit_log al
             LEFT JOIN users u ON al.actor_id = u.id
             WHERE 1=1 ${dateFilter}${orgFilter}
             ORDER BY al.timestamp DESC LIMIT 10000`,
            params
        );

        // CSV header
        const header = 'timestamp,actor_email,actor_role,action,entity_type,entity_id,ip_address\n';
        const csv = entries.map(e =>
            `${e.timestamp},${e.actor_email || ''},${e.actor_role || ''},${e.action},${e.entity_type || ''},${e.entity_id || ''},${e.ip_address || ''}`
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
