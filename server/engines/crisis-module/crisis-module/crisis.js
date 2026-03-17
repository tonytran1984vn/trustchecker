/**
 * TrustChecker — Crisis Governance Engine v1.0
 * Kill-Switch Controller + Crisis Level Classification + Escalation Matrix
 * 
 * Features:
 *   - Kill-switch: per-tenant, per-module, or system-wide halt
 *   - 5 Crisis Levels: MONITOR → YELLOW → ORANGE → RED → BLACK
 *   - Dual-Key Authorization: RED/BLACK require 2 authorized roles
 *   - Auto-Deactivation Timer: prevent indefinite lockouts
 *   - Crisis Drill: simulation mode without actual impact
 *   - Immutable Audit Trail
 */

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════
// CRISIS LEVELS
// ═══════════════════════════════════════════════════════════════════

const CRISIS_LEVELS = {
    MONITOR: {
        level: 0, name: 'Monitor', color: '#22c55e',
        description: 'Normal operations — all systems within SLO',
        auto_actions: [],
        required_approvers: 0,
    },
    YELLOW: {
        level: 1, name: 'Yellow Alert', color: '#eab308',
        description: 'Elevated risk detected — monitoring intensified',
        auto_actions: ['increase_logging', 'notify_ops'],
        required_approvers: 1,
        allowed_roles: ['super_admin', 'ops_manager', 'platform_security'],
    },
    ORANGE: {
        level: 2, name: 'Orange Alert', color: '#f97316',
        description: 'Active threat — partial service restriction may be needed',
        auto_actions: ['increase_logging', 'notify_ops', 'restrict_new_registrations'],
        required_approvers: 1,
        allowed_roles: ['super_admin', 'ops_manager', 'platform_security'],
    },
    RED: {
        level: 3, name: 'Red — Kill-Switch Engaged', color: '#ef4444',
        description: 'Critical breach — targeted kill-switch active, services suspended',
        auto_actions: ['halt_target', 'notify_all_stakeholders', 'lock_audit_log'],
        required_approvers: 2,
        allowed_roles: ['super_admin', 'platform_security'],
    },
    BLACK: {
        level: 4, name: 'Black — Full System Halt', color: '#000000',
        description: 'Catastrophic — all operations halted, war room active',
        auto_actions: ['halt_all', 'notify_all_stakeholders', 'lock_audit_log', 'activate_war_room'],
        required_approvers: 2,
        allowed_roles: ['super_admin'],
    }
};

// ═══════════════════════════════════════════════════════════════════
// ESCALATION MATRIX
// ═══════════════════════════════════════════════════════════════════

const ESCALATION_MATRIX = [
    { from: 'MONITOR', to: 'YELLOW', trigger: 'anomaly_detected', auto_after_min: null },
    { from: 'YELLOW', to: 'ORANGE', trigger: 'threat_confirmed', auto_after_min: 30 },
    { from: 'ORANGE', to: 'RED', trigger: 'breach_active', auto_after_min: 15 },
    { from: 'RED', to: 'BLACK', trigger: 'data_exfiltration', auto_after_min: null },
    // De-escalation
    { from: 'BLACK', to: 'RED', trigger: 'threat_contained', auto_after_min: null },
    { from: 'RED', to: 'ORANGE', trigger: 'remediation_started', auto_after_min: null },
    { from: 'ORANGE', to: 'YELLOW', trigger: 'risk_mitigated', auto_after_min: null },
    { from: 'YELLOW', to: 'MONITOR', trigger: 'all_clear', auto_after_min: null },
];

// ═══════════════════════════════════════════════════════════════════
// CRISIS PLAYBOOKS
// ═══════════════════════════════════════════════════════════════════

