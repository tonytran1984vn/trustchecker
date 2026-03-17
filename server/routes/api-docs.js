/**
 * API Documentation — Swagger UI via CDN + OpenAPI 3.0 Spec (Phase 6)
 *
 * GET /api/docs       → Swagger UI (interactive explorer)
 * GET /api/docs/spec  → Raw OpenAPI JSON
 *
 * Uses CDN-hosted Swagger UI — no npm dependencies needed.
 * ATK-10: Requires auth in production.
 */
const express = require("express");
const router = express.Router();
const SPEC = require("../lib/openapi-spec");

// Auth check in production
router.use((req, res, next) => {
    if (process.env.NODE_ENV === "production") {
        const auth = req.headers.authorization;
        if (!auth) {
            return res.status(401).json({ error: "Authentication required to access API docs" });
        }
    }
    next();
});

// GET /api/docs/spec — raw OpenAPI JSON
router.get("/spec", (req, res) => {
    res.json(SPEC);
});

// GET /api/docs — Swagger UI via CDN
router.get("/", (req, res) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>TrustChecker API Docs</title>
<link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui.css" />
<style>
body { margin:0; background:#0d1117; }
.swagger-ui .topbar { background:#0a0a1a !important; padding:10px 0; }
.swagger-ui .topbar-wrapper .link::after { content:"TrustChecker API"; color:#0ff; font-size:18px; margin-left:10px; }
.swagger-ui .info .title { color:#0ff !important; }
.swagger-ui .scheme-container { background:#161b22 !important; }
.swagger-ui .opblock-tag { color:#c9d1d9 !important; }
.swagger-ui .opblock-summary-description { color:#8b949e !important; }
#swagger-ui { max-width:1400px; margin:0 auto; }
</style>
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://unpkg.com/swagger-ui-dist@5.18.2/swagger-ui-bundle.js"></script>
<script>
SwaggerUIBundle({
    url: "/api/docs/spec",
    dom_id: "#swagger-ui",
    deepLinking: true,
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
    layout: "StandaloneLayout",
    requestInterceptor: function(req) {
        var token = localStorage.getItem("tc_token");
        if (token) req.headers["Authorization"] = "Bearer " + token;
        return req;
    }
});
</script>
</body></html>`);
});

module.exports = router;
