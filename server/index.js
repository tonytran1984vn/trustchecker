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
warnDefaultSecrets();

const app = express();
const server = http.createServer(app);

// ─── Core Middleware ─────────────────────────────────────────────────────────

// CORS — restrict to known origins
const ALLOWED_ORIGINS = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:4000', 'http://localhost:3000', 'http://127.0.0.1:4000'];
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
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400
}));

// Helmet — security headers with proper CSP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],  // Allow inline event handlers (onclick, onkeydown)
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "ws:", "wss:"],
            objectSrc: ["'none'"],
            frameAncestors: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true }
}));
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Prometheus Metrics
const { metricsMiddleware, metricsHandler } = require('./metrics');
app.use(metricsMiddleware);
app.get('/metrics', metricsHandler);

const isTest = process.env.NODE_ENV === 'test';

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTest ? 10000 : 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', apiLimiter);

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: isTest ? 1000 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many auth attempts. Try again in 15 minutes' },
    skipSuccessfulRequests: true
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ─── Boot Sequence ───────────────────────────────────────────────────────────
async function boot() {
    // 1. Database initialization
    await db._readyPromise;
    console.log(`✅ Database initialized (${config.dbMode})`);

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
    const wss = new WebSocketServer({ server, path: '/ws' });
    const { eventBus } = require('./events');
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'trustchecker-secret-change-me';

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
    const scheduler = require('./engines/scheduler');
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

boot().catch(err => {
    console.error('❌ Failed to boot TrustChecker:', err);
    process.exit(1);
});

module.exports = { app, server };
