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

// ─── GET /api/products/generation-history — Products with QR code counts ─────
// MUST be before /:id route or Express will match 'generation-history' as :id
router.get('/generation-history', authMiddleware, async (req, res) => {
    try {
        let orgFilter = '';
        const params = [];

        if (req.user.role !== 'super_admin' && req.user.orgId) {
            orgFilter = 'AND p.org_id = ?';
            params.push(req.user.orgId);
        }

        const history = await db.all(`
            SELECT p.id, p.name, p.sku, p.category,
                   COUNT(qc.id) as total_codes,
                   MAX(qc.generated_at) as last_generated,
                   GROUP_CONCAT(qr_data, ', ') as recent_codes
            FROM products p
            INNER JOIN qr_codes qc ON qc.product_id = p.id AND qc.status != 'deleted'
            WHERE 1=1 ${orgFilter}
            GROUP BY p.id, p.name, p.sku, p.category
            ORDER BY last_generated DESC
            LIMIT 20
        `, params);

        res.json({ history });
    } catch (err) {
        console.error('Generation history error:', err.message, '\nSQL details:', err.meta || '');
        res.status(500).json({ error: 'Failed to fetch generation history', detail: err.message });
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
                return res.status(500).json({ error: 'Unable to generate unique code, please try again' });
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
            message: `Generated ${generatedCodes.length} verification codes`,
            product: { id: product.id, name: product.name, sku: product.sku },
            codes: generatedCodes,
            instructions: 'Print these codes and attach to products. Customers can verify at /check or scan the QR code.'
        });
    } catch (err) {
        console.error('Generate code error:', err);
        res.status(500).json({ error: 'Failed to generate codes' });
    }
});