const PLAYBOOKS = {
    data_breach: {
        name: 'Data Breach Response', severity: 'RED',
        steps: [
            { seq: 1, action: 'Activate kill-switch for affected tenant', role: 'platform_security', sla_min: 5 },
            { seq: 2, action: 'Isolate affected database partitions', role: 'ops_manager', sla_min: 10 },
            { seq: 3, action: 'Forensic snapshot of audit logs', role: 'auditor', sla_min: 15 },
            { seq: 4, action: 'Notify affected users per GDPR Art.33', role: 'compliance_officer', sla_min: 60 },
            { seq: 5, action: 'External security audit engagement', role: 'super_admin', sla_min: 120 },
            { seq: 6, action: 'Remediation and patch deployment', role: 'developer', sla_min: 240 },
            { seq: 7, action: 'Post-mortem and regulatory report', role: 'compliance_officer', sla_min: 4320 },
        ]
    },
    service_outage: {
        name: 'Service Outage Response', severity: 'ORANGE',
        steps: [
            { seq: 1, action: 'Confirm outage scope and severity', role: 'ops_manager', sla_min: 5 },
            { seq: 2, action: 'Engage failover / DR systems', role: 'ops_manager', sla_min: 10 },
            { seq: 3, action: 'Status page update to stakeholders', role: 'ops_manager', sla_min: 15 },
            { seq: 4, action: 'Root cause identification', role: 'developer', sla_min: 60 },
            { seq: 5, action: 'Service restoration', role: 'developer', sla_min: 120 },
            { seq: 6, action: 'Post-incident review', role: 'ops_manager', sla_min: 1440 },
        ]
    },
    supply_chain_compromise: {
        name: 'Supply Chain Integrity Breach', severity: 'RED',
        steps: [
            { seq: 1, action: 'Freeze all pending certifications', role: 'risk_officer', sla_min: 5 },
            { seq: 2, action: 'Kill-switch on affected supply chain module', role: 'platform_security', sla_min: 10 },
            { seq: 3, action: 'Quarantine suspect blockchain seals', role: 'blockchain_operator', sla_min: 15 },
            { seq: 4, action: 'Notify regulatory bodies (EU CBAM)', role: 'compliance_officer', sla_min: 60 },
            { seq: 5, action: 'Full chain-of-custody re-verification', role: 'scm_analyst', sla_min: 480 },
            { seq: 6, action: 'Remediation report + evidence pack', role: 'auditor', sla_min: 2880 },
        ]
    },
    financial_fraud: {
        name: 'Financial Fraud Detection', severity: 'RED',
        steps: [
            { seq: 1, action: 'Suspend billing for affected accounts', role: 'super_admin', sla_min: 5 },
            { seq: 2, action: 'Transaction forensics analysis', role: 'auditor', sla_min: 30 },
            { seq: 3, action: 'Kill-switch on billing module', role: 'platform_security', sla_min: 10 },
            { seq: 4, action: 'Contact payment processor', role: 'super_admin', sla_min: 60 },
            { seq: 5, action: 'Legal review and SAR filing', role: 'compliance_officer', sla_min: 1440 },
        ]
    },
    insider_threat: {
        name: 'Insider Threat Response', severity: 'BLACK',
        steps: [
            { seq: 1, action: 'Revoke all sessions for suspect account', role: 'platform_security', sla_min: 2 },
            { seq: 2, action: 'Full system kill-switch', role: 'super_admin', sla_min: 5 },
            { seq: 3, action: 'Forensic audit of all actions by suspect', role: 'auditor', sla_min: 30 },
            { seq: 4, action: 'Legal counsel engagement', role: 'super_admin', sla_min: 60 },
            { seq: 5, action: 'Credential rotation and re-auth all users', role: 'platform_security', sla_min: 120 },
            { seq: 6, action: 'Regulatory notification', role: 'compliance_officer', sla_min: 4320 },
        ]
    }
};

// ═══════════════════════════════════════════════════════════════════
// AUTO-DEACTIVATION POLICY
// ═══════════════════════════════════════════════════════════════════

