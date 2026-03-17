/**
 * v9.5.0: API Versioning Middleware
 * Sets API version header on responses
 */
const API_VERSION = "1.0.0";

function apiVersionMiddleware(req, res, next) {
    res.setHeader("X-API-Version", API_VERSION);
    next();
}

function versionInfoHandler(req, res) {
    res.json({
        api_version: API_VERSION,
        platform: "TrustChecker",
        edition: "Enterprise",
        build: "9.5.0"
    });
}

module.exports = { apiVersionMiddleware, apiVersion: API_VERSION, versionInfoHandler };
