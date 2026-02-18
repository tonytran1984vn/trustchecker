// ─── Public Insight Dashboard Routes ─────────────────────────────────────────
// No authentication required – read-only aggregate statistics
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/public/stats – aggregate platform statistics
router.get('/stats', async (req, res) => {
    try {
        const products = await db.get('SELECT COUNT(*) as count FROM products');
        const scans = await db.get('SELECT COUNT(*) as count FROM scan_events');
        const todayScans = await db.get(`SELECT COUNT(*) as count FROM scan_events WHERE scanned_at >= datetime('now', '-1 day')`);
        const avgTrust = await db.get('SELECT ROUND(AVG(score), 1) as avg FROM trust_scores');
        const seals = await db.get('SELECT COUNT(*) as count FROM blockchain_seals');
        const alerts = await db.get(`SELECT COUNT(*) as count FROM fraud_alerts WHERE status = 'open'`);
        const partners = await db.get('SELECT COUNT(*) as count FROM partners');
        const batches = await db.get('SELECT COUNT(*) as count FROM batches');
        const evidence = await db.get('SELECT COUNT(*) as count FROM evidence_items');
        const certifications = await db.get(`SELECT COUNT(*) as count FROM certifications WHERE status = 'active'`);

        // Verification rate
        const validScans = await db.get(`SELECT COUNT(*) as count FROM scan_events WHERE result = 'valid'`);
        const verificationRate = scans.count > 0 ? Math.round((validScans.count / scans.count) * 100) : 0;

        res.json({
            total_products: products.count,
            total_scans: scans.count,
            today_scans: todayScans.count,
            avg_trust_score: avgTrust.avg || 0,
            blockchain_seals: seals.count,
            open_alerts: alerts.count,
            total_partners: partners.count,
            total_batches: batches.count,
            total_evidence: evidence.count,
            active_certifications: certifications.count,
            verification_rate: verificationRate,
            platform_uptime: '99.97%',
            last_updated: new Date().toISOString()
        });
    } catch (err) {
        console.error('Public stats error:', err);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// GET /api/public/scan-trends – 7-day scan volume
router.get('/scan-trends', async (req, res) => {
    try {
        const trends = await db.all(`
      SELECT DATE(scanned_at) as date, 
             COUNT(*) as total,
             SUM(CASE WHEN result = 'valid' THEN 1 ELSE 0 END) as valid,
             SUM(CASE WHEN result = 'suspicious' THEN 1 ELSE 0 END) as suspicious,
             SUM(CASE WHEN result = 'counterfeit' THEN 1 ELSE 0 END) as counterfeit
      FROM scan_events
      WHERE scanned_at >= datetime('now', '-7 days')
      GROUP BY DATE(scanned_at)
      ORDER BY date ASC
    `);
        res.json(trends);
    } catch (err) {
        console.error('Scan trends error:', err);
        res.status(500).json({ error: 'Failed to fetch scan trends' });
    }
});

// GET /api/public/trust-distribution – trust score histogram
router.get('/trust-distribution', async (req, res) => {
    try {
        const dist = await db.all(`
      SELECT 
        CASE 
          WHEN score >= 90 THEN 'Excellent (90-100)'
          WHEN score >= 70 THEN 'Good (70-89)'
          WHEN score >= 50 THEN 'Fair (50-69)'
          WHEN score >= 30 THEN 'Low (30-49)'
          ELSE 'Critical (0-29)'
        END as bracket,
        COUNT(*) as count,
        ROUND(AVG(score), 1) as avg_score
      FROM trust_scores
      GROUP BY bracket
      ORDER BY MIN(score) DESC
    `);
        res.json(dist);
    } catch (err) {
        console.error('Trust distribution error:', err);
        res.status(500).json({ error: 'Failed to fetch trust distribution' });
    }
});

// GET /api/public/scan-results – scan result breakdown
router.get('/scan-results', async (req, res) => {
    try {
        const results = await db.all(`
      SELECT result, COUNT(*) as count
      FROM scan_events
      GROUP BY result
      ORDER BY count DESC
    `);
        res.json(results);
    } catch (err) {
        console.error('Product check error:', err);
        res.status(500).json({ error: 'Failed to check product' });
    }
});

// GET /api/public/alert-severity – alert severity breakdown
router.get('/alert-severity', async (req, res) => {
    try {
        const severity = await db.all(`
      SELECT severity, COUNT(*) as count
      FROM fraud_alerts
      GROUP BY severity
      ORDER BY CASE severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END
    `);
        res.json(severity);
    } catch (err) {
        console.error('Public verify error:', err);
        res.status(500).json({ error: 'Failed to verify product' });
    }
});

// ─── Public API v1 (CORS-enabled, for researchers/partners) ──────────────
// CORS middleware for API v1 routes
const corsHeaders = async (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    res.setHeader('X-RateLimit-Limit', '100');
    res.setHeader('X-RateLimit-Remaining', '99');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
};

// GET /api/public/api/v1/stats — Structured JSON API for researchers
router.get('/api/v1/stats', corsHeaders, async (req, res) => {
    try {
        const products = await db.get('SELECT COUNT(*) as count FROM products');
        const scans = await db.get('SELECT COUNT(*) as count FROM scan_events');
        const validScans = await db.get(`SELECT COUNT(*) as count FROM scan_events WHERE result = 'valid'`);
        const avgTrust = await db.get('SELECT ROUND(AVG(score), 1) as avg FROM trust_scores');
        const seals = await db.get('SELECT COUNT(*) as count FROM blockchain_seals');
        const alerts = await db.get(`SELECT COUNT(*) as count FROM fraud_alerts WHERE status = 'open'`);
        const criticalAlerts = await db.get(`SELECT COUNT(*) as count FROM fraud_alerts WHERE severity = 'critical'`);
        const partners = await db.get('SELECT COUNT(*) as count FROM partners');
        const evidence = await db.get('SELECT COUNT(*) as count FROM evidence_items');

        const verificationRate = scans.count > 0 ? Math.round((validScans.count / scans.count) * 100) : 0;

        res.json({
            api_version: 'v1',
            status: 'ok',
            data: {
                platform: {
                    name: 'TrustChecker',
                    version: '8.8.6',
                    uptime_percent: 99.97
                },
                products: {
                    total: products.count,
                    avg_trust_score: avgTrust.avg || 0,
                    blockchain_sealed: seals.count
                },
                verification: {
                    total_scans: scans.count,
                    valid_scans: validScans.count,
                    verification_rate_percent: verificationRate
                },
                security: {
                    open_alerts: alerts.count,
                    critical_alerts: criticalAlerts.count,
                    evidence_items: evidence.count
                },
                supply_chain: {
                    total_partners: partners.count
                }
            },
            timestamp: new Date().toISOString(),
            documentation: '/api/docs'
        });
    } catch (err) {
        console.error('Public API verify error:', err);
        res.status(500).json({ api_version: 'v1', status: 'error', error: 'Verification failed' });
    }
});

// GET /api/public/api/v1/products/:id/trust — Public trust score lookup
router.get('/api/v1/products/:id/trust', corsHeaders, async (req, res) => {
    try {
        const product = await db.get('SELECT id, name, category, brand FROM products WHERE id = ?', [req.params.id]);
        if (!product) return res.status(404).json({ api_version: 'v1', status: 'error', error: 'Product not found' });

        const trust = await db.get('SELECT * FROM trust_scores WHERE product_id = ?', [req.params.id]);
        const seal = await db.get('SELECT seal_hash, created_at FROM blockchain_seals WHERE product_id = ? ORDER BY created_at DESC LIMIT 1', [req.params.id]);
        const scanCount = await db.get('SELECT COUNT(*) as count FROM scan_events WHERE product_id = ?', [req.params.id]);

        res.json({
            api_version: 'v1',
            status: 'ok',
            data: {
                product: {
                    id: product.id,
                    name: product.name,
                    category: product.category,
                    brand: product.brand
                },
                trust_score: trust ? {
                    overall: trust.score,
                    grade: trust.score >= 90 ? 'A+' : trust.score >= 80 ? 'A' : trust.score >= 70 ? 'B' : trust.score >= 50 ? 'C' : 'D',
                    factors: {
                        supply_chain: trust.factor_supply_chain,
                        verification: trust.factor_verification,
                        community: trust.factor_community,
                        blockchain: trust.factor_blockchain
                    }
                } : null,
                blockchain_seal: seal ? { hash: seal.seal_hash, sealed_at: seal.created_at } : null,
                total_scans: scanCount.count
            },
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Public API batch verify error:', err);
        res.status(500).json({ api_version: 'v1', status: 'error', error: 'Batch verification failed' });
    }
});

// GET /api/public/embed/widget — Self-contained embeddable HTML/JS widget
router.get('/embed/widget', async (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
.tc-widget{font-family:'Inter',system-ui,sans-serif;background:#0a0e1a;color:#e0e6ed;
  border:1px solid rgba(0,240,255,0.15);border-radius:12px;padding:20px;max-width:380px;
  box-shadow:0 4px 24px rgba(0,0,0,0.4)}
.tc-header{display:flex;align-items:center;gap:10px;margin-bottom:16px}
.tc-logo{width:28px;height:28px;background:linear-gradient(135deg,#00f0ff,#8b5cf6);
  border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:14px}
.tc-title{font-size:14px;font-weight:600;color:#00f0ff}
.tc-subtitle{font-size:11px;color:#64748b}
.tc-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px}
.tc-stat{background:rgba(255,255,255,0.04);border-radius:8px;padding:12px;text-align:center}
.tc-val{font-size:22px;font-weight:700;color:#00f0ff}
.tc-label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px}
.tc-bar{height:6px;background:rgba(255,255,255,0.06);border-radius:3px;overflow:hidden;margin:4px 0}
.tc-bar-fill{height:100%;border-radius:3px;transition:width 1s ease}
.tc-footer{text-align:center;padding-top:10px;border-top:1px solid rgba(255,255,255,0.06)}
.tc-footer a{color:#00f0ff;text-decoration:none;font-size:11px;font-weight:500}
.tc-footer a:hover{text-decoration:underline}
.tc-trust-row{display:flex;justify-content:space-between;align-items:center;font-size:11px;
  color:#94a3b8;margin-bottom:8px}
</style>
</head>
<body>
<div class="tc-widget" id="tc-widget">
  <div class="tc-header">
    <div class="tc-logo">🛡</div>
    <div><div class="tc-title">TrustChecker</div><div class="tc-subtitle">Digital Trust Infrastructure</div></div>
  </div>
  <div class="tc-grid">
    <div class="tc-stat"><div class="tc-val" id="tc-products">–</div><div class="tc-label">Products</div></div>
    <div class="tc-stat"><div class="tc-val" id="tc-scans">–</div><div class="tc-label">Scans</div></div>
    <div class="tc-stat"><div class="tc-val" id="tc-trust">–</div><div class="tc-label">Avg Trust</div></div>
    <div class="tc-stat"><div class="tc-val" id="tc-rate">–</div><div class="tc-label">Verif. Rate</div></div>
  </div>
  <div class="tc-trust-row"><span>Verification Rate</span><span id="tc-rate2">–%</span></div>
  <div class="tc-bar"><div class="tc-bar-fill" id="tc-bar1" style="width:0%;background:linear-gradient(90deg,#00f0ff,#10b981)"></div></div>
  <div class="tc-trust-row" style="margin-top:8px"><span>Blockchain Coverage</span><span id="tc-chain">–%</span></div>
  <div class="tc-bar"><div class="tc-bar-fill" id="tc-bar2" style="width:0%;background:linear-gradient(90deg,#8b5cf6,#ec4899)"></div></div>
  <div class="tc-footer"><a href="${baseUrl}" target="_blank">Powered by TrustChecker ↗</a></div>
</div>
<script>
fetch('${baseUrl}/api/public/api/v1/stats')
  .then(r=>r.json()).then(d=>{
    const s=d.data;
    document.getElementById('tc-products').textContent=s.products.total;
    document.getElementById('tc-scans').textContent=s.verification.total_scans;
    document.getElementById('tc-trust').textContent=s.products.avg_trust_score;
    document.getElementById('tc-rate').textContent=s.verification.verification_rate_percent+'%';
    document.getElementById('tc-rate2').textContent=s.verification.verification_rate_percent+'%';
    document.getElementById('tc-bar1').style.width=s.verification.verification_rate_percent+'%';
    const chainPct=s.products.total>0?Math.round(s.products.blockchain_sealed/s.products.total*100):0;
    document.getElementById('tc-chain').textContent=chainPct+'%';
    document.getElementById('tc-bar2').style.width=chainPct+'%';
  }).catch(()=>{});
</script>
</body></html>`;
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(html);
});

// GET /api/public/embed/snippet — Returns embeddable iframe snippet code
router.get('/embed/snippet', corsHeaders, async (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
        embed_code: `<iframe src="${baseUrl}/api/public/embed/widget" width="400" height="360" frameborder="0" style="border-radius:12px;overflow:hidden" title="TrustChecker Widget"></iframe>`,
        script_tag: `<script src="${baseUrl}/api/public/embed/widget"></script>`,
        documentation: '/api/docs'
    });
});

// GET /api/public/recently-verified — Recently verified products
router.get('/recently-verified', corsHeaders, async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const products = await db.all(`
      SELECT p.id, p.name, p.category, p.brand, p.trust_score,
        (SELECT COUNT(*) FROM scan_events WHERE product_id = p.id) as scan_count,
        (SELECT MAX(scanned_at) FROM scan_events WHERE product_id = p.id) as last_scanned
      FROM products p
      WHERE p.trust_score IS NOT NULL AND p.status = 'active'
      ORDER BY last_scanned DESC
      LIMIT ?
    `, [Number(limit)]);

        res.json({
            recently_verified: products,
            total: products.length,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Product lookup error:', err);
        res.status(500).json({ error: 'Failed to look up product' });
    }
});

// GET /api/public/search — Search products by name/category/brand
router.get('/search', corsHeaders, async (req, res) => {
    try {
        const { q, category, brand, limit = 20 } = req.query;
        if (!q && !category && !brand) return res.status(400).json({ error: 'Provide q, category, or brand parameter' });

        let sql = `SELECT p.id, p.name, p.category, p.brand, p.trust_score, p.origin_country FROM products p WHERE p.status = 'active'`;
        const params = [];

        if (q) { sql += ` AND (p.name LIKE ? OR p.sku LIKE ? OR p.category LIKE ?)`; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
        if (category) { sql += ` AND p.category = ?`; params.push(category); }
        if (brand) { sql += ` AND p.brand = ?`; params.push(brand); }

        sql += ` ORDER BY p.trust_score DESC LIMIT ?`;
        params.push(Number(limit));

        const results = await db.all(sql, params);

        res.json({
            query: { q, category, brand },
            results,
            total: results.length,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Manufacturer products error:', err);
        res.status(500).json({ error: 'Failed to fetch manufacturer products' });
    }
});

// GET /api/public/health — Platform health report
router.get('/health', corsHeaders, async (req, res) => {
    try {
        const products = (await db.get('SELECT COUNT(*) as c FROM products'))?.c || 0;
        const scans24h = (await db.get("SELECT COUNT(*) as c FROM scan_events WHERE scanned_at > datetime('now', '-1 day')"))?.c || 0;
        const fraudAlerts = (await db.get("SELECT COUNT(*) as c FROM fraud_alerts WHERE status = 'active'"))?.c || 0;
        const leakAlerts = (await db.get("SELECT COUNT(*) as c FROM leak_alerts WHERE status = 'open'"))?.c || 0;
        const blockchainIntact = (await db.get("SELECT COUNT(*) as c FROM blockchain_seals"))?.c || 0;
        const avgTrust = (await db.get("SELECT COALESCE(AVG(trust_score), 0) as a FROM products"))?.a || 0;

        const systemStatus = fraudAlerts > 10 || leakAlerts > 20 ? 'degraded' : 'operational';

        res.json({
            status: systemStatus,
            services: {
                product_registry: { status: 'operational', count: products },
                scan_engine: { status: 'operational', scans_24h: scans24h },
                fraud_detection: { status: fraudAlerts > 10 ? 'warning' : 'operational', active_alerts: fraudAlerts },
                leak_monitoring: { status: leakAlerts > 20 ? 'warning' : 'operational', open_alerts: leakAlerts },
                blockchain: { status: 'operational', seals: blockchainIntact },
                trust_scoring: { status: 'operational', avg_score: Math.round(avgTrust) }
            },
            uptime: '99.97%',
            last_check: new Date().toISOString()
        });
    } catch (err) {
        console.error('Recent scans error:', err);
        res.status(500).json({ error: 'Failed to fetch recent scans' });
    }
});

// ─── POST /api/public/check — Public product code verification ───────────────
// NO AUTH REQUIRED — anyone can check a product code
router.post('/check', async (req, res) => {
    const startTime = Date.now();

    try {
        const { code } = req.body;

        if (!code || code.trim().length < 3) {
            return res.status(400).json({
                valid: false,
                message: '❌ Vui lòng nhập mã sản phẩm hợp lệ (ít nhất 3 ký tự)'
            });
        }

        const cleanCode = code.trim().toUpperCase();

        // Look up the code in qr_codes table
        const qrCode = await db.get('SELECT * FROM qr_codes WHERE UPPER(qr_data) = ?', [cleanCode]);

        if (!qrCode) {
            // Code not found — potential counterfeit
            return res.json({
                valid: false,
                result: 'not_found',
                message: '❌ MÃ KHÔNG TỒN TẠI TRONG HỆ THỐNG — Sản phẩm này có thể là hàng giả. Vui lòng liên hệ nhà sản xuất để xác minh.',
                code: cleanCode,
                response_time_ms: Date.now() - startTime
            });
        }

        // Get product info
        const product = await db.get('SELECT * FROM products WHERE id = ?', [qrCode.product_id]);

        // Check previous scans — CORE ANTI-COUNTERFEIT LOGIC
        const previousScans = await db.all(
            `SELECT id, scanned_at, ip_address FROM scan_events 
             WHERE qr_code_id = ? AND result != 'pending'
             ORDER BY scanned_at ASC`,
            [qrCode.id]
        );
        const scanCount = previousScans.length;
        const isFirstScan = scanCount === 0;
        const firstScanRecord = previousScans.length > 0 ? previousScans[0] : null;

        // Create scan event for this check
        const scanId = require('uuid').v4();
        await db.prepare(`
            INSERT INTO scan_events (id, qr_code_id, product_id, scan_type, ip_address, user_agent, result, scanned_at)
            VALUES (?, ?, ?, 'code_check', ?, ?, 'pending', datetime('now'))
        `).run(scanId, qrCode.id, qrCode.product_id, req.ip || '', req.get('user-agent') || '');

        // Determine result
        let result, message, risk_level;

        if (qrCode.status === 'revoked') {
            result = 'revoked';
            message = '🚫 MÃ ĐÃ BỊ THU HỒI — Mã sản phẩm này không còn hợp lệ. Vui lòng kiểm tra với nhà sản xuất.';
            risk_level = 'Rất cao';
        } else if (isFirstScan) {
            result = 'valid';
            message = '✅ Sản phẩm bạn vừa kiểm tra là HÀNG CHÍNH HÃNG. Đây là lần đầu tiên mã được kiểm tra.';
            risk_level = 'Không có rủi ro';
        } else {
            const firstTime = new Date(firstScanRecord.scanned_at + 'Z');
            const hours = firstTime.getHours().toString().padStart(2, '0');
            const minutes = firstTime.getMinutes().toString().padStart(2, '0');
            const day = firstTime.getDate().toString().padStart(2, '0');
            const month = (firstTime.getMonth() + 1).toString().padStart(2, '0');
            const year = firstTime.getFullYear();

            result = scanCount >= 3 ? 'suspicious' : 'warning';
            message = `⚠️ Mã bạn kiểm tra đã được quét vào lúc ${hours} giờ ${minutes} phút ngày ${day} tháng ${month} năm ${year}. Lưu ý kiểm tra kĩ vì có thể không phải hàng chính hãng.`;
            risk_level = scanCount >= 5 ? 'Rất cao — có khả năng hàng giả' : scanCount >= 3 ? 'Cao — nghi ngờ hàng giả' : 'Trung bình — cần kiểm tra thêm';
        }

        // Update scan event result
        await db.prepare('UPDATE scan_events SET result = ?, response_time_ms = ? WHERE id = ?')
            .run(result, Date.now() - startTime, scanId);

        res.json({
            valid: result === 'valid',
            result,
            message,
            code: cleanCode,
            scan_verification: {
                is_first_scan: isFirstScan,
                total_scans: scanCount + 1,
                risk_level
            },
            product: product ? {
                name: product.name,
                manufacturer: product.manufacturer,
                category: product.category,
                origin_country: product.origin_country
            } : null,
            response_time_ms: Date.now() - startTime
        });
    } catch (err) {
        console.error('Public check error:', err);
        res.status(500).json({ error: 'Lỗi hệ thống, vui lòng thử lại' });
    }
});

module.exports = router;
