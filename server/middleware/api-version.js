/**
 * API Version Middleware v2.0
 * Supports both URL-based and header-based versioning.
 *
 * URL:    /api/v1/products, /api/v2/products
 * Header: Accept: application/vnd.trustchecker.v1+json
 *
 * Adds req.apiVersion (number) and deprecation headers for legacy calls.
 */

const CURRENT_VERSION = 1;
const SUPPORTED_VERSIONS = [1];
const SUNSET_DATE = null; // Set when deprecating a version

function apiVersionMiddleware() {
    return (req, res, next) => {
        let version = null;

        // 1. URL-based: /api/v1/...
        const urlMatch = req.path.match(/^\/api\/v(\d+)\//);
        if (urlMatch) {
            version = parseInt(urlMatch[1], 10);
        }

        // 2. Header-based: Accept: application/vnd.trustchecker.v1+json
        if (!version) {
            const accept = req.headers['accept'] || '';
            const headerMatch = accept.match(/application\/vnd\.trustchecker\.v(\d+)\+json/);
            if (headerMatch) {
                version = parseInt(headerMatch[1], 10);
            }
        }

        // 3. X-API-Version header (simple)
        if (!version && req.headers['x-api-version']) {
            version = parseInt(req.headers['x-api-version'], 10);
        }

        // Default to current version
        if (!version) version = CURRENT_VERSION;

        // Validate version
        if (!SUPPORTED_VERSIONS.includes(version)) {
            return res.status(400).json({
                error: 'Unsupported API version',
                supported: SUPPORTED_VERSIONS,
                current: CURRENT_VERSION,
            });
        }

        // Set on request
        req.apiVersion = version;

        // Deprecation headers for legacy /api/ calls (without version)
        if (!urlMatch && !req.headers['x-api-version']) {
            res.setHeader('Deprecation', 'true');
            res.setHeader('Link', '</api/v1>; rel="successor-version"');
            if (SUNSET_DATE) res.setHeader('Sunset', SUNSET_DATE);
        }

        // Version in response
        res.setHeader('X-API-Version', version);

        next();
    };
}

// Version info endpoint handler (backward compat with boot/routes.js)
function versionInfoHandler(req, res) {
    res.json({
        api_version: CURRENT_VERSION + '.0.0',
        platform: 'TrustChecker',
        edition: 'Enterprise',
        build: '9.5.1',
        supported_versions: SUPPORTED_VERSIONS,
        versioning: {
            url: '/api/v1/...',
            header: 'Accept: application/vnd.trustchecker.v1+json',
            simple: 'X-API-Version: 1',
        },
    });
}

module.exports = { apiVersionMiddleware, versionInfoHandler, CURRENT_VERSION, SUPPORTED_VERSIONS };
