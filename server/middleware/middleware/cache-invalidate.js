/**
 * v9.4.4: Auto Cache Invalidation Middleware
 * Automatically clears related caches on POST/PUT/PATCH/DELETE.
 *
 * Usage: router.post('/products', cacheInvalidate('products'), handler);
 */
const { clearCacheByPrefix } = require('../cache');

// Map of resource → cache prefixes to invalidate
const INVALIDATION_MAP = {
    'products':     ['/api/products', '/api/trust'],
    'incidents':    ['/api/ops', '/api/trust', '/api/risk'],
    'fraud':        ['/api/fraud', '/api/trust', '/api/risk'],
    'evidence':     ['/api/evidence', '/api/compliance'],
    'partners':     ['/api/scm/partners', '/api/trust'],
    'compliance':   ['/api/compliance', '/api/certifications'],
    'certifications': ['/api/certifications', '/api/compliance'],
    'users':        ['/api/admin', '/api/org-admin'],
    'risk':         ['/api/risk', '/api/trust', '/api/scm/models'],
    'billing':      ['/api/billing'],
};

function cacheInvalidate(resource) {
    return (req, res, next) => {
        // Only invalidate on mutations
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

        // Hook into res.json to invalidate AFTER successful response
        const originalJson = res.json.bind(res);
        res.json = function(data) {
            // Only invalidate on success (2xx)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                const prefixes = INVALIDATION_MAP[resource] || [`/api/${resource}`];
                const orgId = req.orgId;
                for (const prefix of prefixes) {
                    const key = orgId ? `${prefix}:${orgId}` : prefix;
                    clearCacheByPrefix(key).catch(() => {});
                }
            }
            return originalJson(data);
        };
        next();
    };
}

module.exports = { cacheInvalidate, INVALIDATION_MAP };
