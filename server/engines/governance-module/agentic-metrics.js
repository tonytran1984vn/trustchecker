/**
 * TrustChecker — Agentic Observability Metrics
 *
 * Provides an in-memory counter singleton to trace Agentic Performance
 * and False Positive Rate during Pre-Deployment Shadow Mode.
 */

class AgenticMetrics {
    constructor() {
        this.counters = {
            containments_issued: 0,
            shadow_drops: 0,
            partial_drops: 0,
            full_executions: 0,
            rollback_triggers: 0,
            veto_overrides: 0,
            proposals_drafted: 0,
        };
        this.confidence_sum = 0;
        this.confidence_count = 0;

        this.cascade = {
            max_depth: 0,
            network_impact_peak_pct: 0,
        };

        // Anti-panic cascade tracker
        this.rate_limit_hits = 0;
    }

    logDirectiveEvent(directive, mode, action_taken) {
        this.counters.containments_issued++;

        if (directive.confidence_score) {
            this.confidence_sum += directive.confidence_score;
            this.confidence_count++;
        }

        if (action_taken === 'SHADOW_DROPPED') this.counters.shadow_drops++;
        if (action_taken === 'PROPOSED_FOR_HUMAN') this.counters.proposals_drafted++;
        if (action_taken === 'EXECUTED') this.counters.full_executions++;
    }

    logCascadeImpact(depth, networkPct) {
        if (depth > this.cascade.max_depth) this.cascade.max_depth = depth;
        if (networkPct > this.cascade.network_impact_peak_pct) this.cascade.network_impact_peak_pct = networkPct;
    }

    logRateLimitHit() {
        this.counters.rate_limit_hits++;
    }

    logRollbackTriggered() {
        this.counters.rollback_triggers++;
    }

    logHumanVeto() {
        this.counters.veto_overrides++;
    }

    getExport() {
        const avg_confidence = this.confidence_count > 0 ? (this.confidence_sum / this.confidence_count).toFixed(2) : 0;

        const false_positive_rate =
            this.counters.containments_issued > 0
                ? ((this.counters.veto_overrides / this.counters.containments_issued) * 100).toFixed(1) + '%'
                : '0%';

        return {
            ...this.counters,
            avg_confidence,
            false_positive_rate,
            cascade_depth_max: this.cascade.max_depth,
            network_impact_peak_pct: this.cascade.network_impact_peak_pct,
            timestamp: new Date().toISOString(),
        };
    }
}

module.exports = new AgenticMetrics();
