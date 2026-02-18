const { safeError } = require('../utils/safe-error');
/**
 * System Routes — Backup, Restore, Seed, and System Info
 * Admin-only endpoints for system maintenance
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { authMiddleware, requireRole } = require('../auth');
const db = require('../db');

router.use(authMiddleware);
router.use(requireRole('admin'));

// ─── GET /info — Full system info ────────────────────────────
router.get('/info', async (req, res) => {
    try {
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
        const tableDetails = [];
        for (const t of tables) {
            try {
                const count = (await db.get(`SELECT COUNT(*) as c FROM ${t.name}`))?.c || 0;
                tableDetails.push({ name: t.name, rows: count });
            } catch (e) {
                tableDetails.push({ name: t.name, rows: -1 });
            }
        }

        res.json({
            system: {
                name: 'TrustChecker',
                version: '8.8.6',
                node_version: process.version,
                platform: process.platform,
                uptime_seconds: Math.round(process.uptime()),
                memory: {
                    rss_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
                    heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                    heap_total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
                },
                pid: process.pid
            },
            database: {
                tables: tableDetails,
                total_tables: tables.length,
                total_rows: tableDetails.reduce((s, t) => s + Math.max(0, t.rows), 0)
            },
            timestamp: new Date().toISOString()
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /seed — Populate demo data ────────────────────────
router.post('/seed', async (req, res) => {
    try {
        const results = {};

        // Seed products
        const products = [
            { name: 'Premium Watch Collection', sku: 'DEMO-WATCH-001', category: 'Luxury', manufacturer: 'SwissTime Ltd', origin_country: 'Switzerland' },
            { name: 'Organic Green Tea', sku: 'DEMO-TEA-001', category: 'Food & Beverage', manufacturer: 'TeaHouse Asia', origin_country: 'Japan' },
            { name: 'Pharmaceutical Grade Insulin', sku: 'DEMO-PHARMA-001', category: 'Pharmaceutical', manufacturer: 'MedCorp', origin_country: 'Germany' },
            { name: 'Designer Leather Handbag', sku: 'DEMO-FASHION-001', category: 'Fashion', manufacturer: 'Luxe Fashion House', origin_country: 'Italy' },
            { name: 'Electric Vehicle Battery Pack', sku: 'DEMO-AUTO-001', category: 'Automotive', manufacturer: 'VoltPower Inc', origin_country: 'South Korea' },
        ];

        let pCount = 0;
        for (const p of products) {
            const existing = await db.get('SELECT id FROM products WHERE sku = ?', [p.sku]);
            if (!existing) {
                const id = uuidv4();
                await db.prepare('INSERT INTO products (id, name, sku, category, manufacturer, origin_country, trust_score) VALUES (?, ?, ?, ?, ?, ?, ?)')
                    .run(id, p.name, p.sku, p.category, p.manufacturer, p.origin_country, 85 + Math.random() * 15); // Math.random OK for demo seed

                // Auto-generate QR
                const qrId = uuidv4();
                const qrData = `TC-${p.sku}-${Date.now()}`;
                await db.prepare('INSERT INTO qr_codes (id, product_id, qr_data) VALUES (?, ?, ?)')
                    .run(qrId, id, qrData);
                pCount++;
            }
        }
        results.products = pCount;

        // Seed partners
        const partners = [
            { name: 'Global Distributors Inc', type: 'distributor', country: 'US', region: 'North America', trust_score: 88 },
            { name: 'Asia Pacific Logistics', type: 'logistics', country: 'SG', region: 'Asia Pacific', trust_score: 92 },
            { name: 'Euro Retail Alliance', type: 'retailer', country: 'DE', region: 'Europe', trust_score: 75 },
            { name: 'Warehouse Solutions Ltd', type: 'warehouse', country: 'UK', region: 'Europe', trust_score: 80 },
        ];

        let ptCount = 0;
        for (const p of partners) {
            const existing = await db.get("SELECT id FROM partners WHERE name = ?", [p.name]);
            if (!existing) {
                await db.prepare('INSERT INTO partners (id, name, type, country, region, trust_score, kyc_status) VALUES (?, ?, ?, ?, ?, ?, ?)')
                    .run(uuidv4(), p.name, p.type, p.country, p.region, p.trust_score, 'verified');
                ptCount++;
            }
        }
        results.partners = ptCount;

        // Seed KYC businesses
        const businesses = [
            { name: 'Acme Manufacturing Co', reg: 'REG-DEMO-001', country: 'US', industry: 'Manufacturing' },
            { name: 'TechVault Solutions', reg: 'REG-DEMO-002', country: 'UK', industry: 'Technology' },
            { name: 'FreshFoods Global', reg: 'REG-DEMO-003', country: 'AU', industry: 'Food & Beverage' },
        ];

        let bCount = 0;
        for (const b of businesses) {
            const existing = await db.get("SELECT id FROM kyc_businesses WHERE registration_number = ?", [b.reg]);
            if (!existing) {
                await db.prepare('INSERT INTO kyc_businesses (id, name, registration_number, country, industry, verification_status) VALUES (?, ?, ?, ?, ?, ?)')
                    .run(uuidv4(), b.name, b.reg, b.country, b.industry, 'verified');
                bCount++;
            }
        }
        results.kyc_businesses = bCount;

        // Seed billing plans hint
        results.note = 'Seed creates demo data with unique SKUs — safe to run multiple times (idempotent)';

        res.json({ message: 'Demo data seeded', results });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /backup — Export database snapshot ─────────────────
router.post('/backup', async (req, res) => {
    try {
        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
        const backup = {};
        let totalRows = 0;

        for (const t of tables) {
            try {
                const rows = await db.all(`SELECT * FROM ${t.name}`);
                backup[t.name] = rows;
                totalRows += rows.length;
            } catch (e) { console.warn(`[system] Backup skip table '${t.name}':`, e.message); }
        }

        res.json({
            backup_id: uuidv4(),
            created_at: new Date().toISOString(),
            tables: Object.keys(backup).length,
            total_rows: totalRows,
            data: backup,
            note: 'Store this JSON securely. Use POST /api/system/restore to restore.'
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /restore — Restore from backup snapshot ────────────
router.post('/restore', async (req, res) => {
    try {
        const { data, confirm } = req.body;
        if (!data || !confirm) {
            return res.status(400).json({ error: 'Send { data: backupData, confirm: true } to restore' });
        }

        let restored = 0;
        // Whitelist of tables allowed for restore (BUG-05 fix: prevent SQL injection)
        const ALLOWED_TABLES = new Set(['users', 'products', 'qr_codes', 'scan_events', 'partners', 'shipments',
            'batches', 'inventory', 'supply_chain_events', 'blockchain_seals', 'evidence_items',
            'fraud_alerts', 'billing_plans', 'audit_log', 'support_tickets', 'nft_certificates',
            'anomaly_detections', 'certifications', 'compliance_records', 'invoices']);
        // Allowed column name pattern (alphanumeric + underscore only)
        const SAFE_COL = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

        for (const [table, rows] of Object.entries(data)) {
            if (!Array.isArray(rows) || rows.length === 0) continue;
            if (!ALLOWED_TABLES.has(table)) {
                console.warn(`Restore: skipping disallowed table '${table}'`);
                continue;
            }
            try {
                const exists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name = ?", [table]);
                if (!exists) continue;

                for (const row of rows) {
                    const cols = Object.keys(row).filter(c => SAFE_COL.test(c));
                    if (cols.length === 0) continue;
                    const placeholders = cols.map(() => '?').join(', ');
                    const sql = `INSERT OR REPLACE INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`;
                    await db.prepare(sql).run(...cols.map(c => row[c]));
                }
                restored += rows.length;
            } catch (e) {
                console.error(`Restore error for table '${table}':`, e.message);
            }
        }

        res.json({ message: `Restored ${restored} rows`, tables: Object.keys(data).length });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── DELETE /purge — Purge all demo data ─────────────────────
router.delete('/purge', async (req, res) => {
    try {
        const { confirm } = req.body;
        if (confirm !== 'DELETE_ALL_DATA') {
            return res.status(400).json({ error: 'Send { confirm: "DELETE_ALL_DATA" } to purge all data' });
        }

        const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
        const results = {};

        for (const t of tables) {
            if (t.name === 'users') continue; // Never delete users
            try {
                const before = (await db.get(`SELECT COUNT(*) as c FROM ${t.name}`))?.c || 0;
                await db.run(`DELETE FROM ${t.name}`);
                results[t.name] = before;
            } catch (e) { console.warn(`[system] Purge skip table '${t.name}':`, e.message); }
        }

        res.json({ message: 'Data purged (users preserved)', tables_cleared: results });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /logs — Access request logs ─────────────────────────
router.get('/logs', async (req, res) => {
    try {
        const { requestLogger } = require('../middleware/security');
        const { limit = 50 } = req.query;
        res.json({
            entries: requestLogger.getEntries(Number(limit)),
            metrics: requestLogger.getMetrics()
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

module.exports = router;
