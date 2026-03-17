/**
 * V1 Controllers — Barrel Export (with rate limiting)
 * Mounts all v1 domain controllers under /api/v1
 */
const express = require("express");
const router = express.Router();
const { rateLimiter } = require("../../middleware/rateLimiter");

// ── Per-domain rate limits ──────────────────────────────────────────────────
const v1ReadLimit = rateLimiter.middleware({ windowMs: 60000, max: 120, keyGenerator: "combined", message: "V1 API read limit (120/min)" });
const v1WriteLimit = rateLimiter.middleware({ windowMs: 60000, max: 30, keyGenerator: "combined", message: "V1 API write limit (30/min)" });
const v1AdminLimit = rateLimiter.middleware({ windowMs: 60000, max: 20, keyGenerator: "combined", message: "V1 admin limit (20/min)" });

// Apply read limit globally to all GET requests
router.get("*", v1ReadLimit);
// Apply write limit to all mutations
router.post("*", v1WriteLimit);
router.put("*", v1WriteLimit);
router.delete("*", v1WriteLimit);

const controllers = [
    { path: "/products", module: "./products.controller" },
    { path: "/verification", module: "./verification.controller" },
    { path: "/trust", module: "./trust.controller" },
    { path: "/org", module: "./org.controller" },
    { path: "/risk", module: "./risk.controller" },
    { path: "/compliance", module: "./compliance.controller" },
    { path: "/notifications", module: "./notifications.controller" },
    { path: "/supply-chain", module: "./supply-chain.controller" },
    { path: "/platform", module: "./platform.controller" },
    { path: "/rbac", module: "./rbac.controller" },
    { path: "/engines", module: "./engines.controller" },
    { path: "/api-keys", module: "./api-keys.controller" },
];

for (const ctrl of controllers) {
    try {
        router.use(ctrl.path, require(ctrl.module));
    } catch (e) {
        console.warn("[v1] Failed to load controller " + ctrl.path + ":", e.message);
    }
}

module.exports = router;
