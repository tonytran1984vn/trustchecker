// [MIGRATED] Use /api/v1/verification instead
/**
 * TrustChecker QR Validation Routes
 * Core validation flow: Scan → Fraud Engine → Trust Engine → Blockchain Seal → Response
 */

let riskEngine;
try {
    riskEngine = require('../services/risk-scoring-engine');
} catch (_) {
    riskEngine = null;
}
const express = require('express');
const { bulkScanDetector, replayDetector } = require('../middleware/blind-spot-defense');

// TC-21-REUSE-CHECK: Detect QR code reuse pattern
async function checkQrReuse(qrCodeId, qrData, ipAddr, deviceFp, db) {
    const crypto = require('crypto');
    const logger = require('../lib/logger');
    const ipHash = crypto
        .createHash('sha256')
        .update(ipAddr || '')
        .digest('hex')
        .substring(0, 16);
    const devHash = crypto
        .createHash('sha256')
        .update(deviceFp || '')
        .digest('hex')
        .substring(0, 16);

    try {
        // Upsert fingerprint
        await db.run(
            `INSERT INTO qr_scan_fingerprints (id, qr_code_id, qr_data, ip_hash, device_hash, ip_address, scan_count)
            VALUES ($1, $2, $3, $4, $5, $6, 1)
            ON CONFLICT (qr_code_id, device_hash) DO UPDATE SET scan_count = qr_scan_fingerprints.scan_count + 1, last_seen = NOW()`,
            [require('uuid').v4(), qrCodeId, qrData, ipHash, devHash, ipAddr || '']
        );

        // Check if reuse threshold breached
        const stats = await db.get(
            `SELECT COUNT(DISTINCT ip_hash) as unique_ips, SUM(scan_count) as total_scans
            FROM qr_scan_fingerprints WHERE qr_code_id = $1 OR qr_data = $2`,
            [qrCodeId, qrData]
        );

        if (stats && stats.unique_ips >= 4 && stats.total_scans >= 5) {
            // Auto-block QR code
            await db.run("UPDATE qr_codes SET status = 'blocked' WHERE id = $1 AND status != 'blocked'", [qrCodeId]);

            // Audit log
            try {
                await db.run(
                    `INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details, ip_address, created_at)
                    VALUES ($1, 'system', 'qr_reuse_auto_block', 'qr_code', $2, $3, $4, NOW())`,
                    [
                        require('uuid').v4(),
                        qrCodeId || qrData,
                        JSON.stringify({ unique_ips: stats.unique_ips, total_scans: stats.total_scans }),
                        ipAddr || '',
                    ]
                );
            } catch (_) {}

            return {
                reuse_detected: true,
                blocked: true,
                unique_ips: stats.unique_ips,
                total_scans: stats.total_scans,
            };
        }

        return { reuse_detected: false, unique_ips: stats?.unique_ips || 0, total_scans: stats?.total_scans || 0 };
    } catch (e) {
        return { reuse_detected: false, error: e.message };
    }
}
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../auth');
const engineClient = require('../engines/infrastructure/engine-client');
const trustEngine = require('../engines/core/trust');
const blockchainEngine = require('../engines/infrastructure/blockchain');
const { eventBus, EVENT_TYPES } = require('../events');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();

router.use((req, res, next) => {
    res.set('X-Deprecation', 'Use /api/v1/verification instead');
    next();
});

// All routes require authentication
router.use(authMiddleware);

