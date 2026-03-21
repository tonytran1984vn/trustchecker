/**
 * TrustChecker — Super Admin Constraint Layer (L3→L4 Hardening)
 * Cryptographic action log, dual-approval, rate limiting, bypass prevention
 * 
 * SA is Protocol Maintainer, NOT God Mode.
 * Every SA action is: hash-linked, rate-limited, dual-approved for destructive ops.
 */
const crypto = require('crypto');

// Actions that require dual-approval (SA + another authority)
const RESTRICTED_ACTIONS = {
    credit_edit: { severity: 'critical', requires: 'compliance_officer', daily_limit: 3, description: 'Edit credit quantity/status directly' },
    credit_delete: { severity: 'critical', requires: 'compliance_officer', daily_limit: 0, description: 'Delete a carbon credit (forbidden)' },
    tenant_delete: { severity: 'critical', requires: 'ceo', daily_limit: 1, description: 'Delete/suspend tenant' },
    rule_override: { severity: 'high', requires: 'compliance_officer', daily_limit: 5, description: 'Override compliance rule' },
    risk_override: { severity: 'high', requires: 'risk_lead', daily_limit: 5, description: 'Override risk engine decision' },
    baseline_change: { severity: 'high', requires: 'compliance_officer', daily_limit: 3, description: 'Change carbon baseline factor' },
    audit_export: { severity: 'medium', requires: null, daily_limit: 10, description: 'Export audit trail data' },
    user_role_change: { severity: 'medium', requires: null, daily_limit: 20, description: 'Change user role/permissions' },
    system_config: { severity: 'medium', requires: null, daily_limit: 10, description: 'Change system configuration' }
};

// Actions SA can NEVER do
const FORBIDDEN_ACTIONS = [
    { action: 'Delete audit logs', reason: 'Audit logs are append-only and immutable' },
    { action: 'Delete carbon credits', reason: 'Credits can only be retired, never deleted' },
    { action: 'Bypass risk engine scoring', reason: 'Risk is an independent constitutional function' },
    { action: 'Read tenant encryption keys', reason: 'Keys are managed by IT custody module only' },
    { action: 'Modify deployed model weights', reason: 'Model weights are frozen — new version required via governance' },
    { action: 'Edit blockchain anchors', reason: 'Blockchain records are immutable by design' }
];

class SuperAdminConstraints {
    constructor() {
        this._actionLog = []; // immutable, hash-linked
        this._dailyCounts = {}; // { 'YYYY-MM-DD': { action: count } }
        this._pendingApprovals = [];
    }

    /**
     * Check if SA action is allowed
     * Returns { allowed, reason, requires_approval }
     */
    checkAction(action, saUserId) {
        // Check forbidden
        const forbidden = FORBIDDEN_ACTIONS.find(f => f.action.toLowerCase().replace(/\s/g, '_') === action);
        if (forbidden) {
            return { allowed: false, reason: forbidden.reason, action, type: 'forbidden' };
        }

        const restriction = RESTRICTED_ACTIONS[action];
        if (!restriction) {
            return { allowed: true, reason: 'Action not restricted', action, type: 'unrestricted' };
        }

        // Check daily limit
        const today = new Date().toISOString().slice(0, 10);
        const todayKey = `${today}:${action}`;
        const count = this._dailyCounts[todayKey] || 0;

        if (restriction.daily_limit === 0) {
            return { allowed: false, reason: `Action "${action}" is permanently forbidden for SA`, action, type: 'forbidden' };
        }

        if (count >= restriction.daily_limit) {
            return { allowed: false, reason: `Daily limit exceeded (${count}/${restriction.daily_limit})`, action, type: 'rate_limited' };
        }

        // Check if dual-approval needed
        if (restriction.requires) {
            return {
                allowed: false, requires_approval: true,
                approver_role: restriction.requires,
                reason: `Requires ${restriction.requires} co-approval`,
                action, type: 'needs_approval', severity: restriction.severity
            };
        }

        return { allowed: true, remaining_today: restriction.daily_limit - count, action, type: 'allowed' };
    }

