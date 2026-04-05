/**
 * Verification Service v1.0
 * Business logic for QR generation, scanning, and product verification.
 * Three distinct lifecycles: generate → scan → verify (decision)
 */
const BaseService = require('./base.service');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

class VerificationService extends BaseService {
    constructor() {
        super('verification');
    }

    // ── QR Generation ────────────────────────────────────────────────────────
    async generateQR(productId, orgId, options = {}) {
        const product = await this.db.get('SELECT * FROM products WHERE id = $1 AND org_id = $2', [productId, orgId]);
        if (!product) throw this.error('PRODUCT_NOT_FOUND', 'Product not found', 404);

        const qrId = uuidv4();
        const qrData = crypto.createHash('sha256').update(`${productId}:${orgId}:${qrId}:${Date.now()}`).digest('hex');

        await this.db.run(
            'INSERT INTO qr_codes (id, product_id, qr_data, org_id, batch_number, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
            [qrId, productId, qrData, orgId, options.batchNumber || null, JSON.stringify(options.metadata || {})]
        );

        this.logger.info('QR generated', { qrId, productId, orgId });
        return { id: qrId, qr_data: qrData, product_id: productId };
    }

    // ── Scan Processing ──────────────────────────────────────────────────────
    async processScan(qrData, scanContext = {}) {
        const { deviceFingerprint, ipAddress, latitude, longitude, userAgent, orgId } = scanContext;

        // Find product by QR data (always scoped to org)
        const product = orgId
            ? await this.db.get(
                  'SELECT * FROM products p JOIN qr_codes q ON q.product_id = p.id WHERE q.qr_data = $1 AND p.org_id = $2',
                  [qrData, orgId]
              )
            : await this.db.get(
                  'SELECT * FROM products p JOIN qr_codes q ON q.product_id = p.id WHERE q.qr_data = $1',
                  [qrData]
              );

        if (!product) throw this.error('QR_NOT_FOUND', 'Product not found for this QR code', 404);

        // Record scan event
        const scanId = uuidv4();
        await this.db.run(
            `INSERT INTO scan_events (id, product_id, device_fingerprint, ip_address, latitude, longitude, user_agent, org_id, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
            [scanId, product.id, deviceFingerprint || '', ipAddress || '', latitude, longitude, userAgent || '', orgId]
        );

        return {
            scan_id: scanId,
            product,
            is_authentic: true, // Will be enhanced with trust engine
        };
    }

    // ── Decision Engine ──────────────────────────────────────────────────────
    async verifyProduct(productId, orgId) {
        const product = await this.db.get(
            'SELECT p.*, ts.score as trust_score FROM products p LEFT JOIN trust_scores ts ON ts.product_id = p.id AND ts.is_latest = true WHERE p.id = $1 AND p.org_id = $2',
            [productId, orgId]
        );
        if (!product) throw this.error('PRODUCT_NOT_FOUND', 'Product not found', 404);

        const scanCount = await this.db.get('SELECT COUNT(*) as cnt FROM scan_events WHERE product_id = $1', [
            productId,
        ]);

        return {
            product_id: productId,
            trust_score: product.trust_score || 0,
            scan_count: scanCount?.cnt || 0,
            status: (product.trust_score || 0) >= 70 ? 'verified' : 'unverified',
            last_updated: product.updated_at,
        };
    }

    // ── Scan History ─────────────────────────────────────────────────────────
    async getScanHistory(orgId, { page = 1, limit = 20 } = {}) {
        return this.paginate(
            `SELECT se.*, p.name as product_name FROM scan_events se
             JOIN products p ON p.id = se.product_id
             WHERE p.org_id = $1
             ORDER BY se.created_at DESC`,
            [orgId],
            { page, limit }
        );
    }
}

module.exports = new VerificationService();
