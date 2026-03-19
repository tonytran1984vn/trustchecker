require("dotenv").config();
/**
 * TrustChecker v9.4 Server – Main Entry Point
 * Express + WebSocket server for the Distributed Digital Trust Infrastructure
 * Supports dual-mode: PostgreSQL (Prisma) or SQLite (sql.js)
 *
 * Boot sequence is split into focused modules:
 *   boot/middleware.js  — Security, observability, versioning, metering, tenant
 *   boot/routes.js      — Declarative route table (36 routes, auto v1 alias)
 *   boot/health.js      — Health, metrics, SLO, domain diagnostics, frontend
 *   boot/shutdown.js    — Graceful shutdown & process error handlers
 */

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { validateConfig, DB_MODES, warnDefaultSecrets } = require('./config');
const db = require('./db');

// ─── Configuration Validation ────────────────────────────────────────────────
const config = validateConfig();

// v9.4.3: Sentry error monitoring
try { require('./observability/sentry'); } catch(e) {}
const errorMonitor = require('./observability/error-monitor');


warnDefaultSecrets();

const app = express();
const server = http.createServer(app);

// ─── Core Middleware ─────────────────────────────────────────────────────────

// CORS — restrict to known origins
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:4000', 'http://localhost:3000', 'http://127.0.0.1:4000', 'https://tonytran.work', 'http://tonytran.work', 'http://34.92.229.72', 'http://34.92.229.72:4000'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
    maxAge: 86400
}));

// Helmet — security headers with CSP
// CSP Notes:
// - 'unsafe-inline' required for legacy client with inline onclick handlers
// - For full XSS protection: refactor client to use nonces, then remove unsafe-inline
// - Use 'strict-dynamic' when nonce is implemented
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:", "https://*.tile.openstreetmap.org"],
            connectSrc: ["'self'", "ws:", "wss:"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: [],
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));
app.use(compression());
app.use(express.json({ limit: '2mb' })); // SEC-API-2: reduced from 5mb

// BS-DEFENSE: Global idempotency guard
const { idempotencyGuard } = require("./middleware/blind-spot-defense");
app.use(idempotencyGuard);
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Prometheus Metrics
const { metricsMiddleware, metricsHandler } = require('./metrics');
const { authMiddleware: metricsAuth, requireRole: metricsRole } = require('./auth/core');
app.use(metricsMiddleware);
// SEC-02: Protect metrics endpoint — requires admin auth
app.get('/metrics', metricsAuth, metricsRole('admin'), metricsHandler);

const isTest = process.env.NODE_ENV === 'test';

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTest ? 10000 : 5000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' }
});
// v9.5.0: API Versioning — /api/v1/* forwards to /api/*
app.use('/api/v1', (req, res, next) => { req.originalUrl = req.originalUrl.replace('/api/v1', '/api'); req.url = req.url; next(); });
app.use('/api/', apiLimiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTest ? 1000 : 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts. Try again in 15 minutes' },
    skipSuccessfulRequests: true
});
// A-11: Deep health check
try { app.use('/healthz', require('./routes/health')); } catch(e) { app.use('/healthz', require('./routes/healthz')); }
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/change-password', authLimiter); // SEC-API-2: rate limit password changes
app.use('/api/auth/reset-password', authLimiter);  // SEC-API-2: rate limit password resets
app.use("/api/trust-network", require("./routes/trust-network"));
app.use("/api/risk-intel", require("./routes/risk-intelligence")); // V21.6

// API Key management UI
app.get("/api-keys", (req, res) => {
    res.sendFile(require("path").join(__dirname, "../client/api-keys.html"));
});

// Trust Network: serve public join page
app.get("/network/join/:token", function(req, res) {
    res.sendFile(require("path").join(__dirname, "../client/join.html"));
});


