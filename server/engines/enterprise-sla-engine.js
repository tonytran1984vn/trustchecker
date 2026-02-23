/**
 * TrustChecker — Enterprise SLA Layer v1.0
 * Formal Service Level Agreements: SLO Tracking, Breach Detection, Penalty Calculation
 * 
 * SLA Tiers by Plan:
 *   Free     → Best-effort (no SLA)
 *   Starter  → 99.0% uptime, 4h response (business hours)
 *   Pro      → 99.5% uptime, 2h response, monthly report
 *   Business → 99.9% uptime, 1h response, dedicated CSM, quarterly review
 *   Enterprise → 99.95% uptime, 15min response, custom SLA, financial credits
 */

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════
// SLA TIERS
// ═══════════════════════════════════════════════════════════════════

const SLA_TIERS = {
    free: {
        name: 'Best Effort',
        uptime_target_pct: 95.0,
        response_time: { p50_ms: 2000, p95_ms: 5000, p99_ms: 10000 },
        support_response: { sev1_hours: null, sev2_hours: null, sev3_hours: null },
        financial_credits: false,
        reporting: 'none',
        dedicated_csm: false,
    },
    starter: {
        name: 'Standard SLA',
        uptime_target_pct: 99.0,
        response_time: { p50_ms: 1000, p95_ms: 3000, p99_ms: 8000 },
        support_response: { sev1_hours: 4, sev2_hours: 8, sev3_hours: 24 },
        financial_credits: false,
        reporting: 'monthly',
        dedicated_csm: false,
    },
    pro: {
        name: 'Professional SLA',
        uptime_target_pct: 99.5,
        response_time: { p50_ms: 500, p95_ms: 1500, p99_ms: 5000 },
        support_response: { sev1_hours: 2, sev2_hours: 4, sev3_hours: 12 },
        financial_credits: true,
        credit_schedule: { uptime_99: 0, uptime_98: 10, uptime_95: 25, below_95: 50 }, // % of monthly bill
        reporting: 'monthly',
        dedicated_csm: false,
    },
    business: {
        name: 'Business SLA',
        uptime_target_pct: 99.9,
        response_time: { p50_ms: 200, p95_ms: 800, p99_ms: 3000 },
        support_response: { sev1_hours: 1, sev2_hours: 2, sev3_hours: 8 },
        financial_credits: true,
        credit_schedule: { uptime_999: 0, uptime_99: 10, uptime_98: 25, uptime_95: 50, below_95: 100 },
        reporting: 'weekly',
        dedicated_csm: true,
        quarterly_review: true,
    },
    enterprise: {
        name: 'Enterprise SLA',
        uptime_target_pct: 99.95,
        response_time: { p50_ms: 100, p95_ms: 500, p99_ms: 2000 },
        support_response: { sev1_minutes: 15, sev2_hours: 1, sev3_hours: 4 },
        financial_credits: true,
        credit_schedule: { uptime_9995: 0, uptime_999: 10, uptime_99: 25, uptime_98: 50, below_98: 100 },
        reporting: 'daily',
        dedicated_csm: true,
        quarterly_review: true,
        custom_sla: true,        // can negotiate custom terms
        exec_escalation: true,   // direct exec escalation path
    },
};

// ═══════════════════════════════════════════════════════════════════
// SLO METRICS TO TRACK
// ═══════════════════════════════════════════════════════════════════

const SLO_METRICS = {
    uptime: { name: 'Service Uptime', unit: '%', direction: 'higher_better' },
    api_latency_p50: { name: 'API Latency (P50)', unit: 'ms', direction: 'lower_better' },
    api_latency_p95: { name: 'API Latency (P95)', unit: 'ms', direction: 'lower_better' },
    api_latency_p99: { name: 'API Latency (P99)', unit: 'ms', direction: 'lower_better' },
    error_rate: { name: 'Error Rate', unit: '%', direction: 'lower_better' },
    verification_accuracy: { name: 'Verification Accuracy', unit: '%', direction: 'higher_better' },
    data_durability: { name: 'Data Durability', unit: 'nines', direction: 'higher_better' },
    support_response: { name: 'Support First Response', unit: 'hours', direction: 'lower_better' },
};

// ═══════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════

class EnterpriseSLAEngine {
    constructor() {
        this.contracts = new Map();      // tenant_id → SLA contract
        this.measurements = [];
        this.breaches = [];
        this.credits = [];
    }

    // ─── Create SLA Contract ──────────────────────────────────────

    createContract(tenantId, plan, customTerms = null) {
        const tier = SLA_TIERS[plan];
        if (!tier) return { error: `Invalid plan: ${plan}`, available: Object.keys(SLA_TIERS) };

        const contract = {
            id: uuidv4(),
            tenant_id: tenantId,
            plan,
            tier_name: tier.name,
            terms: customTerms || tier,
            status: 'active',
            effective_from: new Date().toISOString(),
            review_date: new Date(Date.now() + 90 * 86400000).toISOString(), // 90 days
            created_at: new Date().toISOString(),
        };

        this.contracts.set(tenantId, contract);
        return { status: 'contract_created', contract };
    }

    // ─── Record Measurement ───────────────────────────────────────

