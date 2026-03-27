/**
 * Dual-Write Retry Worker — Phase 1 Trust Infrastructure Migration
 *
 * Background worker that retries failed dual-writes from the dead-letter queue.
 * Polls dual_write_failures every 60 seconds, processes up to 100 records per tick.
 * Max 5 retries per record before marking as permanently failed.
 *
 * Start: called from index.js on app boot.
 * Stop: call stop() on graceful shutdown.
 *
 * @module lib/dual-write-worker
 */
const logger = require('./logger');
const db = require('../db');
const { dualWriteProduct, dualWriteQR, dualWriteBatch, isDualWriteEnabled } = require('./dual-write');

const MAX_RETRIES = 5;
const POLL_INTERVAL_MS = 60_000; // 1 minute
const BATCH_SIZE = 100;

let _intervalId = null;
let _isProcessing = false;

// ─── Stats ───────────────────────────────────────────────────────
const workerStats = {
    totalProcessed: 0,
    totalSuccess: 0,
    totalFailed: 0,
    lastRunAt: null,
};

/**
 * Replay a single failed write based on its type and payload.
 */
async function replay(writeType, payload) {
    switch (writeType) {
        case 'product':
            await dualWriteProduct(payload);
            break;
        case 'qr':
            await dualWriteQR(payload);
            break;
        case 'batch':
            await dualWriteBatch(payload);
            break;
        default:
            throw new Error(`Unknown write_type: ${writeType}`);
    }
}

/**
 * Process one tick: fetch and retry failed writes.
 */
async function processTick() {
    if (_isProcessing || !isDualWriteEnabled()) return;
    _isProcessing = true;

    try {
        const rows = await db.all(
            `SELECT * FROM dual_write_failures
             WHERE resolved = false AND retry_count < $1
             ORDER BY created_at ASC
             LIMIT $2`,
            [MAX_RETRIES, BATCH_SIZE]
        );

        if (rows.length === 0) {
            _isProcessing = false;
            workerStats.lastRunAt = new Date().toISOString();
            return;
        }

        logger.info(`[DualWriteWorker] Processing ${rows.length} failed writes`);

        for (const row of rows) {
            workerStats.totalProcessed++;

            try {
                const payload = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;
                await replay(row.write_type, payload);

                // Success → mark resolved
                await db.run(`UPDATE dual_write_failures SET resolved = true, last_retry_at = NOW() WHERE id = $1`, [
                    row.id,
                ]);
                workerStats.totalSuccess++;
                logger.info('[DualWriteWorker] Retry SUCCESS', { id: row.id, type: row.write_type });
            } catch (err) {
                // Increment retry count
                await db.run(
                    `UPDATE dual_write_failures SET retry_count = retry_count + 1, last_retry_at = NOW(), error = $1 WHERE id = $2`,
                    [(err?.message || '').slice(0, 2000), row.id]
                );
                workerStats.totalFailed++;

                if ((row.retry_count || 0) + 1 >= MAX_RETRIES) {
                    logger.error('[DualWriteWorker] MAX RETRIES reached — manual intervention required', {
                        id: row.id,
                        type: row.write_type,
                        retries: (row.retry_count || 0) + 1,
                    });
                }
            }
        }
    } catch (err) {
        logger.error('[DualWriteWorker] Tick error', { error: err.message });
    } finally {
        _isProcessing = false;
        workerStats.lastRunAt = new Date().toISOString();
    }
}

/**
 * Start the background retry worker.
 */
function start() {
    if (_intervalId) return; // Already running

    logger.info('[DualWriteWorker] Started (poll every 60s, max retries: 5)');
    _intervalId = setInterval(processTick, POLL_INTERVAL_MS);

    // Run once immediately after 5s delay (let DB warm up)
    setTimeout(processTick, 5000);
}

/**
 * Stop the background retry worker.
 */
function stop() {
    if (_intervalId) {
        clearInterval(_intervalId);
        _intervalId = null;
        logger.info('[DualWriteWorker] Stopped');
    }
}

function getStats() {
    return { ...workerStats, isRunning: !!_intervalId, isProcessing: _isProcessing };
}

module.exports = { start, stop, getStats, processTick };
