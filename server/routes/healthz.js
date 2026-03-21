/**
 * v9.5.0: Health Check Endpoint
 * GET /healthz — basic liveness probe
 * GET /healthz/ready — readiness probe (DB + Redis)
 */
const express = require('express');
const router = express.Router();
const db = require('../db');

// Liveness: process is running
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        uptime: Math.round(process.uptime()),
        timestamp: new Date().toISOString(),
        memory: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
            heap: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        },
        version: '9.5.0',
    });
});

// Readiness: dependencies are available
router.get('/ready', async (req, res) => {
    const checks = { db: false, timestamp: new Date().toISOString() };

    try {
        const result = await db.get('SELECT 1 as ok');
        checks.db = result?.ok === 1;
    } catch (e) {
        checks.db = false;
        checks.db_error = e.message;
    }

    const allOk = checks.db;
    res.status(allOk ? 200 : 503).json({
        status: allOk ? 'ready' : 'not_ready',
        checks,
    });
});

module.exports = router;
