/**
 * TrustChecker QR Validation Routes
 * Core validation flow: Scan → Fraud Engine → Trust Engine → Blockchain Seal → Response
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../auth');
const engineClient = require('../engines/engine-client');
const trustEngine = require('../engines/trust');
const blockchainEngine = require('../engines/blockchain');
const { eventBus, EVENT_TYPES } = require('../events');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();

// ─── POST /api/qr/validate ──────────────────────────────────────────────────
// The core real-time validation endpoint
router.post('/validate', validate(schemas.qrScan), async (req, res) => {
    const startTime = Date.now();

    try {
        const { qr_data, device_fingerprint, ip_address, latitude, longitude, user_agent } = req.body;

        if (!qr_data) {
            return res.status(400).json({ error: 'qr_data is required' });
        }

        // Step 1: Look up QR code
        const qrCode = await db.prepare('SELECT * FROM qr_codes WHERE qr_data = ?').get(qr_data);

        if (!qrCode) {
            // Unknown QR — potential counterfeit
            const scanId = uuidv4();
            await db.prepare(`
        INSERT INTO scan_events (id, scan_type, device_fingerprint, ip_address, latitude, longitude, user_agent, result, fraud_score, scanned_at)
        VALUES (?, 'validation', ?, ?, ?, ?, ?, 'counterfeit', 1.0, datetime('now'))
      `).run(scanId, device_fingerprint || '', ip_address || '', latitude || null, longitude || null, user_agent || '');

            await blockchainEngine.seal('QRInvalid', scanId, { qr_data, result: 'counterfeit' });

            eventBus.emitEvent(EVENT_TYPES.QR_INVALID, {
                scan_id: scanId,
                qr_data: qr_data.substring(0, 20) + '...',
                result: 'counterfeit'
            });

            return res.json({
                valid: false,
                result: 'counterfeit',
                message: '❌ QR CODE NOT RECOGNIZED — Potential counterfeit detected',
                fraud_score: 1.0,
                trust_score: 0,
                response_time_ms: Date.now() - startTime
            });
        }

        // Step 2: Get product
        const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(qrCode.product_id);

        // Step 2.5: Check previous scans — CORE ANTI-COUNTERFEIT LOGIC
        const previousScans = await db.all(
            `SELECT id, scanned_at, ip_address, device_fingerprint, geo_city, geo_country 
             FROM scan_events 
             WHERE qr_code_id = ? AND result != 'pending'
             ORDER BY scanned_at ASC`,
            [qrCode.id]
        );
        const scanCount = previousScans.length;
        const isFirstScan = scanCount === 0;
        const firstScanRecord = previousScans.length > 0 ? previousScans[0] : null;

        // Step 3: Create scan event
        const scanId = uuidv4();
        await db.prepare(`
      INSERT INTO scan_events (id, qr_code_id, product_id, scan_type, device_fingerprint, ip_address, latitude, longitude, user_agent, result, scanned_at)
      VALUES (?, ?, ?, 'validation', ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).run(scanId, qrCode.id, qrCode.product_id, device_fingerprint || '', ip_address || '', latitude || null, longitude || null, user_agent || '');

        eventBus.emitEvent(EVENT_TYPES.QR_SCANNED, {
            scan_id: scanId,
            product_id: qrCode.product_id,
            product_name: product ? product.name : 'Unknown'
        });

        // Step 4: Run Fraud Engine
        const fraudResult = await engineClient.fraudAnalyze({
            id: scanId,
            qr_code_id: qrCode.id,
            product_id: qrCode.product_id,
            device_fingerprint: device_fingerprint || '',
            ip_address: ip_address || '',
            latitude,
            longitude
        });

        // Step 5: Calculate Trust Score
        const trustResult = trustEngine.calculate(qrCode.product_id, fraudResult.fraudScore);

        // Step 6: Determine result — FIRST-SCAN vs REPEAT-SCAN
        let result = 'valid';
        let message = '';
        let scan_warning = null;

        if (isFirstScan) {
            // ✅ First-time scan — product is authentic
            result = 'valid';
            message = '✅ Sản phẩm bạn vừa kiểm tra là HÀNG CHÍNH HÃNG. Đây là lần đầu tiên mã được kiểm tra.';
        } else {
            // ⚠️ Repeat scan — warn user
            const firstTime = new Date(firstScanRecord.scanned_at + 'Z');
            const hours = firstTime.getHours().toString().padStart(2, '0');
            const minutes = firstTime.getMinutes().toString().padStart(2, '0');
            const day = firstTime.getDate().toString().padStart(2, '0');
            const month = (firstTime.getMonth() + 1).toString().padStart(2, '0');
            const year = firstTime.getFullYear();

            result = scanCount >= 3 ? 'suspicious' : 'warning';
            message = `⚠️ Mã bạn kiểm tra đã được quét vào lúc ${hours} giờ ${minutes} phút ngày ${day} tháng ${month} năm ${year}. Lưu ý kiểm tra kĩ vì có thể không phải hàng chính hãng.`;

            scan_warning = {
                is_first_scan: false,
                total_previous_scans: scanCount,
                first_scanned_at: firstScanRecord.scanned_at,
                first_scanned_from_ip: firstScanRecord.ip_address || 'N/A',
                first_scanned_location: firstScanRecord.geo_city ? `${firstScanRecord.geo_city}, ${firstScanRecord.geo_country}` : 'N/A',
                risk_level: scanCount >= 5 ? 'Rất cao — có khả năng hàng giả' : scanCount >= 3 ? 'Cao — nghi ngờ hàng giả' : 'Trung bình — cần kiểm tra thêm',
                all_scan_times: previousScans.map(s => s.scanned_at)
            };
        }

        // Override with fraud engine results if worse
        if (fraudResult.fraudScore > 0.7) {
            result = 'suspicious';
            message = '⚠️ NGHI NGỜ — Phát hiện nhiều dấu hiệu gian lận. ' + (isFirstScan ? '' : message);
        } else if (fraudResult.fraudScore > 0.4 && isFirstScan) {
            result = 'warning';
            message = '⚡ LƯU Ý — Một số bất thường được phát hiện, hãy xác minh thủ công';
        }

        if (qrCode.status === 'revoked') {
            result = 'revoked';
            message = '🚫 MÃ QR ĐÃ BỊ THU HỒI — Mã này không còn hợp lệ';
        }

        // Step 7: Update scan event
        const responseTime = Date.now() - startTime;
        await db.prepare(`
      UPDATE scan_events SET result = ?, fraud_score = ?, trust_score = ?, response_time_ms = ? WHERE id = ?
    `).run(result, fraudResult.fraudScore, trustResult.score, responseTime, scanId);

        // Step 8: Blockchain seal
        const seal = await blockchainEngine.seal('QRValidated', scanId, {
            product_id: qrCode.product_id,
            result,
            fraud_score: fraudResult.fraudScore,
            trust_score: trustResult.score
        });

        eventBus.emitEvent(EVENT_TYPES.QR_VALIDATED, {
            scan_id: scanId,
            product_name: product ? product.name : 'Unknown',
            result,
            fraud_score: fraudResult.fraudScore,
            trust_score: trustResult.score,
            response_time_ms: responseTime
        });

        res.json({
            valid: result === 'valid',
            result,
            message,
            scan_id: scanId,
            scan_verification: {
                is_first_scan: isFirstScan,
                total_scans: scanCount + 1,
                ...(scan_warning || {})
            },
            product: product ? {
                id: product.id,
                name: product.name,
                sku: product.sku,
                manufacturer: product.manufacturer,
                category: product.category,
                origin_country: product.origin_country
            } : null,
            fraud: {
                score: fraudResult.fraudScore,
                alerts: fraudResult.alerts.length,
                details: fraudResult.alerts.map(a => ({
                    type: a.type,
                    severity: a.severity,
                    description: a.description
                })),
                explainability: fraudResult.explainability
            },
            trust: {
                score: trustResult.score,
                grade: trustResult.grade,
                factors: trustResult.explanation
            },
            blockchain: {
                sealed: true,
                block_index: seal.block_index,
                data_hash: seal.data_hash,
                merkle_root: seal.merkle_root
            },
            response_time_ms: responseTime
        });
    } catch (err) {
        console.error('QR Validation error:', err);
        res.status(500).json({ error: 'Validation failed', response_time_ms: Date.now() - startTime });
    }
});

// ─── GET /api/qr/scan-history ────────────────────────────────────────────────
router.get('/scan-history', authMiddleware, async (req, res) => {
    try {
        const { product_id, limit = 50 } = req.query;
        let query = `
      SELECT se.*, p.name as product_name, p.sku as product_sku
      FROM scan_events se
      LEFT JOIN products p ON se.product_id = p.id
    `;
        const params = [];

        if (product_id) {
            query += ' WHERE se.product_id = ?';
            params.push(product_id);
        }

        query += ' ORDER BY se.scanned_at DESC LIMIT ?';
        params.push(Math.min(Number(limit) || 50, 200));

        const scans = await db.prepare(query).all(...params);
        res.json({ scans });
    } catch (err) {
        console.error('Scan history error:', err);
        res.status(500).json({ error: 'Failed to fetch scan history' });
    }
});

// ─── GET /api/qr/fraud-alerts ────────────────────────────────────────────────
router.get('/fraud-alerts', authMiddleware, async (req, res) => {
    try {
        const { status = 'open', limit = 50 } = req.query;
        const alerts = await db.prepare(`
      SELECT fa.*, p.name as product_name, p.sku as product_sku
      FROM fraud_alerts fa
      LEFT JOIN products p ON fa.product_id = p.id
      WHERE fa.status = ?
      ORDER BY fa.created_at DESC LIMIT ?
    `).all(status, Math.min(Number(limit) || 50, 200));

        res.json({ alerts });
    } catch (err) {
        console.error('Fraud alerts error:', err);
        res.status(500).json({ error: 'Failed to fetch fraud alerts' });
    }
});

// ─── GET /api/qr/blockchain ─────────────────────────────────────────────────
router.get('/blockchain', authMiddleware, async (req, res) => {
    try {
        const stats = await blockchainEngine.getStats();
        const recent = await blockchainEngine.getRecent(20);
        res.json({ stats, recent_seals: recent });
    } catch (err) {
        console.error('Blockchain error:', err);
        res.status(500).json({ error: 'Failed to fetch blockchain data' });
    }
});

// ─── GET /api/qr/blockchain/verify ──────────────────────────────────────────
router.get('/blockchain/verify', authMiddleware, async (req, res) => {
    try {
        const verification = await blockchainEngine.verifyChain();
        res.json(verification);
    } catch (err) {
        console.error('Blockchain verify error:', err);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// ─── GET /api/qr/dashboard-stats ─────────────────────────────────────────────
router.get('/dashboard-stats', authMiddleware, async (req, res) => {
    try {
        // NODE-BP-1: Parallelize independent DB queries
        const [totalProducts, totalScans, todayScans, openAlerts, avgTrustScore, totalSeals] = await Promise.all([
            db.prepare('SELECT COUNT(*) as count FROM products').get(),
            db.prepare('SELECT COUNT(*) as count FROM scan_events').get(),
            db.prepare(`SELECT COUNT(*) as count FROM scan_events WHERE DATE(scanned_at) = DATE('now')`).get(),
            db.prepare(`SELECT COUNT(*) as count FROM fraud_alerts WHERE status = 'open'`).get(),
            db.prepare('SELECT AVG(trust_score) as avg FROM products WHERE trust_score > 0').get(),
            db.prepare('SELECT COUNT(*) as count FROM blockchain_seals').get(),
        ]);

        const [scansByResult, alertsBySeverity, recentActivity, scanTrend] = await Promise.all([
            db.prepare('SELECT result, COUNT(*) as count FROM scan_events GROUP BY result').all(),
            db.prepare(`SELECT severity, COUNT(*) as count FROM fraud_alerts WHERE status = 'open' GROUP BY severity`).all(),
            db.prepare(`SELECT se.id, se.result, se.fraud_score, se.trust_score, se.scanned_at, p.name as product_name
              FROM scan_events se LEFT JOIN products p ON se.product_id = p.id
              ORDER BY se.scanned_at DESC LIMIT 10`).all(),
            db.prepare(`SELECT DATE(scanned_at) as day, COUNT(*) as count FROM scan_events
              WHERE scanned_at > datetime('now', '-7 days') GROUP BY DATE(scanned_at) ORDER BY day ASC`).all(),
        ]);

        res.json({
            total_products: totalProducts.count,
            total_scans: totalScans.count,
            today_scans: todayScans.count,
            open_alerts: openAlerts.count,
            avg_trust_score: Math.round(avgTrustScore.avg || 0),
            total_blockchain_seals: totalSeals.count,
            scans_by_result: scansByResult,
            alerts_by_severity: alertsBySeverity,
            recent_activity: recentActivity,
            scan_trend: scanTrend
        });
    } catch (err) {
        console.error('Dashboard stats error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// ─── GET /api/qr/events ─────────────────────────────────────────────────────
router.get('/events', authMiddleware, async (req, res) => {
    try {
        const events = eventBus.getRecentEvents(50);
        res.json({ events });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── GET /api/qr/camera-config — Mobile camera scanner config ───────────────
router.get('/camera-config', async (req, res) => {
    try {
        res.json({
            scanner: {
                type: 'getUserMedia',
                constraints: {
                    video: {
                        facingMode: 'environment',
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                },
                decoder: {
                    library: 'jsQR',
                    cdn: 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
                    interval_ms: 100
                }
            },
            supported_formats: ['QR_CODE', 'DATA_MATRIX', 'CODE_128', 'EAN_13'],
            offline_capable: true,
            instructions: {
                step1: 'Grant camera permission when prompted',
                step2: 'Point camera at the QR code',
                step3: 'Hold steady for 1-2 seconds',
                step4: 'Result appears automatically'
            },
            tips: [
                'Ensure adequate lighting',
                'Hold device 10-20cm from QR code',
                'Keep QR code flat and visible',
                'Works offline — scans are queued for sync'
            ]
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/qr/mobile-scan — Mobile scan with image data ────────────────
router.post('/mobile-scan', validate(schemas.qrScan), async (req, res) => {
    const startTime = Date.now();
    try {
        const { qr_data, image_data, device_info } = req.body;
        if (!qr_data) return res.status(400).json({ error: 'qr_data required' });

        // Reuse the core validation logic
        const qrCode = await db.prepare('SELECT * FROM qr_codes WHERE qr_data = ?').get(qr_data);
        if (!qrCode) {
            return res.json({
                valid: false, result: 'counterfeit',
                message: '❌ QR CODE NOT RECOGNIZED',
                response_time_ms: Date.now() - startTime,
                scan_type: 'mobile_camera'
            });
        }

        const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(qrCode.product_id);
        const scanId = uuidv4();

        await db.prepare(`
      INSERT INTO scan_events (id, qr_code_id, product_id, scan_type, device_fingerprint, user_agent, result, scanned_at)
      VALUES (?, ?, ?, 'mobile_camera', ?, ?, 'valid', datetime('now'))
    `).run(scanId, qrCode.id, qrCode.product_id,
            device_info?.model || 'mobile', device_info?.userAgent || 'Mobile Camera');

        const fraudResult = await engineClient.fraudAnalyze({ id: scanId, qr_code_id: qrCode.id, product_id: qrCode.product_id });
        const trustResult = trustEngine.calculate(qrCode.product_id, fraudResult.fraudScore);

        await db.prepare('UPDATE scan_events SET fraud_score = ?, trust_score = ?, response_time_ms = ? WHERE id = ?')
            .run(fraudResult.fraudScore, trustResult.score, Date.now() - startTime, scanId);

        res.json({
            valid: true,
            result: fraudResult.fraudScore > 0.7 ? 'suspicious' : 'valid',
            message: fraudResult.fraudScore > 0.7 ? '⚠️ SUSPICIOUS' : '✅ PRODUCT VERIFIED',
            scan_id: scanId,
            scan_type: 'mobile_camera',
            product: product ? { id: product.id, name: product.name, sku: product.sku, manufacturer: product.manufacturer } : null,
            fraud_score: fraudResult.fraudScore,
            trust_score: trustResult.score,
            trust_grade: trustResult.grade,
            response_time_ms: Date.now() - startTime
        });
    } catch (err) {
        res.status(500).json({ error: 'Mobile scan failed', response_time_ms: Date.now() - startTime });
    }
});

// ─── GET /api/qr/public/check/:productId — Freemium public trust check ──────
// No auth required. Rate limited per IP. Returns limited data + signup CTA.
const rateLimit = require('express-rate-limit');
const publicCheckLimiter = rateLimit({
    windowMs: 60_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Public check rate limit exceeded. Sign up for higher limits.' },
    // Default keyGenerator handles IPv6 normalization automatically in v8+
});

router.get('/public/check/:productId', publicCheckLimiter, async (req, res) => {
    try {
        const product = await db.prepare(
            'SELECT id, name, manufacturer, sku, trust_score FROM products WHERE id = ?'
        ).get(req.params.productId);

        if (!product) {
            return res.status(404).json({
                found: false,
                message: 'Product not found in TrustChecker registry',
                verified_by: 'TrustChecker Free',
            });
        }

        const scanCount = await db.prepare(
            'SELECT COUNT(*) as c FROM scan_events WHERE product_id = ?'
        ).get(product.id);

        const recentScans = await db.prepare(
            "SELECT COUNT(*) as c FROM scan_events WHERE product_id = ? AND scanned_at >= datetime('now', '-30 days')"
        ).get(product.id);

        res.json({
            found: true,
            product: {
                name: product.name,
                manufacturer: product.manufacturer,
                sku: product.sku,
            },
            trust: {
                score: product.trust_score || 85,
                grade: _publicGrade(product.trust_score || 85),
                status: (product.trust_score || 85) >= 70 ? 'authentic' : 'suspicious',
            },
            verification: {
                total_scans: scanCount?.c || 0,
                recent_scans_30d: recentScans?.c || 0,
            },
            verified_by: 'TrustChecker Free',
            upgrade_cta: {
                message: 'Get full forensic analysis, fraud detection & supply chain tracking',
                url: '/pricing',
                plans: ['starter', 'pro', 'business'],
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Public check failed' });
    }
});

function _publicGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
}

module.exports = router;
