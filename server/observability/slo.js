/**
 * TrustChecker v9.2 — SLO (Service Level Objectives)
 * ═══════════════════════════════════════════════════════════
 * Defines, tracks, and reports on SLO compliance:
 *   - Availability: % of successful requests (non-5xx)
 *   - Latency: p99 response time < threshold
 *   - Error budget: remaining allowed failures before SLO breach
 *
 * Usage:
 *   const slo = require('./observability/slo');
 *   slo.record(req, res, durationMs);
 *   const report = slo.getReport();
 */

// ─── SLO Definitions ─────────────────────────────────────────
const SLO_DEFINITIONS = {
    availability: {
        name: 'Service Availability',
        target: 0.999,       // 99.9%
        description: 'Percentage of requests that return non-5xx responses',
        window: '30d',       // rolling 30-day window
    },
    latency_p99: {
        name: 'Latency P99',
        target: 500,          // 500ms
        description: 'p99 response time must be under 500ms',
        window: '30d',
    },
    latency_p95: {
        name: 'Latency P95',
        target: 200,          // 200ms
        description: 'p95 response time must be under 200ms',
        window: '30d',
    },
    error_rate: {
        name: 'Error Rate',
        target: 0.001,        // 0.1%
        description: 'Percentage of requests that return 5xx errors',
        window: '30d',
    },
    event_processing: {
        name: 'Event Processing',
        target: 0.999,        // 99.9%
        description: 'Percentage of domain events processed successfully',
        window: '30d',
    },
    ai_availability: {
        name: 'AI Service Availability',
        target: 0.99,         // 99% (lower because external dependency)
        description: 'Percentage of AI engine calls that succeed (including circuit breaker fallbacks)',
        window: '30d',
    },
};

// ─── Sliding Window Data ─────────────────────────────────────
const WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const BUCKET_MS = 60 * 60 * 1000;            // 1 hour buckets

class SlidingWindow {
    constructor() {
        this.buckets = new Map(); // bucketKey → { total, success, errors, latencies[] }
    }

    _bucketKey(ts) {
        return Math.floor(ts / BUCKET_MS) * BUCKET_MS;
    }

    _getBucket(ts) {
        const key = this._bucketKey(ts);
        if (!this.buckets.has(key)) {
            this.buckets.set(key, { total: 0, success: 0, errors: 0, latencies: [] });
        }
        return this.buckets.get(key);
    }

    record(durationMs, isError) {
        const now = Date.now();
        const bucket = this._getBucket(now);
        bucket.total++;
        if (isError) {
            bucket.errors++;
        } else {
            bucket.success++;
        }
        bucket.latencies.push(durationMs);

        // Cap latencies per bucket to prevent memory bloat
        if (bucket.latencies.length > 5000) {
            bucket.latencies = bucket.latencies.slice(-2500);
        }

        // Prune old buckets
        this._prune(now);
    }

    _prune(now) {
        const cutoff = now - WINDOW_MS;
        for (const [key] of this.buckets) {
            if (key < cutoff) this.buckets.delete(key);
        }
    }

    getStats() {
        const now = Date.now();
        this._prune(now);

        let total = 0, success = 0, errors = 0;
        const allLatencies = [];

        for (const bucket of this.buckets.values()) {
            total += bucket.total;
            success += bucket.success;
            errors += bucket.errors;
            allLatencies.push(...bucket.latencies);
        }

        allLatencies.sort((a, b) => a - b);

        return {
            total,
            success,
            errors,
            availability: total > 0 ? success / total : 1,
            errorRate: total > 0 ? errors / total : 0,
            latencyP50: percentile(allLatencies, 50),
            latencyP95: percentile(allLatencies, 95),
            latencyP99: percentile(allLatencies, 99),
        };
    }
}

function percentile(sorted, p) {
    if (sorted.length === 0) return 0;
    const idx = Math.ceil(p / 100 * sorted.length) - 1;
    return sorted[Math.max(0, idx)];
}

