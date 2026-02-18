/**
 * Boot: Health & Observability Endpoints
 * Health checks, metrics, SLO, domain diagnostics, CQRS query endpoints.
 */
const path = require('path');

function setupHealth(app, { config, db, redis, wss, waf, apiGateway, metrics, slo, eventBus, dlq, listEventTypes, partitionManager, domainRegistry, sagaOrchestrator, queryStore, replicaManager, getQueueStats, getAllBreakerStatus }) {
    const { authMiddleware, requireRole } = require('../auth');

    // ─── Basic Health ────────────────────────────────────────────────
    app.get('/api/health', async (req, res) => {
        const { cache } = require('../cache');
        const mem = process.memoryUsage();
        res.json({
            status: 'healthy',
            service: 'TrustChecker v9.4.0',
            api_version: 'v1',
            database: config.dbMode,
            redis: !!redis,
            cache: await cache.stats(),
            queue: getQueueStats(),
            circuit_breakers: getAllBreakerStatus(),
            event_bus: eventBus.getStats(),
            dlq: await dlq.depth(),
            slo: slo.getReport().status,
            partitions: await partitionManager.checkHealth(),
            domain_registry: domainRegistry.getStats(),
            sagas: sagaOrchestrator.getStats(),
            query_store: queryStore.getStats(),
            read_replica: replicaManager.getStats(),
            waf: waf.getStats(),
            api_gateway: apiGateway.getStats(),
            memory: {
                rss_mb: Math.round(mem.rss / 1048576),
                heap_used_mb: Math.round(mem.heapUsed / 1048576),
                heap_total_mb: Math.round(mem.heapTotal / 1048576),
            },
            uptime: Math.round(process.uptime()),
            timestamp: new Date().toISOString(),
            ws_clients: wss.clients.size
        });
    });
    app.get('/api/v1/health', (req, res, next) => { req.url = '/api/health'; next('route'); });

    // ─── Observability Endpoints (admin only) ────────────────────────
    app.get('/api/metrics', authMiddleware, requireRole('admin'), (req, res) => {
        res.setHeader('Content-Type', 'text/plain; version=0.0.4');
        metrics.gauge('uptime_seconds', Math.round(process.uptime()));
        res.send(metrics.serialize());
    });

    app.get('/api/health/slo', authMiddleware, requireRole('admin'), (req, res) => {
        res.json(slo.getReport());
    });

    app.get('/api/events/schemas', authMiddleware, requireRole('admin'), (req, res) => {
        res.json({ schemas: listEventTypes(), dlq_depth: dlq.getStats() });
    });

    // ─── Domain Diagnostics (admin only) ─────────────────────────────
    app.get('/api/domain/registry', authMiddleware, requireRole('admin'), (req, res) => {
        res.json(domainRegistry.getStats());
    });
    app.get('/api/domain/invariants', authMiddleware, requireRole('admin'), (req, res) => {
        res.json({ invariants: domainRegistry.getAllInvariants() });
    });
    app.get('/api/domain/sagas', authMiddleware, requireRole('admin'), (req, res) => {
        res.json({
            stats: sagaOrchestrator.getStats(),
            active: sagaOrchestrator.getActiveSagas(),
            recent: sagaOrchestrator.getRecentSagas(20),
        });
    });

    // ─── CQRS Query Endpoints ────────────────────────────────────────
    app.get('/api/query/dashboard', authMiddleware, async (req, res) => {
        const result = await queryStore.getDashboardStats(req.tenantId);
        res.json(result);
    });
    app.get('/api/query/scan/:productId', authMiddleware, async (req, res) => {
        const result = await queryStore.getScanVerification(req.params.productId);
        res.json(result);
    });

    // ─── WAF & Gateway Stats ─────────────────────────────────────────
    app.get('/api/security/waf', authMiddleware, requireRole('admin'), (req, res) => {
        res.json(waf.getStats());
    });

    // v1 aliases
    app.get('/api/v1/metrics', (req, res, next) => { req.url = '/api/metrics'; next('route'); });
    app.get('/api/v1/health/slo', (req, res, next) => { req.url = '/api/health/slo'; next('route'); });
    app.get('/api/v1/events/schemas', (req, res, next) => { req.url = '/api/events/schemas'; next('route'); });

    // ─── Deep Health (admin only) ────────────────────────────────────
    app.get('/api/health/deep', authMiddleware, requireRole('admin'), async (req, res) => {
        const { cache } = require('../cache');
        const { rateLimiter } = require('../middleware/rateLimiter');
        const { requestLogger: rl } = require('../middleware/security');
        const { getFeaturesForPlan } = require('../middleware/featureGate');

        const startTime = Date.now();

        let dbOk = false;
        let dbLatency = 0;
        let tableStats = {};
        try {
            const dbStart = Date.now();
            await db.prepare("SELECT COUNT(*) as c FROM users").get();
            dbLatency = Date.now() - dbStart;
            dbOk = true;

            const ALLOWED_TABLES = new Set(['users', 'products', 'scan_events', 'partners', 'shipments',
                'fraud_alerts', 'inventory', 'batches', 'supply_chain_events', 'blockchain_seals',
                'evidence_items', 'support_tickets', 'nft_certificates', 'audit_log', 'anomaly_detections']);
            for (const t of ALLOWED_TABLES) {
                try {
                    const r = await db.prepare('SELECT COUNT(*) as c FROM "' + t.replace(/"/g, '') + '"').get();
                    tableStats[t] = r?.c || 0;
                } catch (e) { tableStats[t] = 'error'; }
            }
        } catch (e) { dbOk = false; }

        const mem = process.memoryUsage();
        const cpus = require('os').cpus();

        res.json({
            status: dbOk ? 'healthy' : 'degraded',
            version: '9.4.0',
            checks: {
                database: { ok: dbOk, latency_ms: dbLatency, mode: config.dbMode },
                redis: { ok: !!redis, connected: !!redis },
                cache: await cache.stats(),
                queue: getQueueStats(),
                rate_limiter: rateLimiter.getStats(),
            },
            system: {
                platform: process.platform,
                node_version: process.version,
                cpus: cpus.length,
                cpu_model: cpus[0]?.model,
                memory: {
                    rss_mb: Math.round(mem.rss / 1048576),
                    heap_used_mb: Math.round(mem.heapUsed / 1048576),
                    heap_total_mb: Math.round(mem.heapTotal / 1048576),
                    external_mb: Math.round(mem.external / 1048576),
                },
                uptime_seconds: Math.round(process.uptime()),
                pid: process.pid,
            },
            database: {
                tables: tableStats,
                total_tables: Object.keys(tableStats).length,
            },
            request_metrics: rl.getMetrics(),
            features: {
                user_plan: req.user?.plan || 'enterprise',
                available: getFeaturesForPlan(req.user?.plan || 'enterprise'),
            },
            response_time_ms: Date.now() - startTime,
        });
    });

    // ─── Frontend Serving ────────────────────────────────────────────
    const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
    const clientPublic = path.join(__dirname, '..', '..', 'client');
    const express = require('express');
    const fs = require('fs');

    // No-cache for HTML and service worker (prevent stale SW cache)
    app.use((req, res, next) => {
        if (req.path === '/sw.js' || req.path.endsWith('.html') || req.path === '/') {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        next();
    });

    if (fs.existsSync(clientDist)) {
        app.use(express.static(clientDist));
    } else if (fs.existsSync(clientPublic)) {
        app.use(express.static(clientPublic));
    }

    app.get('/check', (req, res) => {
        const checkPage = path.join(clientPublic, 'check.html');
        if (fs.existsSync(checkPage)) {
            res.sendFile(checkPage);
        } else {
            res.redirect('/');
        }
    });

    app.get('{*path}', (req, res) => {
        if (!req.path.startsWith('/api/') && !req.path.startsWith('/ws')) {
            const indexPath = fs.existsSync(clientDist)
                ? path.join(clientDist, 'index.html')
                : path.join(clientPublic, 'index.html');
            if (fs.existsSync(indexPath)) {
                res.sendFile(indexPath);
            } else {
                res.status(404).send('Frontend not built yet. Run npm run build:client');
            }
        }
    });

    // ─── Centralized Error Handler ───────────────────────────────────
    app.use((err, req, res, next) => {
        if (err.message === 'Not allowed by CORS') {
            return res.status(403).json({ error: 'Origin not allowed', request_id: req.requestId });
        }
        console.error(`⚠️ Unhandled error [${req.requestId || 'no-id'}]:`, err);
        const message = process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message || 'Internal server error';
        res.status(err.status || 500).json({ error: message, request_id: req.requestId });
    });
}

module.exports = { setupHealth };
