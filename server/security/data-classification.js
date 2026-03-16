/**
 * SOC2 CE-2: Data Classification Middleware
 * Tags API responses with data classification headers.
 * Classifications: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
 */
const CLASSIFICATION_MAP = {
    '/api/public': 'PUBLIC',
    '/api/docs': 'PUBLIC',
    '/api/products': 'CONFIDENTIAL',
    '/api/billing': 'RESTRICTED',
    '/api/platform': 'RESTRICTED',
    '/api/admin': 'RESTRICTED',
    '/api/org-admin': 'CONFIDENTIAL',
    '/api/compliance': 'CONFIDENTIAL',
    '/api/auth': 'RESTRICTED',
    '/api/kyc': 'RESTRICTED',
};

function dataClassification() {
    return (req, res, next) => {
        const path = req.path;
        let classification = 'INTERNAL'; // default
        for (const [prefix, level] of Object.entries(CLASSIFICATION_MAP)) {
            if (path.startsWith(prefix)) { classification = level; break; }
        }
        res.setHeader('X-Data-Classification', classification);
        res.setHeader('X-Content-Security', 'no-store, no-cache');
        if (classification === 'RESTRICTED') {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
        }
        next();
    };
}

module.exports = { dataClassification };
