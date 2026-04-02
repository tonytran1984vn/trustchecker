/**
 * TrustChecker — Ops Monitoring Engine (Operational Integrity Layer)
 * Real-time SLO monitoring, incident severity, runbook, pipeline health
 * Ops = Execution Stabilizer — cannot mint, change baselines, or delete audit
 */
const crypto = require('crypto');
const IngestionBuffer = require('./ingestion-buffer');
const predictiveEngine = require('./predictive-intelligence');
const opsRepo = require('../../data/ops-repository');
const db = require('../../db'); // P0: Inject DB Dependency
const { GovernanceRouter } = require('./promotion-engine');
const { PredictiveModelV1, PredictiveModelV2 } = require('./predictive-intelligence');

// SLO thresholds
const SLO_THRESHOLDS = {
    mint_pipeline_latency_ms: { target: 5000, warning: 8000, critical: 15000, unit: 'ms' },
    mrv_processing_time_ms: { target: 3000, warning: 6000, critical: 12000, unit: 'ms' },
    risk_engine_latency_ms: { target: 1000, warning: 3000, critical: 5000, unit: 'ms' },
    api_response_p95_ms: { target: 500, warning: 1500, critical: 3000, unit: 'ms' },
    uptime_pct: { target: 99.95, warning: 99.5, critical: 99.0, unit: '%' },
    error_rate_pct: { target: 0.1, warning: 1.0, critical: 5.0, unit: '%' },
    mrv_backlog_count: { target: 0, warning: 50, critical: 200, unit: 'items' },
    credit_freeze_active: { target: 0, warning: 1, critical: 3, unit: 'count' },
};

// Incident severity classification
const SEVERITY = {
    SEV1: {
        name: 'Critical',
        color: '#ef4444',
        response_min: 15,
        escalate_to: 'super_admin',
        description: 'System-level failure — minting halted, data integrity at risk',
    },
    SEV2: {
        name: 'High',
        color: '#f59e0b',
        response_min: 60,
        escalate_to: 'admin_company',
        description: 'Major degradation — pipeline delays, fraud outbreak',
    },
    SEV3: {
        name: 'Medium',
        color: '#3b82f6',
        response_min: 240,
        escalate_to: 'ops_lead',
        description: 'Moderate issue — SLO breach, backlog growth',
    },
    SEV4: {
        name: 'Low',
        color: '#94a3b8',
        response_min: 1440,
        escalate_to: 'ops_team',
        description: 'Minor — performance degradation, cosmetic issues',
    },
};

// ─── STRICT FSM CONTRACT ────────────────────────────────────────

const FSM_TRANSITIONS = {
    open: ['acknowledged', 'escalated'],
    acknowledged: ['in_progress', 'escalated'],
    in_progress: ['escalated', 'resolved'],
    escalated: ['war_room_active', 'resolved'],
    war_room_active: ['resolved'],
    resolved: ['post_mortem'],
    post_mortem: ['closed'],
    closed: [],
};

function assertValidTransition(from, to) {
    const allowed = FSM_TRANSITIONS[from] || [];
    if (!allowed.includes(to)) {
        return { error: 'INVALID_TRANSITION', message: `Invalid state transition: ${from} → ${to}` };
    }
    return null;
}

