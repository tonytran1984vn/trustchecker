/**
 * TrustChecker v9.2 — Partition Manager
 * ═══════════════════════════════════════════════════════════
 * Manages PostgreSQL time-based partitions:
 *   - Auto-create upcoming monthly partitions (3 months ahead)
 *   - Archive/drop old partitions (configurable retention)
 *   - Health check: verify current + next month exist
 *   - Scheduled daily maintenance
 *
 * Usage:
 *   const partitionManager = require('./partitions/partition-manager');
 *   await partitionManager.ensurePartitions();
 *   const health = await partitionManager.checkHealth();
 *   partitionManager.startScheduler(); // daily at 2 AM
 */

const PARTITIONED_TABLES = ['scan_events', 'audit_log', 'shipment_checkpoints'];
const MONTHS_AHEAD = 3;
const RETENTION_MONTHS = 12;

let _prisma = null;

function getPrisma() {
    if (!_prisma) {
        try {
            const { getDb } = require('../prisma-db');
            _prisma = getDb();
        } catch {
            return null;
        }
    }
    return _prisma;
}

/**
 * Ensure partitions exist for current + upcoming months.
 * @returns {Promise<{table: string, created: string[]}[]>}
 */
async function ensurePartitions() {
    const prisma = getPrisma();
    if (!prisma) {
        console.warn('[partition-manager] Database not available');
        return [];
    }

    const results = [];

    for (const table of PARTITIONED_TABLES) {
        try {
            const result = await prisma.$queryRawUnsafe(
                `SELECT create_monthly_partitions($1, $2)`,
                table,
                MONTHS_AHEAD
            );

            const created = result[0]?.create_monthly_partitions || [];
            if (created.length > 0) {
                console.info(`[partition-manager] Created ${created.length} partitions for ${table}: ${created.join(', ')}`);
            }

            results.push({ table, created });
        } catch (err) {
            console.error(`[partition-manager] Failed to create partitions for ${table}:`, err.message);
            results.push({ table, created: [], error: err.message });
        }
    }

    return results;
}

/**
 * Drop old partitions beyond retention period.
 * @returns {Promise<{table: string, dropped: string[]}[]>}
 */
async function dropOldPartitions() {
    const prisma = getPrisma();
    if (!prisma) return [];

    const results = [];

    for (const table of PARTITIONED_TABLES) {
        try {
            const result = await prisma.$queryRawUnsafe(
                `SELECT drop_old_partitions($1, $2)`,
                table,
                RETENTION_MONTHS
            );

            const dropped = result[0]?.drop_old_partitions || [];
            if (dropped.length > 0) {
                console.info(`[partition-manager] Dropped ${dropped.length} old partitions for ${table}: ${dropped.join(', ')}`);
            }

            results.push({ table, dropped });
        } catch (err) {
            console.error(`[partition-manager] Failed to drop partitions for ${table}:`, err.message);
            results.push({ table, dropped: [], error: err.message });
        }
    }

    return results;
}

/**
 * Check partition health — verify current and next month partitions exist.
 * @returns {Promise<object[]>}
 */
async function checkHealth() {
    const prisma = getPrisma();
    if (!prisma) {
        return PARTITIONED_TABLES.map(t => ({
            table_name: t,
            current_month_exists: false,
            next_month_exists: false,
            total_partitions: 0,
            status: 'unknown',
        }));
    }

    try {
        const results = await prisma.$queryRawUnsafe(`SELECT * FROM check_partition_health()`);
        return results.map(r => ({
            ...r,
            total_partitions: Number(r.total_partitions),
            status: r.current_month_exists && r.next_month_exists ? 'healthy' : 'needs_attention',
        }));
    } catch (err) {
        console.error('[partition-manager] Health check failed:', err.message);
        return PARTITIONED_TABLES.map(t => ({
            table_name: t,
            current_month_exists: false,
            next_month_exists: false,
            total_partitions: 0,
            status: 'error',
            error: err.message,
        }));
    }
}

/**
 * Run full maintenance cycle.
 */
async function runMaintenance() {
    console.info('[partition-manager] Starting maintenance cycle...');

    const created = await ensurePartitions();
    const dropped = await dropOldPartitions();
    const health = await checkHealth();

    const summary = {
        timestamp: new Date().toISOString(),
        created: created.filter(r => r.created.length > 0),
        dropped: dropped.filter(r => r.dropped.length > 0),
        health,
    };

    console.info(`[partition-manager] Maintenance complete. Health: ${health.every(h => h.status === 'healthy') ? '✅ All healthy' : '⚠️ Issues found'
        }`);

    return summary;
}

// ─── Scheduler ───────────────────────────────────────────────
let _schedulerInterval = null;

function startScheduler(intervalMs = 24 * 60 * 60 * 1000) { // default: daily
    if (_schedulerInterval) return;

    // Run immediately on start
    runMaintenance().catch(err => {
        console.error('[partition-manager] Initial maintenance failed:', err.message);
    });

    // Schedule recurring
    _schedulerInterval = setInterval(() => {
        runMaintenance().catch(err => {
            console.error('[partition-manager] Scheduled maintenance failed:', err.message);
        });
    }, intervalMs);
    if (_schedulerInterval.unref) _schedulerInterval.unref();

    console.info(`[partition-manager] Scheduler started (interval: ${Math.round(intervalMs / 3600000)}h)`);
}

function stopScheduler() {
    if (_schedulerInterval) {
        clearInterval(_schedulerInterval);
        _schedulerInterval = null;
        console.info('[partition-manager] Scheduler stopped');
    }
}

module.exports = {
    PARTITIONED_TABLES,
    ensurePartitions,
    dropOldPartitions,
    checkHealth,
    runMaintenance,
    startScheduler,
    stopScheduler,
};
