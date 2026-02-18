/**
 * TrustChecker v9.2 — API Versioning Middleware
 * ═══════════════════════════════════════════════════════════
 * URL-prefix based API versioning with backwards compatibility.
 *
 * Strategy:
 *   /api/v1/*  →  Versioned endpoint (canonical, recommended)
 *   /api/*     →  Legacy alias (maps internally to v1)
 *
 * Usage in index.js:
 *   const { apiVersionRouter, apiVersionMiddleware } = require('./middleware/api-version');
 *   app.use('/api/v1', apiVersionRouter);    // versioned prefix
 *   app.use(apiVersionMiddleware);            // adds version header
 */

const express = require('express');

// ─── Current API version ─────────────────────────────────────
const CURRENT_VERSION = 'v1';
const SUPPORTED_VERSIONS = ['v1'];
const DEPRECATION_DATE = null; // Set when v2 is released

/**
 * Middleware: Injects API version headers into responses.
 * Also handles Accept-Version header for header-based versioning.
 */
function apiVersionMiddleware(req, res, next) {
    // Determine version from URL or header
    const urlMatch = req.path.match(/^\/api\/(v\d+)\//);
    const headerVersion = req.headers['accept-version'];

    const version = urlMatch?.[1] || headerVersion || CURRENT_VERSION;

    // Validate version
    if (!SUPPORTED_VERSIONS.includes(version)) {
        return res.status(400).json({
            error: 'Unsupported API version',
            version,
            supported: SUPPORTED_VERSIONS,
            current: CURRENT_VERSION,
        });
    }

    // Inject metadata
    req.apiVersion = version;
    res.set('X-API-Version', version);
    res.set('X-API-Current', CURRENT_VERSION);

    // Add deprecation header if applicable
    if (DEPRECATION_DATE && !urlMatch) {
        res.set('Deprecation', DEPRECATION_DATE);
        res.set('Sunset', DEPRECATION_DATE);
        res.set('Link', `</api/${CURRENT_VERSION}${req.path.replace(/^\/api/, '')}>; rel="successor-version"`);
    }

    next();
}

/**
 * Create a versioned router that mounts all existing route handlers
 * under /api/v1/ prefix while keeping /api/ as a backwards-compatible alias.
 *
 * @param {express.Router[]} routeConfigs - Array of { path, router, middleware? }
 * @returns {{ v1Router: express.Router, legacyRouter: express.Router }}
 */
function createVersionedRouters(routeConfigs) {
    const v1Router = express.Router();
    const legacyRouter = express.Router();

    for (const config of routeConfigs) {
        const { path, router, middleware } = config;
        const handlers = middleware ? [middleware, router] : [router];
        v1Router.use(path, ...handlers);
        legacyRouter.use(path, ...handlers);
    }

    return { v1Router, legacyRouter };
}

/**
 * Version info endpoint handler.
 */
function versionInfoHandler(req, res) {
    res.json({
        current: CURRENT_VERSION,
        supported: SUPPORTED_VERSIONS,
        deprecation: DEPRECATION_DATE,
        endpoints: {
            versioned: `/api/${CURRENT_VERSION}/`,
            legacy: '/api/ (alias, will be deprecated with v2)',
        },
        documentation: '/api/docs',
    });
}

module.exports = {
    apiVersionMiddleware,
    createVersionedRouters,
    versionInfoHandler,
    CURRENT_VERSION,
    SUPPORTED_VERSIONS,
};