// Runbook templates (Ops can only execute, not create)
const RUNBOOKS = {
    credit_freeze: {
        name: 'Credit Freeze Response',
        severity: 'SEV1',
        requires_audit: true,
        steps: [
            { action: 'Confirm freeze trigger from Risk Engine', role: 'ops', audit: true },
            { action: 'Notify Compliance Officer', role: 'ops', audit: true },
            { action: 'Block pending transfers', role: 'ops', audit: true },
            { action: 'Escalate to Admin Company for review', role: 'ops', audit: true },
            { action: 'Compliance approves unfreeze', role: 'compliance', audit: true },
            { action: 'Risk Engine re-validates', role: 'risk', audit: true },
        ],
    },
    suspicious_transfer: {
        name: 'Suspicious Transfer Investigation',
        severity: 'SEV2',
        requires_audit: true,
        steps: [
            { action: 'Flag transfer in registry', role: 'ops', audit: true },
            { action: 'Run AML check via Compliance', role: 'compliance', audit: true },
            { action: 'Collect transfer evidence', role: 'ops', audit: true },
            { action: 'Risk Engine re-score', role: 'risk', audit: true },
            { action: 'Compliance decision: approve/block', role: 'compliance', audit: true },
        ],
    },
    data_anomaly: {
        name: 'Data Anomaly Escalation',
        severity: 'SEV2',
        requires_audit: true,
        steps: [
            { action: 'Isolate affected data partition', role: 'ops', audit: true },
            { action: 'Notify IT for integrity check', role: 'ops', audit: true },
            { action: 'IT verifies hash chain', role: 'it', audit: true },
            { action: 'Compare against blockchain anchor', role: 'it', audit: true },
            { action: 'Compliance reviews impact', role: 'compliance', audit: true },
        ],
    },
    carbon_miscalculation: {
        name: 'Carbon Miscalculation Response',
        severity: 'SEV1',
        requires_audit: true,
        steps: [
            { action: 'Freeze affected credits', role: 'risk', audit: true },
            { action: 'Ops identifies root cause', role: 'ops', audit: true },
            { action: 'Compliance reviews baseline logic', role: 'compliance', audit: true },
            { action: 'Recalculate affected credits', role: 'risk', audit: true },
            { action: 'Admin Company approves correction', role: 'admin_company', audit: true },
            { action: 'Super Admin audits entire process', role: 'super_admin', audit: true },
        ],
    },
    baseline_corruption: {
        name: 'Baseline Corruption',
        severity: 'SEV1',
        requires_audit: true,
        steps: [
            { action: 'Halt all minting immediately', role: 'risk', audit: true },
            { action: 'IT restores from verified backup', role: 'it', audit: true },
            { action: 'Compliance validates restored baseline', role: 'compliance', audit: true },
            { action: 'Risk Engine re-processes affected pipeline', role: 'risk', audit: true },
            { action: 'Super Admin signs off', role: 'super_admin', audit: true },
        ],
    },
    fraud_outbreak: {
        name: 'Fraud Outbreak Response',
        severity: 'SEV1',
        requires_audit: true,
        steps: [
            { action: 'Risk Engine triggers platform-wide alert', role: 'risk', audit: true },
            { action: 'Ops freezes affected orgs', role: 'ops', audit: true },
            { action: 'IT isolates network segments', role: 'it', audit: true },
            { action: 'Compliance notifies regulators if required', role: 'compliance', audit: true },
            { action: 'Admin Company coordinates response', role: 'admin_company', audit: true },
            { action: 'Super Admin oversees investigation', role: 'super_admin', audit: true },
        ],
    },
};

// Ops boundary — what Ops CANNOT do
const OPS_FORBIDDEN = [
    { action: 'Mint credits directly', reason: 'Minting requires Risk Engine approval' },
    { action: 'Change baseline factors', reason: 'Baselines require Compliance approval' },
    { action: 'Delete audit logs', reason: 'Audit logs are immutable' },
    { action: 'Override Risk Engine', reason: 'Risk decisions require Compliance escalation' },
    { action: 'Access org encryption keys', reason: 'Key management is IT-only' },
    { action: 'Modify compliance rules', reason: 'Policy authority belongs to Compliance' },
];

class OpsMonitoringEngine {
    constructor() {
        this.sloThresholds = SLO_THRESHOLDS;
        this.activeIncidents = new Map();
        this.shadowWarRooms = new Map();

        // Dynamic L4.5 Governance Router
        this.router = new GovernanceRouter();
        this.modelV1 = new PredictiveModelV1();
        this.modelV2 = new PredictiveModelV2();
    }

