/**
 * Session Timeout v9.5.1
 * Enforce idle timeout based on last activity tracking.
 * Regular users: 24h. Platform admins: 15 minutes.
 * S-08 FIX: Track actual last-activity via session store, not just JWT iat.
 */
const sessionActivity = new Map(); // userId → lastActivity timestamp
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Clean every 5 min

// Periodic cleanup of stale entries
setInterval(() => {
    const cutoff = Date.now() - 25 * 60 * 60 * 1000; // 25h
    for (const [key, ts] of sessionActivity) {
        if (ts < cutoff) sessionActivity.delete(key);
    }
}, CLEANUP_INTERVAL).unref();

function sessionTimeout() {
    return (req, res, next) => {
        if (!req.user) return next();

        const userId = req.user.id || req.user.sub;
        const isPlatform = req.user.user_type === 'platform' || req.user.role === 'super_admin';
        const maxIdleMs = isPlatform ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;

        const lastActivity = sessionActivity.get(userId) || (req.user.iat ? req.user.iat * 1000 : 0);
        const idleMs = Date.now() - lastActivity;

        if (idleMs > maxIdleMs) {
            sessionActivity.delete(userId);
            return res.status(401).json({
                error: 'Session expired',
                code: 'SESSION_TIMEOUT',
                message: isPlatform
                    ? 'Platform admin sessions expire after 15 minutes of inactivity'
                    : 'Session expired, please login again'
            });
        }

        // Update last activity on every request
        sessionActivity.set(userId, Date.now());
        next();
    };
}

module.exports = { sessionTimeout };
