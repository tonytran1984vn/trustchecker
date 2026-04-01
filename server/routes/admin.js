const { withTransaction } = require('../middleware/transaction');
const { safeError } = require('../utils/safe-error');
/**
 * Admin Dashboard & User Management Routes
 * Admin-only. System overview, user management, audit, system settings
 */

function _safeId(name) {
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error('Invalid identifier: ' + name);
    return name;
}

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const logger = require('../lib/logger');
const complianceEngine = require('../services/compliance-engine/engine');

router.use(authMiddleware);
router.use(requirePermission('org:user_create'));

// ─── GET /overview — System-wide admin overview ─────────────
router.get('/overview', async (req, res) => {
    try {
        // NODE-BP-1: Parallelize independent DB queries with Promise.all
        const isSuper = req.user?.role === 'super_admin' || req.user?.user_type === 'platform';
        const orgId = req.user?.org_id || req.user?.orgId;
        const orgFilter = !isSuper && orgId ? ' WHERE org_id = ?' : '';
        const orgP = !isSuper && orgId ? [orgId] : [];
        const [users, products, scans, todayScans, openAlerts, seals, evidence, tickets, anomalies, nfts] =
            await Promise.all([
                db.get(
                    "SELECT COUNT(*) as c FROM users WHERE status != 'deactivated'" +
                        (orgFilter ? ' AND org_id = ?' : ''),
                    orgP
                ),
                db.get('SELECT COUNT(*) as c FROM products' + orgFilter, orgP),
                db.get('SELECT COUNT(*) as c FROM scan_events' + orgFilter, orgP),
                db.get(
                    'SELECT COUNT(*) as c FROM scan_events WHERE DATE(scanned_at) = CURRENT_DATE' +
                        (orgFilter ? ' AND org_id = ?' : ''),
                    orgP
                ),
                db.get(
                    "SELECT COUNT(*) as c FROM fraud_alerts WHERE status = 'open'" +
                        (orgFilter ? ' AND org_id = ?' : ''),
                    orgP
                ),
                db.get('SELECT COUNT(*) as c FROM blockchain_seals' + orgFilter, orgP),
                db.get('SELECT COUNT(*) as c FROM evidence_items' + orgFilter, orgP),
                db.get(
                    "SELECT COUNT(*) as c FROM support_tickets WHERE status = 'open'" +
                        (orgFilter ? ' AND org_id = ?' : ''),
                    orgP
                ),
                db.get(
                    "SELECT COUNT(*) as c FROM anomaly_detections WHERE status = 'open'" +
                        (orgFilter ? ' AND org_id = ?' : ''),
                    orgP
                ),
                db.get('SELECT COUNT(*) as c FROM nft_certificates' + (orgFilter ? ' WHERE org_id = ?' : ''), orgP),
            ]);

        const [userGrowth, scanTrend, activeUsersRow, paidPlans] = await Promise.all([
            db.all(
                "SELECT DATE(created_at) as date, COUNT(*) as count FROM users WHERE created_at > NOW() - INTERVAL '30 days'" +
                    (orgFilter ? ' AND org_id = ?' : '') +
                    ' GROUP BY date ORDER BY date LIMIT 1000'
            ),
            db.all(
                "SELECT DATE(scanned_at) as date, COUNT(*) as count FROM scan_events WHERE scanned_at > NOW() - INTERVAL '14 days'" +
                    (orgFilter ? ' AND org_id = ?' : '') +
                    ' GROUP BY date ORDER BY date LIMIT 1000'
            ),
            db.get(
                "SELECT COUNT(DISTINCT actor_id) as c FROM audit_log WHERE timestamp > NOW() - INTERVAL '7 days'" +
                    (orgFilter ? ' AND org_id = ?' : ''),
                orgP
            ),
            db.all(
                "SELECT plan_name, COUNT(*) as count FROM billing_plans WHERE status = 'active' AND plan_name != 'Free'" +
                    (orgFilter ? ' AND user_id IN (SELECT id FROM users WHERE org_id = ?)' : '') +
                    ' GROUP BY plan_name',
                orgP
            ),
        ]);

        const activeUsers = activeUsersRow?.c || 0;

        res.json({
            totals: {
                users: users?.c || 0,
                products: products?.c || 0,
                scans: scans?.c || 0,
                today_scans: todayScans?.c || 0,
                open_alerts: openAlerts?.c || 0,
                blockchain_seals: seals?.c || 0,
                evidence_items: evidence?.c || 0,
                open_tickets: tickets?.c || 0,
                open_anomalies: anomalies?.c || 0,
                nft_certificates: nfts?.c || 0,
            },
            active_users_7d: activeUsers,
            user_growth_30d: userGrowth,
            scan_trend_14d: scanTrend,
            paid_plans: paidPlans,
            system_health: { status: 'healthy', uptime: '99.97%', db_size_mb: await getDBSize() },
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /users — List users (org-scoped for non-platform) ──
router.get('/users', async (req, res) => {
    try {
        const { role, status, search, limit = 50, offset = 0 } = req.query;
        let sql =
            'SELECT id, username, email, role, company, mfa_enabled, created_at, last_login, org_id FROM users WHERE 1=1';
        const params = [];

        // Company Admin / Admin → only their org's users
        const userRole = req.user?.role;
        const userType = req.user?.user_type;
        if (userRole !== 'super_admin' && userType !== 'platform') {
            const orgId = req.user?.org_id || req.user?.orgId;
            if (orgId) {
                sql += ' AND org_id = ?';
                params.push(orgId);
            }
        }

        if (role) {
            sql += ' AND role = ?';
            params.push(role);
        }
        if (search) {
            sql += ' AND (username LIKE ? OR email LIKE ? OR company LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(Math.min(Number(limit) || 50, 200), Math.max(Number(offset) || 0, 0));

        const users = await db.all(sql, params);

        // Count total (also scoped)
        let countSql = 'SELECT COUNT(*) as c FROM users WHERE 1=1';
        const countParams = [];
        if (userRole !== 'super_admin' && userType !== 'platform') {
            const orgId = req.user?.org_id || req.user?.orgId;
            if (orgId) {
                countSql += ' AND org_id = ?';
                countParams.push(orgId);
            }
        }
        const total = (await db.get(countSql, countParams))?.c || 0;

        res.json({ users, total, page: Math.floor(offset / limit) + 1, pages: Math.ceil(total / limit) });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── PUT /users/:id/role — Update user role ─────────────────
// ─── Valid roles for the platform ────────────────────────────
const VALID_ROLES = [
    'super_admin',
    'admin', // System roles
    'executive',
    'ops_manager',
    'risk_officer', // Org / Business roles
    'compliance_officer',
    'developer', // Org / Business roles
    'manager',
    'operator',
    'viewer', // Legacy roles
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

        await db
            .prepare(
                'INSERT INTO users (id, username, email, password_hash, role, company, org_id, must_change_password) VALUES (?, ?, ?, ?, ?, ?, ?, 1)'
            )
            .run(id, displayName, email, password_hash, role, company, req.user.org_id || null);

        await db
            .prepare(
                'INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)'
            )
            .run(
                uuidv4(),
                req.user.id,
                'USER_CREATED',
                'user',
                id,
                JSON.stringify({ email, role, created_by: req.user.email || req.user.username }),
                req.ip || null
            );

        res.status(201).json({ id, username: displayName, email, role, company, message: 'User created successfully' });
    } catch (e) {
        safeError(res, 'Failed to create user', e);
    }
});

// ─── PUT /users/:id/role — Update user role ─────────────────
router.put('/users/:id/role', async (req, res) => {
    try {
        const { role } = req.body;
        if (!VALID_ROLES.includes(role))
            return res.status(400).json({ error: `Invalid role. Choose: ${VALID_ROLES.join(', ')}` });

        if (role === 'super_admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Only super_admin can assign super_admin role' });
        }

        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot change your own role' });
        }

        const user = await db.get('SELECT id, username FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await db.run('UPDATE users SET role = ? WHERE id = ?', [role, req.params.id]);

        await db
            .prepare(
                'INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)'
            )
            .run(
                uuidv4(),
                req.user.id,
                'USER_ROLE_CHANGED',
                'user',
                req.params.id,
                JSON.stringify({ username: user.username, new_role: role }),
                req.ip || null
            );

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
        if (!validStatuses.includes(status))
            return res.status(400).json({ error: `Invalid status. Choose: ${validStatuses.join(', ')}` });

        const user = await db.get('SELECT id, username FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        await db.run('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);

        await db
            .prepare(
                'INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)'
            )
            .run(
                uuidv4(),
                req.user.id,
                'USER_STATUS_CHANGED',
                'user',
                req.params.id,
                JSON.stringify({ username: user.username, new_status: status }),
                req.ip || null
            );

        res.json({ user_id: req.params.id, username: user.username, new_status: status });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── DELETE /users/:id — Remove user (org-scoped) ───────────
router.delete('/users/:id', async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        // Scope check: non-platform users can only delete within their org
        let user;
        const userRole = req.user?.role;
        const userType = req.user?.user_type;
        if (userRole !== 'super_admin' && userType !== 'platform') {
            const orgId = req.user?.org_id || req.user?.orgId;
            user = await db.get('SELECT id, username, role FROM users WHERE id = ? AND org_id = ?', [
                req.params.id,
                orgId,
            ]);
        } else {
            user = await db.get('SELECT id, username, role FROM users WHERE id = ?', [req.params.id]);
        }

        if (!user) return res.status(404).json({ error: 'User not found' });

        // Prevent non-super_admin from deleting super_admins
        if (user.role === 'super_admin' && req.user.role !== 'super_admin') {
            return res.status(403).json({ error: 'Cannot delete super_admin' });
        }

        // v9.4.4: Soft-delete instead of hard delete (prevents orphan data + preserves audit trail)
        await db.run(
            "UPDATE users SET status = 'deactivated', deactivated_at = NOW(), deactivated_by = $1 WHERE id = $2",
            [req.user.id, req.params.id]
        );
        // Revoke active sessions but keep RBAC history for audit
        await db.run('UPDATE sessions SET revoked = true WHERE user_id = $1', [req.params.id]);

        await db.run(
            'INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [
                uuidv4(),
                req.user.id,
                'USER_DELETED',
                'user',
                req.params.id,
                JSON.stringify({ username: user.username }),
                req.ip || null,
            ]
        );

        res.json({ message: `User ${user.username} deactivated`, user_id: req.params.id, soft_deleted: true });
    } catch (e) {
        safeError(res, 'Failed to delete user', e);
    }
});

// SEC-3: Admin-only endpoint must require authentication
router.post('/users/:id/reset-password', authMiddleware, requirePermission('org:user_create'), async (req, res) => {
    try {
        const { new_password } = req.body;
        if (!new_password || new_password.length < 8)
            return res.status(400).json({ error: 'Password must be at least 8 characters' });

        const user = await db.get('SELECT id, username FROM users WHERE id = ?', [req.params.id]);
        if (!user) return res.status(404).json({ error: 'User not found' });

        const hash = await bcrypt.hash(new_password, 12);
        await db.run('UPDATE users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?', [
            hash,
            req.params.id,
        ]);

        await db
            .prepare(
                'INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)'
            )
            .run(
                uuidv4(),
                req.user.id,
                'ADMIN_PASSWORD_RESET',
                'user',
                req.params.id,
                JSON.stringify({ username: user.username }),
                req.ip || null
            );

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
        let sql =
            'SELECT a.*, u.username as actor_name FROM audit_log a LEFT JOIN users u ON a.actor_id = u.id WHERE 1=1';
        const params = [];

        // Org-scope: non-super_admin only sees audit entries from their org
        if (orgId && req.user?.role !== 'super_admin') {
            sql += ' AND (u.org_id = ? OR a.actor_id = ?)';
            params.push(orgId, req.user.id);
        }

        if (action) {
            sql += ' AND a.action = ?';
            params.push(action);
        }
        if (actor_id) {
            sql += ' AND a.actor_id = ?';
            params.push(actor_id);
        }
        if (entity_type) {
            sql += ' AND a.entity_type = ?';
            params.push(entity_type);
        }
        if (from_date) {
            sql += ' AND a.timestamp >= ?';
            params.push(from_date);
        }
        if (to_date) {
            sql += ' AND a.timestamp <= ?';
            params.push(to_date);
        }

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
        const settings = await db.get(
            "SELECT details FROM audit_log WHERE action = 'SYSTEM_SETTINGS' ORDER BY timestamp DESC LIMIT 1"
        );
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
        const allowedKeys = [
            'site_name',
            'maintenance_mode',
            'max_upload_size',
            'default_plan',
            'fraud_threshold',
            'auto_block',
            'notification_email',
            'timezone',
        ];
        const sanitized = {};
        for (const key of allowedKeys) {
            if (req.body[key] !== undefined) sanitized[key] = req.body[key];
        }

        await db
            .prepare(
                'INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)'
            )
            .run(
                uuidv4(),
                req.user.id,
                'SYSTEM_SETTINGS',
                'system',
                'settings',
                JSON.stringify({ ...sanitized, updated_at: new Date().toISOString(), updated_by: req.user.id }),
                req.ip || null
            );

        res.json({ message: 'System settings updated', settings: sanitized });
    } catch (e) {
        logger.error('Settings error:', e);
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
            'users',
            'products',
            'qr_codes',
            'scan_events',
            'fraud_alerts',
            'blockchain_seals',
            'evidence_items',
            'support_tickets',
            'nft_certificates',
            'sustainability_scores',
            'anomaly_detections',
            'audit_log',
        ];

        const tableSizes = {};
        for (const t of dbTables) {
            try {
                tableSizes[t] = (await db.get(`SELECT COUNT(*) as c FROM " + _safeId(t) + "`))?.c || 0;
            } catch {
                tableSizes[t] = 'N/A';
            }
        }

        // Avg response times (from recent scans)
        const avgResponseTime =
            (
                await db.get(
                    'SELECT AVG(response_time_ms) as avg FROM scan_events WHERE response_time_ms > 0' +
                        (orgFilter ? ' AND org_id = ?' : ''),
                    orgP
                )
            )?.avg || 0;

        res.json({
            uptime_seconds: Math.round(uptime),
            uptime_human: formatUptime(uptime),
            memory: {
                rss_mb: Math.round(mem.rss / 1024 / 1024),
                heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
                heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
            },
            database: {
                size_mb: await getDBSize(),
                table_counts: tableSizes,
            },
            performance: {
                avg_scan_response_ms: Math.round(avgResponseTime),
            },
            node_version: process.version,
            platform: process.platform,
            timestamp: new Date().toISOString(),
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM COMPLIANCE GOVERNANCE
// ═══════════════════════════════════════════════════════════════════════════════

// ─── GET /compliance/policies — List GLOBAL system policies ────────────────
router.get('/compliance/policies', async (req, res) => {
    try {
        const { action } = req.query;
        let query = `SELECT id, action, version_id, is_active, created_at, created_by,
                            (SELECT username FROM users WHERE id::text = created_by::text) as creator_name
                     FROM compliance_policies 
                     WHERE org_id = 'SYSTEM'
                     ORDER BY is_active DESC, created_at DESC LIMIT 100`;
        const params = [];

        if (action) {
            query = `SELECT id, action, version_id, is_active, created_at, created_by, rules_jsonb,
                            (SELECT username FROM users WHERE id::text = created_by::text) as creator_name
                     FROM compliance_policies 
                     WHERE org_id = 'SYSTEM' AND action = ?
                     ORDER BY is_active DESC, created_at DESC LIMIT 100`;
            params.push(action);
        }

        const policies = await db.all(query, params);
        res.json({ policies });
    } catch (err) {
        logger.error('[PlatformAdmin] List compliance policies error:', err);
        res.status(500).json({ error: 'Failed to list SYSTEM policies' });
    }
});

// ─── POST /compliance/policies — Create a new SYSTEM Policy Version ──────────
router.post('/compliance/policies', async (req, res) => {
    try {
        // Double down on platform guard
        const isSuper = req.user?.role === 'super_admin' || req.user?.user_type === 'platform';
        if (!isSuper) return res.status(403).json({ error: 'Only Platform Administrators can set SYSTEM rules.' });

        const { action, rules_jsonb } = req.body;

        if (!action || !rules_jsonb || !Array.isArray(rules_jsonb)) {
            return res.status(400).json({ error: 'Valid action and Array rules_jsonb are required.' });
        }

        const version_id = `v_${Date.now()}_${uuidv4().substring(0, 6)}`;

        // 1. Dập tắt toàn bộ SYSTEM policies hiện tại của Action này
        await db.run(`UPDATE compliance_policies SET is_active = false WHERE org_id = 'SYSTEM' AND action = ?`, [
            action,
        ]);

        // 2. Chèn Version Mới (org_id = 'SYSTEM')
        await db.run(
            `INSERT INTO compliance_policies (org_id, action, version_id, rules_jsonb, is_active, created_by) 
             VALUES ('SYSTEM', ?, ?, ?, true, ?)`,
            [action, version_id, JSON.stringify(rules_jsonb), req.user.id]
        );

        // 3. Tẩy Cache để Trí Tuệ Nạp Lại Luật Toàn Cầu
        complianceEngine.clearCache('SYSTEM', action);

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, 'SYSTEM_POLICY_UPDATED', 'compliance_policy', ?, ?)`,
            [uuidv4(), req.user.id, action, JSON.stringify({ new_version: version_id })]
        );

        res.status(201).json({
            message: 'SYSTEM Policy Version Created and Global Engine reloaded.',
            action,
            version_id,
        });
    } catch (err) {
        logger.error('[PlatformAdmin] Create compliance policy error:', err);
        res.status(500).json({ error: 'Failed to create SYSTEM compliance policy' });
    }
});

async function getDBSize() {
    try {
        const row = await db.get('SELECT pg_database_size(current_database()) / (1024*1024) as size_mb');
        return Math.round((row?.size_mb || 0) * 100) / 100;
    } catch (e) {
        logger.warn('[admin] getDBSize failed:', e.message);
    }
    return 0;
}

function formatUptime(seconds) {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
}

module.exports = router;
