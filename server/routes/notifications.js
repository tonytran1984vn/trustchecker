const { safeError } = require('../utils/safe-error');
/**
 * Notification System Routes
 * In-app notifications, preferences, activity feed, and push management
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const { withTransaction } = require('../middleware/transaction');

router.use(authMiddleware);

// ─── GET / — List user notifications ────────────────────────
router.get('/', async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;
        const userId = req.user.id;
        let sql = "SELECT * FROM audit_log WHERE action LIKE 'NOTIFY_%' AND actor_id = CAST(? AS TEXT)";
        const params = [userId];

        if (status === 'unread') {
            sql += " AND (details->>'read')::text != 'true'";
        }
        if (status === 'read') {
            sql += " AND (details->>'read')::text = 'true'";
        }

        sql +=
            ' ORDER BY timestamp DESC LIMIT ' +
            Math.min(Number(limit) || 50, 200) +
            ' OFFSET ' +
            Math.max(Number(offset) || 0, 0);

        let rows = [];
        try {
            rows = await db.all(sql, params);
        } catch (e) {
            console.error('[Notifications] query error:', e.message);
        }

        const notifications = (rows || []).map(r => {
            let d = {};
            try {
                d = typeof r.details === 'string' ? JSON.parse(r.details) : r.details || {};
            } catch (e) {}
            return {
                id: r.id,
                type: d.type || 'info',
                title: d.title || r.action?.replace('NOTIFY_', '').replace(/_/g, ' ') || 'Notification',
                message: d.message || '',
                read: d.read || false,
                link: d.link,
                created_at: r.timestamp,
                timestamp: r.timestamp,
            };
        });

        let unreadCount = 0;
        try {
            const cnt = await db.get(
                "SELECT COUNT(*) as c FROM audit_log WHERE action LIKE 'NOTIFY_%' AND actor_id = CAST(? AS TEXT) AND (details->>'read')::text != 'true'",
                [userId]
            );
            unreadCount = cnt?.c || 0;
        } catch (e) {
            /* ignore */
        }

        res.json({ notifications, unread_count: unreadCount, total: notifications.length });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST / — Create notification (system/admin) ────────────
