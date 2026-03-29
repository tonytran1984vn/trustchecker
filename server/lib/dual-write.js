/**
 * Dual-Write Library — Phase 1 Trust Infrastructure Migration
 *
 * Writes to BOTH legacy and new-schema tables inside a SINGLE transaction.
 * Uses existing withTransaction() for strong consistency (same DB).
 *
 * Feature flag: DUAL_WRITE_ENABLED (default: true)
 * Rollback: set DUAL_WRITE_ENABLED=false → only legacy writes execute.
 *
 * @module lib/dual-write
 */
const { v4: uuidv4 } = require('uuid');
const logger = require('./logger');
const db = require('../db');
const { withTransaction } = require('../middleware/transaction');

// ─── Feature Flag ────────────────────────────────────────────────
const isDualWriteEnabled = () => (process.env.DUAL_WRITE_ENABLED || 'true').toLowerCase() !== 'false';

// ─── Failure Logger (Dead-Letter Queue) ─────────────────────────
async function logDualWriteFailure(writeType, payload, error, idempotencyKey) {
    try {
        await db.run(
            `INSERT INTO dual_write_failures (id, write_type, idempotency_key, payload, error)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [
                'dwf_' + uuidv4().replace(/-/g, '').slice(0, 20),
                writeType,
                idempotencyKey || null,
                JSON.stringify(payload),
                (error?.message || String(error)).slice(0, 2000),
            ]
        );
    } catch (logErr) {
        logger.error('[DualWrite] Failed to log failure to DLQ', {
            writeType,
            originalError: error?.message,
            logError: logErr.message,
        });
    }
}

// ─── Stats (for monitoring endpoint) ────────────────────────────
const stats = {
    product_success: 0,
    product_skip: 0,
    product_fail: 0,
    qr_success: 0,
    qr_skip: 0,
    qr_fail: 0,
    batch_success: 0,
    batch_skip: 0,
    batch_fail: 0,
};

function getStats() {
    return { ...stats, enabled: isDualWriteEnabled() };
}

// ═════════════════════════════════════════════════════════════════
// PRODUCT DUAL-WRITE
// Legacy: products → New: product_definitions + product_catalogs
// ═════════════════════════════════════════════════════════════════

/**
 * Dual-write product creation.
 * Called AFTER the legacy INSERT succeeds (within same transaction).
 *
 * @param {object} tx - Transaction client from withTransaction
 * @param {object} data - { id, name, orgId, sku, category, description, origin_country, manufacturer }
 */
async function dualWriteProductInTx(tx, data) {
    if (!isDualWriteEnabled()) {
        stats.product_skip++;
        return;
    }

    const { id, name, orgId, sku, category, description, origin_country, manufacturer, product_capabilities } = data;
    const defaultCaps = JSON.stringify({
        can_buy: true,
        can_sell: true,
        can_manufacture: false,
        can_consume: true,
        can_stock: true,
        can_transfer: true,
    });
    const capsJson = product_capabilities ? JSON.stringify(product_capabilities) : defaultCaps;

    // 1. product_definitions (idempotent via ON CONFLICT)
    await tx.run(
        `INSERT INTO product_definitions (id, name, brand_org_id, category, description, origin_country, status, product_capabilities, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [id, name, orgId || 'UNKNOWN_ORG', category || '', description || '', origin_country || '', capsJson]
    );

    // 2. product_catalogs (deterministic ID for idempotency)
    const catalogId = id + '_catalog';
    await tx.run(
        `INSERT INTO product_catalogs (id, org_id, product_definition_id, sku, status, product_capabilities, created_at)
         VALUES ($1, $2, $3, $4, 'active', $5, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [catalogId, orgId || 'UNKNOWN_ORG', id, sku || '', capsJson]
    );

    stats.product_success++;
    logger.info('[DualWrite] Product synced', { productId: id });
}

/**
 * Standalone dual-write for product (wraps in its own transaction).
 * Used when the caller doesn't already have a transaction open.
 */
async function dualWriteProduct(data) {
    if (!isDualWriteEnabled()) {
        stats.product_skip++;
        return;
    }

    try {
        await withTransaction(db, async tx => {
            await dualWriteProductInTx(tx, data);
        });
    } catch (err) {
        stats.product_fail++;
        logger.error('[DualWrite] Product sync FAILED → DLQ', { productId: data.id, error: err.message });
        await logDualWriteFailure('product', data, err);
    }
}

// ═════════════════════════════════════════════════════════════════
// QR CODE DUAL-WRITE
// Extend existing qr_codes row with new anti-counterfeit columns
// ═════════════════════════════════════════════════════════════════

/**
 * Dual-write QR code enrichment (new columns on existing row).
 *
 * @param {object} tx - Transaction client
 * @param {object} data - { qrId, serialNumber }
 */
async function dualWriteQRInTx(tx, data) {
    if (!isDualWriteEnabled()) {
        stats.qr_skip++;
        return;
    }

    const { qrId, serialNumber } = data;

    // Update the QR row with new-schema columns
    await tx.run(
        `UPDATE qr_codes SET
           serial_number = COALESCE(serial_number, $1),
           qr_state = COALESCE(qr_state, 'created')
         WHERE id = $2`,
        [serialNumber || null, qrId]
    );

    stats.qr_success++;
}

/**
 * Standalone dual-write for QR (wraps in its own transaction).
 */
async function dualWriteQR(data) {
    if (!isDualWriteEnabled()) {
        stats.qr_skip++;
        return;
    }

    try {
        await withTransaction(db, async tx => {
            await dualWriteQRInTx(tx, data);
        });
    } catch (err) {
        stats.qr_fail++;
        logger.error('[DualWrite] QR sync FAILED → DLQ', { qrId: data.qrId, error: err.message });
        await logDualWriteFailure('qr', data, err);
    }
}

// ═════════════════════════════════════════════════════════════════
// BATCH DUAL-WRITE
// Legacy: batches → New: batches.product_definition_id + current_owner_org_id
// ═════════════════════════════════════════════════════════════════

/**
 * Dual-write batch enrichment (new columns on existing row).
 *
 * @param {object} tx - Transaction client
 * @param {object} data - { batchId, productId, orgId }
 */
async function dualWriteBatchInTx(tx, data) {
    if (!isDualWriteEnabled()) {
        stats.batch_skip++;
        return;
    }

    const { batchId, productId, orgId } = data;

    await tx.run(
        `UPDATE batches SET
           product_definition_id = COALESCE(product_definition_id, $1),
           current_owner_org_id = COALESCE(current_owner_org_id, $2)
         WHERE id = $3`,
        [productId, orgId || null, batchId]
    );

    stats.batch_success++;
}

/**
 * Standalone dual-write for batch.
 */
async function dualWriteBatch(data) {
    if (!isDualWriteEnabled()) {
        stats.batch_skip++;
        return;
    }

    try {
        await withTransaction(db, async tx => {
            await dualWriteBatchInTx(tx, data);
        });
    } catch (err) {
        stats.batch_fail++;
        logger.error('[DualWrite] Batch sync FAILED → DLQ', { batchId: data.batchId, error: err.message });
        await logDualWriteFailure('batch', data, err);
    }
}

module.exports = {
    // Transaction-aware (called inside withTransaction)
    dualWriteProductInTx,
    dualWriteQRInTx,
    dualWriteBatchInTx,

    // Standalone (manage their own transaction)
    dualWriteProduct,
    dualWriteQR,
    dualWriteBatch,

    // Monitoring
    getStats,
    isDualWriteEnabled,
};
