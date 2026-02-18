/**
 * TrustChecker Engine Client v9.2 — Adapter Layer with Circuit Breaker
 * Routes calls to Python AI microservices (HTTP) with proper
 * circuit breaker pattern and JS fallback.
 *
 * Architecture:
 *   CLOSED  → HTTP POST to Python FastAPI
 *   OPEN    → Immediate JS fallback (no network call)
 *   HALF_OPEN → Probe one request, others fallback
 */

const http = require('http');
const { getBreaker, getAllBreakerStatus } = require('../middleware/circuit-breaker');

// Service URLs (configurable via env)
const SERVICES = {
    simulation: process.env.AI_SIMULATION_URL || 'http://localhost:5001',
    detection: process.env.AI_DETECTION_URL || 'http://localhost:5002',
    analytics: process.env.AI_ANALYTICS_URL || 'http://localhost:5003'
};

// Initialize circuit breakers per service
const breakers = {
    simulation: getBreaker('ai-simulation', { failureThreshold: 3, openDurationMs: 30_000 }),
    detection: getBreaker('ai-detection', { failureThreshold: 3, openDurationMs: 30_000 }),
    analytics: getBreaker('ai-analytics', { failureThreshold: 3, openDurationMs: 30_000 }),
};

// ─── JS Fallback Engines ─────────────────────────────────────
const fallback = {
    monteCarlo: () => require('./monte-carlo-worker'),
    digitalTwin: () => require('./digital-twin'),
    advancedScmAI: () => require('./advanced-scm-ai'),
    scmAI: () => require('./scm-ai'),
    fraud: () => require('./fraud'),
    anomaly: () => require('./anomaly'),
    riskRadar: () => require('./risk-radar'),
    carbon: () => require('./carbon-engine'),
};


// ─── HTTP Helper ─────────────────────────────────────────────
function httpPost(baseUrl, path, body, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, baseUrl);
        const data = JSON.stringify(body);

        const req = http.request({
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
            timeout: timeoutMs
        }, res => {
            let chunks = '';
            res.on('data', c => chunks += c);
            res.on('end', () => {
                if (res.statusCode >= 500) {
                    reject(new Error(`Service returned ${res.statusCode}`));
                    return;
                }
                try { resolve(JSON.parse(chunks)); }
                catch { reject(new Error(`Invalid JSON from ${url}`)); }
            });
        });

        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
        req.write(data);
        req.end();
    });
}


// ─── Generic Call Through Circuit Breaker ────────────────────
async function callEngine(serviceName, path, payload, jsFallbackFn) {
    const breaker = breakers[serviceName];
    if (!breaker) {
        console.warn(`[engine-client] No circuit breaker for ${serviceName}, calling directly`);
        try {
            return await httpPost(SERVICES[serviceName], path, payload);
        } catch {
            return jsFallbackFn();
        }
    }

    return breaker.exec(
        () => httpPost(SERVICES[serviceName], path, payload),
        () => {
            console.info(`[engine-client] JS fallback for ${serviceName}${path}`);
            return jsFallbackFn();
        }
    );
}


// ═══════════════════════════════════════════════════════════════
//  Public API — preserves original function signatures
// ═══════════════════════════════════════════════════════════════

// ─── Monte Carlo ─────────────────────────────────────────────
exports.monteCarloRun = (params, simulations = 1000) =>
    callEngine('simulation', '/monte-carlo/run', { params, simulations },
        () => fallback.monteCarlo().run(params, simulations));

// ─── Digital Twin ────────────────────────────────────────────
exports.digitalTwinBuild = (data) =>
    callEngine('simulation', '/digital-twin/build', { data },
        () => fallback.digitalTwin().buildModel(data));

exports.digitalTwinKPIs = (data) =>
    callEngine('simulation', '/digital-twin/kpis', { data },
        () => fallback.digitalTwin().computeKPIs(data));

exports.digitalTwinAnomalies = (data) =>
    callEngine('simulation', '/digital-twin/anomalies', { data },
        () => fallback.digitalTwin().detectAnomalies(data));

exports.digitalTwinSimulate = (model, scenario) =>
    callEngine('simulation', '/digital-twin/simulate', { model, scenario },
        () => fallback.digitalTwin().simulateDisruption(model, scenario));

// ─── Holt-Winters ────────────────────────────────────────────
exports.holtWintersForecast = (data, seasonLength = 7, periodsAhead = 14, params = {}) =>
    callEngine('simulation', '/holt-winters/forecast', { data, season_length: seasonLength, periods_ahead: periodsAhead, params },
        () => fallback.advancedScmAI().holtWintersTriple(data, seasonLength, periodsAhead, params));

// ─── What-If ─────────────────────────────────────────────────
exports.whatIfSimulate = (scenario, currentState = {}) =>
    callEngine('simulation', '/what-if/simulate', { scenario, current_state: currentState },
        () => fallback.advancedScmAI().whatIfSimulation(scenario, currentState));

