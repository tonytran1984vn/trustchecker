/**
 * TrustChecker v9.2 — Metrics Collector
 * ═══════════════════════════════════════════════════════════
 * Prometheus-compatible metrics primitives:
 *   - Counter: monotonically increasing (e.g. total requests)
 *   - Gauge: point-in-time value (e.g. active connections)
 *   - Histogram: distribution with percentiles (e.g. latency)
 *
 * Usage:
 *   const metrics = require('./observability/metrics');
 *   metrics.increment('http_requests_total', { method: 'GET', status: '200' });
 *   metrics.gauge('active_connections', 42);
 *   metrics.observe('http_request_duration_ms', 150, { path: '/api/products' });
 *   const output = metrics.serialize(); // Prometheus text format
 */

// ─── Counter ─────────────────────────────────────────────────
class Counter {
    constructor(name, help) {
        this.name = name;
        this.help = help;
        this.values = new Map(); // labelKey → number
    }

    inc(labels = {}, value = 1) {
        const key = labelKey(labels);
        this.values.set(key, (this.values.get(key) || 0) + value);
    }

    serialize() {
        let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} counter\n`;
        for (const [key, val] of this.values) {
            out += `${this.name}${key} ${val}\n`;
        }
        return out;
    }
}

// ─── Gauge ───────────────────────────────────────────────────
class Gauge {
    constructor(name, help) {
        this.name = name;
        this.help = help;
        this.values = new Map();
    }

    set(labels = {}, value) {
        this.values.set(labelKey(labels), value);
    }

    inc(labels = {}, value = 1) {
        const key = labelKey(labels);
        this.values.set(key, (this.values.get(key) || 0) + value);
    }

    dec(labels = {}, value = 1) {
        const key = labelKey(labels);
        this.values.set(key, (this.values.get(key) || 0) - value);
    }

    serialize() {
        let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} gauge\n`;
        for (const [key, val] of this.values) {
            out += `${this.name}${key} ${val}\n`;
        }
        return out;
    }
}

