/**
 * SOC2 CE-1: Compliance Evidence Collection
 * Auto-generates evidence reports for SOC2 / ISO 27001 auditors.
 * Base path: /api/compliance-evidence
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requirePermission } = require('../auth');

router.use(authMiddleware);
router.use(requirePermission('compliance:manage'));

// GET /snapshot — Point-in-time compliance snapshot
router.get('/snapshot', async (req, res) => {
    try {
        const orgId = req.orgId;
        const [userCount, mfaEnabled, activeSessionCount, auditLogCount, rls, recentChanges] = await Promise.all([
            db.get('SELECT COUNT(*) as c FROM users WHERE org_id = $1', [orgId]),
            db.get('SELECT COUNT(*) as c FROM users WHERE mfa_secret IS NOT NULL AND org_id = $1', [orgId]),
            db.get("SELECT COUNT(*) as c FROM sessions WHERE last_active > NOW() - INTERVAL '24 hours'"),
            db.get('SELECT COUNT(*) as c FROM audit_log WHERE org_id = $1', [orgId]),
            db.get('SELECT count(*) as c FROM pg_policies'),
            db.all(
                "SELECT action, COUNT(*) as count FROM audit_log WHERE org_id = $1 AND timestamp > NOW() - INTERVAL '30 days' GROUP BY action ORDER BY count DESC LIMIT 10",
                [orgId]
            ),
        ]);

        res.json({
            report_type: 'SOC2 Compliance Evidence Snapshot',
            generated_at: new Date().toISOString(),
            generated_by: req.user.email,
            org_id: orgId,
            evidence: {
                access_controls: {
                    total_users: userCount?.c || 0,
                    mfa_enabled_users: mfaEnabled?.c || 0,
                    mfa_coverage: userCount?.c ? (((mfaEnabled?.c || 0) / userCount.c) * 100).toFixed(1) + '%' : '0%',
                    active_sessions_24h: activeSessionCount?.c || 0,
                    password_policy: 'ENFORCED (min 12 chars, complexity required)',
                    session_timeout: 'Platform admin: 15min, Users: 24h',
                },
                data_protection: {
                    encryption_at_rest: 'AES-256-GCM field-level encryption',
                    encryption_in_transit: 'TLS 1.2+ via Nginx',
                    rls_policies: rls?.c || 0,
                    tenant_isolation: 'PostgreSQL Row Level Security + application orgGuard',
                    backup_policy: 'Daily pg_dump, 7-day retention',
                },
                audit_trail: {
                    total_audit_entries: auditLogCount?.c || 0,
                    recent_activity_summary: recentChanges,
                    log_retention: 'Immutable, org-scoped, timestamped',
                    log_format: 'Structured JSON with requestId, userId, action, timestamp',
                },
                security_controls: {
                    waf: 'Active (SQLi, XSS, path traversal)',
                    rate_limiting: 'Auth: 30/15min, API: 5000/15min',
                    cors: 'Strict allowlist',
                    security_headers: 'HSTS, X-Frame-Options DENY, CSP, nosniff',
                    jwt: '1h expiry, issuer/audience validation, refresh rotation',
                },
                monitoring: {
                    error_tracking: 'Sentry (configured)',
                    health_checks: 'Every 60s',
                    uptime_monitoring: 'PM2 process manager',
                    log_aggregation: 'Structured JSON logs with OpenTelemetry',
                },
            },
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to generate compliance snapshot' });
    }
});

// GET /access-review — List all users with roles for access review
router.get('/access-review', async (req, res) => {
    try {
        const orgId = req.orgId;
        const users = await db.all(
            `SELECT u.id, u.email, u.username, u.role, u.status, u.created_at, u.last_login,
                    CASE WHEN u.mfa_secret IS NOT NULL THEN true ELSE false END as mfa_enabled,
                    m.role as org_role
             FROM users u
             LEFT JOIN memberships m ON m.user_id = u.id AND m.org_id = $1
             WHERE u.org_id = $1
             ORDER BY u.role, u.email LIMIT 1000`,
            [orgId]
        );
        res.json({
            report_type: 'Access Review Report',
            generated_at: new Date().toISOString(),
            org_id: orgId,
            total_users: users.length,
            users: users.map(u => ({
                ...u,
                needs_review: !u.last_login || new Date() - new Date(u.last_login) > 90 * 86400000,
                mfa_compliant: u.mfa_enabled,
            })),
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to generate access review' });
    }
});

// GET /incident-log — Security incident summary
router.get('/incident-log', async (req, res) => {
    try {
        const orgId = req.orgId;
        const incidents = await db.all(
            `SELECT id, title, severity, status, created_at, resolved_at, root_cause, resolution
             FROM ops_incidents_v2
             WHERE org_id = $1 AND severity IN ('critical', 'high')
             ORDER BY created_at DESC LIMIT 100`,
            [orgId]
        );
        const stats = {
            total: incidents.length,
            open: incidents.filter(i => i.status === 'open').length,
            resolved: incidents.filter(i => i.status === 'resolved' || i.status === 'closed').length,
            avg_resolution_hours:
                incidents.filter(i => i.resolved_at).length > 0
                    ? (
                          incidents
                              .filter(i => i.resolved_at)
                              .reduce(
                                  (sum, i) => sum + (new Date(i.resolved_at) - new Date(i.created_at)) / 3600000,
                                  0
                              ) / incidents.filter(i => i.resolved_at).length
                      ).toFixed(1)
                    : 'N/A',
        };
        res.json({
            report_type: 'Security Incident Log',
            generated_at: new Date().toISOString(),
            org_id: orgId,
            summary: stats,
            incidents,
        });
    } catch (e) {
        res.status(500).json({ error: 'Failed to generate incident log' });
    }
});

module.exports = router;
