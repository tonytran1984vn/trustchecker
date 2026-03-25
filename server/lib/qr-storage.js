/**
 * QR Image Storage — VPS File Storage Strategy
 * Saves QR code images as PNG files to disk at:
 *   /data/qr/{org_id}/{batch_ts}/{uuid}.png
 *
 * DB stores only `image_key` (relative path), not binary/base64.
 * Images served via Express static middleware or Nginx.
 *
 * Future-proof: image_key format is compatible with S3/R2 object key migration.
 */
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const logger = require('./logger');

// ── Storage root — configurable via env ─────────────────────────
const STORAGE_ROOT = process.env.QR_STORAGE_PATH || path.join(__dirname, '..', '..', 'data', 'qr');

// ── QR image generation options (consistent styling) ────────────
const QR_OPTIONS = {
    type: 'png',
    width: 400,
    margin: 2,
    color: { dark: '#0ff', light: '#0a0a1a' },
};

/**
 * Build the image_key (relative path) for a QR code.
 * Format: {org_id}/{batch_ts}/{uuid}.png
 *
 * @param {string} orgId - Organization ID (or 'default')
 * @param {string|number} batchTimestamp - Batch timestamp for grouping
 * @param {string} qrId - UUID of the QR code
 * @returns {string} Relative image key
 */
function buildImageKey(orgId, batchTimestamp, qrId) {
    const safeOrg = (orgId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
    const safeBatch = String(batchTimestamp || Date.now());
    const safeId = qrId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return `${safeOrg}/${safeBatch}/${safeId}.png`;
}

/**
 * Ensure the directory for a given image_key exists.
 */
function ensureDir(imageKey) {
    const fullDir = path.join(STORAGE_ROOT, path.dirname(imageKey));
    if (!fs.existsSync(fullDir)) {
        fs.mkdirSync(fullDir, { recursive: true });
    }
    return fullDir;
}

/**
 * Generate a QR code PNG and save to disk.
 *
 * @param {string} qrData - The URL/data to encode in the QR code
 * @param {string} imageKey - Relative storage path (from buildImageKey)
 * @returns {Promise<string>} The image_key that was saved
 */
async function saveQrImage(qrData, imageKey) {
    ensureDir(imageKey);
    const fullPath = path.join(STORAGE_ROOT, imageKey);

    // Generate PNG buffer and write to disk
    const pngBuffer = await QRCode.toBuffer(qrData, QR_OPTIONS);
    fs.writeFileSync(fullPath, pngBuffer);

    return imageKey;
}

/**
 * Batch-save multiple QR images for a generation job.
 * Optimized: generates and writes sequentially to avoid memory spikes.
 *
 * @param {Array<{qrId: string, qrData: string}>} codes - Array of codes to save
 * @param {string} orgId - Organization ID
 * @param {string|number} batchTimestamp - Batch grouping timestamp
 * @returns {Promise<Map<string, string>>} Map of qrId → imageKey
 */
async function batchSaveQrImages(codes, orgId, batchTimestamp) {
    const results = new Map();

    for (const { qrId, qrData } of codes) {
        try {
            const imageKey = buildImageKey(orgId, batchTimestamp, qrId);
            await saveQrImage(qrData, imageKey);
            results.set(qrId, imageKey);
        } catch (err) {
            logger.error(`[QR-Storage] Failed to save QR image ${qrId}:`, err.message);
            // Continue — don't block batch on single failure
        }
    }

    return results;
}

/**
 * Get the full filesystem path for a given image_key.
 */
function getFullPath(imageKey) {
    return path.join(STORAGE_ROOT, imageKey);
}

/**
 * Check if a QR image file exists on disk.
 */
function exists(imageKey) {
    return fs.existsSync(getFullPath(imageKey));
}

/**
 * Delete a QR image file from disk.
 */
function remove(imageKey) {
    const fullPath = getFullPath(imageKey);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        return true;
    }
    return false;
}

/**
 * Get the storage root directory path.
 */
function getStorageRoot() {
    return STORAGE_ROOT;
}

module.exports = {
    buildImageKey,
    saveQrImage,
    batchSaveQrImages,
    getFullPath,
    getStorageRoot,
    exists,
    remove,
    QR_OPTIONS,
};
