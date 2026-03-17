/**
 * V1 Controllers — Barrel Export
 * Mounts all v1 domain controllers under /api/v1
 */
const express = require('express');
const router = express.Router();

const controllers = [
    { path: '/products', module: './products.controller' },
    { path: '/verification', module: './verification.controller' },
    { path: '/trust', module: './trust.controller' },
    { path: '/org', module: './org.controller' },
    { path: '/risk', module: './risk.controller' },
    { path: '/compliance', module: './compliance.controller' },
    { path: '/notifications', module: './notifications.controller' },
    { path: '/supply-chain', module: './supply-chain.controller' },
    { path: '/platform', module: './platform.controller' },
    { path: '/rbac', module: './rbac.controller' },
    { path: '/engines', module: './engines.controller' },
];

for (const ctrl of controllers) {
    try {
        router.use(ctrl.path, require(ctrl.module));
    } catch (e) {
        console.warn(`[v1] Failed to load controller ${ctrl.path}:`, e.message);
    }
}

module.exports = router;
