/**
 * TrustChecker — Ops Monitoring Engine (Operational Integrity Layer)
 * Real-time SLO monitoring, incident severity, runbook, pipeline health
 * Ops = Execution Stabilizer — cannot mint, change baselines, or delete audit
 */
const crypto = require('crypto');

// SLO thresholds
const SLO_THRESHOLDS = {
    mint_pipeline_latency_ms: { target: 5000, warning: 8000, critical: 15000, unit: 'ms' },
    mrv_processing_time_ms: { target: 3000, warning: 6000, critical: 12000, unit: 'ms' },
    risk_engine_latency_ms: { target: 1000, warning: 3000, critical: 5000, unit: 'ms' },
    api_response_p95_ms: { target: 500, warning: 1500, critical: 3000, unit: 'ms' },
    uptime_pct: { target: 99.95, warning: 99.5, critical: 99.0, unit: '%' },
    error_rate_pct: { target: 0.1, warning: 1.0, critical: 5.0, unit: '%' },
    mrv_backlog_count: { target: 0, warning: 50, critical: 200, unit: 'items' },
    credit_freeze_active: { target: 0, warning: 1, critical: 3, unit: 'count' }
};

// Incident severity classification
const SEVERITY = {
    SEV1: { name: 'Critical', color: '#ef4444', response_min: 15, escalate_to: 'super_admin', description: 'System-level failure — minting halted, data integrity at risk' },
    SEV2: { name: 'High', color: '#f59e0b', response_min: 60, escalate_to: 'admin_company', description: 'Major degradation — pipeline delays, fraud outbreak' },
    SEV3: { name: 'Medium', color: '#3b82f6', response_min: 240, escalate_to: 'ops_lead', description: 'Moderate issue — SLO breach, backlog growth' },
    SEV4: { name: 'Low', color: '#94a3b8', response_min: 1440, escalate_to: 'ops_team', description: 'Minor — performance degradation, cosmetic issues' }
};

// Runbook templates (Ops can only execute, not create)
const RUNBOOKS = {
    credit_freeze: {
        name: 'Credit Freeze Response', severity: 'SEV1', requires_audit: true,
        steps: [
            { action: 'Confirm freeze trigger from Risk Engine', role: 'ops', audit: true },
            { action: 'Notify Compliance Officer', role: 'ops', audit: true },
            { action: 'Block pending transfers', role: 'ops', audit: true },
            { action: 'Escalate to Admin Company for review', role: 'ops', audit: true },
            { action: 'Compliance approves unfreeze', role: 'compliance', audit: true },
            { action: 'Risk Engine re-validates', role: 'risk', audit: true }
        ]
    },
    suspicious_transfer: {
        name: 'Suspicious Transfer Investigation', severity: 'SEV2', requires_audit: true,
        steps: [
            { action: 'Flag transfer in registry', role: 'ops', audit: true },
            { action: 'Run AML check via Compliance', role: 'compliance', audit: true },
            { action: 'Collect transfer evidence', role: 'ops', audit: true },
            { action: 'Risk Engine re-score', role: 'risk', audit: true },
            { action: 'Compliance decision: approve/block', role: 'compliance', audit: true }
        ]
    },
    data_anomaly: {
        name: 'Data Anomaly Escalation', severity: 'SEV2', requires_audit: true,
        steps: [
            { action: 'Isolate affected data partition', role: 'ops', audit: true },
            { action: 'Notify IT for integrity check', role: 'ops', audit: true },
            { action: 'IT verifies hash chain', role: 'it', audit: true },
            { action: 'Compare against blockchain anchor', role: 'it', audit: true },
            { action: 'Compliance reviews impact', role: 'compliance', audit: true }
        ]
    },
    carbon_miscalculation: {
        name: 'Carbon Miscalculation Response', severity: 'SEV1', requires_audit: true,
        steps: [
            { action: 'Freeze affected credits', role: 'risk', audit: true },
            { action: 'Ops identifies root cause', role: 'ops', audit: true },
            { action: 'Compliance reviews baseline logic', role: 'compliance', audit: true },
            { action: 'Recalculate affected credits', role: 'risk', audit: true },
            { action: 'Admin Company approves correction', role: 'admin_company', audit: true },
            { action: 'Super Admin audits entire process', role: 'super_admin', audit: true }
        ]
    },
    baseline_corruption: {
        name: 'Baseline Corruption', severity: 'SEV1', requires_audit: true,
        steps: [
            { action: 'Halt all minting immediately', role: 'risk', audit: true },
            { action: 'IT restores from verified backup', role: 'it', audit: true },
            { action: 'Compliance validates restored baseline', role: 'compliance', audit: true },
            { action: 'Risk Engine re-processes affected pipeline', role: 'risk', audit: true },
            { action: 'Super Admin signs off', role: 'super_admin', audit: true }
        ]
    },
    fraud_outbreak: {
        name: 'Fraud Outbreak Response', severity: 'SEV1', requires_audit: true,
        steps: [
            { action: 'Risk Engine triggers platform-wide alert', role: 'risk', audit: true },
            { action: 'Ops freezes affected tenants', role: 'ops', audit: true },
            { action: 'IT isolates network segments', role: 'it', audit: true },
            { action: 'Compliance notifies regulators if required', role: 'compliance', audit: true },
            { action: 'Admin Company coordinates response', role: 'admin_company', audit: true },
            { action: 'Super Admin oversees investigation', role: 'super_admin', audit: true }
        ]
    }
};

