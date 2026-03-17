/**
 * TrustChecker — Observability Engine (L3→L4 Hardening)
 * Real metrics from Node.js process, alert pipeline, incident SLA tracking
 * Replaces simulated data with actual system measurements
 */
const os = require('os');

class ObservabilityEngine {
    constructor() {
        this._requestLog = [];      // actual request metrics
        this._errorLog = [];        // actual errors
        this._alertRules = [];      // alert thresholds
        this._incidentSLAs = [];    // SLA tracking
        this._startTime = Date.now();
    }

    // ═══════════════════════════════════════════════════════════════════
    // REAL SYSTEM METRICS (not simulated)
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Collect actual system health from Node.js process + OS
     */
    collectSystemHealth() {
        const mem = process.memoryUsage();
        const cpus = os.cpus();
        const uptimeSec = process.uptime();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();

        // Request metrics from log
        const now = Date.now();
        const last5min = this._requestLog.filter(r => now - r.timestamp < 300000);
        const lastHour = this._requestLog.filter(r => now - r.timestamp < 3600000);
        const errors5min = this._errorLog.filter(e => now - e.timestamp < 300000);

        // Calculate P95 response time
        const responseTimes = last5min.map(r => r.duration_ms).sort((a, b) => a - b);
        const p95Index = Math.floor(responseTimes.length * 0.95);
        const p95 = responseTimes[p95Index] || 0;
        const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)] || 0;

        // Error rate
        const errorRate = last5min.length > 0 ? (errors5min.length / last5min.length * 100) : 0;

        return {
            title: 'System Health (Real Metrics)',
            process: {
                uptime_seconds: Math.floor(uptimeSec),
                uptime_human: `${Math.floor(uptimeSec / 3600)}h ${Math.floor((uptimeSec % 3600) / 60)}m`,
                pid: process.pid,
                node_version: process.version
            },
            memory: {
                heap_used_mb: Math.round(mem.heapUsed / 1048576 * 10) / 10,
                heap_total_mb: Math.round(mem.heapTotal / 1048576 * 10) / 10,
                rss_mb: Math.round(mem.rss / 1048576 * 10) / 10,
                external_mb: Math.round(mem.external / 1048576 * 10) / 10,
                heap_usage_pct: Math.round(mem.heapUsed / mem.heapTotal * 100),
                system_total_gb: Math.round(totalMem / 1073741824 * 10) / 10,
                system_free_gb: Math.round(freeMem / 1073741824 * 10) / 10,
                system_usage_pct: Math.round((1 - freeMem / totalMem) * 100)
            },
            cpu: {
                cores: cpus.length,
                model: cpus[0]?.model || 'unknown',
                load_avg: os.loadavg().map(l => Math.round(l * 100) / 100)
            },
            requests: {
                last_5min: last5min.length,
                last_hour: lastHour.length,
                errors_5min: errors5min.length,
                error_rate_pct: Math.round(errorRate * 100) / 100,
                p50_ms: p50,
                p95_ms: p95,
                total_tracked: this._requestLog.length
            },
            collected_at: new Date().toISOString()
        };
    }

    /**
     * Record a request (called from middleware)
     */
    recordRequest(method, path, statusCode, durationMs) {
        this._requestLog.push({
            method, path, status: statusCode,
            duration_ms: durationMs,
            timestamp: Date.now()
        });
        // Keep last 10000
        if (this._requestLog.length > 10000) this._requestLog = this._requestLog.slice(-10000);

        if (statusCode >= 500) {
            this._errorLog.push({ method, path, status: statusCode, timestamp: Date.now() });
            if (this._errorLog.length > 5000) this._errorLog = this._errorLog.slice(-5000);
        }

        // Check alert rules
        this._checkAlerts({ method, path, status: statusCode, duration_ms: durationMs });
    }

    // ═══════════════════════════════════════════════════════════════════
    // ALERT PIPELINE
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Add alert rule
     */
    addAlertRule(rule) {
        const { name, metric, operator, threshold, severity = 'warning', action = 'log' } = rule;
        const ruleId = `ALERT-${this._alertRules.length + 1}`;
        this._alertRules.push({
            rule_id: ruleId, name, metric, operator, threshold,
            severity, action, triggered_count: 0, last_triggered: null, active: true
        });
        return { rule_id: ruleId, name, metric, threshold, severity };
    }

    /**
     * Check alerts against latest data point
     */
    _checkAlerts(dataPoint) {
        this._alertRules.filter(r => r.active).forEach(rule => {
            let value;
            switch (rule.metric) {
                case 'response_time': value = dataPoint.duration_ms; break;
                case 'status_code': value = dataPoint.status; break;
                case 'error_rate': {
                    const now = Date.now();
                    const recent = this._requestLog.filter(r => now - r.timestamp < 60000);
                    const errors = recent.filter(r => r.status >= 500);
                    value = recent.length > 0 ? (errors.length / recent.length * 100) : 0;
                    break;
                }
                default: return;
            }

            let triggered = false;
            switch (rule.operator) {
                case '>': triggered = value > rule.threshold; break;
                case '<': triggered = value < rule.threshold; break;
                case '>=': triggered = value >= rule.threshold; break;
                case '==': triggered = value === rule.threshold; break;
            }

            if (triggered) {
                rule.triggered_count++;
                rule.last_triggered = new Date().toISOString();
            }
        });
    }

    /**
     * Get alert status
     */
    getAlertStatus() {
        return {
            title: 'Alert Pipeline',
            total_rules: this._alertRules.length,
            active: this._alertRules.filter(r => r.active).length,
            recently_triggered: this._alertRules.filter(r => r.triggered_count > 0).map(r => ({
                rule_id: r.rule_id, name: r.name, severity: r.severity,
                triggered_count: r.triggered_count, last: r.last_triggered
            })),
            rules: this._alertRules
        };
    }

    // ═══════════════════════════════════════════════════════════════════
    // INCIDENT SLA TRACKING
    // ═══════════════════════════════════════════════════════════════════

    /**
     * Track incident SLA
     */
    trackIncidentSLA(incident) {
        const { incident_id, severity, created_at, acknowledged_at, resolved_at } = incident;
        const sloTargets = { SEV1: 15, SEV2: 60, SEV3: 240, SEV4: 1440 };
        const targetMin = sloTargets[severity] || 1440;

        const created = new Date(created_at).getTime();
        const ackTime = acknowledged_at ? Math.round((new Date(acknowledged_at).getTime() - created) / 60000) : null;
        const resolveTime = resolved_at ? Math.round((new Date(resolved_at).getTime() - created) / 60000) : null;

        const slaEntry = {
            incident_id, severity,
            target_response_min: targetMin,
            actual_ack_min: ackTime,
            actual_resolve_min: resolveTime,
            ack_sla_met: ackTime !== null ? ackTime <= targetMin : null,
            resolve_sla_met: resolveTime !== null ? resolveTime <= targetMin * 4 : null,
            tracked_at: new Date().toISOString()
        };

        this._incidentSLAs.push(slaEntry);
        return slaEntry;
    }

    /**
     * Get SLA performance summary
     */
    getSLAPerformance() {
        const total = this._incidentSLAs.length;
        if (total === 0) return { title: 'Incident SLA Performance', total: 0, message: 'No incidents tracked yet' };

        const ackMet = this._incidentSLAs.filter(s => s.ack_sla_met === true).length;
        const ackBreached = this._incidentSLAs.filter(s => s.ack_sla_met === false).length;

        return {
            title: 'Incident SLA Performance',
            total_incidents: total,
            ack_sla_met: ackMet,
            ack_sla_breached: ackBreached,
            ack_compliance_pct: total > 0 ? Math.round(ackMet / (ackMet + ackBreached || 1) * 100) : 0,
            by_severity: ['SEV1', 'SEV2', 'SEV3', 'SEV4'].map(sev => {
                const sevItems = this._incidentSLAs.filter(s => s.severity === sev);
                return { severity: sev, count: sevItems.length, met: sevItems.filter(s => s.ack_sla_met).length };
            }),
            recent: this._incidentSLAs.slice(-10)
        };
    }

    /**
     * Get error breakdown
     */
    getErrorBreakdown() {
        const now = Date.now();
        const pastHour = this._errorLog.filter(e => now - e.timestamp < 3600000);
        const byPath = {};
        pastHour.forEach(e => { const p = e.path || 'unknown'; byPath[p] = (byPath[p] || 0) + 1; });

        return {
            title: 'Error Breakdown (Last Hour)',
            total_errors: pastHour.length,
            by_path: Object.entries(byPath).map(([path, count]) => ({ path, count })).sort((a, b) => b.count - a.count).slice(0, 20),
            by_status: [500, 502, 503].map(s => ({ status: s, count: pastHour.filter(e => e.status === s).length })),
            collected_at: new Date().toISOString()
        };
    }
}

module.exports = new ObservabilityEngine();
