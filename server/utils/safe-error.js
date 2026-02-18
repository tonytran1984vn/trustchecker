/**
 * Safe Error Response Utility
 * Never expose raw e.message to API consumers — prevents
 * information leakage of internal DB errors, file paths, etc.
 */

/**
 * Send a safe error response to the client.
 * Logs the full error server-side for debugging.
 *
 * @param {object} res - Express response
 * @param {string} publicMessage - Safe message for the client
 * @param {Error} err - The actual error (logged, never sent)
 * @param {number} [statusCode=500] - HTTP status
 */
function safeError(res, publicMessage, err, statusCode = 500) {
    if (err) {
        console.error(`[SafeError] ${publicMessage}:`, err.message || err);
    }
    return res.status(statusCode).json({ error: publicMessage });
}

module.exports = { safeError };
