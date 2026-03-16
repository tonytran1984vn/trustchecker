/**
 * SOC2 CE-4: Incident Response Automation
 * Auto-escalates critical security events.
 */

class IncidentResponse {
    constructor(db) {
        this.db = db;
        this.thresholds = {
            failed_logins: { count: 10, window: '15 minutes', severity: 'high' },
            cross_tenant_attempt: { count: 1, window: '1 minute', severity: 'critical' },
            data_export: { count: 5, window: '5 minutes', severity: 'medium' },
        };
    }

    async checkFailedLogins(userId, orgId) {
        try {
            const result = await this.db.get(
                `SELECT COUNT(*) as c FROM audit_log
                 WHERE action = 'LOGIN_FAILED' AND actor_id = $1
                 AND timestamp > NOW() - INTERVAL '15 minutes'`,
                [userId]
            );
            if ((result?.c || 0) >= this.thresholds.failed_logins.count) {
                await this._autoLockAccount(userId, orgId);
                await this._createSecurityIncident(orgId, 'ACCOUNT_LOCKOUT',
                    `Account ${userId} locked after ${result.c} failed login attempts`, 'high');
            }
        } catch (e) { console.error('[IR] checkFailedLogins:', e.message); }
    }

    async _autoLockAccount(userId, orgId) {
        await this.db.run('UPDATE users SET status = $1, locked_until = NOW() + INTERVAL \'30 minutes\' WHERE id = $2',
            ['locked', userId]);
        console.warn(`🔒 [IR] Account ${userId} auto-locked (org: ${orgId})`);
    }

    async _createSecurityIncident(orgId, type, description, severity) {
        const id = require('crypto').randomUUID();
        await this.db.run(
            `INSERT INTO ops_incidents_v2 (id, title, description, severity, status, category, org_id, created_at)
             VALUES ($1, $2, $3, $4, 'open', 'security', $5, NOW())`,
            [id, `[AUTO] ${type}`, description, severity, orgId]
        );
        console.warn(`🚨 [IR] Security incident created: ${type} (${severity})`);
    }
}

module.exports = { IncidentResponse };
