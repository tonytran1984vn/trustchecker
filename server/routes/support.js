const { safeError } = require('../utils/safe-error');
/**
 * Support Ticket System Routes
 * CRUD tickets, messaging, assignment, priority management
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');

router.use(authMiddleware);

// ─── POST / — Create a support ticket ───────────────────────
router.post('/', async (req, res) => {
    try {
        const { subject, description, category, priority } = req.body;
        if (!subject) return res.status(400).json({ error: 'Subject is required' });

        const validCategories = ['general', 'billing', 'technical', 'security', 'feature_request', 'bug_report'];
        const validPriorities = ['low', 'medium', 'high', 'critical'];

        const id = uuidv4();
        await db.prepare(`
      INSERT INTO support_tickets (id, user_id, subject, description, category, priority)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, subject, description || '',
            validCategories.includes(category) ? category : 'general',
            validPriorities.includes(priority) ? priority : 'medium');

        // Auto-create first message
        await db.prepare('INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_role, message) VALUES (?, ?, ?, ?, ?)')
            .run(uuidv4(), id, req.user.id, req.user.role, description || subject);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'TICKET_CREATED', 'ticket', id, JSON.stringify({ subject, category, priority }));

        res.status(201).json({ id, subject, category, priority: priority || 'medium', status: 'open' });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET / — List tickets ───────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { status, priority, category, limit = 50 } = req.query;
        let sql = 'SELECT st.*, u.username as user_name FROM support_tickets st LEFT JOIN users u ON st.user_id = u.id WHERE 1=1';
        const params = [];

        // Non-admin users only see their own tickets
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            sql += ' AND st.user_id = ?';
            params.push(req.user.id);
        }
        if (status) { sql += ' AND st.status = ?'; params.push(status); }
        if (priority) { sql += ' AND st.priority = ?'; params.push(priority); }
        if (category) { sql += ' AND st.category = ?'; params.push(category); }

        sql += ' ORDER BY CASE st.priority WHEN \'critical\' THEN 1 WHEN \'high\' THEN 2 WHEN \'medium\' THEN 3 ELSE 4 END, st.created_at DESC LIMIT ?';
        params.push(Math.min(Number(limit) || 50, 200));

        const tickets = await db.all(sql, params);
        const stats = {
            open: (await db.get("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'open'"))?.c || 0,
            in_progress: (await db.get("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'in_progress'"))?.c || 0,
            resolved: (await db.get("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'resolved'"))?.c || 0,
            closed: (await db.get("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'closed'"))?.c || 0,
        };

        res.json({ tickets, stats, total: tickets.length });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /stats/summary — Ticket statistics ─────────────────
// NOTE: Must be BEFORE /:id to avoid route shadowing
router.get('/stats/summary', requireRole('manager'), async (req, res) => {
    try {
        const total = (await db.get('SELECT COUNT(*) as c FROM support_tickets'))?.c || 0;
        const byStatus = await db.all('SELECT status, COUNT(*) as count FROM support_tickets GROUP BY status');
        const byPriority = await db.all('SELECT priority, COUNT(*) as count FROM support_tickets GROUP BY priority');
        const byCategory = await db.all('SELECT category, COUNT(*) as count FROM support_tickets GROUP BY category');
        const avgResolution = await db.get("SELECT AVG(JULIANDAY(resolved_at) - JULIANDAY(created_at)) * 24 as avg_hours FROM support_tickets WHERE resolved_at IS NOT NULL");

        res.json({
            total,
            by_status: byStatus,
            by_priority: byPriority,
            by_category: byCategory,
            avg_resolution_hours: avgResolution?.avg_hours ? Math.round(avgResolution.avg_hours * 10) / 10 : null
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /:id — Get ticket detail with messages ─────────────
router.get('/:id', async (req, res) => {
    try {
        const ticket = await db.get('SELECT st.*, u.username as user_name FROM support_tickets st LEFT JOIN users u ON st.user_id = u.id WHERE st.id = ?', [req.params.id]);
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        // Access control
        if (req.user.role !== 'admin' && req.user.role !== 'manager' && ticket.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const messages = await db.all(
            'SELECT tm.*, u.username as sender_name FROM ticket_messages tm LEFT JOIN users u ON tm.sender_id = u.id WHERE tm.ticket_id = ? ORDER BY tm.created_at ASC',
            [req.params.id]
        );

        res.json({ ticket, messages });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /:id/message — Add message to ticket ─────────────
router.post('/:id/message', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Message is required' });

        const ticket = await db.get('SELECT * FROM support_tickets WHERE id = ?', [req.params.id]);
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        const id = uuidv4();
        await db.prepare('INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_role, message) VALUES (?, ?, ?, ?, ?)')
            .run(id, req.params.id, req.user.id, req.user.role, message);

        // Auto-reopen if closed/resolved and user messages
        if (['resolved', 'closed'].includes(ticket.status) && ticket.user_id === req.user.id) {
            await db.prepare("UPDATE support_tickets SET status = 'open', updated_at = datetime('now') WHERE id = ?").run(req.params.id);
        } else {
            await db.prepare("UPDATE support_tickets SET updated_at = datetime('now') WHERE id = ?").run(req.params.id);
        }

        res.status(201).json({ id, ticket_id: req.params.id, message });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── PUT /:id/assign — Assign ticket (admin/manager) ───────
router.put('/:id/assign', requireRole('manager'), async (req, res) => {
    try {
        const { assigned_to } = req.body;
        if (!assigned_to) return res.status(400).json({ error: 'assigned_to user ID required' });

        const ticket = await db.get('SELECT * FROM support_tickets WHERE id = ?', [req.params.id]);
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        const assignee = await db.get('SELECT id, username FROM users WHERE id = ?', [assigned_to]);
        if (!assignee) return res.status(404).json({ error: 'Assignee not found' });

        await db.prepare("UPDATE support_tickets SET assigned_to = ?, status = 'in_progress', updated_at = datetime('now') WHERE id = ?")
            .run(assigned_to, req.params.id);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'TICKET_ASSIGNED', 'ticket', req.params.id, JSON.stringify({ assigned_to, assignee_name: assignee.username }));

        res.json({ id: req.params.id, assigned_to, assignee_name: assignee.username, status: 'in_progress' });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── PUT /:id/resolve — Resolve ticket ──────────────────────
router.put('/:id/resolve', async (req, res) => {
    try {
        const { resolution } = req.body;
        const ticket = await db.get('SELECT * FROM support_tickets WHERE id = ?', [req.params.id]);
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        // Only admin/manager or assigned agent can resolve
        if (req.user.role !== 'admin' && req.user.role !== 'manager' && ticket.assigned_to !== req.user.id) {
            return res.status(403).json({ error: 'Only assigned agents or admins can resolve tickets' });
        }

        await db.prepare("UPDATE support_tickets SET status = 'resolved', resolution = ?, resolved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?")
            .run(resolution || '', req.params.id);

        await db.prepare('INSERT INTO ticket_messages (id, ticket_id, sender_id, sender_role, message) VALUES (?, ?, ?, ?, ?)')
            .run(uuidv4(), req.params.id, req.user.id, req.user.role, `[RESOLVED] ${resolution || 'Issue resolved'}`);

        res.json({ id: req.params.id, status: 'resolved', resolution });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── PUT /:id/close — Close ticket ──────────────────────────
router.put('/:id/close', async (req, res) => {
    try {
        const ticket = await db.get('SELECT * FROM support_tickets WHERE id = ?', [req.params.id]);
        if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

        await db.prepare("UPDATE support_tickets SET status = 'closed', updated_at = datetime('now') WHERE id = ?").run(req.params.id);

        res.json({ id: req.params.id, status: 'closed' });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});



module.exports = router;
