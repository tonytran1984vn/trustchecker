/**
 * Async Handler Wrapper — Node.js Best Practice
 * Catches unhandled promise rejections in Express route handlers
 * and forwards them to the centralized error handler.
 *
 * Usage:
 *   const { asyncHandler } = require('../middleware/asyncHandler');
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 *
 * Why:
 *   Express 4.x does NOT catch async errors automatically.
 *   Without this wrapper, unhandled rejections crash PM2 or get swallowed.
 */

function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}

module.exports = { asyncHandler };