// ─── Histogram ───────────────────────────────────────────────
class Histogram {
    constructor(name, help, buckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000]) {
        this.name = name;
        this.help = help;
        this.buckets = buckets.sort((a, b) => a - b);
        this.observations = new Map(); // labelKey → { values[], sum, count }
    }

    observe(labels = {}, value) {
        const key = labelKey(labels);
        if (!this.observations.has(key)) {
            this.observations.set(key, { values: [], sum: 0, count: 0 });
        }
        const obs = this.observations.get(key);
        obs.values.push(value);
        obs.sum += value;
        obs.count++;

        // Keep only last 10000 observations to bound memory
        if (obs.values.length > 10000) {
            obs.values = obs.values.slice(-5000);
        }
    }

    percentile(labelKey, p) {
        const obs = this.observations.get(labelKey);
        if (!obs || obs.values.length === 0) return 0;
        const sorted = [...obs.values].sort((a, b) => a - b);
        const idx = Math.ceil(p / 100 * sorted.length) - 1;
        return sorted[Math.max(0, idx)];
    }

    serialize() {
        let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} histogram\n`;
        for (const [key, obs] of this.observations) {
            for (const bucket of this.buckets) {
                const count = obs.values.filter(v => v <= bucket).length;
                out += `${this.name}_bucket${addLabel(key, 'le', bucket)} ${count}\n`;
            }
            out += `${this.name}_bucket${addLabel(key, 'le', '+Inf')} ${obs.count}\n`;
            out += `${this.name}_sum${key} ${obs.sum}\n`;
            out += `${this.name}_count${key} ${obs.count}\n`;
        }
        return out;
    }
}

// ─── Label Helpers ───────────────────────────────────────────
function labelKey(labels) {
    const entries = Object.entries(labels);
    if (entries.length === 0) return '';
    return '{' + entries.map(([k, v]) => `${k}="${v}"`).join(',') + '}';
}

function addLabel(existing, key, value) {
    if (!existing || existing === '') return `{${key}="${value}"}`;
    return existing.slice(0, -1) + `,${key}="${value}"}`;
}

// ═══════════════════════════════════════════════════════════════
//  METRICS REGISTRY
// ═══════════════════════════════════════════════════════════════
const _counters = new Map();
const _gauges = new Map();
const _histograms = new Map();

// Pre-register standard metrics
function _getOrCreateCounter(name, help) {
    if (!_counters.has(name)) _counters.set(name, new Counter(name, help));
    return _counters.get(name);
}

function _getOrCreateGauge(name, help) {
    if (!_gauges.has(name)) _gauges.set(name, new Gauge(name, help));
    return _gauges.get(name);
}

function _getOrCreateHistogram(name, help, buckets) {
    if (!_histograms.has(name)) _histograms.set(name, new Histogram(name, help, buckets));
    return _histograms.get(name);
}

// ─── Pre-registered Metrics ──────────────────────────────────
_getOrCreateCounter('http_requests_total', 'Total HTTP requests');
_getOrCreateCounter('http_errors_total', 'Total HTTP errors (4xx+5xx)');
_getOrCreateCounter('events_published_total', 'Total domain events published');
_getOrCreateCounter('events_consumed_total', 'Total domain events consumed');
_getOrCreateCounter('events_failed_total', 'Total domain events that failed processing');
_getOrCreateCounter('jobs_processed_total', 'Total background jobs processed');
_getOrCreateCounter('jobs_failed_total', 'Total background jobs failed');
_getOrCreateCounter('dlq_entries_total', 'Total entries pushed to DLQ');
_getOrCreateCounter('circuit_breaker_trips_total', 'Total circuit breaker trips');
_getOrCreateCounter('auth_attempts_total', 'Total authentication attempts');
_getOrCreateCounter('scans_total', 'Total QR scans processed');

_getOrCreateGauge('active_connections', 'Current active HTTP connections');
_getOrCreateGauge('event_bus_queue_depth', 'Current event bus queue depth');
_getOrCreateGauge('worker_active_jobs', 'Current active worker jobs');
_getOrCreateGauge('circuit_breaker_state', 'Circuit breaker state (0=closed, 1=half-open, 2=open)');
_getOrCreateGauge('uptime_seconds', 'Server uptime in seconds');

_getOrCreateHistogram('http_request_duration_ms', 'HTTP request duration in milliseconds');
_getOrCreateHistogram('db_query_duration_ms', 'Database query duration in milliseconds');
_getOrCreateHistogram('event_processing_duration_ms', 'Event processing duration in milliseconds');
_getOrCreateHistogram('ai_engine_duration_ms', 'AI engine call duration in milliseconds');

// ═══════════════════════════════════════════════════════════════
//  PUBLIC API
// ═══════════════════════════════════════════════════════════════
const metrics = {
    increment(name, labels = {}, value = 1) {
        _getOrCreateCounter(name, name).inc(labels, value);
    },

    gauge(name, value, labels = {}) {
        _getOrCreateGauge(name, name).set(labels, value);
    },

    gaugeInc(name, labels = {}, value = 1) {
        _getOrCreateGauge(name, name).inc(labels, value);
    },

    gaugeDec(name, labels = {}, value = 1) {
        _getOrCreateGauge(name, name).dec(labels, value);
    },

    observe(name, value, labels = {}) {
        _getOrCreateHistogram(name, name).observe(labels, value);
    },

    percentile(name, p, labels = {}) {
        const hist = _histograms.get(name);
        if (!hist) return 0;
        return hist.percentile(labelKey(labels), p);
    },

    /**
     * Serialize all metrics in Prometheus text exposition format.
     */
    serialize() {
        let out = '';
        for (const counter of _counters.values()) out += counter.serialize();
        for (const gauge of _gauges.values()) out += gauge.serialize();
        for (const hist of _histograms.values()) out += hist.serialize();
        return out;
    },

    /**
     * Get summary stats (for health endpoint).
     */
    getSummary() {
        const summary = {};
        for (const [name, counter] of _counters) {
            let total = 0;
            for (const v of counter.values.values()) total += v;
            summary[name] = total;
        }
        for (const [name, gauge] of _gauges) {
            const values = {};
            for (const [k, v] of gauge.values) values[k || 'value'] = v;
            summary[name] = Object.keys(values).length === 1 ? Object.values(values)[0] : values;
        }
        for (const [name, hist] of _histograms) {
            const stats = {};
            for (const [k, obs] of hist.observations) {
                stats[k || 'default'] = {
                    count: obs.count,
                    p50: hist.percentile(k, 50),
                    p95: hist.percentile(k, 95),
                    p99: hist.percentile(k, 99),
                    avg: obs.count > 0 ? Math.round(obs.sum / obs.count) : 0,
                };
            }
            summary[name] = stats;
        }
        return summary;
    },

    /**
     * Express middleware — tracks request metrics.
     */
    middleware(req, res, next) {
        const start = Date.now();

        metrics.gaugeInc('active_connections');

        const originalEnd = res.end;
        res.end = function (...args) {
            const duration = Date.now() - start;
            const labels = { method: req.method, path: req.route?.path || req.path, status: String(res.statusCode) };

            metrics.increment('http_requests_total', labels);
            metrics.observe('http_request_duration_ms', duration, { method: req.method, path: req.route?.path || req.path });

            if (res.statusCode >= 400) {
                metrics.increment('http_errors_total', labels);
            }

            metrics.gaugeDec('active_connections');

            originalEnd.apply(res, args);
        };

        next();
    },
};

module.exports = metrics;