// ─── Fraud Detection ─────────────────────────────────────────
exports.fraudAnalyze = (scanEvent, context = {}) =>
    callEngine('detection', '/fraud/analyze', { scan_event: scanEvent, context },
        () => fallback.fraud().analyze(scanEvent));

// ─── Anomaly Detection ───────────────────────────────────────
exports.anomalyFullScan = (data) =>
    callEngine('detection', '/anomaly/full-scan', { data },
        () => fallback.anomaly().runFullScan(data));

exports.anomalyScanVelocity = (scanEvents, windowMinutes = 60) =>
    callEngine('detection', '/anomaly/scan-velocity', { scan_events: scanEvents, window_minutes: windowMinutes },
        () => fallback.anomaly().detectScanVelocity(scanEvents, windowMinutes));

exports.anomalyFraudSpikes = (fraudAlerts) =>
    callEngine('detection', '/anomaly/fraud-spikes', { fraud_alerts: fraudAlerts },
        () => fallback.anomaly().detectFraudSpikes(fraudAlerts));

exports.anomalyTrustDrops = (trustScores) =>
    callEngine('detection', '/anomaly/trust-drops', { trust_scores: trustScores },
        () => fallback.anomaly().detectTrustDrops(trustScores));

exports.anomalyGeoDispersion = (scanEvents, windowHours = 1) =>
    callEngine('detection', '/anomaly/geo-dispersion', { scan_events: scanEvents, window_hours: windowHours },
        () => fallback.anomaly().detectGeoDispersion(scanEvents, windowHours));

// ─── Risk Radar ──────────────────────────────────────────────
exports.riskRadarCompute = (data) =>
    callEngine('detection', '/risk-radar/compute', { data },
        () => fallback.riskRadar().computeRadar(data));

exports.riskRadarHeatmap = (partners, shipments, leaks) =>
    callEngine('detection', '/risk-radar/heatmap', { partners, shipments, leaks },
        () => fallback.riskRadar().generateHeatmap(partners, shipments, leaks));

// ─── Carbon / ESG ────────────────────────────────────────────
exports.carbonFootprint = (product, shipments = [], events = []) =>
    callEngine('analytics', '/carbon/footprint', { product, shipments, events },
        () => fallback.carbon().calculateFootprint(product, shipments, events));

exports.carbonAggregate = (products, shipments = [], events = []) =>
    callEngine('analytics', '/carbon/aggregate', { products, shipments, events },
        () => fallback.carbon().aggregateByScope(products, shipments, events));

exports.carbonLeaderboard = (partners, shipments = [], violations = []) =>
    callEngine('analytics', '/carbon/leaderboard', { partners, shipments, violations },
        () => fallback.carbon().partnerLeaderboard(partners, shipments, violations));

exports.carbonGRIReport = (data) =>
    callEngine('analytics', '/carbon/gri-report', { data },
        () => fallback.carbon().generateGRIReport(data));

// ─── SCM AI ──────────────────────────────────────────────────
exports.scmPredictDelay = (shipments) =>
    callEngine('analytics', '/scm/predict-delay', { shipments },
        () => fallback.scmAI().predictDelay(shipments));

exports.scmForecastInventory = (history, periodsAhead = 7) =>
    callEngine('analytics', '/scm/forecast-inventory', { history, periods_ahead: periodsAhead },
        () => fallback.scmAI().forecastInventory(history, periodsAhead));

exports.scmBottlenecks = (events, partners = []) =>
    callEngine('analytics', '/scm/bottlenecks', { events, partners },
        () => fallback.scmAI().detectBottlenecks(events, partners));

exports.scmOptimizeRoute = (graph, fromId, toId) =>
    callEngine('analytics', '/scm/optimize-route', { graph, from_id: fromId, to_id: toId },
        () => fallback.scmAI().optimizeRoute(graph, fromId, toId));

exports.scmPartnerRisk = (partner, alerts = [], shipments = [], violations = []) =>
    callEngine('analytics', '/scm/partner-risk', { partner, alerts, shipments, violations },
        () => fallback.scmAI().scorePartnerRisk(partner, alerts, shipments, violations));

exports.scmPageRank = (nodes, edges, iterations = 20, damping = 0.85) =>
    callEngine('analytics', '/scm/pagerank', { nodes, edges, iterations, damping },
        () => fallback.scmAI().pageRank(nodes, edges, iterations, damping));

exports.scmToxicNodes = (nodes, edges, alerts = []) =>
    callEngine('analytics', '/scm/toxic-nodes', { nodes, edges, alerts },
        () => fallback.scmAI().detectToxicNodes(nodes, edges, alerts));

// ─── Demand Sensing ──────────────────────────────────────────
exports.demandSensing = (salesHistory, threshold = 2.0) =>
    callEngine('analytics', '/demand/detect', { sales_history: salesHistory, threshold },
        () => fallback.advancedScmAI().demandSensing(salesHistory, threshold));

// ─── Diagnostics (for /health endpoint) ──────────────────────
exports.getCircuitBreakerStatus = getAllBreakerStatus;
