/**
 * Session Timeout v9.4.3
 * Enforce idle timeout for platform admin sessions.
 * Regular users: 24h. Platform admins: 15 minutes.
 */
function sessionTimeout() {
    return (req, res, next) => {
        if (!req.user) return next();

        const isPlatform = req.user.user_type === 'platform' || req.user.role === 'super_admin';
        const maxIdleMs = isPlatform ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000;

        // Check JWT issued-at time
        const issuedAt = req.user.iat ? req.user.iat * 1000 : 0;
        const elapsed = Date.now() - issuedAt;

        if (elapsed > maxIdleMs) {
            return res.status(401).json({
                error: 'Session expired',
                code: 'SESSION_TIMEOUT',
                message: isPlatform
                    ? 'Platform admin sessions expire after 15 minutes of inactivity'
                    : 'Session expired, please login again'
            });
        }
        next();
    };
}

module.exports = { sessionTimeout };