router.post('/', requirePermission('notification:manage'), async (req, res) => {
    try {
        const { user_id, title, message, type, link } = req.body;
        if (!user_id || !message) return res.status(400).json({ error: 'user_id and message required' });

        const id = uuidv4();
        await db
            .prepare(
                'INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)'
            )
            .run(
                id,
                user_id,
                'NOTIFY_CUSTOM',
                'notification',
                id,
                JSON.stringify({ title: title || 'Notification', message, type: type || 'info', link, read: false })
            );

        res.status(201).json({ id, title, message, sent_to: user_id });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /broadcast — Send notification to all users ───────
router.post('/broadcast', requirePermission('notification:manage'), async (req, res) => {
    try {
        const { title, message, type } = req.body;
        if (!message) return res.status(400).json({ error: 'message required' });

        const users = await db.all('SELECT id FROM users');
        const ids = [];
        for (const u of users) {
            const id = uuidv4();
            await db
                .prepare(
                    'INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)'
                )
                .run(
                    id,
                    u.id,
                    'NOTIFY_BROADCAST',
                    'notification',
                    id,
                    JSON.stringify({
                        title: title || 'System Announcement',
                        message,
                        type: type || 'announcement',
                        read: false,
                    })
                );
            ids.push(id);
        }

        res.json({ sent_to: users.length, notification_ids: ids.length });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── PUT /:id/read — Mark notification as read ──────────────
router.put('/:id/read', async (req, res) => {
    try {
        const notif = await db.get(
            "SELECT * FROM audit_log WHERE id = CAST(? AS TEXT) AND action LIKE 'NOTIFY_%' AND actor_id = CAST(? AS TEXT)",
            [req.params.id, req.user.id]
        );
        if (!notif) return res.status(404).json({ error: 'Notification not found' });

        let details = {};
        try {
            details = typeof notif.details === 'string' ? JSON.parse(notif.details) : notif.details || {};
        } catch (e) {}
        details.read = true;
        details.read_at = new Date().toISOString();

        await db
            .prepare('UPDATE audit_log SET details = ? WHERE id = CAST(? AS TEXT) LIMIT 1000')
            .run(JSON.stringify(details), req.params.id);
        res.json({ id: req.params.id, read: true });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── PUT /read-all — Mark all as read ───────────────────────
router.put('/read-all', async (req, res) => {
    try {
        let unread = [];
        try {
            unread = await db.all(
                "SELECT id, details FROM audit_log WHERE action LIKE 'NOTIFY_%' AND actor_id = CAST(? AS TEXT) AND (details->>'read')::text != 'true'",
                [req.user.id]
            );
        } catch (e) {
            /* ignore */
        }
        for (const n of unread || []) {
            let d = {};
            try {
                d = typeof n.details === 'string' ? JSON.parse(n.details) : n.details || {};
            } catch (e) {}
            d.read = true;
            d.read_at = new Date().toISOString();
            await db
                .prepare('UPDATE audit_log SET details = ? WHERE id = CAST(? AS TEXT) LIMIT 1000')
                .run(JSON.stringify(d), n.id);
        }

        res.json({ marked_read: (unread || []).length });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /preferences — Get notification preferences ────────
router.get('/preferences', async (req, res) => {
    try {
        const pref = await db.get(
            "SELECT details FROM audit_log WHERE action = 'NOTIFY_PREFS' AND actor_id = ? ORDER BY timestamp DESC LIMIT 1",
            [req.user.id]
        );
        const defaults = {
            email: { fraud_alerts: true, scan_reports: true, billing: true, system: true },
            push: { fraud_alerts: true, scan_reports: false, billing: false, system: true },
            in_app: { fraud_alerts: true, scan_reports: true, billing: true, system: true },
        };

        res.json(pref ? { ...defaults, ...JSON.parse(pref.details) } : defaults);
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── PUT /preferences — Update notification preferences ─────
router.put('/preferences', async (req, res) => {
    try {
        const { email, push, in_app } = req.body;

        await db
            .prepare(
                'INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)'
            )
            .run(
                uuidv4(),
                req.user.id,
                'NOTIFY_PREFS',
                'notification',
                req.user.id,
                JSON.stringify({ email, push, in_app, updated_at: new Date().toISOString() })
            );

        res.json({ message: 'Notification preferences updated', email, push, in_app });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /activity — Activity feed (recent system events) ───
router.get('/activity', async (req, res) => {
    try {
        const { limit = 30 } = req.query;
        const activities = await db.all(
            `
      SELECT id, actor_id, action, entity_type, entity_id, details, timestamp
      FROM audit_log
      WHERE actor_id = ? AND action NOT LIKE 'NOTIFY_%'
      ORDER BY timestamp DESC LIMIT ?
    `,
            [req.user.id, Math.min(Number(limit) || 50, 200)]
        );

        const feed = activities.map(a => {
            const d = JSON.parse(a.details || '{}');
            return {
                id: a.id,
                action: a.action,
                entity: `${a.entity_type}:${a.entity_id}`,
                summary: formatActivitySummary(a.action, d),
                timestamp: a.timestamp,
            };
        });

        res.json({ activities: feed, total: feed.length });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

function formatActivitySummary(action, details) {
    const map = {
        QR_SCANNED: 'Scanned a QR code',
        PRODUCT_CREATED: `Created product: ${details.name || ''}`,
        PLAN_UPGRADED: `Upgraded plan to ${details.plan || ''}`,
        FRAUD_ALERT: 'Fraud alert triggered',
        EVIDENCE_UPLOADED: 'Uploaded evidence item',
        KYC_SUBMITTED: 'Submitted KYC verification',
        TICKET_CREATED: 'Created support ticket',
        ANOMALY_SCAN: 'Ran anomaly detection scan',
        DID_CREATED: 'Created decentralized identity',
        CHECKOUT_CREATED: 'Started payment checkout',
        BRAND_CONFIG: 'Updated branding configuration',
    };
    return map[action] || action.replace(/_/g, ' ').toLowerCase();
}

module.exports = router;
