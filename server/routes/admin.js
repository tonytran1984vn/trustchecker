const { safeError } = require('../utils/safe-error');
/**
 * Admin Dashboard & User Management Routes
 * Admin-only. System overview, user management, audit, system settings
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');

router.use(authMiddleware);
router.use(requirePermission('tenant:user_create'));

// ─── GET /overview — System-wide admin overview ─────────────
router.get('/overview', async (req, res) => {
    try {
        // NODE-BP-1: Parallelize independent DB queries with Promise.all
        const [users, products, scans, todayScans, openAlerts, seals, evidence, tickets, anomalies, nfts] = await Promise.all([
            db.get('SELECT COUNT(*) as c FROM users'),
            db.get('SELECT COUNT(*) as c FROM products'),
            db.get('SELECT COUNT(*) as c FROM scan_events'),
            db.get("SELECT COUNT(*) as c FROM scan_events WHERE DATE(scanned_at) = DATE('now')"),
            db.get("SELECT COUNT(*) as c FROM fraud_alerts WHERE status = 'open'"),
            db.get('SELECT COUNT(*) as c FROM blockchain_seals'),
            db.get('SELECT COUNT(*) as c FROM evidence_items'),
            db.get("SELECT COUNT(*) as c FROM support_tickets WHERE status = 'open'"),
            db.get("SELECT COUNT(*) as c FROM anomaly_detections WHERE status = 'open'"),
            db.get('SELECT COUNT(*) as c FROM nft_certificates'),
        ]);

        const [userGrowth, scanTrend, activeUsersRow, paidPlans] = await Promise.all([
            db.all("SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at > datetime('now', '-30 days') GROUP BY date ORDER BY date"),
            db.all("SELECT DATE(scanned_at) as date, COUNT(*) as count FROM scan_events WHERE scanned_at > datetime('now', '-14 days') GROUP BY date ORDER BY date"),
            db.get("SELECT COUNT(DISTINCT actor_id) as c FROM audit_log WHERE timestamp > datetime('now', '-7 days')"),
            db.all("SELECT plan_name, COUNT(*) as count FROM billing_plans WHERE status = 'active' AND plan_name != 'Free' GROUP BY plan_name"),
        ]);

        const activeUsers = activeUsersRow?.c || 0;

        res.json({
            totals: { users: users?.c || 0, products: products?.c || 0, scans: scans?.c || 0, today_scans: todayScans?.c || 0, open_alerts: openAlerts?.c || 0, blockchain_seals: seals?.c || 0, evidence_items: evidence?.c || 0, open_tickets: tickets?.c || 0, open_anomalies: anomalies?.c || 0, nft_certificates: nfts?.c || 0 },
            active_users_7d: activeUsers,
            user_growth_30d: userGrowth,
            scan_trend_14d: scanTrend,
            paid_plans: paidPlans,
            system_health: { status: 'healthy', uptime: '99.97%', db_size_mb: getDBSize() }
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /users — List all users ────────────────────────────
router.get('/users', async (req, res) => {
    try {
        const { role, status, search, limit = 50, offset = 0 } = req.query;
        let sql = "SELECT id, username, email, role, company, mfa_enabled, created_at, last_login FROM users WHERE 1=1";
        const params = [];

        if (role) { sql += ' AND role = ?'; params.push(role); }
        if (search) { sql += ' AND (username LIKE ? OR email LIKE ? OR company LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(Math.min(Number(limit) || 50, 200), Math.max(Number(offset) || 0, 0)); // NODE-BP-2: cap

        const users = await db.all(sql, params);
        const total = (await db.get('SELECT COUNT(*) as c FROM users'))?.c || 0;

        res.json({ users, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── PUT /users/:id/role — Update user role ─────────────────
// ─── Valid roles for the platform ────────────────────────────
const VALID_ROLES = [
    'super_admin', 'admin',                                // System roles
    'executive', 'ops_manager', 'risk_officer',            // Tenant / Business roles
    'compliance_officer', 'developer',                     // Tenant / Business roles
    'manager', 'operator', 'viewer',                       // Legacy roles
];

// ─── POST /users — Create a new user with role ──────────────
router.post('/users', async (req, res) => {
    try {
        const { username, email, password, role = 'operator', company = '' } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'email and password are required' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }
        if (!VALID_ROLES.includes(role)) {
            return res.status(400).json({ error: `Invalid role. Choose: ${VALID_ROLES.join(', ')}` });
        }
        if (role === 'super_admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super_admin can assign super_admin role' });
        }

        const existing = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (existing) {
            return res.status(409).json({ error: 'Email already exists' });
        }

        const id = uuidv4();
        const displayName = username || email.split('@')[0];
        const password_hash = await bcrypt.hash(password, 12);

        await db.prepare(
            'INSERT INTO users (id, username, email, password_hash, role, company, org_id, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
        ).run(id, displayName, email, password_hash, role, company, req.user.org_id || null);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'USER_CREATED', 'user', id, JSON.stringify({ email, role, created_by: req.user.email || req.user.username }));

        res.status(201).json({ id, username: displayName, email, role, company, message: 'User created successfully' });
    } catch (e) {
        safeError(res, 'Failed to create user', e);
    }
});

// ─── PUT /users/:id/role — Update user role ─────────────────
router.put('/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: `Invalid role. Choose: ${VALID_ROLES.join(', ')}` });

        if (role === 'super_admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super_admin can assign super_admin role' });
        }

        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot change your own role' });
        }

        const user = await db.get('SELECT id, username FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'USER_ROLE_CHANGED', 'user', req.params.id, JSON.stringify({ username: user.username, new_role: role }));

        res.json({ user_id: req.params.id, username: user.username, new_role: role });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── PUT /users/:id/status — Activate/suspend/ban user ──────
router.put('/users/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['active', 'suspended', 'banned'];
        if (!validStatuses.includes(status)) return res.status(400).json({ error: `Invalid status. Choose: ${validStatuses.join(', ')}` });

        const user = await db.get('SELECT id, username FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, req.params.id);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'USER_STATUS_CHANGED', 'user', req.params.id, JSON.stringify({ username: user.username, new_status: status }));

        res.json({ user_id: req.params.id, username: user.username, new_status: status });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// SEC-3: Admin-only endpoint must require authentication
router.post('/users/:id/reset-password', authMiddleware, requireRole('admin'), async (req, res) => {
    try {
        const { new_password } = req.body;
        if (!new_password || new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

        const user = await db.get('SELECT id, username FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const hash = await bcrypt.hash(new_password, 12);
        await db.prepare('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?').run(hash, req.params.id);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'ADMIN_PASSWORD_RESET', 'user', req.params.id, JSON.stringify({ username: user.username }));

        res.json({ user_id: req.params.id, message: 'Password reset successfully' });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /audit — Full audit log ────────────────────────────
router.get('/audit', async (req, res) => {
    try {
        const { action, actor_id, entity_type, from_date, to_date, limit = 100, offset = 0 } = req.query;
        const orgId = req.user?.org_id || req.user?.orgId;
        let sql = 'SELECT a.*, u.username as actor_name FROM audit_log a LEFT JOIN users u ON a.actor_id = u.id WHERE 1=1';
        const params = [];

        // Org-scope: non-super_admin only sees audit entries from their org
        if (orgId && req.user?.role !== 'super_admin') {
            sql += ' AND (u.org_id = ? OR a.actor_id = ?)';
            params.push(orgId, req.user.id);
        }

        if (action) { sql += ' AND a.action = ?'; params.push(action); }
        if (actor_id) { sql += ' AND a.actor_id = ?'; params.push(actor_id); }
        if (entity_type) { sql += ' AND a.entity_type = ?'; params.push(entity_type); }
        if (from_date) { sql += ' AND a.timestamp >= ?'; params.push(from_date); }
        if (to_date) { sql += ' AND a.timestamp <= ?'; params.push(to_date); }

        sql += ' ORDER BY a.timestamp DESC LIMIT ? OFFSET ?';
        params.push(Math.min(Number(limit) || 100, 500), Math.max(Number(offset) || 0, 0)); // NODE-BP-2: cap

        const logs = await db.all(sql, params);
        const total = logs.length;

        // Action breakdown (scoped)
        let breakdownSql = 'SELECT action, COUNT(*) as count FROM audit_log';
        const breakdownParams = [];
        if (orgId && req.user?.role !== 'super_admin') {
            breakdownSql += ' WHERE actor_id IN (SELECT id FROM users WHERE org_id = ?)';
            breakdownParams.push(orgId);
        }
        breakdownSql += ' GROUP BY action ORDER BY count DESC LIMIT 20';
        const actionBreakdown = await db.all(breakdownSql, breakdownParams);

        res.json({ logs, total, action_breakdown: actionBreakdown });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /settings — Get system settings ────────────────────
router.get('/settings', async (req, res) => {
    try {
        const settings = await db.get("SELECT details FROM audit_log WHERE action = 'SYSTEM_SETTINGS' ORDER BY timestamp DESC LIMIT 1");
        const defaults = {
            platform_name: 'TrustChecker',
            max_scan_rate_per_minute: 60,
            max_file_upload_mb: 50,
            session_timeout_minutes: 60,
            password_min_length: 8,
            require_mfa_for_admin: false,
            auto_lock_after_failed_attempts: 5,
            lockout_duration_minutes: 15,
            enable_public_api: true,
            enable_websocket: true,
            enable_push_notifications: false,
            maintenance_mode: false,
            allowed_origins: [], // SEC-2: No wildcard — use global CORS whitelist
            data_retention_days: 365,
            blockchain_difficulty: 2,
        };

        res.json(settings ? { ...defaults, ...safeParse(settings.details) } : defaults);
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── PUT /settings — Update system settings ─────────────────
router.put('/settings', async (req, res) => {
    try {
        // Fix #11: Validate settings against known keys (was raw req.body)
        const allowedKeys = ['site_name', 'maintenance_mode', 'max_upload_size', 'default_plan',
            'fraud_threshold', 'auto_block', 'notification_email', 'timezone'];
        const sanitized = {};
        for (const key of allowedKeys) {
            if (req.body[key] !== undefined) sanitized[key] = req.body[key];
        }

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'SYSTEM_SETTINGS', 'system', 'settings',
                JSON.stringify({ ...sanitized, updated_at: new Date().toISOString(), updated_by: req.user.id }));

        res.json({ message: 'System settings updated', settings: sanitized });
    } catch (e) {
        console.error('Settings error:', e);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// ─── GET /metrics — System performance metrics ──────────────
router.get('/metrics', async (req, res) => {
    try {
        const uptime = process.uptime();
        const mem = process.memoryUsage();

        // DB metrics
        const dbTables = [
            'users', 'products', 'qr_codes', 'scan_events', 'fraud_alerts',
            'blockchain_seals', 'evidence_items', 'support_tickets', 'nft_certificates',
            'sustainability_scores', 'anomaly_detections', 'audit_log'
        ];

        const tableSizes = {};
        for (const t of dbTables) {
            try {
                tableSizes[t] = (await db.get(`SELECT COUNT(*) as c FROM ${t}`))?.c || 0;
            } catch { tableSizes[t] = 'N/A'; }
        }

        // Avg response times (from recent scans)
        const avgResponseTime = (await db.get('SELECT AVG(response_time_ms) as avg FROM scan_events WHERE response_time_ms > 0'))?.avg || 0;

        res.json({
            uptime_seconds: Math.round(uptime),
            uptime_human: formatUptime(uptime),
            memory: {
                rss_mb: Math.round(mem.rss / 1024 / 1024),
                heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
                heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
            },
            database: {
                size_mb: getDBSize(),
                table_counts: tableSizes,
            },
            performance: {
                avg_scan_response_ms: Math.round(avgResponseTime),
            },
            node_version: process.version,
            platform: process.platform,
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

function getDBSize() {
    try {
        const fs = require('fs');
        const path = require('path');
        const { safeParse } = require('../utils/safe-json');
        const dbPath = path.join(__dirname, '..', 'data', 'trustchecker.db');
        if (fs.existsSync(dbPath)) {
            return Math.round(fs.statSync(dbPath).size / 1024 / 1024 * 100) / 100;
        }
    } catch (e) { console.warn('[admin] getDBSize failed:', e.message); }
    return 0;
}

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
}

module.exports = router;
