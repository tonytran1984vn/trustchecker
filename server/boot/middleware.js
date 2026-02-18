/**
 * Boot: Middleware Setup
 * Applies security, observability, versioning, metering, and tenant middleware.
 */

function setupMiddleware(app, redis) {
    const { securityHeaders, sanitizeRequest, requestLogger } = require('../middleware/security');
    const { apiMeteringMiddleware } = require('../middleware/usage-meter');
    const { tenantMiddleware } = require('../middleware/tenant');
    const { apiVersionMiddleware } = require('../middleware/api-version');
    const { waf } = require('../middleware/waf');
    const { gateway: apiGateway } = require('../middleware/api-gateway-policy');

    // v9.2: Observability layer
    const { requestLoggerMiddleware } = require('../observability/logger');
    const { traceMiddleware } = require('../observability/tracer');
    const metrics = require('../observability/metrics');
    const slo = require('../observability/slo');

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

    // API-scoped middleware
    app.use('/api/', apiVersionMiddleware);
    app.use('/api/', apiMeteringMiddleware);
    app.use('/api/', apiGateway.middleware());
    app.use('/api/', tenantMiddleware);

    return { waf, apiGateway, metrics, slo };
}

module.exports = { setupMiddleware };