    recordMeasurement(tenantId, metrics) {
        const contract = this.contracts.get(tenantId);
        if (!contract) return { error: 'No SLA contract for tenant' };

        const tier = contract.terms;
        const violations = [];

        // Check uptime
        if (metrics.uptime_pct !== undefined && metrics.uptime_pct < tier.uptime_target_pct) {
            violations.push({
                metric: 'uptime',
                target: tier.uptime_target_pct,
                actual: metrics.uptime_pct,
                gap: Math.round((tier.uptime_target_pct - metrics.uptime_pct) * 100) / 100,
            });
        }

        // Check latency
        if (metrics.p95_ms !== undefined && metrics.p95_ms > tier.response_time.p95_ms) {
            violations.push({
                metric: 'api_latency_p95',
                target: tier.response_time.p95_ms,
                actual: metrics.p95_ms,
                gap: metrics.p95_ms - tier.response_time.p95_ms,
            });
        }

        const measurement = {
            id: uuidv4(),
            tenant_id: tenantId,
            plan: contract.plan,
            metrics,
            violations,
            compliant: violations.length === 0,
            timestamp: new Date().toISOString(),
        };

        this.measurements.push(measurement);

        // Auto-create breach if violations detected
        if (violations.length > 0) {
            const breach = {
                id: uuidv4(),
                tenant_id: tenantId,
                measurement_id: measurement.id,
                violations,
                severity: violations.some(v => v.metric === 'uptime') ? 'critical' : 'warning',
                status: 'detected',
                created_at: new Date().toISOString(),
            };
            this.breaches.push(breach);
            measurement.breach_id = breach.id;
        }

        return measurement;
    }

    // ─── Calculate Financial Credit ───────────────────────────────

    calculateCredit(tenantId, period, monthlyBill) {
        const contract = this.contracts.get(tenantId);
        if (!contract) return { error: 'No SLA contract' };
        if (!contract.terms.financial_credits) return { credit: 0, reason: 'Plan does not include financial credits' };

        // Find worst uptime in period
        const periodMeasurements = this.measurements.filter(m =>
            m.tenant_id === tenantId && m.timestamp.startsWith(period)
        );

        if (periodMeasurements.length === 0) return { credit: 0, reason: 'No measurements in period' };

        const uptimes = periodMeasurements
            .filter(m => m.metrics.uptime_pct !== undefined)
            .map(m => m.metrics.uptime_pct);

        const avgUptime = uptimes.length > 0 ? uptimes.reduce((a, b) => a + b, 0) / uptimes.length : 100;

        // Determine credit percentage
        const schedule = contract.terms.credit_schedule || {};
        let creditPct = 0;

        if (avgUptime < 95) creditPct = schedule.below_95 || schedule.below_98 || 0;
        else if (avgUptime < 98) creditPct = schedule.uptime_95 || schedule.uptime_98 || 0;
        else if (avgUptime < 99) creditPct = schedule.uptime_98 || schedule.uptime_99 || 0;
        else if (avgUptime < 99.5) creditPct = schedule.uptime_99 || 0;
        else if (avgUptime < 99.9) creditPct = schedule.uptime_99 || schedule.uptime_999 || 0;
        else if (avgUptime < 99.95) creditPct = schedule.uptime_999 || schedule.uptime_9995 || 0;

        const creditAmount = Math.round(monthlyBill * creditPct) / 100;

        const credit = {
            id: uuidv4(),
            tenant_id: tenantId,
            period,
            avg_uptime: Math.round(avgUptime * 100) / 100,
            target_uptime: contract.terms.uptime_target_pct,
            credit_pct: creditPct,
            monthly_bill: monthlyBill,
            credit_amount: creditAmount,
            measurements_count: periodMeasurements.length,
            status: creditAmount > 0 ? 'credit_due' : 'no_credit',
            calculated_at: new Date().toISOString(),
        };

        if (creditAmount > 0) this.credits.push(credit);
        return credit;
    }

    // ─── SLA Compliance Report ────────────────────────────────────

    getComplianceReport(tenantId) {
        const contract = this.contracts.get(tenantId);
        if (!contract) return { error: 'No SLA contract' };

        const measurements = this.measurements.filter(m => m.tenant_id === tenantId);
        const breaches = this.breaches.filter(b => b.tenant_id === tenantId);
        const credits = this.credits.filter(c => c.tenant_id === tenantId);

        const compliant = measurements.filter(m => m.compliant).length;
        const total = measurements.length;

        return {
            tenant_id: tenantId,
            plan: contract.plan,
            tier: contract.tier_name,
            contract_status: contract.status,
            compliance: {
                total_measurements: total,
                compliant,
                non_compliant: total - compliant,
                compliance_rate: total > 0 ? Math.round(compliant / total * 100) : 100,
            },
            breaches: {
                total: breaches.length,
                critical: breaches.filter(b => b.severity === 'critical').length,
                recent: breaches.slice(-5),
            },
            financial_credits: {
                total_credits: credits.length,
                total_amount: credits.reduce((a, c) => a + c.credit_amount, 0),
                recent: credits.slice(-3),
            },
            next_review: contract.review_date,
        };
    }

    // ─── All Contracts ────────────────────────────────────────────

    getAllContracts() {
        return Array.from(this.contracts.values());
    }

    getContract(tenantId) {
        return this.contracts.get(tenantId) || null;
    }

    // ─── Getters ──────────────────────────────────────────────────

    getSLATiers() { return SLA_TIERS; }
    getSLOMetrics() { return SLO_METRICS; }
    getBreaches(limit = 20) { return this.breaches.slice(-limit).reverse(); }
    getCredits(limit = 20) { return this.credits.slice(-limit).reverse(); }
}

module.exports = new EnterpriseSLAEngine();
