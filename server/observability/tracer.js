/**
 * TrustChecker v9.5 — Distributed Tracer with OpenTelemetry Export
 * ═══════════════════════════════════════════════════════════
 * OpenTelemetry-compatible trace context without external deps.
 * Implements W3C Trace Context (traceparent + baggage headers).
 *
 * Phase 5B additions:
 *   - OTLP HTTP batch exporter (JSON format)
 *   - Configurable batch processor (flush interval, max batch)
 *   - Resource attributes (service.name, version, environment)
 *   - W3C Baggage header propagation
 *   - Sampling control (head-based)
 *
 * Env:
 *   OTEL_EXPORTER_OTLP_ENDPOINT - Collector endpoint (e.g. http://localhost:4318)
 *   OTEL_SERVICE_NAME           - Service name (default: trustchecker-api)
 *   OTEL_SAMPLE_RATE            - 0.0 to 1.0 (default: 1.0 = 100%)
 *   NODE_ENV                    - environment tag
 *
 * Usage:
 *   const { tracer, traceMiddleware } = require('./observability/tracer');
 *   const span = tracer.startSpan('db.query', { db: 'products' });
 *   try { ... } finally { span.end(); }
 */

const crypto = require('crypto');
const http = require('http');
const https = require('https');

// ─── ID Generation ───────────────────────────────────────────
function generateTraceId() {
    return crypto.randomBytes(16).toString('hex'); // 32 hex chars
}

function generateSpanId() {
    return crypto.randomBytes(8).toString('hex'); // 16 hex chars
}

// ─── W3C Trace Context ──────────────────────────────────────
function parseTraceparent(header) {
    if (!header) return null;
    const parts = header.split('-');
    if (parts.length < 4) return null;
    return {
        version: parts[0],
        traceId: parts[1],
        parentSpanId: parts[2],
        flags: parts[3],
    };
}

function formatTraceparent(traceId, spanId, sampled = true) {
    return `00-${traceId}-${spanId}-${sampled ? '01' : '00'}`;
}

// ─── Span ────────────────────────────────────────────────────
class Span {
    constructor(name, opts = {}) {
        this.name = name;
        this.traceId = opts.traceId || generateTraceId();
        this.spanId = generateSpanId();
        this.parentSpanId = opts.parentSpanId || null;
        this.kind = opts.kind || 'internal'; // 'server', 'client', 'internal', 'consumer', 'producer'
        this.attributes = opts.attributes || {};
        this.startTime = Date.now();
        this.endTime = null;
        this.status = 'ok';
        this.error = null;
        this.events = [];
    }

    setAttribute(key, value) {
        this.attributes[key] = value;
        return this;
    }

    setAttributes(attrs) {
        Object.assign(this.attributes, attrs);
        return this;
    }

    addEvent(name, attributes = {}) {
        this.events.push({
            name,
            timestamp: Date.now(),
            attributes,
        });
        return this;
    }

    setError(err) {
        this.status = 'error';
        this.error = {
            message: err.message || String(err),
            stack: err.stack || null,
            type: err.constructor?.name || 'Error',
        };
        return this;
    }

    end() {
        this.endTime = Date.now();
        this.durationMs = this.endTime - this.startTime;
        // Collect in trace store
        _traceStore.addSpan(this);
        return this;
    }

    toJSON() {
        return {
            traceId: this.traceId,
            spanId: this.spanId,
            parentSpanId: this.parentSpanId,
            name: this.name,
            kind: this.kind,
            startTime: this.startTime,
            endTime: this.endTime,
            durationMs: this.durationMs,
            status: this.status,
            error: this.error,
            attributes: this.attributes,
            events: this.events,
        };
    }
}

// ─── Trace Store (In-Memory Ring Buffer) ─────────────────────
class TraceStore {
    constructor(maxTraces = 1000) {
        this.maxTraces = maxTraces;
        this.traces = new Map(); // traceId → spans[]
        this._order = [];
    }

    addSpan(span) {
        if (!this.traces.has(span.traceId)) {
            this.traces.set(span.traceId, []);
            this._order.push(span.traceId);

            // Evict oldest
            while (this._order.length > this.maxTraces) {
                const old = this._order.shift();
                this.traces.delete(old);
            }
        }
        this.traces.get(span.traceId).push(span.toJSON());
    }

    getTrace(traceId) {
        return this.traces.get(traceId) || [];
    }

    getRecentTraces(limit = 20) {
        const recent = this._order.slice(-limit).reverse();
        return recent.map(id => ({
            traceId: id,
            spans: this.traces.get(id),
        }));
    }

