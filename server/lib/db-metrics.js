/**
 * Database Pool Metrics
 * Exposes PG pool stats for monitoring.
 */
let db;
try { db = require('../db'); } catch(e) {}

function getPoolMetrics() {
    if (!db?._pool) return { available: false };
    const pool = db._pool;
    return {
        totalCount: pool.totalCount,       // Total connections created
        idleCount: pool.idleCount,         // Idle connections
        waitingCount: pool.waitingCount,   // Queries waiting for connection
        maxConnections: pool.options?.max || 50,
        utilization: pool.totalCount > 0
            ? Math.round((pool.totalCount - pool.idleCount) / pool.totalCount * 100) + '%'
            : '0%',
    };
}

module.exports = { getPoolMetrics };
