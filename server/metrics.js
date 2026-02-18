/**
 * TrustChecker Prometheus Metrics Module
 * Exposes /metrics endpoint for Prometheus scraping.
 *
 * Metrics collected:
 * - HTTP request duration histogram (route, method, status)
 * - Active HTTP connections gauge
 * - Engine call counter + latency (engine name, target: python|js)
 * - Redis queue depth gauge
 * - Business metrics: scans/min, fraud alerts/min
 */

const client = require('prom-client');

// ─── Default metrics (Node.js process: CPU, memory, GC, event loop) ─────────
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: 'trustchecker_' });

// ─── Custom Metrics ─────────────────────────────────────────────────────────

// HTTP request duration histogram
const httpRequestDuration = new client.Histogram({
    name: 'trustchecker_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

// HTTP requests total counter
const httpRequestsTotal = new client.Counter({
    name: 'trustchecker_http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'],
});

// Active connections gauge
const activeConnections = new client.Gauge({
    name: 'trustchecker_active_connections',
    help: 'Number of active HTTP connections',
});

// Engine call metrics
const engineCallDuration = new client.Histogram({
    name: 'trustchecker_engine_call_duration_seconds',
    help: 'Duration of AI engine calls',
    labelNames: ['engine', 'target'], // target = 'python' | 'js_fallback'
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
});

const engineCallsTotal = new client.Counter({
    name: 'trustchecker_engine_calls_total',
    help: 'Total AI engine calls',
    labelNames: ['engine', 'target', 'status'], // status = 'success' | 'error'
});

// Redis queue depth gauge
const redisQueueDepth = new client.Gauge({
    name: 'trustchecker_redis_queue_depth',
    help: 'Number of pending jobs in Redis queue',
    labelNames: ['queue'],
});

// Business metrics
const qrScansTotal = new client.Counter({
    name: 'trustchecker_qr_scans_total',
    help: 'Total QR code scans',
    labelNames: ['result'], // valid, counterfeit, suspicious, warning
});

const fraudAlertsTotal = new client.Counter({
    name: 'trustchecker_fraud_alerts_total',
    help: 'Total fraud alerts generated',
    labelNames: ['severity'],
});

// WebSocket connections gauge
const wsConnections = new client.Gauge({
    name: 'trustchecker_websocket_connections',
    help: 'Active WebSocket connections',
});

// ─── Express Middleware ─────────────────────────────────────────────────────

/**
 * Express middleware to track HTTP request metrics.
 * Mount BEFORE routes: app.use(metricsMiddleware)
 */
function metricsMiddleware(req, res, next) {
    // Skip metrics endpoint itself
    if (req.path === '/metrics') return next();

    activeConnections.inc();
    const end = httpRequestDuration.startTimer();

    res.on('finish', () => {
        const route = _normalizeRoute(req);
        const labels = {
            method: req.method,
            route,
            status_code: res.statusCode,
        };
        end(labels);
        httpRequestsTotal.inc(labels);
        activeConnections.dec();
    });

    next();
}

/**
 * Normalize route to collapse IDs into :id placeholders.
 * Prevents high-cardinality labels.
 */
function _normalizeRoute(req) {
    if (req.route && req.route.path) {
        return req.baseUrl + req.route.path;
    }
    // Fallback: collapse UUID-like segments
    return req.path
        .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
        .replace(/\/\d+/g, '/:id');
}

/**
 * Express route handler: GET /metrics
 */
async function metricsHandler(req, res) {
    try {
        // Update Redis queue depth before scrape
        await _updateQueueDepth();

        res.set('Content-Type', client.register.contentType);
        const metrics = await client.register.metrics();
        res.end(metrics);
    } catch (err) {
        res.status(500).end('Error collecting metrics');
    }
}

/**
 * Update Redis queue depths from Redis.
 */
async function _updateQueueDepth() {
    try {
        const redis = require('./redis');
        const client = redis.getRedisClient();
        if (!client || !client.isOpen) return;

        const queues = ['ai-simulation', 'ai-detection', 'ai-analytics'];
        for (const q of queues) {
            const depth = await client.lLen(`queue:${q}`) || 0;
            redisQueueDepth.set({ queue: q }, depth);
        }
    } catch (_) {
        // Redis not available — skip queue depth
    }
}

// ─── Helper: Track engine calls from engine-client.js ───────────────────────

/**
 * Record an engine call metric.
 * @param {string} engine - Engine name (e.g. 'fraud', 'monteCarlo')
 * @param {string} target - 'python' or 'js_fallback'
 * @param {number} durationMs - Duration in milliseconds
 * @param {boolean} success - Whether the call succeeded
 */
function recordEngineCall(engine, target, durationMs, success = true) {
    engineCallDuration.observe({ engine, target }, durationMs / 1000);
    engineCallsTotal.inc({ engine, target, status: success ? 'success' : 'error' });
}

/**
 * Record a QR scan result.
 */
function recordQRScan(result) {
    qrScansTotal.inc({ result });
}

/**
 * Record a fraud alert.
 */
function recordFraudAlert(severity) {
    fraudAlertsTotal.inc({ severity });
}

/**
 * Track WebSocket connection changes.
 */
function setWSConnections(count) {
    wsConnections.set(count);
}

module.exports = {
    metricsMiddleware,
    metricsHandler,
    recordEngineCall,
    recordQRScan,
    recordFraudAlert,
    setWSConnections,
    // Expose Prometheus client for advanced usage
    client,
};
