const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const { eventBus, EVENT_TYPES } = require('../events');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();

// ─── Auth: all product routes require authentication ─────────────────────────
router.use(authMiddleware);

// ─── GET /api/products ───────────────────────────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { search, status, category, limit = 50, offset = 0 } = req.query;
        let query = 'SELECT * FROM products WHERE 1=1';
        const params = [];

        // Tenant scoping: non-super_admin only sees their org's products
        if (req.user.role !== 'super_admin' && req.user.orgId) {
            query += ' AND org_id = ?';
            params.push(req.user.orgId);
        }

        if (search) {
            query += ' AND (name LIKE ? OR sku LIKE ? OR manufacturer LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (category) {
            query += ' AND category = ?';
            params.push(category);
        }

        query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
        params.push(Number(limit), Math.max(Number(offset) || 0, 0));

        const products = await db.prepare(query).all(...params);
        const total = await db.prepare('SELECT COUNT(*) as count FROM products').get();

        res.json({ products, total: total.count });
    } catch (err) {
        console.error('Get products error:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// ─── GET /api/products/:id ───────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
    try {
        const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const qrCodes = await db.prepare('SELECT * FROM qr_codes WHERE product_id = ?').all(req.params.id);
        const recentScans = await db.prepare(`
      SELECT * FROM scan_events WHERE product_id = ? ORDER BY scanned_at DESC LIMIT 10
    `).all(req.params.id);
        const trustHistory = await db.prepare(`
      SELECT * FROM trust_scores WHERE product_id = ? ORDER BY calculated_at DESC LIMIT 10
    `).all(req.params.id);

        res.json({ product, qr_codes: qrCodes, recent_scans: recentScans, trust_history: trustHistory });
    } catch (err) {
        console.error('Get product error:', err);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// ─── POST /api/products ─────────────────────────────────────────────────────
router.post('/', requirePermission('product:create'), validate(schemas.createProduct), async (req, res) => {
    try {
        const { name, sku, description, category, manufacturer, batch_number, origin_country } = req.body;

        if (!name || !sku) {
            return res.status(400).json({ error: 'Name and SKU are required' });
        }

        const existing = await db.prepare('SELECT id FROM products WHERE sku = ?').get(sku);
        if (existing) {
            return res.status(409).json({ error: 'Product with this SKU already exists' });
        }

        const productId = uuidv4();
        const qrCodeId = uuidv4();
        const qrData = `TC:${productId}:${sku}:${Date.now()}`;

        // Generate QR code image
        const qrImageBase64 = await QRCode.toDataURL(qrData, {
            width: 300,
            margin: 2,
            color: { dark: '#0ff', light: '#0a0a1a' }
        });

        // Insert product
        await db.prepare(`
      INSERT INTO products (id, name, sku, description, category, manufacturer, batch_number, origin_country, registered_by, org_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(productId, name, sku, description || '', category || '', manufacturer || '', batch_number || '', origin_country || '', req.user.id, req.user.orgId || null);

        // Insert QR code
        await db.prepare(`
      INSERT INTO qr_codes (id, product_id, qr_data, qr_image_base64)
      VALUES (?, ?, ?, ?)
    `).run(qrCodeId, productId, qrData, qrImageBase64);

        // Audit log
        await db.prepare(`INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.user.id, 'PRODUCT_REGISTERED', 'product', productId, JSON.stringify({ name, sku }));

        eventBus.emitEvent(EVENT_TYPES.PRODUCT_REGISTERED, {
            product_id: productId,
            name,
            sku,
            registered_by: req.user.username
        });

        res.status(201).json({
            product: { id: productId, name, sku, trust_score: 100 },
            qr_code: { id: qrCodeId, qr_data: qrData, qr_image_base64: qrImageBase64 }
        });
    } catch (err) {
        console.error('Create product error:', err);
        res.status(500).json({ error: 'Failed to create product' });
    }
});

// ─── PUT /api/products/:id ───────────────────────────────────────────────────
router.put('/:id', authMiddleware, requirePermission('product:update'), async (req, res) => {
    try {
        const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const { name, description, category, manufacturer, batch_number, origin_country, status } = req.body;

        await db.prepare(`
      UPDATE products SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        manufacturer = COALESCE(?, manufacturer),
        batch_number = COALESCE(?, batch_number),
        origin_country = COALESCE(?, origin_country),
        status = COALESCE(?, status),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(name, description, category, manufacturer, batch_number, origin_country, status, req.params.id);

        res.json({ message: 'Product updated', id: req.params.id });
    } catch (err) {
        console.error('Update product error:', err);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// ─── POST /api/products/generate-code ────────────────────────────────────────
// Generate unique printable verification codes for products
router.post('/generate-code', authMiddleware, requirePermission('product:create'), async (req, res) => {
    try {
        const { product_id, format = 'random', brand_prefix, quantity = 1 } = req.body;

        if (!product_id) {
            return res.status(400).json({ error: 'product_id là bắt buộc' });
        }
        if (quantity < 1 || quantity > 100) {
            return res.status(400).json({ error: 'Số lượng phải từ 1 đến 100' });
        }

        const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(product_id);
        if (!product) {
            return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });
        }

        const generatedCodes = [];

        for (let i = 0; i < quantity; i++) {
            let code;
            let attempts = 0;

            // Generate unique code
            do {
                if (format === 'branded' && brand_prefix) {
                    // Format: BRAND-NAME-ABC12345
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    const nums = '0123456789';
                    let suffix = '';
                    for (let j = 0; j < 3; j++) suffix += chars[require('crypto').randomInt(chars.length)];
                    for (let j = 0; j < 5; j++) suffix += nums[require('crypto').randomInt(nums.length)];
                    code = `${brand_prefix.toUpperCase().replace(/[^A-Z0-9-]/g, '')}-${suffix}`;
                } else {
                    // Format: ABCDEFGH1234
                    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                    const nums = '0123456789';
                    let alphapart = '';
                    let numpart = '';
                    for (let j = 0; j < 8; j++) alphapart += chars[require('crypto').randomInt(chars.length)];
                    for (let j = 0; j < 4; j++) numpart += nums[require('crypto').randomInt(nums.length)];
                    code = alphapart + numpart;
                }
                attempts++;
            } while (await db.get('SELECT id FROM qr_codes WHERE qr_data = ?', [code]) && attempts < 50);

            if (attempts >= 50) {
                return res.status(500).json({ error: 'Không thể tạo mã duy nhất, thử lại sau' });
            }

            // Generate QR code image for this code
            const qrImageBase64 = await QRCode.toDataURL(code, {
                width: 300,
                margin: 2,
                color: { dark: '#0ff', light: '#0a0a1a' }
            });

            const qrId = uuidv4();
            await db.prepare(`
                INSERT INTO qr_codes (id, product_id, qr_data, qr_image_base64, org_id, generated_by)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(qrId, product_id, code, qrImageBase64, req.user.orgId || null, req.user.id);

            generatedCodes.push({
                id: qrId,
                code: code,
                qr_image_base64: qrImageBase64
            });
        }

        // Audit log
        await db.prepare(`INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.user.id, 'CODES_GENERATED', 'product', product_id,
                JSON.stringify({ quantity, format, codes: generatedCodes.map(c => c.code) }));

        eventBus.emitEvent(EVENT_TYPES.PRODUCT_REGISTERED, {
            product_id,
            product_name: product.name,
            action: 'codes_generated',
            quantity
        });

        res.status(201).json({
            message: `Đã tạo ${generatedCodes.length} mã xác thực`,
            product: { id: product.id, name: product.name, sku: product.sku },
            codes: generatedCodes,
            instructions: 'In các mã này và dán lên sản phẩm. Khách hàng có thể kiểm tra tại /check hoặc quét mã QR.'
        });
    } catch (err) {
        console.error('Generate code error:', err);
        res.status(500).json({ error: 'Không thể tạo mã' });
    }
});

// ─── GET /api/products/:id/codes — List all codes for a product ──────────────
router.get('/:id/codes', authMiddleware, async (req, res) => {
    try {
        const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!product) return res.status(404).json({ error: 'Không tìm thấy sản phẩm' });

        const codes = await db.all(`
            SELECT qc.id, qc.qr_data as code, qc.status, qc.created_at,
                   COUNT(se.id) as scan_count,
                   MAX(se.scanned_at) as last_scanned
            FROM qr_codes qc
            LEFT JOIN scan_events se ON se.qr_code_id = qc.id
            WHERE qc.product_id = ?
            GROUP BY qc.id
            ORDER BY qc.created_at DESC
        `, [req.params.id]);

        res.json({
            product: { id: product.id, name: product.name, sku: product.sku },
            total_codes: codes.length,
            codes
        });
    } catch (err) {
        console.error('Get product codes error:', err);
        res.status(500).json({ error: 'Failed to fetch product codes' });
    }
});

// ─── DELETE /api/products/codes/:codeId — Soft-delete a code ─────────────────
// Rules: Cannot delete a code that has been scanned. Records deletion in audit_log.
router.delete('/codes/:codeId', authMiddleware, requirePermission('product:delete'), async (req, res) => {
    try {
        const codeId = req.params.codeId;

        // Find the code
        const code = await db.prepare('SELECT * FROM qr_codes WHERE id = ?').get(codeId);
        if (!code) {
            return res.status(404).json({ error: 'Mã không tồn tại' });
        }

        // Tenant check: admin can only delete their org's codes
        if (req.user.role !== 'super_admin' && req.user.orgId && code.org_id && code.org_id !== req.user.orgId) {
            return res.status(403).json({ error: 'Không có quyền xoá mã của tổ chức khác' });
        }

        // Already deleted?
        if (code.status === 'deleted') {
            return res.status(409).json({ error: 'Mã đã bị xoá trước đó' });
        }

        // Check if code has been scanned
        const scanCount = await db.prepare('SELECT COUNT(*) as count FROM scan_events WHERE qr_code_id = ?').get(codeId);
        if (scanCount && scanCount.count > 0) {
            return res.status(409).json({
                error: 'Không thể xoá mã đã được quét',
                scan_count: scanCount.count,
                message: 'Mã đã được quét ' + scanCount.count + ' lần. Mã đã quét không thể xoá để đảm bảo tính toàn vẹn dữ liệu.'
            });
        }

        // Soft-delete
        await db.prepare(
            "UPDATE qr_codes SET status = 'deleted', deleted_at = datetime('now'), deleted_by = ? WHERE id = ?"
        ).run(req.user.id, codeId);

        // Audit log
        await db.prepare(`INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), req.user.id, 'CODE_DELETED', 'qr_code', codeId,
                JSON.stringify({ code: code.qr_data, product_id: code.product_id }));

        res.json({
            message: 'Mã đã được xoá thành công',
            code_id: codeId,
            code: code.qr_data,
            deleted_by: req.user.username
        });
    } catch (err) {
        console.error('Delete code error:', err);
        res.status(500).json({ error: 'Không thể xoá mã' });
    }
});

// ─── GET /api/products/codes/deletion-history — Get deletion history ─────────
router.get('/codes/deletion-history', authMiddleware, requirePermission('product:view'), async (req, res) => {
    try {
        const { limit = 50 } = req.query;
        let query = `
            SELECT al.*, u.username as deleted_by_username
            FROM audit_log al
            LEFT JOIN users u ON u.id = al.actor_id
            WHERE al.action = 'CODE_DELETED'
        `;
        const params = [];

        // Tenant scoping
        if (req.user.role !== 'super_admin' && req.user.orgId) {
            query += ` AND al.actor_id IN (SELECT id FROM users WHERE org_id = ?)`;
            params.push(req.user.orgId);
        }

        query += ' ORDER BY al.timestamp DESC LIMIT ?';
        params.push(Math.min(Number(limit) || 50, 200));

        const history = await db.prepare(query).all(...params);
        res.json({ deletion_history: history, total: history.length });
    } catch (err) {
        console.error('Deletion history error:', err);
        res.status(500).json({ error: 'Failed to fetch deletion history' });
    }
});

module.exports = router;
