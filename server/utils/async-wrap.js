/**
 * TrustChecker — Async Handler Wrapper for Express 4.x
 *
 * Express 4 does not catch rejections from async route handlers.
 * This wrapper catches errors and passes them to Express error middleware.
 *
 * Usage:
 *   const { asyncHandler } = require('../utils/async-wrap');
 *   router.get('/foo', asyncHandler(async (req, res) => { ... }));
 */

function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = { asyncHandler };