// ─── GET /api/products/:id/codes — List all codes for a product ──────────────
router.get('/:id/codes', authMiddleware, async (req, res) => {
    try {
        const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        const codes = await db.all(`
            SELECT qc.id, qc.qr_data as code, qc.status, qc.generated_at,
                   COUNT(se.id) as scan_count,
                   MAX(se.scanned_at) as last_scanned
            FROM qr_codes qc
            LEFT JOIN scan_events se ON se.qr_code_id = qc.id
            WHERE qc.product_id = ?
            GROUP BY qc.id, qc.qr_data, qc.status, qc.generated_at
            ORDER BY qc.generated_at DESC
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
            return res.status(404).json({ error: 'Code not found' });
        }

        // Tenant check: admin can only delete their org's codes
        if (req.user.role !== 'super_admin' && req.user.orgId && code.org_id && code.org_id !== req.user.orgId) {
            return res.status(403).json({ error: 'Not authorized to delete codes from another organization' });
        }

        // Already deleted?
        if (code.status === 'deleted') {
            return res.status(409).json({ error: 'Code has already been deleted' });
        }

        // Check if code has been scanned
        const scanCount = await db.prepare('SELECT COUNT(*) as count FROM scan_events WHERE qr_code_id = ?').get(codeId);
        if (scanCount && scanCount.count > 0) {
            return res.status(409).json({
                error: 'Cannot delete scanned codes',
                scan_count: scanCount.count,
                message: 'This code has been scanned ' + scanCount.count + ' times. Scanned codes cannot be deleted to ensure data integrity.'
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
            message: 'Code deleted successfully',
            code_id: codeId,
            code: code.qr_data,
            deleted_by: req.user.username
        });
    } catch (err) {
        console.error('Delete code error:', err);
        res.status(500).json({ error: 'Failed to delete code' });
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

// ─── GET /api/products/:id/codes/export — Export QR codes as CSV or PDF ──────
router.get('/:id/codes/export', authMiddleware, async (req, res) => {
    try {
        const { format = 'csv' } = req.query;
        const product = await db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
        if (!product) return res.status(404).json({ error: 'Product not found' });

        // Tenant scoping
        if (req.user.role !== 'super_admin' && req.user.orgId && product.org_id && product.org_id !== req.user.orgId) {
            return res.status(403).json({ error: 'Not authorized to access this product' });
        }

        const codes = await db.all(`
            SELECT qc.id, qc.qr_data as code, qc.qr_image_base64, qc.status, qc.generated_at,
                   COUNT(se.id) as scan_count,
                   MAX(se.scanned_at) as last_scanned
            FROM qr_codes qc
            LEFT JOIN scan_events se ON se.qr_code_id = qc.id
            WHERE qc.product_id = ? AND qc.status != 'deleted'
            GROUP BY qc.id, qc.qr_data, qc.qr_image_base64, qc.status, qc.generated_at
            ORDER BY qc.generated_at DESC
        `, [req.params.id]);

        if (codes.length === 0) {
            return res.status(404).json({ error: 'No QR codes found for this product' });
        }

        const safeFileName = product.name.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF ]/g, '').replace(/\s+/g, '_');
        const dateStr = new Date().toISOString().slice(0, 10);

        // ── CSV Format (Tab-separated for reliable Excel column splitting) ──
        if (format === 'csv') {
            const BOM = '\uFEFF'; // UTF-8 BOM for Excel compatibility
            const SEP = '\t'; // Tab separator — Excel auto-detects columns
            const header = ['No.', 'Code', 'Product', 'SKU', 'Status', 'Created Date', 'Scan Count', 'Last Scanned'];
            const rows = codes.map((c, i) => [
                i + 1,
                c.code || '',
                product.name,
                product.sku,
                c.status || 'active',
                c.generated_at ? new Date(c.generated_at).toLocaleString('en-US') : '',
                c.scan_count || 0,
                c.last_scanned ? new Date(c.last_scanned).toLocaleString('en-US') : 'Not scanned'
            ]);

            const csvContent = BOM + header.join(SEP) + '\n' + rows.map(r => r.join(SEP)).join('\n');

            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}_codes_${dateStr}.csv"`);
            return res.send(csvContent);
        }

        // ── PDF Format (Clean text code list for printing — NO QR images) ──
        if (format === 'pdf') {
            const PDFDocument = require('pdfkit');
            const doc = new PDFDocument({ size: 'A4', margin: 40 });
            const buffers = [];

            doc.on('data', chunk => buffers.push(chunk));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}_codes_${dateStr}.pdf"`);
                res.send(pdfData);
            });

            const pageWidth = doc.page.width - 80; // 40px margin each side
            const rowHeight = 18;
            const headerHeight = 80;
            const pageHeight = doc.page.height - 80; // 40px top + bottom
            const codesPerPage = Math.floor((pageHeight - headerHeight) / rowHeight);
            const totalPages = Math.ceil(codes.length / codesPerPage);

            // Column widths
            const col1W = 35;  // No.
            const col3W = 55;  // Status
            const col4W = 80;  // Date
            const col2W = pageWidth - col1W - col3W - col4W; // Code (flex)

            for (let page = 0; page < totalPages; page++) {
                if (page > 0) doc.addPage();

                // ── Page Header ──
                doc.fontSize(14).font('Helvetica-Bold')
                    .text(product.name, 40, 40, { width: pageWidth });
                doc.fontSize(8).font('Helvetica')
                    .fillColor('#666')
                    .text(`SKU: ${product.sku}  |  Export: ${dateStr}  |  Total: ${codes.length} codes  |  Page ${page + 1}/${totalPages}`, 40, 58);
                doc.moveTo(40, 72).lineTo(40 + pageWidth, 72).stroke('#ccc');

                // ── Table Header ──
                const tableTop = headerHeight;
                doc.fillColor('#333').fontSize(7).font('Helvetica-Bold');
                doc.text('#', 40, tableTop, { width: col1W });
                doc.text('CODE', 40 + col1W, tableTop, { width: col2W });
                doc.text('STATUS', 40 + col1W + col2W, tableTop, { width: col3W });
                doc.text('CREATED', 40 + col1W + col2W + col3W, tableTop, { width: col4W });
                doc.moveTo(40, tableTop + 12).lineTo(40 + pageWidth, tableTop + 12).stroke('#ddd');

                // ── Code Rows ──
                const startIdx = page * codesPerPage;
                const pageCodes = codes.slice(startIdx, startIdx + codesPerPage);

                for (let i = 0; i < pageCodes.length; i++) {
                    const y = tableTop + 16 + i * rowHeight;
                    const globalIdx = startIdx + i + 1;

                    // Alternating row background
                    if (i % 2 === 0) {
                        doc.rect(40, y - 2, pageWidth, rowHeight).fill('#f8f9fa').stroke();
                    }

                    // Row number
                    doc.fillColor('#999').fontSize(7).font('Helvetica')
                        .text(String(globalIdx), 40, y, { width: col1W });

                    // Code (monospace, prominent)
                    doc.fillColor('#111').fontSize(8.5).font('Courier-Bold')
                        .text(pageCodes[i].code || '', 40 + col1W, y, { width: col2W });

                    // Status
                    const status = pageCodes[i].status || 'active';
                    doc.fillColor(status === 'active' ? '#16a34a' : '#dc2626')
                        .fontSize(7).font('Helvetica')
                        .text(status, 40 + col1W + col2W, y, { width: col3W });

                    // Date
                    const dateVal = pageCodes[i].generated_at
                        ? new Date(pageCodes[i].generated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '';
                    doc.fillColor('#666').fontSize(6.5).font('Helvetica')
                        .text(dateVal, 40 + col1W + col2W + col3W, y, { width: col4W });
                }

                // Bottom line
                const bottomY = tableTop + 16 + pageCodes.length * rowHeight;
                doc.moveTo(40, bottomY).lineTo(40 + pageWidth, bottomY).stroke('#ddd');
            }

            doc.end();
            return;
        }

        return res.status(400).json({ error: 'Invalid format. Use: csv or pdf' });

    } catch (err) {
        console.error('Export codes error:', err);
        res.status(500).json({ error: 'Failed to export QR codes' });
    }
});

module.exports = router;