// ─── Boot Sequence ───────────────────────────────────────────────────────────
async function boot() {
    // 1. Database initialization
    await db._readyPromise;
    console.log(`✅ Database initialized (${config.dbMode})`);

    // V21.6: Risk Engine migration (idempotent)
    try {
        const { runMigration } = require('./migrations/risk-engine-v21-migration');
        await runMigration();
    } catch(e) { console.warn('⚠️  V21.6 migration skipped:', e.message); }

    // 2. Redis (optional)
    let redis = null;
    if (process.env.REDIS_URL) {
        try {
            const redisModule = require('./redis');
            await redisModule.getRedisClient().connect();
            redis = redisModule;
            console.log('✅ Redis connected');
        } catch (e) {
            console.warn('⚠️  Redis not available, using in-memory fallback:', e.message);
        }
    }

    // 3. WebSocket Server (with JWT auth)
    const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 64 * 1024 }); // SEC-API-2: 64KB max message
    const { eventBus } = require('./events');
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('./auth');

    wss.on('connection', (ws, req) => {
        try {
            const url = new URL(req.url, `http://${req.headers.host}`);
            const token = url.searchParams.get('token');
            if (!token) { ws.close(4001, 'Authentication required'); return; }
            ws.user = jwt.verify(token, JWT_SECRET, { issuer: 'trustchecker', audience: 'trustchecker-users' });
        } catch (e) { ws.close(4003, 'Invalid or expired token'); return; }

        console.log(`🔗 WebSocket client connected: ${ws.user.username} (${wss.clients.size} total)`);
        eventBus.addClient(ws);
        ws.send(JSON.stringify({
            type: 'CONNECTED',
            data: { message: 'Connected to TrustChecker Event Stream', user: ws.user.username, timestamp: new Date().toISOString() }
        }));
        // v9.4.2: Store org_id on ws for scoped broadcasts
        ws.orgId = ws.user.org_id || ws.user.orgId || null;
        ws.on('close', () => console.log(`📴 WebSocket client disconnected (${wss.clients.size} total)`));
    });

    // 4. Infrastructure components
    const { getQueueStats } = require('./queue');
    const { getAllBreakerStatus } = require('./middleware/circuit-breaker');
    const dlq = require('./events/dead-letter');
    const { listEventTypes } = require('./events/schema-registry');
    const partitionManager = require('./partitions/partition-manager');
    const { registry: domainRegistry } = require('./domain/domain-registry');
    const { orchestrator: sagaOrchestrator } = require('./domain/saga-orchestrator');
    const { QueryStore } = require('./data/query-store');
    const { replicaManager } = require('./data/read-replica');
    const queryStore = new QueryStore(db, redis?.getRedisClient?.() || null);

    // 5. Apply middleware chain (WAF → security → observability → versioning → metering → tenant)
    const { setupMiddleware } = require('./boot/middleware');
    const { waf, apiGateway, metrics, slo } = setupMiddleware(app, redis);

    // 6. Mount all routes (36 routes, auto v1 alias)
    const { setupRoutes } = require('./boot/routes');
    setupRoutes(app);

    // 7. Health, metrics, frontend, error handler
    const { setupHealth } = require('./boot/health');
    setupHealth(app, {
        config, db, redis, wss, waf, apiGateway, metrics, slo,
        eventBus, dlq, listEventTypes, partitionManager,
        domainRegistry, sagaOrchestrator, queryStore, replicaManager,
        getQueueStats, getAllBreakerStatus
    });

    // 8. Start scheduler & partition maintenance
    const scheduler = require('./engines/infrastructure/scheduler');
    scheduler.init(db);
    scheduler.start();
    partitionManager.startScheduler();

    // 9. Start server
    const PORT = process.env.PORT || 4000;
    server.listen(PORT, '0.0.0.0', () => {
        const dbLabel = config.dbMode === DB_MODES.POSTGRESQL ? 'PostgreSQL (Prisma)' : 'SQLite (sql.js)';
        const redisLabel = redis ? '✅ Connected' : '⏭️  Skipped';
        console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   🛡️  TrustChecker v9.4.0 – Digital Trust Infrastructure    ║
║                                                              ║
║   🌐 HTTP Server:  http://localhost:${PORT}                   ║
║   🔌 WebSocket:    ws://localhost:${PORT}/ws                  ║
║   📊 Database:     ${dbLabel.padEnd(38)}║
║   📮 Redis:        ${redisLabel.padEnd(38)}║
║   🔧 Environment:  ${(config.env || 'development').padEnd(38)}║
║                                                              ║
║   Event-Driven | Edge-First | AI-Evolvable                   ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
    `);
    });

    // 10. Shutdown & process error handlers
    const { setupShutdown } = require('./boot/shutdown');
    setupShutdown(server, { db, redis, eventBus, partitionManager, waf, replicaManager });
}

const ready = boot().catch(err => {
    console.error('❌ Failed to boot TrustChecker:', err);
    process.exit(1);
});

module.exports = { app, server, ready };

// ═══════════════════════════════════════════════════════
// A-15: Graceful Shutdown Handler
// ═══════════════════════════════════════════════════════
const gracefulShutdown = (signal) => {
    console.log(`\n[SHUTDOWN] ${signal} received. Shutting down gracefully...`);
    // Stop accepting new connections
    if (global._httpServer) {
        global._httpServer.close(() => {
            console.log('[SHUTDOWN] HTTP server closed');
            // Close DB pool
            try {
                const db = require('./db');
                if (db._pool) db._pool.end().then(() => console.log('[SHUTDOWN] DB pool closed'));
            } catch(e) {}
            // Exit after cleanup
            setTimeout(() => process.exit(0), 1000);
        });
        // Force exit after 10s
        setTimeout(() => { console.log('[SHUTDOWN] Forced exit'); process.exit(1); }, 10000);
    } else {
        process.exit(0);
    }
};
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