// ─── Separate Windows per SLI ────────────────────────────────
const httpWindow = new SlidingWindow();
const eventWindow = new SlidingWindow();
const aiWindow = new SlidingWindow();

// ═══════════════════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════════════════

/**
 * Record an HTTP request outcome.
 */
function recordHttp(statusCode, durationMs) {
    const isError = statusCode >= 500;
    httpWindow.record(durationMs, isError);
}

/**
 * Record a domain event processing outcome.
 */
function recordEvent(success = true, durationMs = 0) {
    eventWindow.record(durationMs, !success);
}

/**
 * Record an AI service call outcome.
 */
function recordAI(success = true, durationMs = 0) {
    aiWindow.record(durationMs, !success);
}

/**
 * Get SLO compliance report.
 */
function getReport() {
    const httpStats = httpWindow.getStats();
    const eventStats = eventWindow.getStats();
    const aiStats = aiWindow.getStats();

    const slos = {
        availability: {
            ...SLO_DEFINITIONS.availability,
            current: httpStats.availability,
            compliant: httpStats.availability >= SLO_DEFINITIONS.availability.target,
            errorBudget: _errorBudget(SLO_DEFINITIONS.availability.target, httpStats),
        },
        latency_p99: {
            ...SLO_DEFINITIONS.latency_p99,
            current: httpStats.latencyP99,
            compliant: httpStats.latencyP99 <= SLO_DEFINITIONS.latency_p99.target,
        },
        latency_p95: {
            ...SLO_DEFINITIONS.latency_p95,
            current: httpStats.latencyP95,
            compliant: httpStats.latencyP95 <= SLO_DEFINITIONS.latency_p95.target,
        },
        error_rate: {
            ...SLO_DEFINITIONS.error_rate,
            current: httpStats.errorRate,
            compliant: httpStats.errorRate <= SLO_DEFINITIONS.error_rate.target,
        },
        event_processing: {
            ...SLO_DEFINITIONS.event_processing,
            current: eventStats.availability,
            compliant: eventStats.availability >= SLO_DEFINITIONS.event_processing.target,
            errorBudget: _errorBudget(SLO_DEFINITIONS.event_processing.target, eventStats),
        },
        ai_availability: {
            ...SLO_DEFINITIONS.ai_availability,
            current: aiStats.availability,
            compliant: aiStats.availability >= SLO_DEFINITIONS.ai_availability.target,
            errorBudget: _errorBudget(SLO_DEFINITIONS.ai_availability.target, aiStats),
        },
    };

    const allCompliant = Object.values(slos).every(s => s.compliant);

    return {
        status: allCompliant ? 'healthy' : 'degraded',
        slos,
        summary: {
            totalRequests: httpStats.total,
            totalErrors: httpStats.errors,
            overallAvailability: httpStats.availability,
            latency: {
                p50: httpStats.latencyP50,
                p95: httpStats.latencyP95,
                p99: httpStats.latencyP99,
            },
        },
        generatedAt: new Date().toISOString(),
    };
}

function _errorBudget(target, stats) {
    if (stats.total === 0) return { remaining: 1, total: 0, used: 0, percentage: 100 };

    const allowedErrors = Math.floor(stats.total * (1 - target));
    const usedErrors = stats.errors;
    const remaining = Math.max(0, allowedErrors - usedErrors);

    return {
        total: allowedErrors,
        used: usedErrors,
        remaining,
        percentage: allowedErrors > 0 ? Math.round((remaining / allowedErrors) * 100) : 0,
    };
}

/**
 * Express middleware — auto-record HTTP SLIs.
 */
function sloMiddleware(req, res, next) {
    const start = Date.now();

    const originalEnd = res.end;
    res.end = function (...args) {
        const duration = Date.now() - start;
        recordHttp(res.statusCode, duration);
        originalEnd.apply(res, args);
    };

    next();
}

module.exports = {
    SLO_DEFINITIONS,
    recordHttp,
    recordEvent,
    recordAI,
    getReport,
    sloMiddleware,
};
