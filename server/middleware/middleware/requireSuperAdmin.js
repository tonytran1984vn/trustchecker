/**
 * requireSuperAdmin — Middleware that restricts access to super_admin role only.
 * Used for platform-level operations: pricing management, org creation, KYC delegation.
 */
const { ROLE_HIERARCHY } = require('../auth/core');

function requireSuperAdmin() {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({
                error: 'Super Admin access required',
                code: 'SUPER_ADMIN_ONLY'
            });
        }
        next();
    };
}

module.exports = requireSuperAdmin;
