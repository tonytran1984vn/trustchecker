/**
 * Error response helper — sanitizes error messages in production.
 * BUG-06 fix: prevents internal error details from leaking to clients.
 *
 * Usage in route handlers:
 *   const { safeError } = require('../utils/errors');
 *   catch (e) { safeError(res, e, 'Operation failed'); }
 */

function safeError(res, err, fallbackMessage = 'Internal server error', statusCode = 500) {
    console.error(`⚠️ ${fallbackMessage}:`, err.message || err);

    const message = process.env.NODE_ENV === 'production'
        ? fallbackMessage
        : err.message || fallbackMessage;

    res.status(statusCode).json({ error: message });
}

module.exports = { safeError };