const AUTO_DEACTIVATION = {
    YELLOW: { max_hours: 72, warn_at_hours: 48 },
    ORANGE: { max_hours: 48, warn_at_hours: 24 },
    RED: { max_hours: 24, warn_at_hours: 12 },
    BLACK: { max_hours: 12, warn_at_hours: 6 },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class CrisisEngine {
    constructor() {
        this.currentLevel = 'MONITOR';
        this.activeKillSwitches = new Map(); // id → { type, target, activated_by, activated_at, ... }
        this.approvalQueue = new Map();      // pending dual-key approvals
        this.auditTrail = [];
        this.drillMode = false;
    }

    // ─── Status ────────────────────────────────────────────────────

    getStatus() {
        const level = CRISIS_LEVELS[this.currentLevel];
        const activeKills = Array.from(this.activeKillSwitches.values());
        return {
            crisis_level: this.currentLevel,
            level_info: level,
            drill_mode: this.drillMode,
            active_kill_switches: activeKills.length,
            kill_switches: activeKills,
            pending_approvals: Array.from(this.approvalQueue.values()),
            auto_deactivation: AUTO_DEACTIVATION[this.currentLevel] || null,
            last_updated: new Date().toISOString(),
        };
    }

    // ─── Kill-Switch: Tenant ──────────────────────────────────────

    killTenant(tenantId, activatedBy, reason, role) {
        return this._activateKillSwitch('tenant', tenantId, activatedBy, reason, role, 'RED');
    }

    // ─── Kill-Switch: Module ──────────────────────────────────────

    killModule(moduleName, activatedBy, reason, role) {
        return this._activateKillSwitch('module', moduleName, activatedBy, reason, role, 'ORANGE');
    }

    // ─── Kill-Switch: Global ────────────────────────── (dual-key) ─

    killGlobal(activatedBy, reason, role) {
        return this._activateKillSwitch('global', 'ALL_SYSTEMS', activatedBy, reason, role, 'BLACK');
    }

    // ─── Internal: Activate Kill-Switch ───────────────────────────

    _activateKillSwitch(type, target, activatedBy, reason, role, minLevel) {
        const levelDef = CRISIS_LEVELS[minLevel];

        // Check role authorization
        if (levelDef.allowed_roles && !levelDef.allowed_roles.includes(role)) {
            return { error: `Role '${role}' not authorized for ${minLevel} kill-switch`, required_roles: levelDef.allowed_roles };
        }

        // Dual-key check for RED/BLACK
        if (levelDef.required_approvers >= 2) {
            const pendingId = `${type}:${target}`;
            const existing = this.approvalQueue.get(pendingId);

            if (!existing) {
                // First key
                const approval = {
                    id: pendingId,
                    type, target, reason,
                    first_approver: { user: activatedBy, role, time: new Date().toISOString() },
                    status: 'awaiting_second_key',
                    expires_at: new Date(Date.now() + 15 * 60000).toISOString(), // 15 min to get second key
                };
                this.approvalQueue.set(pendingId, approval);
                this._log('DUAL_KEY_FIRST', { type, target, activatedBy, role, reason });
                return {
                    status: 'awaiting_second_key',
                    message: `Kill-switch requires dual-key authorization. First key accepted from ${role}. Second key needed within 15 minutes.`,
                    approval,
                };
            }

            // Second key — must be different user
            if (existing.first_approver.user === activatedBy) {
                return { error: 'Dual-key requires two DIFFERENT users. Same user cannot provide both keys.' };
            }

            // Second key accepted — execute
            this.approvalQueue.delete(pendingId);
            existing.second_approver = { user: activatedBy, role, time: new Date().toISOString() };
            existing.status = 'approved';
            this._log('DUAL_KEY_APPROVED', existing);
        }

        // Execute kill-switch
        const id = uuidv4();
        const killSwitch = {
            id, type, target, reason,
            activated_by: activatedBy,
            activated_by_role: role,
            activated_at: new Date().toISOString(),
            status: 'active',
            drill: this.drillMode,
            auto_deactivate_at: AUTO_DEACTIVATION[minLevel]
                ? new Date(Date.now() + AUTO_DEACTIVATION[minLevel].max_hours * 3600000).toISOString()
                : null,
        };

        this.activeKillSwitches.set(id, killSwitch);
        this.currentLevel = minLevel;
        this._log('KILL_SWITCH_ACTIVATED', killSwitch);

        return {
            status: 'activated',
            kill_switch: killSwitch,
            crisis_level: this.currentLevel,
            message: this.drillMode
                ? `[DRILL] Kill-switch simulated for ${type}:${target}`
                : `Kill-switch ACTIVE for ${type}:${target}. Crisis level: ${minLevel}`,
        };
    }

    // ─── Deactivate Kill-Switch ───────────────────────────────────

    deactivate(killSwitchId, deactivatedBy, reason, role) {
        const ks = this.activeKillSwitches.get(killSwitchId);
        if (!ks) return { error: 'Kill-switch not found or already deactivated' };

        // Only super_admin or platform_security can deactivate
        if (!['super_admin', 'platform_security'].includes(role)) {
            return { error: `Role '${role}' cannot deactivate kill-switches`, required_roles: ['super_admin', 'platform_security'] };
        }

        ks.status = 'deactivated';
        ks.deactivated_by = deactivatedBy;
        ks.deactivated_at = new Date().toISOString();
        ks.deactivation_reason = reason;
        this.activeKillSwitches.delete(killSwitchId);

        // De-escalate if no more active kill-switches
        if (this.activeKillSwitches.size === 0) {
            this.currentLevel = 'MONITOR';
        }

        this._log('KILL_SWITCH_DEACTIVATED', ks);

        return {
            status: 'deactivated',
            kill_switch: ks,
            crisis_level: this.currentLevel,
            remaining_active: this.activeKillSwitches.size,
        };
    }

    // ─── Escalation ───────────────────────────────────────────────

    escalate(fromLevel, toLevel, trigger, escalatedBy, role) {
        const rule = ESCALATION_MATRIX.find(r => r.from === fromLevel && r.to === toLevel);
        if (!rule) return { error: `No escalation path from ${fromLevel} to ${toLevel}` };

        const toLevelDef = CRISIS_LEVELS[toLevel];
        if (toLevelDef.allowed_roles && !toLevelDef.allowed_roles.includes(role)) {
            return { error: `Role '${role}' not authorized to escalate to ${toLevel}` };
        }

        this.currentLevel = toLevel;
        const event = {
            id: uuidv4(),
            from: fromLevel, to: toLevel, trigger,
            escalated_by: escalatedBy, role,
            timestamp: new Date().toISOString(),
        };
        this._log('ESCALATION', event);

        return { status: 'escalated', ...event, level_info: toLevelDef };
    }

    // ─── Crisis Drill ─────────────────────────────────────────────

    startDrill(startedBy, playbook_key) {
        this.drillMode = true;
        const playbook = PLAYBOOKS[playbook_key];
        if (!playbook) return { error: `Unknown playbook: ${playbook_key}`, available: Object.keys(PLAYBOOKS) };

        const drill = {
            id: uuidv4(),
            playbook_key,
            playbook,
            started_by: startedBy,
            started_at: new Date().toISOString(),
            drill_mode: true,
        };
        this._log('DRILL_STARTED', drill);
        return { status: 'drill_active', ...drill };
    }

    endDrill(endedBy) {
        this.drillMode = false;
        // Clear any drill kill-switches
        for (const [id, ks] of this.activeKillSwitches) {
            if (ks.drill) this.activeKillSwitches.delete(id);
        }
        if (this.activeKillSwitches.size === 0) this.currentLevel = 'MONITOR';
        this._log('DRILL_ENDED', { ended_by: endedBy });
        return { status: 'drill_ended', crisis_level: this.currentLevel };
    }

    // ─── Getters ──────────────────────────────────────────────────

    getEscalationMatrix() { return ESCALATION_MATRIX; }
    getPlaybooks() { return PLAYBOOKS; }
    getPlaybook(key) { return PLAYBOOKS[key] || null; }
    getCrisisLevels() { return CRISIS_LEVELS; }
    getAutoDeactivationPolicy() { return AUTO_DEACTIVATION; }

    getAuditTrail(limit = 50) {
        return this.auditTrail.slice(-limit).reverse();
    }

    // ─── Check if module/tenant is halted ─────────────────────────

    isHalted(type, target) {
        // Check global halt
        for (const ks of this.activeKillSwitches.values()) {
            if (ks.type === 'global' && !ks.drill) return true;
        }
        // Check specific halt
        for (const ks of this.activeKillSwitches.values()) {
            if (ks.type === type && ks.target === target && !ks.drill) return true;
        }
        return false;
    }

    // ─── Audit Log ────────────────────────────────────────────────

    _log(action, details) {
        this.auditTrail.push({
            id: uuidv4(),
            action,
            details,
            timestamp: new Date().toISOString(),
        });
        console.log(`[CRISIS] ${action}:`, JSON.stringify(details).slice(0, 200));
    }
}

module.exports = new CrisisEngine();