    // P2: Automatic SLO Evaluator Trigger Pipeline with L3.5 Support
    startAutoTrigger() {
        if (this._sloInterval) return;
        this.dedupCache = new Map();

        // Initialize the lock-free batch ingestion buffer for metrics
        this.ingestBuffer = new IngestionBuffer(db);
        this.ingestBuffer.start();

        this._sloInterval = setInterval(async () => {
            // L4.5 Dynamic Governance Check
            const govState = await this.router.syncState(db);

            const result = this.checkPipelineHealth();
            const snapshotV1 = {};
            const snapshotV2 = {};

            // 1. Ingest Data Points & Compute Streaming Math
            for (const c of result.checks) {
                const ts = result.timestamp;
                this.ingestBuffer.push({ metric: c.metric, value: c.actual, ts });

                this.modelV1.update(c.metric, c.actual, ts);
                snapshotV1[c.metric] = this.modelV1.getState(c.metric);

                if (govState.mode === 'CANARY' && !govState.kill_switch_engaged) {
                    this.modelV2.update(c.metric, c.actual, ts);
                    snapshotV2[c.metric] = this.modelV2.getState(c.metric);
                }
            }

            // 2. Correlation Gate Flag Calculation
            const isCorrelatedCrisisV1 = this.modelV1.correlate(snapshotV1);
            const isCorrelatedCrisisV2 = govState.mode === 'CANARY' ? this.modelV2.correlate(snapshotV2) : false;

            // 3. Evaluation Decision Phase
            for (const c of result.checks) {
                const isCritical = c.status === 'critical';

                // Active Model Evaluation (Using V1 structurally for now as stable)
                const checkStatusV1 = this.modelV1.detect(c.metric, c.actual);

                // Canary Execution
                let activeStatus = checkStatusV1;
                let activeCorrealted = isCorrelatedCrisisV1;
                let activeEngine = this.modelV1;

                if (this.router.shouldRouteToCanary(result.timestamp) && govState.mode === 'CANARY') {
                    activeStatus = this.modelV2.detect(c.metric, c.actual);
                    activeCorrealted = isCorrelatedCrisisV2;
                    activeEngine = this.modelV2;
                }

                let escalationReason = '';
                let severityLevel = 'SEV3';

                // Core AI evaluation bounds
                if (isCritical) {
                    escalationReason = `SLO Critical Threshold Breached: ${c.metric}`;
                    severityLevel = 'SEV2';
                } else if (!govState.kill_switch_engaged && activeStatus.anomaly) {
                    const score = activeEngine.computeRiskScore(
                        0.5,
                        activeStatus.slope > 0 ? 1.0 : 0,
                        0.8,
                        activeStatus.z
                    );

                    if (score > 0.8 || activeCorrealted) {
                        escalationReason = `AI Predictive Escalation: Z-${activeStatus.z.toFixed(2)} Slope-${activeStatus.slope.toFixed(2)} Score-${score.toFixed(2)}`;
                        severityLevel = 'SEV2';
                    }
                }

                if (escalationReason) {
                    const dedupKey = `${c.metric}-${Math.floor(Date.now() / 300000)}`;
                    if (this.dedupCache.has(dedupKey)) continue;

                    this.dedupCache.set(dedupKey, true);
                    setTimeout(() => this.dedupCache.delete(dedupKey), 300000);

                    await this.createIncident({
                        title: escalationReason,
                        severity: severityLevel,
                        triggered_by: 'system:ai_predictor',
                        module: c.metric,
                    }).catch(err => {});
                }
            }
        }, 30000); // 30 sec interval eval
    } // End startAutoTrigger