    getStats() {
        let totalSpans = 0;
        let errorSpans = 0;
        let totalDuration = 0;
        let count = 0;

        for (const spans of this.traces.values()) {
            totalSpans += spans.length;
            for (const span of spans) {
                if (span.status === 'error') errorSpans++;
                if (span.durationMs && span.kind === 'server') {
                    totalDuration += span.durationMs;
                    count++;
                }
            }
        }

        return {
            activeTraces: this.traces.size,
            totalSpans,
            errorSpans,
            avgDurationMs: count > 0 ? Math.round(totalDuration / count) : 0,
        };
    }

    clear() {
        this.traces.clear();
        this._order.length = 0;
    }
}

const _traceStore = new TraceStore();

// ═══════════════════════════════════════════════════════════════════
// RESOURCE ATTRIBUTES (OpenTelemetry Semantic Conventions)
// ═══════════════════════════════════════════════════════════════════

const _resource = {
    'service.name': process.env.OTEL_SERVICE_NAME || 'trustchecker-api',
    'service.version': process.env.APP_VERSION || '9.5.0',
    'deployment.environment': process.env.NODE_ENV || 'development',
    'telemetry.sdk.name': 'trustchecker-tracer',
    'telemetry.sdk.version': '2.0.0',
    'host.name': require('os').hostname(),
};

// ═══════════════════════════════════════════════════════════════════
// SAMPLING
// ═══════════════════════════════════════════════════════════════════

const SAMPLE_RATE = parseFloat(process.env.OTEL_SAMPLE_RATE || '1.0');

function shouldSample() {
    return Math.random() < SAMPLE_RATE;
}

// ═══════════════════════════════════════════════════════════════════
// W3C BAGGAGE
// ═══════════════════════════════════════════════════════════════════

function parseBaggage(header) {
    if (!header) return {};
    const baggage = {};
    header.split(',').forEach(item => {
        const [keyVal, ...meta] = item.trim().split(';');
        const [key, value] = keyVal.split('=');
        if (key && value) {
            baggage[key.trim()] = decodeURIComponent(value.trim());
        }
    });
    return baggage;
}

function formatBaggage(baggage) {
    return Object.entries(baggage)
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join(', ');
}

// ═══════════════════════════════════════════════════════════════════
// OTLP HTTP BATCH EXPORTER
// ═══════════════════════════════════════════════════════════════════

const OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || null;
const BATCH_FLUSH_INTERVAL = parseInt(process.env.OTEL_BATCH_FLUSH_MS || '5000', 10);
const BATCH_MAX_SIZE = parseInt(process.env.OTEL_BATCH_MAX_SIZE || '512', 10);

let _batchBuffer = [];
let _batchTimer = null;
let _exportStats = { exported: 0, errors: 0, dropped: 0 };

/**
 * Convert internal span to OTLP JSON format.
 */
function spanToOTLP(span) {
    const spanJson = span.toJSON ? span.toJSON() : span;
    return {
        traceId: spanJson.traceId,
        spanId: spanJson.spanId,
        parentSpanId: spanJson.parentSpanId || undefined,
        name: spanJson.name,
        kind: mapKindToOTLP(spanJson.kind),
        startTimeUnixNano: (spanJson.startTime * 1_000_000).toString(),
        endTimeUnixNano: ((spanJson.endTime || Date.now()) * 1_000_000).toString(),
        attributes: objectToAttributes(spanJson.attributes),
        status: {
            code: spanJson.status === 'error' ? 2 : 1,
            message: spanJson.error?.message || '',
        },
        events: (spanJson.events || []).map(e => ({
            name: e.name,
            timeUnixNano: (e.timestamp * 1_000_000).toString(),
            attributes: objectToAttributes(e.attributes || {}),
        })),
    };
}

function mapKindToOTLP(kind) {
    const map = { 'internal': 1, 'server': 2, 'client': 3, 'producer': 4, 'consumer': 5 };
    return map[kind] || 1;
}

function objectToAttributes(obj) {
    return Object.entries(obj || {}).map(([key, value]) => {
        if (typeof value === 'number') {
            return Number.isInteger(value)
                ? { key, value: { intValue: value.toString() } }
                : { key, value: { doubleValue: value } };
        }
        if (typeof value === 'boolean') {
            return { key, value: { boolValue: value } };
        }
        return { key, value: { stringValue: String(value) } };
    });
}

/**
 * Add span to batch buffer. Flushes when buffer full or timer fires.
 */
