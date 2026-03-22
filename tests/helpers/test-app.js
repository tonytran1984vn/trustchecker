/**
 * Test App Factory — Creates Express app instances for supertest
 *
 * Usage:
 *   const { createTestApp } = require('../helpers/test-app');
 *   const app = createTestApp(routerUnderTest, { user: mockUser.admin() });
 */
const express = require('express');
const { mockAuthMiddleware } = require('./auth-mock');

/**
 * @param {express.Router} router - The route module to mount
 * @param {object} options
 * @param {object} options.user - User to inject via auth middleware
 * @param {string} options.basePath - Mount path (default: '/api')
 * @param {string} options.orgId - Org ID to inject via orgGuard
 */
function createTestApp(router, options = {}) {
    const app = express();
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Inject user if provided
    if (options.user) {
        app.use(mockAuthMiddleware(options.user));
    }

    // Inject orgId if provided
    if (options.orgId) {
        app.use((req, _res, next) => {
            req.orgId = options.orgId;
            req.tenantId = options.orgId;
            next();
        });
    }

    const basePath = options.basePath || '/api';
    app.use(basePath, router);

    // Error handler
    app.use((err, _req, res, _next) => {
        res.status(err.statusCode || 500).json({
            error: err.message || 'Internal server error',
            code: err.errorCode || 'INTERNAL_ERROR',
        });
    });

    return app;
}

module.exports = { createTestApp };