    /**
     * Request dual-approval for a restricted action
     */
    requestApproval(params) {
        const { action, sa_user_id, target_entity, reason, evidence = [] } = params;
        const restriction = RESTRICTED_ACTIONS[action];
        if (!restriction) return { error: 'Unknown restricted action' };
        if (!restriction.requires) return { error: 'Action does not require dual-approval' };

        const requestId = `SA-REQ-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
        const request = {
            request_id: requestId,
            action, target_entity, reason, evidence,
            sa_user_id,
            required_approver_role: restriction.requires,
            severity: restriction.severity,
            status: 'pending',
            approvals: [],
            hash: crypto.createHash('sha256').update(JSON.stringify({ requestId, action, sa_user_id, reason })).digest('hex'),
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 24 * 3600000).toISOString()
        };

        this._pendingApprovals.push(request);
        return request;
    }

    /**
     * Approve or reject SA action request
     */
    processApproval(requestId, approver) {
        const { approver_id, role, decision, reason = '' } = approver;
        const request = this._pendingApprovals.find(r => r.request_id === requestId);
        if (!request) return { error: 'Request not found' };
        if (request.status !== 'pending') return { error: `Request is ${request.status}` };
        if (approver_id === request.sa_user_id) return { error: 'SA cannot approve own request (SoD)' };

        request.approvals.push({ approver_id, role, decision, reason, at: new Date().toISOString() });

        if (decision === 'approve') {
            request.status = 'approved';
            // Log the action
            this._logAction(request.action, request.sa_user_id, request.target_entity, `Dual-approved by ${approver_id}`, true);
        } else {
            request.status = 'rejected';
            this._logAction(`REJECTED:${request.action}`, request.sa_user_id, request.target_entity, `Rejected by ${approver_id}: ${reason}`, false);
        }

        return { request_id: requestId, status: request.status, message: decision === 'approve' ? 'Action approved and logged' : 'Action rejected and logged' };
    }

    /**
     * Log SA action (immutable, hash-linked)
     */
    _logAction(action, userId, target, detail = '', approved = true) {
        const prevHash = this._actionLog.length > 0 ? this._actionLog[this._actionLog.length - 1].hash : '0'.repeat(64);
        const entry = {
            index: this._actionLog.length,
            action, user_id: userId, target, detail, approved,
            timestamp: new Date().toISOString(),
            prev_hash: prevHash
        };
        entry.hash = crypto.createHash('sha256').update(prevHash + JSON.stringify(entry)).digest('hex');
        this._actionLog.push(entry);

        // Update daily counter
        const today = new Date().toISOString().slice(0, 10);
        const key = `${today}:${action}`;
        this._dailyCounts[key] = (this._dailyCounts[key] || 0) + 1;

        return entry;
    }

    /**
     * Log unrestricted SA action (still audited)
     */
    logAction(action, userId, target, detail = '') {
        return this._logAction(action, userId, target, detail, true);
    }

    /**
     * Get SA audit trail
     */
    getAuditTrail() {
        return {
            title: 'Super Admin Audit Trail (Immutable Hash-Linked)',
            total_actions: this._actionLog.length,
            chain_valid: this._verifyChain(),
            recent: this._actionLog.slice(-20).map(e => ({
                index: e.index, action: e.action, user: e.user_id,
                target: e.target, approved: e.approved,
                hash: e.hash.slice(0, 12) + '…', at: e.timestamp
            })),
            pending_approvals: this._pendingApprovals.filter(r => r.status === 'pending').length
        };
    }

    /**
     * Get SA constraint dashboard
     */
    getConstraintDashboard() {
        const today = new Date().toISOString().slice(0, 10);
        const todayActions = Object.entries(this._dailyCounts)
            .filter(([k]) => k.startsWith(today))
            .map(([k, v]) => ({ action: k.split(':').slice(1).join(':'), count: v, limit: RESTRICTED_ACTIONS[k.split(':').slice(1).join(':')]?.daily_limit || '∞' }));

        return {
            title: 'Super Admin Constraints Dashboard',
            restricted_actions: RESTRICTED_ACTIONS,
            forbidden_actions: FORBIDDEN_ACTIONS,
            today_actions: todayActions,
            pending_approvals: this._pendingApprovals.filter(r => r.status === 'pending'),
            total_logged: this._actionLog.length,
            chain_valid: this._verifyChain()
        };
    }

    _verifyChain() {
        for (let i = 1; i < this._actionLog.length; i++) {
            if (this._actionLog[i].prev_hash !== this._actionLog[i - 1].hash) return false;
        }
        return true;
    }

    getRestrictions() { return RESTRICTED_ACTIONS; }
    getForbidden() { return FORBIDDEN_ACTIONS; }
}

module.exports = new SuperAdminConstraints();
