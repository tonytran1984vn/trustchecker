/**
 * Health Check v9.5.1 (A-11)
 * Shallow: GET /healthz → {status: ok}
 * Deep: GET /healthz?deep=true → {db, redis, memory, disk, uptime}
 */
const express = require('express');
const router = express.Router();
const os = require('os');
const db = require('../db');

const startTime = Date.now();

router.get('/', async (req, res) => {
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const mem = process.memoryUsage();

    // Shallow check (for load balancers)
    if (req.query.deep !== 'true') {
        return res.json({
            status: 'ok',
            uptime,
            timestamp: new Date().toISOString(),
            memory: { rss: Math.round(mem.rss / 1048576) + 'MB', heap: Math.round(mem.heapUsed / 1048576) + 'MB' },
            version: '9.5.1',
        });
    }

    // Deep check (for monitoring dashboards)
    const checks = {};

    // Database
    try {
        const start = Date.now();
        await db.get('SELECT 1 as ok');
        checks.database = { status: 'ok', latency_ms: Date.now() - start };
    } catch(e) {
        checks.database = { status: 'error', error: e.message };
    }

    // pg_stat_statements (slow queries)
    try {
        const slow = await db.all(
            "SELECT LEFT(query, 80) as query, calls, ROUND(mean_exec_time::numeric, 2) as avg_ms, ROUND(total_exec_time::numeric, 0) as total_ms " +
            "FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5"
        );
        checks.slow_queries = slow;
    } catch(e) {
        checks.slow_queries = { status: 'unavailable' };
    }

    // Table sizes (top 5)
    try {
        const sizes = await db.all(
            "SELECT relname as table_name, pg_size_pretty(pg_total_relation_size(relid)) as size " +
            "FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 5"
        );
        checks.table_sizes = sizes;
    } catch(e) {
        checks.table_sizes = { status: 'unavailable' };
    }

    // Connection pool
    try {
        const pool = await db.get("SELECT count(*) as active FROM pg_stat_activity WHERE state = 'active'");
        const total = await db.get("SELECT count(*) as total FROM pg_stat_activity");
        checks.connections = { active: pool?.active || 0, total: total?.total || 0 };
    } catch(e) {
        checks.connections = { status: 'unavailable' };
    }

    // System
    checks.system = {
        hostname: os.hostname(),
        platform: os.platform(),
        cpus: os.cpus().length,
        load_avg: os.loadavg().map(l => Math.round(l * 100) / 100),
        total_memory: Math.round(os.totalmem() / 1048576) + 'MB',
        free_memory: Math.round(os.freemem() / 1048576) + 'MB',
    };

    // Process
    checks.process = {
        pid: process.pid,
        uptime_seconds: uptime,
        node_version: process.version,
        rss: Math.round(mem.rss / 1048576) + 'MB',
        heap_used: Math.round(mem.heapUsed / 1048576) + 'MB',
        heap_total: Math.round(mem.heapTotal / 1048576) + 'MB',
    };

    const allOk = checks.database?.status === 'ok';
    res.status(allOk ? 200 : 503).json({
        status: allOk ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        checks,
    });
});


// Readiness probe (matches old healthz.js API)
router.get(/ready, async (req, res) => {
    try {
        await db.get("SELECT 1 as ok");
        res.json({ status: "ready", database: "connected" });
    } catch(e) {
        res.status(503).json({ status: "not_ready", error: e.message });
    }
});

module.exports = router;