function addToBatch(span) {
    if (!OTLP_ENDPOINT) return; // No collector configured

    _batchBuffer.push(span);

    if (_batchBuffer.length >= BATCH_MAX_SIZE) {
        flushBatch();
    } else if (!_batchTimer) {
        _batchTimer = setTimeout(flushBatch, BATCH_FLUSH_INTERVAL);
    }
}

/**
 * Flush batch buffer to OTLP collector.
 */
async function flushBatch() {
    if (_batchTimer) {
        clearTimeout(_batchTimer);
        _batchTimer = null;
    }

    if (_batchBuffer.length === 0) return;

    const spans = _batchBuffer.splice(0);

    const payload = JSON.stringify({
        resourceSpans: [{
            resource: {
                attributes: objectToAttributes(_resource),
            },
            scopeSpans: [{
                scope: { name: 'trustchecker-tracer', version: '2.0.0' },
                spans: spans.map(spanToOTLP),
            }],
        }],
    });

    try {
        const url = new URL('/v1/traces', OTLP_ENDPOINT);
        const transport = url.protocol === 'https:' ? https : http;

        await new Promise((resolve, reject) => {
            const req = transport.request(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload),
                },
                timeout: 10_000,
            }, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        _exportStats.exported += spans.length;
                        resolve();
                    } else {
                        _exportStats.errors++;
                        console.warn(`[Tracer] OTLP export failed: ${res.statusCode} ${body.slice(0, 100)}`);
                        reject(new Error(`OTLP ${res.statusCode}`));
                    }
                });
            });

            req.on('error', (err) => {
                _exportStats.errors++;
                console.warn(`[Tracer] OTLP connection error: ${err.message}`);
                reject(err);
            });

            req.on('timeout', () => {
                _exportStats.errors++;
                req.destroy();
                reject(new Error('OTLP timeout'));
            });

            req.write(payload);
            req.end();
        });

    } catch (err) {
        // Spans are dropped — don't block application
        _exportStats.dropped += spans.length;
    }
}

// ─── Tracer API ──────────────────────────────────────────────
const tracer = {
    startSpan(name, opts = {}) {
        return new Span(name, opts);
    },

    getStore() {
        return _traceStore;
    },

    getTrace(traceId) {
        return _traceStore.getTrace(traceId);
    },

    getRecentTraces(limit) {
        return _traceStore.getRecentTraces(limit);
    },

    getResource() {
        return { ..._resource };
    },

    getExportStats() {
        return { ..._exportStats, bufferSize: _batchBuffer.length, endpoint: OTLP_ENDPOINT || 'none' };
    },

    async shutdown() {
        await flushBatch();
        if (_batchTimer) clearTimeout(_batchTimer);
    },
};

// ─── Express Middleware (enhanced with baggage + sampling) ───
function traceMiddleware(req, res, next) {
    // Head-based sampling
    const sampled = shouldSample();

    // Extract or create trace context
    const traceparent = parseTraceparent(req.headers.traceparent);
    const traceId = traceparent?.traceId || generateTraceId();
    const parentSpanId = traceparent?.parentSpanId || null;

    // Extract W3C baggage
    const baggage = parseBaggage(req.headers.baggage);

    // Create server span
    const span = new Span(`HTTP ${req.method} ${req.route?.path || req.path}`, {
        traceId,
        parentSpanId,
        kind: 'server',
        attributes: {
            'http.method': req.method,
            'http.url': req.originalUrl,
            'http.host': req.hostname,
            'http.user_agent': req.headers['user-agent'],
            'net.peer.ip': req.ip,
            'http.sampled': sampled,
        },
    });

    // Propagate trace context on request
    req.traceId = traceId;
    req.span = span;
    req.baggage = baggage;

    // Set response headers (propagate downstream)
    res.setHeader('traceparent', formatTraceparent(traceId, span.spanId, sampled));
    res.setHeader('X-Trace-Id', traceId);

    // Forward baggage
    if (Object.keys(baggage).length > 0) {
        res.setHeader('baggage', formatBaggage(baggage));
    }

    // End span on response finish
    const originalEnd = res.end;
    res.end = function (...args) {
        span.setAttribute('http.status_code', res.statusCode);
        span.setAttribute('http.response_content_length', res.getHeader('content-length') || 0);

        if (res.statusCode >= 400) {
            span.setError({ message: `HTTP ${res.statusCode}` });
        }

        span.end();

        // Also export to OTLP if configured and sampled
        if (sampled) {
            addToBatch(span);
        }

        originalEnd.apply(res, args);
    };

    next();
}

module.exports = {
    tracer,
    Span,
    TraceStore,
    traceMiddleware,
    parseTraceparent,
    formatTraceparent,
    parseBaggage,
    formatBaggage,
    generateTraceId,
    generateSpanId,
};
