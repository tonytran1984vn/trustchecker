/**
 * Response Wrapper Middleware v1.0 (Phase 4)
 *
 * Patches res.json() to automatically wrap old route responses
 * into the unified { data, meta, errors } format.
 *
 * ONLY wraps responses that are NOT already in the unified format.
 * V1 controllers already use lib/response.js — they are untouched.
 *
 * Detection logic:
 *   if body has { data } + { meta } keys → already unified, pass through
 *   if body has { error } key → wrap as error response
 *   else → wrap body as { data: body, meta: {...} }
 */

// Paths that should NOT be wrapped (health checks, public, static)
const SKIP_PATHS = ['/healthz', '/api/public', '/api/docs', '/socket.io', '/favicon'];

function responseWrapper() {
    return (req, res, next) => {
        // Skip non-API paths and already-versioned v1 paths
        if (SKIP_PATHS.some(p => req.path.startsWith(p))) return next();
        if (req.path.startsWith('/api/v1/')) return next();

        // Save original res.json
        const originalJson = res.json.bind(res);

        res.json = function (body) {
            // Skip if body is null/undefined or not an object
            if (!body || typeof body !== 'object') {
                return originalJson(body);
            }

            // Already in unified format — pass through
            if (body.data !== undefined && body.meta !== undefined) {
                return originalJson(body);
            }

            // Error response { error: "..." }
            if (body.error) {
                return originalJson({
                    data: null,
                    errors: [
                        {
                            code: body.code || 'ERROR',
                            message: body.error,
                            ...(body.details ? { details: body.details } : {}),
                        },
                    ],
                    meta: {
                        timestamp: new Date().toISOString(),
                        path: req.path,
                        api_version: req.apiVersion || 1,
                    },
                });
            }

            // Standard success — determine data key
            // Common patterns: { products: [...], total: N }, { user: {...} }, { token: "..." }
            const keys = Object.keys(body);

            // If only one primary key + optional pagination keys → use that as data
            const paginationKeys = ['total', 'count', 'page', 'offset', 'limit', 'totalPages', 'hasMore'];
            const dataKeys = keys.filter(k => !paginationKeys.includes(k));

            let data, meta;

            if (dataKeys.length === 1) {
                // Single data key: { products: [...], total: 42 } → data = products, meta includes total
                data = body[dataKeys[0]];
                meta = {};
                for (const pk of paginationKeys) {
                    if (body[pk] !== undefined) meta[pk] = body[pk];
                }
                meta._originalKey = dataKeys[0];
            } else {
                // Multiple keys or complex object — wrap entire body
                data = body;
                meta = {};
            }

            return originalJson({
                data,
                meta: {
                    ...meta,
                    timestamp: new Date().toISOString(),
                    path: req.path,
                    api_version: req.apiVersion || 1,
                },
            });
        };

        next();
    };
}

module.exports = { responseWrapper };