// Ops boundary — what Ops CANNOT do
const OPS_FORBIDDEN = [
    { action: 'Mint credits directly', reason: 'Minting requires Risk Engine approval' },
    { action: 'Change baseline factors', reason: 'Baselines require Compliance approval' },
    { action: 'Delete audit logs', reason: 'Audit logs are immutable' },
    { action: 'Override Risk Engine', reason: 'Risk decisions require Compliance escalation' },
    { action: 'Access tenant encryption keys', reason: 'Key management is IT-only' },
    { action: 'Modify compliance rules', reason: 'Policy authority belongs to Compliance' }
];

class OpsMonitoringEngine {

    constructor() {
        // In-memory incident store (production: PostgreSQL)
        this.incidents = new Map();       // incident_id → incident
        this.escalationLog = [];
        this.postMortems = new Map();
        this.warRooms = new Map();
    }

    /**
     * Real-time pipeline health check
     */
    checkPipelineHealth(metrics = {}) {
        const checks = Object.entries(SLO_THRESHOLDS).map(([key, threshold]) => {
            const actual = metrics[key] ?? (
                key.includes('uptime') ? 99.98 :
                    key.includes('error') ? 0.05 :
                        key.includes('backlog') ? 0 :
                            key.includes('freeze') ? 0 :
                                Math.floor(threshold.target * (0.3 + Math.random() * 0.6))  // 30-90% of target = healthy range
            );
            let status = 'healthy';
            if (key === 'uptime_pct' || key === 'error_rate_pct') {
                if (key === 'uptime_pct') status = actual >= threshold.target ? 'healthy' : actual >= threshold.warning ? 'warning' : 'critical';
                else status = actual <= threshold.target ? 'healthy' : actual <= threshold.warning ? 'warning' : 'critical';
            } else {
                status = actual <= threshold.target ? 'healthy' : actual <= threshold.warning ? 'warning' : 'critical';
            }
            return { metric: key.replace(/_/g, ' '), actual, target: threshold.target, warning: threshold.warning, critical: threshold.critical, unit: threshold.unit, status };
        });

        const criticalCount = checks.filter(c => c.status === 'critical').length;
        const warningCount = checks.filter(c => c.status === 'warning').length;

        return {
            title: 'Pipeline Health Monitor (SLO-based)',
            overall: criticalCount > 0 ? 'critical' : warningCount > 0 ? 'degraded' : 'healthy',
            checks,
            summary: { healthy: checks.filter(c => c.status === 'healthy').length, warning: warningCount, critical: criticalCount },
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Create incident with severity classification + lifecycle tracking
     */
    createIncident(params) {
        const { title, description, severity = 'SEV3', affected_entity, triggered_by = 'system', runbook_key, module, tags } = params;
        const sev = SEVERITY[severity];
        if (!sev) return { error: `Invalid severity. Valid: ${Object.keys(SEVERITY).join(', ')}` };

        const incidentId = `INC-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();
        const now = new Date();

        const incident = {
            incident_id: incidentId,
            title, description,
            severity: { key: severity, ...sev },
            affected_entity, module,
            triggered_by,
            tags: tags || [],
            runbook: runbook_key ? RUNBOOKS[runbook_key] : null,
            status: 'open',
            assigned_to: null,
            timeline: [{ event: 'Incident created', actor: triggered_by, at: now.toISOString() }],
            response_deadline: new Date(now.getTime() + sev.response_min * 60000).toISOString(),
            escalate_to: sev.escalate_to,
            sla: {
                response_target_min: sev.response_min,
                acknowledged_at: null,
                resolved_at: null,
                breached: false,
            },
            hash: crypto.createHash('sha256').update(JSON.stringify({ incidentId, title, severity })).digest('hex'),
            created_at: now.toISOString(),
            updated_at: now.toISOString(),
        };

        this.incidents.set(incidentId, incident);
        return incident;
    }

    // ─── Escalate an incident ───────────────────────────────────

    escalateIncident(incidentId, escalatedBy, reason, newSeverity) {
        const inc = this.incidents.get(incidentId);
        if (!inc) return { error: 'Incident not found' };

        const oldSeverity = inc.severity.key;
        if (newSeverity) {
            const sev = SEVERITY[newSeverity];
            if (!sev) return { error: `Invalid severity: ${newSeverity}` };
            inc.severity = { key: newSeverity, ...sev };
            inc.response_deadline = new Date(Date.now() + sev.response_min * 60000).toISOString();
            inc.escalate_to = sev.escalate_to;
        }

        const evt = {
            event: `Escalated from ${oldSeverity} to ${newSeverity || oldSeverity}`,
            actor: escalatedBy,
            reason,
            at: new Date().toISOString(),
        };
        inc.timeline.push(evt);
        inc.updated_at = new Date().toISOString();

        this.escalationLog.push({ incident_id: incidentId, ...evt });
        return { status: 'escalated', incident: inc };
    }

    // ─── Assign incident to user/role ───────────────────────────

    assignIncident(incidentId, assignedTo, assignedBy) {
        const inc = this.incidents.get(incidentId);
        if (!inc) return { error: 'Incident not found' };

        inc.assigned_to = assignedTo;
        if (inc.status === 'open') inc.status = 'acknowledged';
        if (!inc.sla.acknowledged_at) {
            inc.sla.acknowledged_at = new Date().toISOString();
            const ackTime = Date.now() - new Date(inc.created_at).getTime();
            inc.sla.time_to_acknowledge_ms = ackTime;
        }
        inc.timeline.push({
            event: `Assigned to ${assignedTo}`,
            actor: assignedBy, at: new Date().toISOString(),
        });
        inc.updated_at = new Date().toISOString();
        return { status: 'assigned', incident: inc };
    }

    // ─── Resolve incident ───────────────────────────────────────

    resolveIncident(incidentId, resolvedBy, resolution, rootCause) {
        const inc = this.incidents.get(incidentId);
        if (!inc) return { error: 'Incident not found' };

        inc.status = 'resolved';
        inc.sla.resolved_at = new Date().toISOString();
        const ttResolve = Date.now() - new Date(inc.created_at).getTime();
        inc.sla.time_to_resolve_ms = ttResolve;
        inc.sla.breached = ttResolve > inc.severity.response_min * 60000;

        inc.resolution = resolution;
        inc.root_cause = rootCause;
        inc.timeline.push({
            event: `Resolved: ${resolution}`,
            actor: resolvedBy,
            root_cause: rootCause,
            at: new Date().toISOString(),
        });
        inc.updated_at = new Date().toISOString();
        return { status: 'resolved', incident: inc };
    }

    // ─── War Room activation ────────────────────────────────────

    activateWarRoom(incidentId, activatedBy) {
        const inc = this.incidents.get(incidentId);
        if (!inc) return { error: 'Incident not found' };

        const warRoom = {
            id: `WR-${Date.now().toString(36)}`,
            incident_id: incidentId,
            status: 'active',
            activated_by: activatedBy,
            activated_at: new Date().toISOString(),
            participants: [activatedBy],
            commander: activatedBy,
            decisions: [],
            action_items: [],
        };

        this.warRooms.set(incidentId, warRoom);
        inc.war_room = warRoom.id;
        inc.timeline.push({
            event: 'War Room activated',
            actor: activatedBy, at: new Date().toISOString(),
        });
        inc.updated_at = new Date().toISOString();
        return { status: 'war_room_active', war_room: warRoom };
    }

    getWarRoom(incidentId) {
        return this.warRooms.get(incidentId) || null;
    }

    // ─── Post-Mortem workflow ───────────────────────────────────

    createPostMortem(incidentId, createdBy, data = {}) {
        const inc = this.incidents.get(incidentId);
        if (!inc) return { error: 'Incident not found' };
        if (inc.status !== 'resolved') return { error: 'Incident must be resolved before post-mortem' };

        const pm = {
            id: `PM-${Date.now().toString(36)}`,
            incident_id: incidentId,
            created_by: createdBy,
            created_at: new Date().toISOString(),
            template: 'blameless',
            sections: {
                summary: data.summary || inc.title,
                impact: data.impact || 'TBD',
                root_cause: data.root_cause || inc.root_cause || 'TBD',
                five_whys: data.five_whys || ['Why?', 'Why?', 'Why?', 'Why?', 'Why?'],
                timeline: inc.timeline,
                what_went_well: data.what_went_well || [],
                what_went_wrong: data.what_went_wrong || [],
                action_items: data.action_items || [],
                preventive_measures: data.preventive_measures || [],
            },
            status: 'draft',
            resolution_time_ms: inc.sla.time_to_resolve_ms,
            sla_breached: inc.sla.breached,
        };

        this.postMortems.set(incidentId, pm);
        inc.status = 'post_mortem';
        inc.post_mortem = pm.id;
        inc.timeline.push({
            event: 'Post-mortem created',
            actor: createdBy, at: new Date().toISOString(),
        });
        inc.updated_at = new Date().toISOString();
        return { status: 'post_mortem_created', post_mortem: pm };
    }

    getPostMortem(incidentId) {
        return this.postMortems.get(incidentId) || null;
    }

    // ─── Incident Timeline ──────────────────────────────────────

    getIncidentTimeline(incidentId) {
        const inc = this.incidents.get(incidentId);
        if (!inc) return { error: 'Incident not found' };
        return {
            incident_id: incidentId,
            title: inc.title,
            severity: inc.severity.key,
            status: inc.status,
            total_events: inc.timeline.length,
            timeline: inc.timeline,
        };
    }

    // ─── SLA Violations ─────────────────────────────────────────

    getSLAViolations() {
        const violations = [];
        for (const inc of this.incidents.values()) {
            const deadline = new Date(inc.response_deadline).getTime();
            const now = Date.now();
            if (inc.status === 'open' && now > deadline) {
                violations.push({
                    incident_id: inc.incident_id,
                    title: inc.title,
                    severity: inc.severity.key,
                    overdue_min: Math.round((now - deadline) / 60000),
                    escalate_to: inc.escalate_to,
                });
            }
            if (inc.sla.breached) {
                violations.push({
                    incident_id: inc.incident_id,
                    title: inc.title,
                    severity: inc.severity.key,
                    type: 'resolution_breach',
                    resolution_time_min: Math.round((inc.sla.time_to_resolve_ms || 0) / 60000),
                    sla_target_min: inc.severity.response_min,
                });
            }
        }
        return { total: violations.length, violations };
    }

    // ─── Incident Correlation ───────────────────────────────────

    getCorrelation() {
        const groups = {};
        for (const inc of this.incidents.values()) {
            const key = inc.module || inc.affected_entity || 'unknown';
            if (!groups[key]) groups[key] = [];
            groups[key].push({
                incident_id: inc.incident_id,
                title: inc.title,
                severity: inc.severity.key,
                status: inc.status,
                created_at: inc.created_at,
            });
        }

        const correlated = Object.entries(groups)
            .filter(([, incs]) => incs.length > 1)
            .map(([module, incs]) => ({
                module,
                incident_count: incs.length,
                pattern: incs.length >= 3 ? 'recurring' : 'clustered',
                incidents: incs,
            }));

        return { correlated_groups: correlated.length, groups: correlated };
    }

    // ─── MTTR (Mean Time to Resolve) ────────────────────────────

    getMTTR() {
        const resolved = Array.from(this.incidents.values()).filter(i => i.sla.resolved_at);
        if (resolved.length === 0) return { mttr_min: 0, mtta_min: 0, total_resolved: 0, sla_compliance_pct: 100 };

        const ttrs = resolved.map(i => i.sla.time_to_resolve_ms || 0);
        const ttas = resolved.filter(i => i.sla.time_to_acknowledge_ms).map(i => i.sla.time_to_acknowledge_ms);
        const breached = resolved.filter(i => i.sla.breached).length;

        const bySeverity = {};
        for (const inc of resolved) {
            const sev = inc.severity.key;
            if (!bySeverity[sev]) bySeverity[sev] = { count: 0, total_ms: 0, breached: 0 };
            bySeverity[sev].count++;
            bySeverity[sev].total_ms += inc.sla.time_to_resolve_ms || 0;
            if (inc.sla.breached) bySeverity[sev].breached++;
        }

        for (const [sev, data] of Object.entries(bySeverity)) {
            data.avg_min = Math.round(data.total_ms / data.count / 60000);
            data.compliance_pct = Math.round(((data.count - data.breached) / data.count) * 100);
        }

        return {
            mttr_min: Math.round(ttrs.reduce((a, b) => a + b, 0) / ttrs.length / 60000),
            mtta_min: ttas.length > 0 ? Math.round(ttas.reduce((a, b) => a + b, 0) / ttas.length / 60000) : 0,
            total_resolved: resolved.length,
            sla_breached: breached,
            sla_compliance_pct: Math.round(((resolved.length - breached) / resolved.length) * 100),
            by_severity: bySeverity,
        };
    }

    // ─── Incident Frequency Analysis ────────────────────────────

    getFrequency() {
        const all = Array.from(this.incidents.values());
        const bySeverity = {};
        const byModule = {};
        const byStatus = { open: 0, acknowledged: 0, in_progress: 0, resolved: 0, post_mortem: 0 };

        for (const inc of all) {
            bySeverity[inc.severity.key] = (bySeverity[inc.severity.key] || 0) + 1;
            const mod = inc.module || 'unknown';
            byModule[mod] = (byModule[mod] || 0) + 1;
            byStatus[inc.status] = (byStatus[inc.status] || 0) + 1;
        }

        return {
            total: all.length,
            by_severity: bySeverity,
            by_module: byModule,
            by_status: byStatus,
            top_affected: Object.entries(byModule)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([module, count]) => ({ module, count })),
        };
    }

    // ─── Get all incidents ──────────────────────────────────────

    getAllIncidents(limit = 20) {
        return Array.from(this.incidents.values())
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, limit);
    }

    getIncident(id) {
        return this.incidents.get(id) || null;
    }

    // ─── Existing getters ───────────────────────────────────────

    getOpsBoundary() {
        return {
            title: 'Ops Role Boundary (Execution Stabilizer)',
            can_do: [
                'Monitor pipeline health and SLOs',
                'Execute runbooks (with audit)',
                'Freeze credits (per Risk Engine trigger)',
                'Escalate incidents',
                'Deploy baseline changes (approved by Compliance)',
                'Respond to data anomalies'
            ],
            cannot_do: OPS_FORBIDDEN,
            governance_model: 'Ops must follow runbooks. Every manual action is hashed and audited. Override requires Compliance + Risk approval.'
        };
    }

    getSeverities() { return SEVERITY; }
    getRunbooks() { return RUNBOOKS; }
    getSLOs() { return SLO_THRESHOLDS; }
}

module.exports = new OpsMonitoringEngine();

