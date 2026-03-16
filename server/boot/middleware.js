const { dataClassification } = require('../security/data-classification');
/**
 * Boot: Middleware Setup
 * Applies security, observability, versioning, metering, and org middleware.
 * v9.4.2: Added global orgGuard for multi-tenant isolation on ALL /api/ routes.
 */

function setupMiddleware(app, redis) {
    const { securityHeaders, sanitizeRequest, requestLogger } = require('../middleware/security');
    const { apiMeteringMiddleware } = require('../middleware/usage-meter');
    const { orgMiddleware } = require('../middleware/org');
    const { apiVersionMiddleware } = require('../middleware/api-version');
    const { waf } = require('../middleware/waf');
    const { gateway: apiGateway } = require('../middleware/api-gateway-policy');

    // v9.2: Observability layer
    const { requestLoggerMiddleware } = require('../observability/logger');
    const { traceMiddleware } = require('../observability/tracer');
    const metrics = require('../observability/metrics');
    const slo = require('../observability/slo');

    // Trust proxy (Nginx reverse proxy) — so req.ip uses X-Forwarded-For
    app.set('trust proxy', 1);

    // v9.4: WAF first — block malicious requests early
    app.use(waf.middleware());
    app.use(securityHeaders);
    app.use(sanitizeRequest);
    app.use(requestLogger);

    // Observability (tracing + metrics + SLO)
    app.use(traceMiddleware);
    app.use(requestLoggerMiddleware);
    app.use(metrics.middleware);
    app.use(slo.sloMiddleware);

    // L3→L4 Hardening: Real metrics collection
    const { observabilityMiddleware } = require('../middleware/observability');
    app.use(observabilityMiddleware);

    // API-scoped middleware
    app.use('/api/', apiVersionMiddleware);
    app.use('/api/', apiMeteringMiddleware);
    app.use('/api/', apiGateway.middleware());
    app.use('/api/', orgMiddleware);

    // ─── v9.4.2: Global orgGuard — Multi-Tenant Isolation ────────────────────
    // This runs AFTER route-level authMiddleware sets req.user.
    // It ensures ALL /api/ routes have orgGuard applied — even those that
    // don't explicitly call orgGuard() in their route file.
    // Routes that DON'T need org scoping are skipped below.
    const { orgGuard } = require('../middleware/org-middleware');
    const _globalOrgGuard = orgGuard({ allowPlatform: true, loadScopes: false });
    app.use('/api/', (req, res, next) => {
        // Only apply if auth has already set req.user
        if (!req.user) return next();
        // Skip routes that already applied orgGuard (avoid double execution)
        if (req.orgId || req._orgGuardApplied) return next();
        // Skip paths that don't need org scoping
        const p = req.path;
        if (p.startsWith('/auth') || p.startsWith('/public') || p.startsWith('/docs') ||
            p === '/version' || p.startsWith('/billing/webhook')) {
            return next();
        }
        req._orgGuardApplied = true;
        return _globalOrgGuard(req, res, next);
    });

    return { waf, apiGateway, metrics, slo };
}

module.exports = { setupMiddleware };