    /**
     * Real-time pipeline health check
     */
    checkPipelineHealth(metrics = {}) {
        const checks = Object.entries(SLO_THRESHOLDS).map(([key, threshold]) => {
            const actual =
                metrics[key] ??
                (key.includes('uptime')
                    ? 99.98
                    : key.includes('error')
                      ? 0.05
                      : key.includes('backlog')
                        ? 0
                        : key.includes('freeze')
                          ? 0
                          : Math.floor(threshold.target * (0.3 + Math.random() * 0.6))); // 30-90% of target = healthy range
            let status = 'healthy';
            if (key === 'uptime_pct' || key === 'error_rate_pct') {
                if (key === 'uptime_pct')
                    status =
                        actual >= threshold.target ? 'healthy' : actual >= threshold.warning ? 'warning' : 'critical';
                else
                    status =
                        actual <= threshold.target ? 'healthy' : actual <= threshold.warning ? 'warning' : 'critical';
            } else {
                status = actual <= threshold.target ? 'healthy' : actual <= threshold.warning ? 'warning' : 'critical';
            }
            return {
                metric: key.replace(/_/g, ' '),
                actual,
                target: threshold.target,
                warning: threshold.warning,
                critical: threshold.critical,
                unit: threshold.unit,
                status,
            };
        });

        const criticalCount = checks.filter(c => c.status === 'critical').length;
        const warningCount = checks.filter(c => c.status === 'warning').length;

        return {
            title: 'Pipeline Health Monitor (SLO-based)',
            overall: criticalCount > 0 ? 'critical' : warningCount > 0 ? 'degraded' : 'healthy',
            checks,
            summary: {
                healthy: checks.filter(c => c.status === 'healthy').length,
                warning: warningCount,
                critical: criticalCount,
            },
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * Create incident with severity classification + lifecycle tracking
     */
    async createIncident(params) {
        const {
            title,
            description,
            severity = 'SEV3',
            affected_entity,
            triggered_by = 'system',
            runbook_key,
            module,
            tags,
        } = params;
        const sev = SEVERITY[severity];
        if (!sev) return { error: `Invalid severity. Valid: ${Object.keys(SEVERITY).join(', ')}` };

        const incidentId = `INC-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}`.toUpperCase();

        const incidentData = {
            incident_id: incidentId,
            title,
            description,
            severity: { key: severity, ...sev },
            affected_entity,
            module,
            triggered_by,
            tags: tags || [],
            status: 'open',
            response_deadline: new Date(Date.now() + sev.response_min * 60000).toISOString(),
            sla: {
                response_target_min: sev.response_min,
                acknowledged_at: null,
                resolved_at: null,
                breached: false,
            },
            timeline: [{ event: 'Incident created', actor: triggered_by, at: new Date().toISOString() }],
        };

        const idempotencyKey = crypto
            .createHash('sha256')
            .update(JSON.stringify({ title, severity, affected_entity, module }))
            .digest('hex');

        // Persist to Repo (handles transactions + constraints)
        const result = await opsRepo.createIncident(incidentData, idempotencyKey);

        // SHADOW WRITE
        if (!result.error && !result.status) {
            this.shadowIncidents.set(result.incident_id, result);
            this._compareShadowState('createIncident');
        }

        // Structured Logging
        this._logStructured('INCIDENT_CREATED', {
            incident_id: result.incident_id,
            severity,
            idempotencyKey,
            warning: result.warning,
        });

        return result;
    }

    // ─── Escalate an incident ───────────────────────────────────

    async escalateIncident(incidentId, escalatedBy, reason, newSeverity) {
        // Read -> Validate -> Write (Done entirely within opsRepo transaction by FSM guard!)
        const payload = { escalate_to: null };

        if (newSeverity) {
            const sev = SEVERITY[newSeverity];
            if (!sev) return { error: `Invalid severity: ${newSeverity}` };
            payload.severity = { key: newSeverity, ...sev };
            payload.escalate_to = sev.escalate_to;
        }

        // Pre- Repo FSM Enforcement Check
        const currentInc = this.shadowIncidents.get(incidentId) || (await opsRepo.getIncident(incidentId));
        if (!currentInc) return { error: 'NOT_FOUND' };

        const fsmViolation = assertValidTransition(currentInc.status, 'escalated');
        if (fsmViolation) return fsmViolation;

        const result = await opsRepo.updateIncidentStatus(incidentId, 'escalated', payload);

        if (!result.error && !result.warning) {
            // SHADOW WRITE
            this.shadowIncidents.set(incidentId, { ...(this.shadowIncidents.get(incidentId) || {}), ...result });
            this._compareShadowState('escalateIncident');

            this._logStructured('INCIDENT_ESCALATED', { incident_id: incidentId, escalatedBy, reason, newSeverity });
        }

        return result;
    }

    // ─── Assign incident to user/role ───────────────────────────

    async assignIncident(incidentId, assignedTo, assignedBy) {
        const payload = { assigned_to: assignedTo };

        const currentInc = this.shadowIncidents.get(incidentId) || (await opsRepo.getIncident(incidentId));
        if (!currentInc) return { error: 'NOT_FOUND' };

        const fsmViolation = assertValidTransition(currentInc.status, 'acknowledged');
        if (fsmViolation) return fsmViolation;

        // This implicitly checks the status inside the tx.
        const result = await opsRepo.updateIncidentStatus(incidentId, 'acknowledged', payload);

        if (!result.error && !result.warning) {
            // SHADOW WRITE
            this.shadowIncidents.set(incidentId, { ...(this.shadowIncidents.get(incidentId) || {}), ...result });
            this._compareShadowState('assignIncident');

            this._logStructured('INCIDENT_ASSIGNED', { incident_id: incidentId, assignedTo, assignedBy });
        }
        return result;
    }

    // ─── Resolve incident ───────────────────────────────────────

    async resolveIncident(incidentId, resolvedBy, resolution, rootCause) {
        const currentInc = this.shadowIncidents.get(incidentId) || (await opsRepo.getIncident(incidentId));
        if (!currentInc) return { error: 'NOT_FOUND' };

        const fsmViolation = assertValidTransition(currentInc.status, 'resolved');
        if (fsmViolation) return fsmViolation;

        const payload = { resolution, root_cause: rootCause, 'sla.resolved_at': new Date().toISOString() };

        const result = await opsRepo.updateIncidentStatus(incidentId, 'resolved', payload);

        if (!result.error && !result.warning) {
            // SHADOW WRITE
            this.shadowIncidents.set(incidentId, { ...(this.shadowIncidents.get(incidentId) || {}), ...result });
            this._compareShadowState('resolveIncident');

            this._logStructured('INCIDENT_RESOLVED', { incident_id: incidentId, resolvedBy, resolution, rootCause });
        }
        return result;
    }

    // War Room activation ────────────────────────────────────

    async activateWarRoom(incidentId, activatedBy) {
        const currentInc = this.shadowIncidents.get(incidentId) || (await opsRepo.getIncident(incidentId));
        if (!currentInc) return { error: 'NOT_FOUND' };

        const fsmViolation = assertValidTransition(currentInc.status, 'war_room_active');
        if (fsmViolation) return fsmViolation;

        const result = await opsRepo.updateIncidentStatus(incidentId, 'war_room_active', {
            war_room: {
                id: `WR-${Date.now().toString(36)}`,
                activated_by: activatedBy,
                activated_at: new Date().toISOString(),
                participants: [activatedBy],
                commander: activatedBy,
                decisions: [],
                action_items: [],
            },
        });
        if (!result.error && !result.warning) {
            this.shadowWarRooms.set(incidentId, result.details?.war_room);
            this._logStructured('WAR_ROOM_ACTIVATED', { incident_id: incidentId, activatedBy });
        }
        return result;
    }

    async getWarRoom(incidentId) {
        const inc = await opsRepo.getIncident(incidentId);
        if (!inc) return null;
        const details = typeof inc.details === 'string' ? JSON.parse(inc.details || '{}') : inc.details || {};
        return details.war_room || null;
    }

    // ─── Post-Mortem workflow ───────────────────────────────────

    async createPostMortem(incidentId, createdBy, data = {}) {
        const currentInc = this.shadowIncidents.get(incidentId) || (await opsRepo.getIncident(incidentId));
        if (!currentInc) return { error: 'NOT_FOUND' };

        const fsmViolation = assertValidTransition(currentInc.status, 'post_mortem');
        if (fsmViolation) return fsmViolation;

        const pmData = {
            incident_id: incidentId,
            created_by: createdBy,
            template: 'blameless',
            sections: {
                summary: data.summary || '',
                impact: data.impact || 'TBD',
                root_cause: data.root_cause || 'TBD',
                five_whys: data.five_whys || ['Why?', 'Why?', 'Why?', 'Why?', 'Why?'],
                what_went_well: data.what_went_well || [],
                what_went_wrong: data.what_went_wrong || [],
                action_items: data.action_items || [],
                preventive_measures: data.preventive_measures || [],
            },
        };

        const pmResult = await opsRepo.createPostMortem(pmData);
        if (pmResult && !pmResult.error) {
            await opsRepo.updateIncidentStatus(incidentId, 'post_mortem', { post_mortem: pmResult.id });
            this._logStructured('POST_MORTEM_CREATED', {
                incident_id: incidentId,
                createdBy,
                post_mortem_id: pmResult.id,
            });
        }
        return pmResult;
    }

    async getPostMortem(incidentId) {
        const row = await db.get('SELECT * FROM post_mortems WHERE incident_id = $1', [incidentId]);
        if (row && typeof row.sections === 'string') row.sections = JSON.parse(row.sections);
        return row || null;
    }

    // ─── Incident Timeline ──────────────────────────────────────

    async getIncidentTimeline(incidentId) {
        const inc = await opsRepo.getIncident(incidentId);
        if (!inc) return { error: 'Incident not found' };

        const details = typeof inc.details === 'string' ? JSON.parse(inc.details || '{}') : inc.details || {};

        return {
            incident_id: incidentId,
            title: inc.title,
            severity: inc.severity,
            status: inc.status,
            total_events: (details.timeline || []).length,
            timeline: details.timeline || [],
        };
    }

    // ─── SLA Violations ─────────────────────────────────────────

    getSLAViolations() {
        const violations = [];
        for (const inc of this.shadowIncidents.values()) {
            const details = inc.details || {};
            const response_deadline = inc.response_deadline || details.response_deadline;
            const deadline = new Date(response_deadline).getTime();

            const now = Date.now();
            if (inc.status === 'open' && deadline && now > deadline) {
                violations.push({
                    incident_id: inc.incident_id,
                    title: inc.title,
                    severity: typeof inc.severity === 'string' ? inc.severity : inc.severity?.key || 'unknown',
                    overdue_min: Math.round((now - deadline) / 60000),
                    escalate_to: inc.escalate_to,
                });
            }

            const sla = inc.sla || details.sla || {};
            if (sla.breached || inc.sla_breached) {
                violations.push({
                    incident_id: inc.incident_id,
                    title: inc.title,
                    severity: typeof inc.severity === 'string' ? inc.severity : inc.severity?.key || 'unknown',
                    type: 'resolution_breach',
                    resolution_time_min: Math.round((sla.time_to_resolve_ms || 0) / 60000),
                    sla_target_min: inc.severity?.response_min || 0,
                });
            }
        }
        return { total: violations.length, violations };
    }

    // ─── Incident Correlation ───────────────────────────────────

    getCorrelation() {
        const groups = {};
        for (const inc of this.shadowIncidents.values()) {
            const key = inc.module || inc.affected_entity || 'unknown';
            if (!groups[key]) groups[key] = [];

            // Handle Schema Mismatch (DB returns string severity, memory returns object)
            const sevKey = typeof inc.severity === 'string' ? inc.severity : inc.severity?.key || 'SEV3';

            groups[key].push({
                incident_id: inc.incident_id,
                title: inc.title,
                severity: sevKey,
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
        // Safe access wrapper to bridge DB flattened schema and Legacy RAM objects
        const getSlaInfo = inc => {
            const memSla = inc.sla || {};
            const dbDetails = typeof inc.details === 'string' ? JSON.parse(inc.details || '{}') : inc.details || {};
            const dbSla = dbDetails.sla || {};
            return {
                resolved_at: inc.resolved_at || dbSla.resolved_at || memSla.resolved_at,
                time_to_resolve_ms: dbSla.time_to_resolve_ms || memSla.time_to_resolve_ms || 0,
                time_to_acknowledge_ms: dbSla.time_to_acknowledge_ms || memSla.time_to_acknowledge_ms || 0,
                breached: inc.sla_breached || dbSla.breached || memSla.breached || false,
            };
        };

        const getSevKey = inc => (typeof inc.severity === 'string' ? inc.severity : inc.severity?.key || 'SEV3');

        const resolved = Array.from(this.shadowIncidents.values()).filter(
            i => i.status === 'resolved' && getSlaInfo(i).resolved_at
        );
        if (resolved.length === 0) return { mttr_min: 0, mtta_min: 0, total_resolved: 0, sla_compliance_pct: 100 };

        const ttrs = resolved.map(i => getSlaInfo(i).time_to_resolve_ms);
        const ttas = resolved
            .filter(i => getSlaInfo(i).time_to_acknowledge_ms > 0)
            .map(i => getSlaInfo(i).time_to_acknowledge_ms);
        const breached = resolved.filter(i => getSlaInfo(i).breached).length;

        const bySeverity = {};
        for (const inc of resolved) {
            const sev = getSevKey(inc);
            if (!bySeverity[sev]) bySeverity[sev] = { count: 0, total_ms: 0, breached: 0 };
            bySeverity[sev].count++;
            bySeverity[sev].total_ms += getSlaInfo(inc).time_to_resolve_ms;
            if (getSlaInfo(inc).breached) bySeverity[sev].breached++;
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
        const all = Array.from(this.shadowIncidents.values());
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

    // Fetch fallback from shadow state until full query layer is built
    getAllIncidents(limit = 20) {
        return Array.from(this.shadowIncidents.values())
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, limit);
    }

    async getIncident(id) {
        const inc = await opsRepo.getIncident(id);
        if (inc) {
            this.shadowIncidents.set(id, inc);
        }
        return inc;
    }

    async getAllIncidents() {
        const incidents = await db.all('SELECT * FROM ops_incidents ORDER BY created_at DESC LIMIT 500');
        for (const inc of incidents) {
            this.shadowIncidents.set(inc.incident_id, inc);
        }
        return incidents;
    }

    // ─── Shadow Write / Migration Monitor ─────────────────────────
    async _compareShadowState(action) {
        try {
            const dbIncidents = await db.all('SELECT incident_id FROM ops_incidents_v2');
            let mismatchCount = 0;
            if (dbIncidents.length !== this.shadowIncidents.size) mismatchCount++;

            if (mismatchCount > 0) {
                this._logStructured('MIGRATION_CUTOVER_METRIC', {
                    action,
                    db_active_count: dbIncidents.length,
                    ram_active_count: this.shadowIncidents.size,
                    mismatch_detected: mismatchCount > 0,
                    cutover_condition: 'Mismatch rate < 0.01% over 24h',
                });
            }
        } catch (e) {
            // Ignore db errors in async fire-and-forget monitor
        }
    }

    // Structured logging helper
    _logStructured(action, details) {
        console.log(
            JSON.stringify({
                timestamp: new Date().toISOString(),
                module: 'OPS',
                action,
                details,
            })
        );
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
                'Respond to data anomalies',
            ],
            cannot_do: OPS_FORBIDDEN,
            governance_model:
                'Ops must follow runbooks. Every manual action is hashed and audited. Override requires Compliance + Risk approval.',
        };
    }

    getSeverities() {
        return SEVERITY;
    }
    getRunbooks() {
        return RUNBOOKS;
    }
    getSLOs() {
        return SLO_THRESHOLDS;
    }
}

module.exports = new OpsMonitoringEngine();