// ─── POST /api/qr/validate ──────────────────────────────────────────────────
// The core real-time validation endpoint
router.post('/validate', validate(schemas.qrScan), async (req, res) => {
    const startTime = Date.now();

    try {
        const { qr_data, device_fingerprint, ip_address, latitude, longitude, user_agent } = req.body;

        // ATK-22: Server-side fingerprint (don't trust client-supplied alone)
        const serverFingerprint = require('crypto')
            .createHash('sha256')
            .update(
                [
                    req.ip || ip_address || '',
                    req.headers['user-agent'] || '',
                    req.headers['accept-language'] || '',
                ].join('|')
            )
            .digest('hex')
            .slice(0, 16);
        // ATK-27: Reject future/stale timestamps
        if (req.body.timestamp) {
            const ts = new Date(req.body.timestamp).getTime();
            const now = Date.now();
            if (ts > now + 300000) return res.status(400).json({ error: 'Timestamp in future' });
            if (ts < now - 604800000) return res.status(400).json({ error: 'Timestamp too old' });
        }

        const effectiveFingerprint = serverFingerprint + ':' + (device_fingerprint || 'none').slice(0, 16);

        if (!qr_data) {
            return res.status(400).json({ error: 'qr_data is required' });
        }

        // Step 1: Look up QR code
        const qrCode = await db.get('SELECT * FROM qr_codes WHERE qr_data = ?', [qr_data]);

        if (!qrCode) {
            // Unknown QR — potential counterfeit
            const scanId = uuidv4();
            await db.run(
                `
        INSERT INTO scan_events (id, scan_type, device_fingerprint, ip_address, latitude, longitude, user_agent, result, fraud_score, scanned_at, org_id)
        VALUES ($1, 'validation', $2, $3, $4, $5, $6, 'counterfeit', 1.0, NOW(), $7)
      `,
                [
                    scanId,
                    effectiveFingerprint || '',
                    req.ip || ip_address || '',
                    latitude || null,
                    longitude || null,
                    req.headers['user-agent'] || user_agent || '',
                    req.orgId || req.user?.orgId || req.user?.org_id || '',
                ]
            );

            await blockchainEngine.seal('QRInvalid', scanId, { qr_data, result: 'counterfeit' });

            eventBus.emitEvent(EVENT_TYPES.QR_INVALID, {
                scan_id: scanId,
                qr_data: qr_data.substring(0, 20) + '...',
                result: 'counterfeit',
            });

            // TC-21: Track fingerprint for counterfeit scan
            try {
                const crypto = require('crypto');
                const ipAddr2 = req.ip || ip_address || '';
                const devFp2 = effectiveFingerprint || '';
                const ipH = crypto.createHash('sha256').update(ipAddr2).digest('hex').substring(0, 16);
                const devH = crypto.createHash('sha256').update(devFp2).digest('hex').substring(0, 16);
                await db.run(
                    `INSERT INTO qr_scan_fingerprints (id, qr_data, ip_hash, device_hash, ip_address, scan_count)
                    VALUES ($1, $2, $3, $4, $5, 1)
                    ON CONFLICT (qr_data, device_hash) DO UPDATE SET scan_count = qr_scan_fingerprints.scan_count + 1, last_seen = NOW()`,
                    [require('uuid').v4(), qr_data, ipH, devH, ipAddr2]
                );
            } catch (_fp) {}

            return res.json({
                valid: false,
                result: 'counterfeit',
                message: '❌ QR CODE NOT RECOGNIZED — Potential counterfeit detected',
                fraud_score: 1.0,
                trust_score: 0,
                response_time_ms: Date.now() - startTime,
            });
        }

        // TC21-HMAC-VERIFY: Validate QR signature integrity
        try {
            const parts = qr_data.split('-');
            if (parts.length >= 4) {
                const sigPart = parts[parts.length - 1]; // Last segment is signature
                const dataPart = parts.slice(0, -1).join('-');
                const expectedSig = require('crypto')
                    .createHmac('sha256', process.env.QR_SECRET || process.env.JWT_SECRET || 'tc-default-key')
                    .update(qrCode.product_id + parts[2] + '0')
                    .digest('hex')
                    .slice(0, 8);
                if (sigPart !== expectedSig && sigPart.length === 8) {
                    req._hmacMismatch = true; // Flag for response enrichment
                }
            }
        } catch (_hmac) {}

        // TC21-REUSE: Check for QR code reuse pattern
        const reuseResult = await checkQrReuse(
            qrCode.id,
            qr_data,
            req.ip || ip_address,
            effectiveFingerprint || device_fingerprint,
            db
        );
        if (reuseResult.blocked) {
            return res.json({
                valid: false,
                result: 'blocked',
                message:
                    '🚫 QR CODE BLOCKED — Reuse detected (' +
                    reuseResult.unique_ips +
                    ' IPs, ' +
                    reuseResult.total_scans +
                    ' scans)',
                reuse_detected: true,
                unique_ips: reuseResult.unique_ips,
                total_scans: reuseResult.total_scans,
                response_time_ms: Date.now() - startTime,
            });
        }

        // ── RED-TEAM P1-1: Check QR expiry ──────────────────────────────────
        if (qrCode.expires_at && new Date(qrCode.expires_at) < new Date()) {
            const scanId = uuidv4();
            await db.run(
                `
              INSERT INTO scan_events (id, qr_code_id, product_id, scan_type, device_fingerprint, ip_address, result, scanned_at, org_id)
              VALUES (?, ?, ?, 'validation', ?, ?, 'expired', NOW(), ?)
            `,
                [
                    scanId,
                    qrCode.id,
                    qrCode.product_id,
                    device_fingerprint || '',
                    req.ip || ip_address || '',
                    qrCode.org_id || '',
                ]
            );
            await blockchainEngine.seal('QRExpired', scanId, { qr_data, result: 'expired' });
            return res.json({
                valid: false,
                result: 'expired',
                message: '⏰ MÃ QR ĐÃ HẾT HẠN — Mã này không còn hợp lệ. Liên hệ nhà sản xuất.',
                fraud_score: 0.3,
                trust_score: 0,
                expired_at: qrCode.expires_at,
                response_time_ms: Date.now() - startTime,
            });
        }

        // Step 2: Get product (org-scoped)
        // ATK-02 FIX: Always scope product query to org
        let prodSql = 'SELECT * FROM products WHERE id = ?';
        const prodParams = [qrCode.product_id];
        // RED-TEAM P1-2: Default org_id from QR code for public (unauthenticated) scans
        const effectiveOrgId = req.orgId || req.user?.orgId || req.user?.org_id || qrCode.org_id;
        if (effectiveOrgId) {
            prodSql += ' AND org_id = ?';
            prodParams.push(effectiveOrgId);
        }
        const product = await db.prepare(prodSql).get(...prodParams);

        // ── RED-TEAM P1-4: Anti-bot scan deduplication (5s window) ────────
        if (device_fingerprint || (req.ip && req.ip !== '::1')) {
            const recentScan = await db.get(
                `SELECT id FROM scan_events 
                 WHERE qr_code_id = ? AND (device_fingerprint = ? OR ip_address = ?)
                 AND scanned_at > NOW() - INTERVAL '5 seconds' AND result != 'pending'
                 LIMIT 1`,
                [qrCode.id, device_fingerprint || '', req.ip || ip_address || '']
            );
            if (recentScan) {
                return res.json({
                    valid: true,
                    result: 'duplicate',
                    message: 'Bạn vừa quét mã này. Vui lòng đợi vài giây rồi thử lại.',
                    response_time_ms: Date.now() - startTime,
                });
            }
        }

        // Step 2.5: Check previous scans — CORE ANTI-COUNTERFEIT LOGIC
        // RED-TEAM P3-1: Use QR code ID hash as advisory lock to prevent concurrent first-scan race
        // Note: pg_advisory_xact_lock is released at end of transaction automatically
        try {
            await db.run('SELECT pg_advisory_xact_lock(hashtext($1))', [qrCode.id]);
        } catch (e) {
            /* non-critical */
        }
        const previousScans = await db.all(
            `SELECT id, scanned_at, ip_address, device_fingerprint, geo_city, geo_country 
             FROM scan_events 
             WHERE qr_code_id = ? AND result != 'pending'
             ORDER BY scanned_at ASC LIMIT 1000`,
            [qrCode.id]
        );
        const scanCount = previousScans.length;

        // FIX-4-THRESHOLD: Auto-block QR codes scanned 5+ times from different IPs
        if (scanCount >= 5) {
            const uniqueIPs = new Set(previousScans.map(s => s.ip_address)).size;
            if (uniqueIPs >= 4) {
                // Flag this QR code as under_review
                try {
                    await db.run("UPDATE qr_codes SET status = 'under_review' WHERE id = $1 AND status = 'active'", [
                        qrCode.id,
                    ]);
                } catch (e) {}

                const scanId = uuidv4();
                await db.run(
                    `
                    INSERT INTO scan_events (id, qr_code_id, product_id, scan_type, device_fingerprint, ip_address, result, scanned_at, org_id)
                    VALUES (?, ?, ?, 'validation', ?, ?, 'blocked', NOW(), ?)`,
                    [
                        scanId,
                        qrCode.id,
                        qrCode.product_id,
                        device_fingerprint || '',
                        req.ip || ip_address || '',
                        effectiveOrgId || qrCode.org_id || '',
                    ]
                );

                eventBus.emitEvent('QRBlocked', {
                    qr_code_id: qrCode.id,
                    product_id: qrCode.product_id,
                    scan_count: scanCount,
                    unique_ips: uniqueIPs,
                    message: 'QR code blocked: ' + scanCount + ' scans from ' + uniqueIPs + ' different IPs',
                });

                return res.json({
                    valid: false,
                    result: 'blocked',
                    message:
                        'QR code has been flagged for review due to unusual scan activity (' +
                        scanCount +
                        ' scans from ' +
                        uniqueIPs +
                        ' locations).',
                    fraud_score: 0.9,
                    trust_score: 5,
                    response_time_ms: Date.now() - startTime,
                });
            }
        }
        const isFirstScan = scanCount === 0;
        const firstScanRecord = previousScans.length > 0 ? previousScans[0] : null;

        // Step 3: Create scan event
        const scanId = uuidv4();
        await db.run(
            `
      /* ATK-06-MAIN */ INSERT INTO scan_events (id, qr_code_id, product_id, scan_type, device_fingerprint, ip_address, latitude, longitude, user_agent, result, scanned_at, org_id)
      VALUES (?, ?, ?, 'validation', ?, ?, ?, ?, ?, 'pending', NOW(), ?)
    `,
            [
                scanId,
                qrCode.id,
                qrCode.product_id,
                device_fingerprint || '',
                ip_address || '',
                latitude || null,
                longitude || null,
                user_agent || '',
                effectiveOrgId || qrCode.org_id || '',
            ]
        );

        // FIX-9-AUDIT-SCAN: Log scan to audit trail
        try {
            await db.run(
                'INSERT INTO audit_log (action, entity_type, entity_id, org_id, new_value, ip_address, user_agent) VALUES ($1,$2,$3,$4,$5,$6,$7)',
                [
                    'QR_SCANNED',
                    'scan_event',
                    scanId,
                    effectiveOrgId || qrCode.org_id,
                    JSON.stringify({ qr_code_id: qrCode.id, product_id: qrCode.product_id }),
                    req.ip || ip_address,
                    req.headers['user-agent'] || user_agent,
                ]
            );
        } catch (auditErr) {}
        eventBus.emitEvent(EVENT_TYPES.QR_SCANNED, {
            scan_id: scanId,
            product_id: qrCode.product_id,
            product_name: product ? product.name : 'Unknown',
        });

        // INV-3-SHIP-CHECK: Verify product has been shipped/distributed before allowing valid scan
        let supplyChainWarning = null;
        try {
            const lastSCEvent = await db.get(
                'SELECT event_type, location FROM supply_chain_events WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1',
                [qrCode.product_id]
            );
            if (!lastSCEvent) {
                supplyChainWarning = 'Product has no supply chain events — may not be in distribution yet';
            } else if (['commission', 'pack'].includes(lastSCEvent.event_type)) {
                supplyChainWarning = 'Product is still at factory/packing stage — not yet in distribution';
            } else if (lastSCEvent.event_type === 'return') {
                supplyChainWarning = 'Product has been returned — may not be authorized for resale';
            }
        } catch (scErr) {
            /* non-blocking */
        }

        // Step 4: Run Fraud Engine
        const fraudResult = await engineClient.fraudAnalyze({
            id: scanId,
            qr_code_id: qrCode.id,
            product_id: qrCode.product_id,
            device_fingerprint: device_fingerprint || '',
            ip_address: ip_address || '',
            latitude,
            longitude,
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
            // TC21-CLAIM-PROMPT: Suggest ownership registration on first scan
            scan_warning = scan_warning || {};
            scan_warning.claim_available = true;
            scan_warning.claim_message = '📋 Bạn có thể đăng ký sở hữu sản phẩm này để bảo vệ quyền lợi của bạn.';
            scan_warning.claim_url = '/api/qr/claim';
        } else {
            // ⚠️ Repeat scan — warn user
            const firstTime = new Date(firstScanRecord.scanned_at + 'Z');
            const hours = firstTime.getHours().toString().padStart(2, '0');
            const minutes = firstTime.getMinutes().toString().padStart(2, '0');
            const day = firstTime.getDate().toString().padStart(2, '0');
            const month = (firstTime.getMonth() + 1).toString().padStart(2, '0');
            const year = firstTime.getFullYear();

            // FIX-5-VELOCITY-LOG: Log velocity anomaly to event bus for monitoring
            if (firstScanRecord.ip_address && firstScanRecord.ip_address !== (req.ip || ip_address || '')) {
                eventBus.emitEvent('VelocityAnomaly', {
                    qr_code_id: qrCode.id,
                    product_id: qrCode.product_id,
                    first_ip: firstScanRecord.ip_address,
                    current_ip: req.ip || ip_address,
                    first_scan: firstScanRecord.scanned_at,
                    time_diff_ms: Date.now() - new Date(firstScanRecord.scanned_at + 'Z').getTime(),
                });
            }
            // ATK-04 FIX: Geo-velocity — different IP within 1 hour = suspicious clone
            if (
                firstScanRecord.ip_address &&
                firstScanRecord.ip_address !== (req.ip || ip_address || '') &&
                Date.now() - new Date(firstScanRecord.scanned_at + 'Z').getTime() < 3600000
            ) {
                result = 'suspicious';
            } else {
                result = scanCount >= 3 ? 'suspicious' : 'warning';
            }
            message = `⚠️ Mã bạn kiểm tra đã được quét vào lúc ${hours} giờ ${minutes} phút ngày ${day} tháng ${month} năm ${year}. Lưu ý kiểm tra kĩ vì có thể không phải hàng chính hãng.`;

            scan_warning = {
                is_first_scan: false,
                total_previous_scans: scanCount,
                first_scanned_at: firstScanRecord.scanned_at,
                first_scanned_from_ip: firstScanRecord.ip_address || 'N/A',
                first_scanned_location: firstScanRecord.geo_city
                    ? `${firstScanRecord.geo_city}, ${firstScanRecord.geo_country}`
                    : 'N/A',
                risk_level:
                    scanCount >= 5
                        ? 'Rất cao — có khả năng hàng giả'
                        : scanCount >= 3
                          ? 'Cao — nghi ngờ hàng giả'
                          : 'Trung bình — cần kiểm tra thêm',
                all_scan_times: previousScans.map(s => s.scanned_at),
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
        await db.run(
            `
      UPDATE scan_events SET result = $1, fraud_score = $2, trust_score = $3, response_time_ms = $4 WHERE id = $5
    `,
            [result, fraudResult.fraudScore, trustResult.score, responseTime, scanId]
        );

        // Step 8: Blockchain seal
        const seal = await blockchainEngine.seal('QRValidated', scanId, {
            product_id: qrCode.product_id,
            result,
            fraud_score: fraudResult.fraudScore,
            bulk_scan_detected: req.bulkScanDetected || false,
            is_replay: req.isReplay || false,
            trust_score: trustResult.score,
        });

        eventBus.emitEvent(EVENT_TYPES.QR_VALIDATED, {
            scan_id: scanId,
            product_name: product ? product.name : 'Unknown',
            result,
            fraud_score: fraudResult.fraudScore,
            trust_score: trustResult.score,
            response_time_ms: responseTime,
        });

        res.json({
            valid: result === 'valid',
            result,
            message,
            scan_id: scanId,
            scan_verification: {
                is_first_scan: isFirstScan,
                total_scans: scanCount + 1,
                // TC21-OWNERSHIP-SCAN: Add ownership status
                ownership_claimed: await (async () => {
                    try {
                        const c = await db.get('SELECT id FROM ownership_claims WHERE qr_code_id = $1', [qrCode.id]);
                        return !!c;
                    } catch (_) {
                        return false;
                    }
                })(),
                ...(scan_warning || {}),
            },
            product: product
                ? {
                      id: product.id,
                      name: product.name,
                      sku: product.sku,
                      manufacturer: product.manufacturer,
                      category: product.category,
                      origin_country: product.origin_country,
                  }
                : null,
            fraud: {
                score: fraudResult.fraudScore,
                alerts: fraudResult.alerts.length,
                details: fraudResult.alerts.map(a => ({
                    type: a.type,
                    severity: a.severity,
                    description: a.description,
                })),
                explainability: fraudResult.explainability,
            },
            trust: {
                score: trustResult.score,
                grade: trustResult.grade,
                factors: trustResult.explanation,
            },
            blockchain: {
                sealed: true,
                block_index: seal.block_index,
                data_hash: seal.data_hash,
                merkle_root: seal.merkle_root,
            },
            // TC21-ENRICHED: Reuse analytics + ownership
            previously_verified: !isFirstScan,
            reuse_analytics: {
                total_scans: scanCount + 1,
                is_first_scan: isFirstScan,
                unique_devices: 'see scan_verification',
                reuse_risk: scanCount >= 10 ? 'CRITICAL' : scanCount >= 5 ? 'HIGH' : scanCount >= 3 ? 'MEDIUM' : 'LOW',
            },
            risk_assessment: riskResult
                ? { score: riskResult.risk_score, level: riskResult.decision, action: riskResult.auto_action }
                : null,
            hmac_valid: !req._hmacMismatch,
            response_time_ms: responseTime,
        });
    } catch (err) {
        logger.error('QR Validation error:', err);
        res.status(500).json({ error: 'Validation failed', response_time_ms: Date.now() - startTime });
    }
});

// ─── POST /api/qr/generate — Bulk QR Code Generation ────────────────────────
router.post('/generate', async (req, res) => {
    try {
        const { product_id, quantity = 1, batch_id, prefix } = req.body;

        if (!product_id) {
            return res.status(400).json({ error: 'product_id is required' });
        }

        const qty = Math.min(Math.max(1, parseInt(quantity) || 1), 10000);

        // Verify product exists (org-scoped)
        // ATK-02 FIX: Always scope product lookup
        let prodSql = 'SELECT id, name, sku FROM products WHERE id = ?';
        const prodParams = [product_id];
        const effectiveOrgId2 = req.orgId || req.user?.orgId || req.user?.org_id;
        if (effectiveOrgId2) {
            prodSql += ' AND org_id = ?';
            prodParams.push(effectiveOrgId2);
        }
        const product = await db.prepare(prodSql).get(...prodParams);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Determine org_id from the product or the logged-in user
        const orgId = req.orgId || req.user?.org_id || null;

        // Generate unique codes
        const codePrefix = prefix || product.sku || 'TC';
        const year = new Date().getFullYear();
        const generated = [];

        for (let i = 0; i < qty; i++) {
            // ATK-01 FIX: Crypto-random sequence
            const seq = crypto.randomBytes(8).toString('hex');
            const hmac = crypto
                .createHmac('sha256', process.env.QR_SECRET || process.env.JWT_SECRET || 'tc-default-key')
                .update(product_id + seq + i)
                .digest('hex')
                .slice(0, 8);
            const qrData = `${codePrefix}-${year}-${seq}-${hmac}`;

            const id = uuidv4();
            try {
                await db.run(
                    `
                    INSERT INTO qr_codes (id, product_id, qr_data, org_id, status, generated_by, generated_at)
                    VALUES (?, ?, ?, ?, 'active', ?, NOW())
                `,
                    [id, product_id, qrData, orgId, req.user?.id || 'system']
                );

                generated.push({
                    id,
                    code: qrData,
                    product_id,
                    product_name: product.name,
                    status: 'active',
                    created_at: new Date().toISOString(),
                });
            } catch (dupErr) {
                // Skip duplicates and continue
                continue;
            }
        }

        eventBus.emitEvent(EVENT_TYPES.QR_VALIDATED || 'qr.generate', {
            count: generated.length,
            product_id,
            product_name: product.name,
            generated_by: req.user?.email || 'system',
        });

        res.json({
            success: true,
            message: `Generated ${generated.length} QR codes for ${product.name}`,
            count: generated.length,
            codes: generated.slice(0, 100), // Return max 100 in response
            product: { id: product.id, name: product.name, sku: product.sku },
        });
    } catch (err) {
        logger.error('QR Generate error:', err);
        res.status(500).json({ error: 'Failed to generate codes' });
    }
});

// TC21-OWNERSHIP-CLAIM: POST /api/qr/claim — Register product ownership
router.post('/claim', async (req, res) => {
    try {
        const { qr_data, claimer_name, claimer_email, claimer_phone } = req.body;
        if (!qr_data) return res.status(400).json({ error: 'qr_data is required' });

        // Look up QR code
        const qrCode = await db.get('SELECT id, product_id, org_id FROM qr_codes WHERE qr_data = $1', [qr_data]);
        if (!qrCode) return res.status(404).json({ error: 'QR code not found' });

        // Check if already claimed
        const existing = await db.get(
            'SELECT id, claimer_name, claimed_at FROM ownership_claims WHERE qr_code_id = $1',
            [qrCode.id]
        );
        if (existing) {
            return res.json({
                claimed: true,
                already_claimed: true,
                claimed_by: existing.claimer_name || 'Anonymous',
                claimed_at: existing.claimed_at,
                message:
                    '⚠️ Sản phẩm này đã được đăng ký sở hữu bởi người khác. Nếu bạn mua hàng chính hãng, hãy liên hệ nhà sản xuất.',
            });
        }

        // Register ownership
        const claimId = require('uuid').v4();
        const deviceFp = req.body.device_fingerprint || req.headers['user-agent'] || '';
        const ipAddr = req.ip || req.body.ip_address || '';

        await db.run(
            `INSERT INTO ownership_claims (id, qr_code_id, product_id, claimer_device, claimer_ip, claimer_name, claimer_email, claimer_phone, org_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                claimId,
                qrCode.id,
                qrCode.product_id,
                deviceFp,
                ipAddr,
                claimer_name || null,
                claimer_email || null,
                claimer_phone || null,
                qrCode.org_id,
            ]
        );

        // Audit
        try {
            await db.run(
                `INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details, ip_address)
                VALUES ($1, 'customer', 'ownership_claimed', 'product', $2, $3, $4)`,
                [
                    require('uuid').v4(),
                    qrCode.product_id,
                    JSON.stringify({ qr_code_id: qrCode.id, claimer: claimer_name || 'Anonymous' }),
                    ipAddr,
                ]
            );
        } catch (_) {}

        res.json({
            claimed: true,
            already_claimed: false,
            claim_id: claimId,
            product_id: qrCode.product_id,
            message: '✅ Đăng ký sở hữu thành công! Bạn là chủ sở hữu hợp pháp của sản phẩm này.',
        });
    } catch (err) {
        logger.error('Ownership claim error:', err);
        res.status(500).json({ error: 'Claim failed' });
    }
});

// TC21-OWNERSHIP: GET /api/qr/ownership/:qr_data — Check ownership status
router.get('/ownership/:qr_data', async (req, res) => {
    try {
        const qrCode = await db.get('SELECT id, product_id FROM qr_codes WHERE qr_data = $1', [req.params.qr_data]);
        if (!qrCode) return res.status(404).json({ error: 'QR code not found' });

        const claim = await db.get(
            'SELECT id, claimer_name, claimed_at, status FROM ownership_claims WHERE qr_code_id = $1',
            [qrCode.id]
        );

        const totalScans = await db.get('SELECT COUNT(*) as c FROM scan_events WHERE qr_code_id = $1', [qrCode.id]);
        const uniqueDevices = await db.get(
            'SELECT COUNT(DISTINCT device_fingerprint) as c FROM scan_events WHERE qr_code_id = $1',
            [qrCode.id]
        );
        const fingerprints = await db.get(
            'SELECT COUNT(DISTINCT ip_hash) as unique_ips, SUM(scan_count) as total FROM qr_scan_fingerprints WHERE qr_code_id = $1',
            [qrCode.id]
        );

        res.json({
            product_id: qrCode.product_id,
            ownership: claim
                ? {
                      claimed: true,
                      owner: claim.claimer_name || 'Anonymous',
                      claimed_at: claim.claimed_at,
                      status: claim.status,
                  }
                : { claimed: false },
            scan_analytics: {
                total_scans: parseInt(totalScans?.c || 0),
                unique_devices: parseInt(uniqueDevices?.c || 0),
                unique_ips: parseInt(fingerprints?.unique_ips || 0),
                reuse_risk: (fingerprints?.unique_ips || 0) >= 4 ? 'HIGH' : 'LOW',
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Lookup failed' });
    }
});

// ─── GET /api/qr/scan-history ────────────────────────────────────────────────
router.get('/scan-history', async (req, res) => {
    try {
        const { product_id, limit = 50 } = req.query;
        const orgId = req.user?.org_id || req.user?.orgId;
        let query = `
      SELECT se.*, p.name as product_name, p.sku as product_sku
      FROM scan_events se
      LEFT JOIN products p ON se.product_id = p.id
    `;
        const params = [];
        const conditions = [];

        if (orgId && req.user?.role !== 'super_admin') {
            conditions.push('se.org_id = ?');
            params.push(orgId);
        }
        if (product_id) {
            conditions.push('se.product_id = ?');
            params.push(product_id);
        }
        if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');

        query += ' ORDER BY se.scanned_at DESC LIMIT ?';
        params.push(Math.min(Number(limit) || 50, 200));

        const scans = await db.prepare(query).all(...params);
        res.json({ scans });
    } catch (err) {
        logger.error('Scan history error:', err);
        res.status(500).json({ error: 'Failed to fetch scan history' });
    }
});

// ─── GET /api/qr/fraud-alerts ────────────────────────────────────────────────
router.get('/fraud-alerts', async (req, res) => {
    try {
        const { status = 'open', limit = 50 } = req.query;
        const alerts = await db.all(
            `
      SELECT fa.*, p.name as product_name, p.sku as product_sku
      FROM fraud_alerts fa
      LEFT JOIN products p ON fa.product_id = p.id
      WHERE fa.status = ?
      ORDER BY fa.created_at DESC LIMIT ?
    `,
            [status, Math.min(Number(limit) || 50, 200)]
        );

        res.json({ alerts });
    } catch (err) {
        logger.error('Fraud alerts error:', err);
        res.status(500).json({ error: 'Failed to fetch fraud alerts' });
    }
});

// ─── GET /api/qr/blockchain ─────────────────────────────────────────────────
router.get('/blockchain', async (req, res) => {
    try {
        const stats = await blockchainEngine.getStats();
        const recent = await blockchainEngine.getRecent(20);
        res.json({ stats, recent_seals: recent });
    } catch (err) {
        logger.error('Blockchain error:', err);
        res.status(500).json({ error: 'Failed to fetch blockchain data' });
    }
});

// ─── GET /api/qr/blockchain/verify ──────────────────────────────────────────
router.get('/blockchain/verify', async (req, res) => {
    try {
        const verification = await blockchainEngine.verifyChain();
        res.json(verification);
    } catch (err) {
        logger.error('Blockchain verify error:', err);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// ─── GET /api/qr/dashboard-stats ─────────────────────────────────────────────
router.get('/dashboard-stats', async (req, res) => {
    try {
        const oid = req.orgId || req.user?.org_id || req.user?.orgId;
        const orgF = oid ? ' WHERE org_id = ?' : '';
        const orgP = oid ? [oid] : [];
        // NODE-BP-1: Parallelize independent DB queries
        const [totalProducts, totalScans, todayScans, openAlerts, avgTrustScore, totalSeals] = await Promise.all([
            db.prepare('SELECT COUNT(*) as count FROM products' + orgF).get(...orgP),
            db.prepare('SELECT COUNT(*) as count FROM scan_events' + orgF).get(...orgP),
            db
                .prepare(
                    `SELECT COUNT(*) as count FROM scan_events WHERE DATE(scanned_at) = DATE('now')` +
                        (oid ? ' AND org_id = ?' : '')
                )
                .get(...orgP),
            db
                .prepare(
                    `SELECT COUNT(*) as count FROM fraud_alerts WHERE status = 'open'` + (oid ? ' AND org_id = ?' : '')
                )
                .get(...orgP),
            db
                .prepare(
                    'SELECT AVG(trust_score) as avg FROM products WHERE trust_score > 0' +
                        (oid ? ' AND org_id = ?' : '')
                )
                .get(...orgP),
            db.prepare('SELECT COUNT(*) as count FROM blockchain_seals' + orgF).get(...orgP),
        ]);

        const [scansByResult, alertsBySeverity, recentActivity, scanTrend] = await Promise.all([
            db
                .prepare(
                    'SELECT result, COUNT(*) as count FROM scan_events' +
                        (oid ? ' WHERE org_id = ?' : '') +
                        ' GROUP BY result'
                )
                .all(...orgP),
            db
                .prepare(
                    `SELECT severity, COUNT(*) as count FROM fraud_alerts WHERE status = 'open'` +
                        (oid ? ' AND org_id = ?' : '') +
                        ' GROUP BY severity'
                )
                .all(...orgP),
            db
                .prepare(
                    `SELECT se.id, se.result, se.fraud_score, se.trust_score, se.scanned_at, p.name as product_name
              FROM scan_events se LEFT JOIN products p ON se.product_id = p.id` +
                        (oid ? ' WHERE se.org_id = ?' : '') +
                        `
              ORDER BY se.scanned_at DESC LIMIT 10`
                )
                .all(...orgP),
            db
                .prepare(
                    `SELECT DATE(scanned_at) as day, COUNT(*) as count FROM scan_events
              WHERE scanned_at > (NOW() - interval '7 days')` +
                        (oid ? ' AND org_id = ?' : '') +
                        ` GROUP BY DATE(scanned_at) ORDER BY day ASC LIMIT 1000`
                )
                .all(...orgP),
        ]);

        // ── CIE (Carbon Integrity Engine) metrics ──
        const orgId = req.orgId || req.user?.org_id || req.user?.orgId || null;
        let cieAnomalies = 0,
            cieSealedCIPs = 0,
            cieAnchoredProofs = 0,
            cieIntegrity = 87;
        try {
            // Anomalies = open fraud alerts
            cieAnomalies = openAlerts.count;
            // Sealed CIPs = distinct carbon passport entries (products with carbon data)
            const sealedRes = orgId
                ? await db.get('SELECT COUNT(*) as c FROM products WHERE org_id = ? AND carbon_footprint_kgco2e > 0', [
                      orgId,
                  ])
                : await db.get('SELECT COUNT(*) as c FROM products WHERE carbon_footprint_kgco2e > 0');
            cieSealedCIPs = sealedRes?.c || 0;
            // Anchored proofs = blockchain seals
            cieAnchoredProofs = totalSeals.count;
            // Integrity score = weighted composite (trust + coverage + blockchain)
            const trustPart = Math.min(30, Math.round(((avgTrustScore.avg || 0) / 100) * 30));
            const coveragePart =
                totalProducts.count > 0 ? Math.min(40, Math.round((cieSealedCIPs / totalProducts.count) * 40)) : 0;
            const blockchainPart =
                cieAnchoredProofs > 0 ? Math.min(30, Math.round(Math.min(cieAnchoredProofs / 10, 1) * 30)) : 0;
            cieIntegrity = trustPart + coveragePart + blockchainPart;
        } catch (_) {}

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
            scan_trend: scanTrend,
            // CIE metrics
            cie_integrity_score: cieIntegrity,
            cie_anomalies: cieAnomalies,
            cie_sealed_cips: cieSealedCIPs,
            cie_anchored_proofs: cieAnchoredProofs,
        });
    } catch (err) {
        logger.error('Dashboard stats error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard stats' });
    }
});

// ─── GET /api/qr/events ─────────────────────────────────────────────────────
router.get('/events', async (req, res) => {
    try {
        const events = eventBus.getRecentEvents(50);
        res.json({ events });
    } catch (e) {
        logger.error(e);
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
                        height: { ideal: 720 },
                    },
                },
                decoder: {
                    library: 'jsQR',
                    cdn: 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
                    interval_ms: 100,
                },
            },
            supported_formats: ['QR_CODE', 'DATA_MATRIX', 'CODE_128', 'EAN_13'],
            offline_capable: true,
            instructions: {
                step1: 'Grant camera permission when prompted',
                step2: 'Point camera at the QR code',
                step3: 'Hold steady for 1-2 seconds',
                step4: 'Result appears automatically',
            },
            tips: [
                'Ensure adequate lighting',
                'Hold device 10-20cm from QR code',
                'Keep QR code flat and visible',
                'Works offline — scans are queued for sync',
            ],
        });
    } catch (e) {
        logger.error(e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ─── POST /api/qr/mobile-scan — Mobile scan with image data ────────────────
router.post('/mobile-scan', bulkScanDetector, replayDetector, validate(schemas.qrScan), async (req, res) => {
    const startTime = Date.now();
    try {
        const { qr_data, image_data, device_info } = req.body;
        if (!qr_data) return res.status(400).json({ error: 'qr_data required' });

        // Reuse the core validation logic
        const qrCode = await db.get('SELECT * FROM qr_codes WHERE qr_data = ?', [qr_data]);
        if (!qrCode) {
            // TC-21 FIX: Log counterfeit scan event + fingerprint
            const scanId = require('uuid').v4();
            const crypto = require('crypto');
            const ipAddr = req.ip || req.body.ip_address || '';
            const devFp = req.body.device_fingerprint || req.body.device_info?.model || '';
            const ipHash = crypto.createHash('sha256').update(ipAddr).digest('hex').substring(0, 16);
            const devHash = crypto.createHash('sha256').update(devFp).digest('hex').substring(0, 16);

            try {
                // Log scan event for counterfeit
                await db.run(
                    `INSERT INTO scan_events (id, scan_type, device_fingerprint, ip_address, result, fraud_score, scanned_at, org_id)
                    VALUES ($1, 'mobile_camera', $2, $3, 'counterfeit', 1.0, NOW(), $4)`,
                    [scanId, devFp, ipAddr, req.orgId || '']
                );

                // Track fingerprint (upsert)
                await db.run(
                    `INSERT INTO qr_scan_fingerprints (id, qr_data, ip_hash, device_hash, ip_address, scan_count)
                    VALUES ($1, $2, $3, $4, $5, 1)
                    ON CONFLICT (qr_data, device_hash) DO UPDATE SET scan_count = qr_scan_fingerprints.scan_count + 1, last_seen = NOW()`,
                    [require('uuid').v4(), qr_data, ipHash, devHash, ipAddr]
                );

                // TC-21 FIX: Check reuse pattern
                const uniqueIPs = await db.get(
                    `SELECT COUNT(DISTINCT ip_hash) as c FROM qr_scan_fingerprints WHERE qr_data = $1`,
                    [qr_data]
                );
                const totalScans = await db.get(
                    `SELECT SUM(scan_count) as c FROM qr_scan_fingerprints WHERE qr_data = $1`,
                    [qr_data]
                );

                if (uniqueIPs?.c >= 4 && totalScans?.c >= 5) {
                    // Auto-flag as reuse attack
                    try {
                        await db.run(
                            `INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details, ip_address, created_at)
                            VALUES ($1, 'system', 'qr_reuse_detected', 'qr_code', $2, $3, $4, NOW())`,
                            [
                                require('uuid').v4(),
                                qr_data,
                                JSON.stringify({
                                    unique_ips: uniqueIPs.c,
                                    total_scans: totalScans.c,
                                    threshold: '4 IPs / 5 scans',
                                }),
                                ipAddr,
                            ]
                        );
                    } catch (_) {}
                }
            } catch (logErr) {
                logger.error('TC21-LOG:', logErr.message);
            }

            return res.json({
                valid: false,
                result: 'counterfeit',
                message: '❌ QR CODE NOT RECOGNIZED',
                response_time_ms: Date.now() - startTime,
                scan_type: 'mobile_camera',
            });
        }

        // TC21-MOBILE-REUSE: Check reuse pattern
        const mobileReuseResult = await checkQrReuse(
            qrCode.id,
            qr_data,
            req.ip || req.body.ip_address,
            req.body.device_fingerprint || req.body.device_info?.model,
            db
        );
        if (mobileReuseResult.blocked) {
            return res.json({
                valid: false,
                result: 'blocked',
                message: '🚫 QR CODE BLOCKED — Reuse detected',
                reuse_detected: true,
                unique_ips: mobileReuseResult.unique_ips,
                total_scans: mobileReuseResult.total_scans,
                response_time_ms: Date.now() - startTime,
                scan_type: 'mobile_camera',
            });
        }

        let mpSql = 'SELECT * FROM products WHERE id = ?';
        const mpParams = [qrCode.product_id];
        if (req.orgId) {
            mpSql += ' AND org_id = ?';
            mpParams.push(req.orgId);
        }
        const product = await db.prepare(mpSql).get(...mpParams);
        const scanId = uuidv4();

        await db.run(
            `
      INSERT INTO scan_events (id, qr_code_id, product_id, scan_type, device_fingerprint, user_agent, result, scanned_at)
      VALUES (?, ?, ?, 'mobile_camera', ?, ?, 'valid', NOW())
    `,
            [
                scanId,
                qrCode.id,
                qrCode.product_id,
                device_info?.model || 'mobile',
                device_info?.userAgent || 'Mobile Camera',
            ]
        );

        // INV-3-MOBILE: Check supply chain status for mobile scans
        let mobileScWarning = null;
        try {
            const lastEvt = await db.get(
                'SELECT event_type FROM supply_chain_events WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1',
                [qrCode.product_id]
            );
            if (!lastEvt || ['commission', 'pack'].includes(lastEvt.event_type)) {
                mobileScWarning = 'Product not yet in distribution';
            }
        } catch (_) {}

        const fraudResult = await engineClient.fraudAnalyze({
            id: scanId,
            qr_code_id: qrCode.id,
            product_id: qrCode.product_id,
        });
        const trustResult = trustEngine.calculate(qrCode.product_id, fraudResult.fraudScore);

        await db
            .prepare('UPDATE scan_events SET fraud_score = ?, trust_score = ?, response_time_ms = ? WHERE id = ?')
            .run(fraudResult.fraudScore, trustResult.score, Date.now() - startTime, scanId);

        res.json({
            valid: true,
            result: fraudResult.fraudScore > 0.7 ? 'suspicious' : 'valid',
            message: fraudResult.fraudScore > 0.7 ? '⚠️ SUSPICIOUS' : '✅ PRODUCT VERIFIED',
            scan_id: scanId,
            scan_type: 'mobile_camera',
            product: product
                ? { id: product.id, name: product.name, sku: product.sku, manufacturer: product.manufacturer }
                : null,
            fraud_score: fraudResult.fraudScore,
            trust_score: trustResult.score,
            trust_grade: trustResult.grade,
            supply_chain_status: supplyChainWarning ? 'warning' : 'verified',
            supply_chain_warning: supplyChainWarning || null, // INV-3-RESP
            response_time_ms: Date.now() - startTime,
        });
    } catch (err) {
        res.status(500).json({ error: 'Mobile scan failed', response_time_ms: Date.now() - startTime });
    }
});

// ─── GET /api/qr/public/check/:productId — Freemium public trust check ──────
// No auth required. Rate limited per IP. Returns limited data + signup CTA.
const rateLimit = require('express-rate-limit');
const { withTransaction } = require('../middleware/transaction');
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
        const product = await db
            .prepare('SELECT id, name, manufacturer, sku, trust_score FROM products WHERE id = ?')
            .get(req.params.productId);

        if (!product) {
            return res.status(404).json({
                found: false,
                message: 'Product not found in TrustChecker registry',
                verified_by: 'TrustChecker Free',
            });
        }

        const scanCount = await db
            .prepare('SELECT COUNT(*) as c FROM scan_events WHERE product_id = ?')
            .get(product.id);

        const recentScans = await db
            .prepare(
                "SELECT COUNT(*) as c FROM scan_events WHERE product_id = ? AND scanned_at >= NOW() - INTERVAL '30 days'"
            )
            .get(product.id);

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
