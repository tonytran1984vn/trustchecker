/**
 * QR Code Generation — Background Job Worker
 * Processes large QR generation jobs (>500 codes) in batches.
 * Uses PostgreSQL as job queue — no Redis needed.
 */
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');

const BATCH_SIZE = 500;
const POLL_INTERVAL_MS = 5000;
let isProcessing = false;

// ── Auto-create table (uses raw pool to bypass SQL translator's DDL skip) ────
async function ensureTable() {
    try {
        // db.exec() is a no-op and _translateSQL skips CREATE TABLE,
        // so we use the raw pg pool directly.
        const pool = db._pool;
        if (!pool) {
            logger.warn('[QR-Worker] DB pool not available yet, will retry');
            return;
        }
        await pool.query(`
            CREATE TABLE IF NOT EXISTS qr_generation_jobs (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                product_name TEXT DEFAULT '',
                product_sku TEXT DEFAULT '',
                quantity INTEGER NOT NULL DEFAULT 1,
                status TEXT DEFAULT 'pending',
                progress REAL DEFAULT 0,
                generated_count INTEGER DEFAULT 0,
                batch_timestamp BIGINT,
                error_message TEXT,
                org_id TEXT,
                created_by TEXT,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        logger.info('[QR-Worker] Table qr_generation_jobs ready');
    } catch (e) {
        if (!e.message?.includes('already exists')) {
            logger.error('[QR-Worker] Table creation error:', e.message);
        }
    }
}

// ── Create a new job ─────────────────────────────────────────────────────────
async function createJob({ product_id, product_name, product_sku, quantity, org_id, created_by }) {
    const id = uuidv4();
    await db.run(
        `INSERT INTO qr_generation_jobs (id, product_id, product_name, product_sku, quantity, status, org_id, created_by)
         VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)`,
        [id, product_id, product_name || '', product_sku || '', quantity, org_id || null, created_by || 'system']
    );
    return id;
}

// ── Get job status ───────────────────────────────────────────────────────────
async function getJob(jobId) {
    return db.get('SELECT * FROM qr_generation_jobs WHERE id = ?', [jobId]);
}

// ── List jobs for a user/org ─────────────────────────────────────────────────
async function listJobs(orgId, limit = 20) {
    if (orgId) {
        return db.all('SELECT * FROM qr_generation_jobs WHERE org_id = ? ORDER BY created_at DESC LIMIT ?', [
            orgId,
            limit,
        ]);
    }
    return db.all('SELECT * FROM qr_generation_jobs ORDER BY created_at DESC LIMIT ?', [limit]);
}

// ── Process one batch (500 codes) ────────────────────────────────────────────
async function processBatch(job, batchStart) {
    const batchEnd = Math.min(batchStart + BATCH_SIZE, job.quantity);
    const batchTimestamp = job.batch_timestamp || Date.now();
    const baseUrl = process.env.PUBLIC_URL || 'https://tonytran.work/trustchecker';
    const product_id = job.product_id;
    const sku = job.product_sku || 'QR';

    let insertedCount = 0;

    for (let i = batchStart; i < batchEnd; i++) {
        const serialCode = `TC:${product_id}:${sku}:${String(i + 1).padStart(5, '0')}:${batchTimestamp}`;
        const qrData = `${baseUrl}/check?code=${encodeURIComponent(serialCode)}`;
        const qrId = uuidv4();

        try {
            await db.run(
                `INSERT INTO qr_codes (id, product_id, qr_data, org_id, generated_by, generated_at)
                 VALUES (?, ?, ?, ?, ?, NOW())`,
                [qrId, product_id, qrData, job.org_id || null, job.created_by || 'system']
            );
            insertedCount++;
        } catch (e) {
            // Skip duplicates
            continue;
        }
    }

    return insertedCount;
}

// ── Main worker loop ─────────────────────────────────────────────────────────
async function processNextJob() {
    if (isProcessing) return;
    isProcessing = true;

    try {
        // Pick the first pending job
        const job = await db.get(
            "SELECT * FROM qr_generation_jobs WHERE status = 'pending' ORDER BY created_at ASC LIMIT 1"
        );

        if (!job) {
            isProcessing = false;
            return;
        }

        // Mark as processing
        const batchTimestamp = Date.now();
        await db.run(
            "UPDATE qr_generation_jobs SET status = 'processing', started_at = NOW(), batch_timestamp = ? WHERE id = ?",
            [batchTimestamp, job.id]
        );
        job.batch_timestamp = batchTimestamp;

        logger.info(`[QR-Worker] Starting job ${job.id}: ${job.quantity} codes for ${job.product_name}`);

        let totalGenerated = 0;
        const totalBatches = Math.ceil(job.quantity / BATCH_SIZE);

        for (let batch = 0; batch < totalBatches; batch++) {
            const batchStart = batch * BATCH_SIZE;

            try {
                const count = await processBatch(job, batchStart);
                totalGenerated += count;

                // Update progress
                const progress = Math.round(((batch + 1) / totalBatches) * 100);
                await db.run('UPDATE qr_generation_jobs SET progress = ?, generated_count = ? WHERE id = ?', [
                    Math.min(progress, 99),
                    totalGenerated,
                    job.id,
                ]);

                logger.info(
                    `[QR-Worker] Job ${job.id}: batch ${batch + 1}/${totalBatches} (${totalGenerated}/${job.quantity})`
                );
            } catch (batchErr) {
                logger.error(`[QR-Worker] Batch ${batch} failed:`, batchErr.message);
                await db.run(
                    "UPDATE qr_generation_jobs SET status = 'failed', error_message = ?, generated_count = ? WHERE id = ?",
                    [`Batch ${batch + 1} failed: ${batchErr.message}`, totalGenerated, job.id]
                );
                isProcessing = false;
                return;
            }
        }

        // Mark completed
        await db.run(
            "UPDATE qr_generation_jobs SET status = 'completed', progress = 100, generated_count = ?, completed_at = NOW() WHERE id = ?",
            [totalGenerated, job.id]
        );

        logger.info(`[QR-Worker] Job ${job.id} COMPLETED: ${totalGenerated} codes generated`);
    } catch (err) {
        logger.error('[QR-Worker] Error:', err.message);
    }

    isProcessing = false;
}

// ── Start worker ─────────────────────────────────────────────────────────────
let workerInterval = null;

function start() {
    ensureTable().then(() => {
        logger.info('[QR-Worker] Started — polling every 5s');
        workerInterval = setInterval(processNextJob, POLL_INTERVAL_MS);
    });
}

function stop() {
    if (workerInterval) {
        clearInterval(workerInterval);
        workerInterval = null;
    }
}

module.exports = { start, stop, createJob, getJob, listJobs };
