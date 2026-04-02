/**
 * TrustChecker — Crisis Governance Engine v1.0
 * Kill-Switch Controller + Crisis Level Classification + Escalation Matrix
 *
 * Features:
 *   - Kill-switch: per-org, per-module, or system-wide halt
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
        level: 0,
        name: 'Monitor',
        color: '#22c55e',
        description: 'Normal operations — all systems within SLO',
        auto_actions: [],
        required_approvers: 0,
    },
    YELLOW: {
        level: 1,
        name: 'Yellow Alert',
        color: '#eab308',
        description: 'Elevated risk detected — monitoring intensified',
        auto_actions: ['increase_logging', 'notify_ops'],
        required_approvers: 1,
        allowed_roles: ['super_admin', 'ops_manager', 'platform_security'],
    },
    ORANGE: {
        level: 2,
        name: 'Orange Alert',
        color: '#f97316',
        description: 'Active threat — partial service restriction may be needed',
        auto_actions: ['increase_logging', 'notify_ops', 'restrict_new_registrations'],
        required_approvers: 1,
        allowed_roles: ['super_admin', 'ops_manager', 'platform_security'],
    },
    RED: {
        level: 3,
        name: 'Red — Kill-Switch Engaged',
        color: '#ef4444',
        description: 'Critical breach — targeted kill-switch active, services suspended',
        auto_actions: ['halt_target', 'notify_all_stakeholders', 'lock_audit_log'],
        required_approvers: 2,
        allowed_roles: ['super_admin', 'platform_security'],
    },
    BLACK: {
        level: 4,
        name: 'Black — Full System Halt',
        color: '#000000',
        description: 'Catastrophic — all operations halted, war room active',
        auto_actions: ['halt_all', 'notify_all_stakeholders', 'lock_audit_log', 'activate_war_room'],
        required_approvers: 2,
        allowed_roles: ['super_admin'],
    },
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
        name: 'Data Breach Response',
        severity: 'RED',
        steps: [
            { seq: 1, action: 'Activate kill-switch for affected org', role: 'platform_security', sla_min: 5 },
            { seq: 2, action: 'Isolate affected database partitions', role: 'ops_manager', sla_min: 10 },
            { seq: 3, action: 'Forensic snapshot of audit logs', role: 'auditor', sla_min: 15 },
            { seq: 4, action: 'Notify affected users per GDPR Art.33', role: 'compliance_officer', sla_min: 60 },
            { seq: 5, action: 'External security audit engagement', role: 'super_admin', sla_min: 120 },
            { seq: 6, action: 'Remediation and patch deployment', role: 'developer', sla_min: 240 },
            { seq: 7, action: 'Post-mortem and regulatory report', role: 'compliance_officer', sla_min: 4320 },
        ],
    },
    service_outage: {
        name: 'Service Outage Response',
        severity: 'ORANGE',
        steps: [
            { seq: 1, action: 'Confirm outage scope and severity', role: 'ops_manager', sla_min: 5 },
            { seq: 2, action: 'Engage failover / DR systems', role: 'ops_manager', sla_min: 10 },
            { seq: 3, action: 'Status page update to stakeholders', role: 'ops_manager', sla_min: 15 },
            { seq: 4, action: 'Root cause identification', role: 'developer', sla_min: 60 },
            { seq: 5, action: 'Service restoration', role: 'developer', sla_min: 120 },
            { seq: 6, action: 'Post-incident review', role: 'ops_manager', sla_min: 1440 },
        ],
    },
    supply_chain_compromise: {
        name: 'Supply Chain Integrity Breach',
        severity: 'RED',
        steps: [
            { seq: 1, action: 'Freeze all pending certifications', role: 'risk_officer', sla_min: 5 },
            { seq: 2, action: 'Kill-switch on affected supply chain module', role: 'platform_security', sla_min: 10 },
            { seq: 3, action: 'Quarantine suspect blockchain seals', role: 'blockchain_operator', sla_min: 15 },
            { seq: 4, action: 'Notify regulatory bodies (EU CBAM)', role: 'compliance_officer', sla_min: 60 },
            { seq: 5, action: 'Full chain-of-custody re-verification', role: 'scm_analyst', sla_min: 480 },
            { seq: 6, action: 'Remediation report + evidence pack', role: 'auditor', sla_min: 2880 },
        ],
    },
    financial_fraud: {
        name: 'Financial Fraud Detection',
        severity: 'RED',
        steps: [
            { seq: 1, action: 'Suspend billing for affected accounts', role: 'super_admin', sla_min: 5 },
            { seq: 2, action: 'Transaction forensics analysis', role: 'auditor', sla_min: 30 },
            { seq: 3, action: 'Kill-switch on billing module', role: 'platform_security', sla_min: 10 },
            { seq: 4, action: 'Contact payment processor', role: 'super_admin', sla_min: 60 },
            { seq: 5, action: 'Legal review and SAR filing', role: 'compliance_officer', sla_min: 1440 },
        ],
    },
    insider_threat: {
        name: 'Insider Threat Response',
        severity: 'BLACK',
        steps: [
            { seq: 1, action: 'Revoke all sessions for suspect account', role: 'platform_security', sla_min: 2 },
            { seq: 2, action: 'Full system kill-switch', role: 'super_admin', sla_min: 5 },
            { seq: 3, action: 'Forensic audit of all actions by suspect', role: 'auditor', sla_min: 30 },
            { seq: 4, action: 'Legal counsel engagement', role: 'super_admin', sla_min: 60 },
            { seq: 5, action: 'Credential rotation and re-auth all users', role: 'platform_security', sla_min: 120 },
            { seq: 6, action: 'Regulatory notification', role: 'compliance_officer', sla_min: 4320 },
        ],
    },
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

const crisisRepo = require('../../data/crisis-repository');

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class CrisisEngine {
    constructor() {
        this.currentLevel = 'MONITOR';
        this.drillMode = false;

        // Shadow State (Migration Strategy Phase)
        this.shadowActiveKillSwitches = new Map();
        this.shadowApprovalQueue = new Map();
    }

    // ─── Status ────────────────────────────────────────────────────

    async getStatus() {
        const _start = Date.now();
        const activeKillsDb = await crisisRepo.getActiveKillSwitches();
        const pendingQueueDb = await crisisRepo.getPendingApprovals();

        // Recalculate highest
        this._recalculateCrisisLevel(activeKillsDb);

        const level = CRISIS_LEVELS[this.currentLevel];

        this._logStructured('STATUS_CHECK', {
            level: this.currentLevel,
            active_count: activeKillsDb.length,
            pending_count: pendingQueueDb.length,
            latency_ms: Date.now() - _start,
        });

        // Parse pending details for compatibility
        const pendingApprovals = pendingQueueDb.map(k => ({
            id: k.id,
            type: k.target.split(':')[0],
            target: k.target,
            reason: k.reason,
            first_approver: { user: k.activated_by, role: k.activated_role, time: k.created_at },
            status: k.status,
            expires_at: new Date(new Date(k.created_at).getTime() + 15 * 60000).toISOString(),
        }));

        return {
            crisis_level: this.currentLevel,
            level_info: level,
            drill_mode: this.drillMode,
            active_kill_switches: activeKillsDb.length,
            kill_switches: activeKillsDb,
            pending_approvals: pendingApprovals,
            auto_deactivation: AUTO_DEACTIVATION[this.currentLevel] || null,
            last_updated: new Date().toISOString(),
        };
    }

    // Compatibility Wrappers (Blocking Sync Emulation)
    getStatusSync() {
        console.warn('⚠️ getStatusSync called directly. Data might be slightly stale if resolving asynchronously.');
        return { crisis_level: this.currentLevel, warning: 'migration_to_async' };
    }

    // ─── Kill-Switch: Org ──────────────────────────────────────

    async killOrg(orgId, activatedBy, reason, role) {
        return this._activateKillSwitch('org', orgId, activatedBy, reason, role, 'RED');
    }

    // ─── Kill-Switch: Module ──────────────────────────────────────

    async killModule(moduleName, activatedBy, reason, role) {
        return this._activateKillSwitch('module', moduleName, activatedBy, reason, role, 'ORANGE');
    }

    // ─── Kill-Switch: Global ────────────────────────── (dual-key) ─

    async killGlobal(activatedBy, reason, role) {
        return this._activateKillSwitch('global', 'ALL_SYSTEMS', activatedBy, reason, role, 'BLACK');
    }

    // Compatibility Mode for Legacy Routes
    killGlobalSync(activatedBy, reason, role) {
        this._logStructured('COMPATIBILITY_WARN', { method: 'killGlobalSync', activatedBy });
        return this.killGlobal(activatedBy, reason, role); // Returns a promise! Route MUST be awaited.
    }

    // ─── Internal: Activate Kill-Switch ───────────────────────────

    async _activateKillSwitch(type, target, activatedBy, reason, role, minLevel) {
        const _start = Date.now();
        const levelDef = CRISIS_LEVELS[minLevel];

        // Check role authorization
        if (levelDef.allowed_roles && !levelDef.allowed_roles.includes(role)) {
            return {
                error: `Role '${role}' not authorized for ${minLevel} kill-switch`,
                required_roles: levelDef.allowed_roles,
            };
        }

        let result;

        // Dual-key check for RED/BLACK
        if (levelDef.required_approvers >= 2) {
            const pendingId = `${type}:${target}`;

            // Check if we are approving an existing one (legacy design passed same params)
            // Or initiating a new one
            result = await crisisRepo.initiateDualKey(type, target, activatedBy, role, reason, pendingId);

            if (result.status === 'already_pending') {
                if (result.warning === 'replay_detected') {
                    this._logStructured('DUAL_KEY_REPLAY_DETECTED', {
                        request_id: pendingId,
                        approver_id: activatedBy,
                        latency_ms: Date.now() - _start,
                    });
                    return result; // Same output no error
                }

                // Second user provides key
                result = await crisisRepo.approveDualKey(
                    result.approval.id,
                    activatedBy,
                    role,
                    this.drillMode,
                    minLevel
                );
                if (!result.error) {
                    // SHADOW WRITE
                    this.shadowApprovalQueue.delete(result.approval?.id || pendingId);
                    this.shadowActiveKillSwitches.set(result.id, result);
                    this._compareShadowState('approveDualKey');

                    this._logStructured('DUAL_KEY_APPROVED', {
                        request_id: pendingId,
                        approver_id: activatedBy,
                        state_transition: 'pending -> approved',
                        latency_ms: Date.now() - _start,
                    });
                    this._recalculateCrisisLevel(await crisisRepo.getActiveKillSwitches());
                } else {
                    this._logStructured('DUAL_KEY_ERROR', {
                        request_id: pendingId,
                        error: result.error,
                        latency_ms: Date.now() - _start,
                    });
                }
            } else {
                // SHADOW WRITE
                this.shadowApprovalQueue.set(pendingId, result);
                this._compareShadowState('initiateDualKey');

                this._logStructured('DUAL_KEY_FIRST', {
                    request_id: pendingId,
                    approver_id: activatedBy,
                    state_transition: 'null -> pending',
                    latency_ms: Date.now() - _start,
                });
                result = {
                    ...result,
                    message: `Kill-switch requires dual-key authorization. First key accepted from ${role}. Second key needed within 15 minutes.`,
                };
            }
        } else {
            // Single-key execute
            result = await crisisRepo.activateKillSwitch(
                type,
                target,
                activatedBy,
                role,
                reason,
                minLevel,
                this.drillMode
            );
            if (!result.error) {
                // SHADOW WRITE
                this.shadowActiveKillSwitches.set(result.id, result);
                this._compareShadowState('activateKillSwitch');

                this._logStructured('KILL_SWITCH_ACTIVATED', {
                    type,
                    target,
                    activatedBy,
                    scope: target,
                    latency_ms: Date.now() - _start,
                });
                this._recalculateCrisisLevel(await crisisRepo.getActiveKillSwitches());
                result.message = this.drillMode
                    ? `[DRILL] Kill-switch simulated for ${type}:${target}`
                    : `Kill-switch ACTIVE for ${type}:${target}. Crisis level: ${minLevel}`;
            } else if (result.warning === 'replay_detected') {
                this._logStructured('KILL_SWITCH_REPLAY', {
                    type,
                    target,
                    activatedBy,
                    latency_ms: Date.now() - _start,
                });
            }
        }

        return result;
    }

    // ─── Deactivate Kill-Switch ───────────────────────────────────

    async deactivate(killSwitchId, deactivatedBy, reason, role) {
        const _start = Date.now();
        // Only super_admin or platform_security can deactivate
        if (!['super_admin', 'platform_security'].includes(role)) {
            return {
                error: `Role '${role}' cannot deactivate kill-switches`,
                required_roles: ['super_admin', 'platform_security'],
            };
        }

        const result = await crisisRepo.deactivateKillSwitch(killSwitchId, deactivatedBy, reason);
        if (!result.error) {
            // SHADOW WRITE
            this.shadowActiveKillSwitches.delete(killSwitchId);
            this._compareShadowState('deactivateKillSwitch');

            this._logStructured('KILL_SWITCH_DEACTIVATED', {
                id: killSwitchId,
                deactivatedBy,
                latency_ms: Date.now() - _start,
            });
            const active = await crisisRepo.getActiveKillSwitches();
            this._recalculateCrisisLevel(active);
            return {
                status: 'deactivated',
                kill_switch: result,
                crisis_level: this.currentLevel,
                remaining_active: active.length,
            };
        }

        return result;
    }

    // ─── Recalculate Highest Severity ────────────────────────────
    _recalculateCrisisLevel(activeKillSwitchesDb) {
        if (!activeKillSwitchesDb || activeKillSwitchesDb.length === 0) {
            this.currentLevel = 'MONITOR';
            return;
        }
        let maxLevelIndex = -1;
        let maxLevelName = 'MONITOR';
        for (const ks of activeKillSwitchesDb) {
            // Re-derive level
            const lvl =
                ks.kill_switch_type === 'global' ? 'BLACK' : ks.kill_switch_type === 'module' ? 'ORANGE' : 'RED';
            const levelInfo = CRISIS_LEVELS[lvl];
            if (levelInfo && levelInfo.level > maxLevelIndex) {
                maxLevelIndex = levelInfo.level;
                maxLevelName = lvl;
            }
        }
        this.currentLevel = maxLevelName;
    }

    // ─── Escalation ───────────────────────────────────────────────

    async escalate(fromLevel, toLevel, trigger, escalatedBy, role) {
        const rule = ESCALATION_MATRIX.find(r => r.from === fromLevel && r.to === toLevel);
        if (!rule) return { error: `No escalation path from ${fromLevel} to ${toLevel}` };

        const toLevelDef = CRISIS_LEVELS[toLevel];
        if (toLevelDef.allowed_roles && !toLevelDef.allowed_roles.includes(role)) {
            return { error: `Role '${role}' not authorized to escalate to ${toLevel}` };
        }

        this.currentLevel = toLevel;
        const event = {
            id: uuidv4(),
            from: fromLevel,
            to: toLevel,
            trigger,
            escalated_by: escalatedBy,
            role,
            timestamp: new Date().toISOString(),
        };
        this._logStructured('ESCALATION', event);

        return { status: 'escalated', ...event, level_info: toLevelDef };
    }

    // ─── Crisis Drill ─────────────────────────────────────────────

    async startDrill(startedBy, playbook_key) {
        this.drillMode = true;
        const playbook = PLAYBOOKS[playbook_key];
        if (!playbook) return { error: `Unknown playbook: ${playbook_key}`, available: Object.keys(PLAYBOOKS) };

        this._logStructured('DRILL_STARTED', { playbook_key, started_by: startedBy });
        return { status: 'drill_active', playbook_key };
    }

    async endDrill(endedBy) {
        this.drillMode = false;
        // In full DB architecture, we would DELETE or deactivate kill_switches where drill_mode=true
        this._logStructured('DRILL_ENDED', { ended_by: endedBy });
        return { status: 'drill_ended', crisis_level: this.currentLevel };
    }

    // ─── Getters ──────────────────────────────────────────────────

    getEscalationMatrix() {
        return ESCALATION_MATRIX;
    }
    getPlaybooks() {
        return PLAYBOOKS;
    }
    getPlaybook(key) {
        return PLAYBOOKS[key] || null;
    }
    getCrisisLevels() {
        return CRISIS_LEVELS;
    }
    getAutoDeactivationPolicy() {
        return AUTO_DEACTIVATION;
    }

    // ─── Check if module/org is halted ─────────────────────────

    async isHalted(type, target) {
        const active = await crisisRepo.getActiveKillSwitches();

        // Check global halt
        for (const ks of active) {
            if (ks.kill_switch_type === 'global' && !ks.drill_mode) return true;
        }
        // Check specific halt
        for (const ks of active) {
            if (ks.kill_switch_type === type && ks.target === target && !ks.drill_mode) return true;
        }
        return false;
    }

    // Legacy sync method for fast paths (middleware check)
    // IMPORTANT: It relies on slightly stale data updated whenever someone calls getStatus or activates.
    // If exact accuracy is needed, middleware must switch to async.
    isHaltedSync(type, target) {
        // Fallback to shadow memory if available
        for (const ks of this.shadowActiveKillSwitches.values()) {
            if (ks.kill_switch_type === 'global' && !ks.drill_mode) return true;
            if (ks.kill_switch_type === type && ks.target === target && !ks.drill_mode) return true;
        }
        return false;
    }

    // ─── Shadow Write / Migration Monitor ─────────────────────────
    async _compareShadowState(action) {
        try {
            const activeKillsDb = await crisisRepo.getActiveKillSwitches();
            const pendingQueueDb = await crisisRepo.getPendingApprovals();

            let mismatchCount = 0;
            if (activeKillsDb.length !== this.shadowActiveKillSwitches.size) mismatchCount++;
            if (pendingQueueDb.length !== this.shadowApprovalQueue.size) mismatchCount++;

            this._logStructured('MIGRATION_CUTOVER_METRIC', {
                action,
                db_active_count: activeKillsDb.length,
                ram_active_count: this.shadowActiveKillSwitches.size,
                mismatch_detected: mismatchCount > 0,
                cutover_condition: 'Mismatch rate < 0.01% over 24h',
            });
        } catch (e) {
            // Safe fire-and-forget catching
            this._logStructured('MIGRATION_MONITOR_ERROR', { error: e.message });
        }
    }

    // ─── Audit Log ────────────────────────────────────────────────

    _logStructured(action, details) {
        console.log(
            JSON.stringify({
                timestamp: new Date().toISOString(),
                module: 'CRISIS',
                action,
                details,
            })
        );
    }
}

module.exports = new CrisisEngine();
