const { safeError } = require('../utils/safe-error');
/**
 * Reporting & Data Export Routes
 * Custom reports, CSV/JSON export, scheduled reports, analytics
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');

router.use(authMiddleware);

// ─── GET /templates — List available report templates ───────
router.get('/templates', async (req, res) => {
    res.json({
        templates: [
            { id: 'scan-report', name: 'Scan Activity Report', description: 'Product scan volume, results, fraud scores', sections: ['scans', 'results', 'fraud_scores'] },
            { id: 'fraud-report', name: 'Fraud Detection Report', description: 'Fraud alerts by severity, status, product', sections: ['alerts', 'severity', 'products'] },
            { id: 'product-report', name: 'Product Trust Report', description: 'Product trust scores, compliance, QR activity', sections: ['trust', 'compliance', 'qr'] },
            { id: 'compliance-report', name: 'Compliance & GDPR Report', description: 'GDPR exports, deletions, retention policies', sections: ['gdpr', 'retention', 'audit'] },
            { id: 'supply-chain-report', name: 'Supply Chain Report', description: 'Partner performance, events, leak analysis', sections: ['partners', 'events', 'leaks'] },
            { id: 'financial-report', name: 'Financial Report', description: 'Revenue, invoices, plan distribution', sections: ['revenue', 'invoices', 'plans'] },
        ],
        formats: ['json', 'csv'],
        total: 6
    });
});

// ─── GET /generate/:id — Generate a specific report ─────────
router.get('/generate/:id', async (req, res) => {
    const reportId = req.params.id;
    const validReports = ['scan-report', 'fraud-report', 'product-report', 'compliance-report', 'supply-chain-report', 'financial-report'];
    if (!validReports.includes(reportId)) return res.status(404).json({ error: 'Report template not found' });
    // Redirect to the actual report endpoint
    res.redirect(`/api/reports/${reportId}?format=json`);
});

// ─── GET /scan-report — Generate scan activity report ───────
router.get('/scan-report', requireRole('manager'), async (req, res) => {
    try {
        const { from, to, format = 'json' } = req.query;
        const fromDate = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        const toDate = to || new Date().toISOString().slice(0, 10);

        const scans = await db.all(`
      SELECT se.id, se.product_id, p.name as product_name, p.sku, se.result, se.fraud_score, se.trust_score,
             se.scan_type, se.ip_address, se.latitude, se.longitude, se.response_time_ms, se.scanned_at
      FROM scan_events se LEFT JOIN products p ON se.product_id = p.id
      WHERE DATE(se.scanned_at) BETWEEN ? AND ?
      ORDER BY se.scanned_at DESC
    `, [fromDate, toDate]);

        const summary = {
            period: { from: fromDate, to: toDate },
            total_scans: scans.length,
            valid: scans.filter(s => s.result === 'valid').length,
            suspicious: scans.filter(s => s.result === 'suspicious').length,
            counterfeit: scans.filter(s => s.result === 'counterfeit').length,
            avg_fraud_score: scans.length > 0 ? Math.round(scans.reduce((a, s) => a + (s.fraud_score || 0), 0) / scans.length * 1000) / 1000 : 0,
            avg_trust_score: scans.length > 0 ? Math.round(scans.reduce((a, s) => a + (s.trust_score || 0), 0) / scans.length) : 0,
            avg_response_ms: scans.length > 0 ? Math.round(scans.reduce((a, s) => a + (s.response_time_ms || 0), 0) / scans.length) : 0,
        };

        if (format === 'csv') {
            const csv = generateCSV(scans, ['id', 'product_name', 'sku', 'result', 'fraud_score', 'trust_score', 'scan_type', 'ip_address', 'scanned_at']);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=scan_report_${fromDate}_${toDate}.csv`);
            return res.send(csv);
        }

        res.json({ report_type: 'scan_activity', summary, data: scans, generated_at: new Date().toISOString() });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /fraud-report — Fraud detection report ─────────────
router.get('/fraud-report', requireRole('manager'), async (req, res) => {
    try {
        const { from, to, format = 'json' } = req.query;
        const fromDate = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
        const toDate = to || new Date().toISOString().slice(0, 10);

        const alerts = await db.all(`
      SELECT fa.*, p.name as product_name FROM fraud_alerts fa
      LEFT JOIN products p ON fa.product_id = p.id
      WHERE DATE(fa.created_at) BETWEEN ? AND ?
      ORDER BY fa.created_at DESC
    `, [fromDate, toDate]);

        const summary = {
            period: { from: fromDate, to: toDate },
            total_alerts: alerts.length,
            by_severity: { critical: 0, high: 0, medium: 0, low: 0 },
            by_status: { open: 0, investigating: 0, resolved: 0 },
            top_products: []
        };

        alerts.forEach(a => {
            if (summary.by_severity[a.severity] !== undefined) summary.by_severity[a.severity]++;
            if (summary.by_status[a.status] !== undefined) summary.by_status[a.status]++;
        });

        // Top affected products
        const productCounts = {};
        alerts.forEach(a => {
            if (a.product_name) {
                productCounts[a.product_name] = (productCounts[a.product_name] || 0) + 1;
            }
        });
        summary.top_products = Object.entries(productCounts)
            .sort((a, b) => b[1] - a[1]).slice(0, 10)
            .map(([name, count]) => ({ name, alerts: count }));

        if (format === 'csv') {
            const csv = generateCSV(alerts, ['id', 'product_name', 'alert_type', 'severity', 'fraud_score', 'status', 'created_at']);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=fraud_report_${fromDate}_${toDate}.csv`);
            return res.send(csv);
        }

        res.json({ report_type: 'fraud_detection', summary, data: alerts, generated_at: new Date().toISOString() });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /product-report — Product trust & compliance ───────
router.get('/product-report', requireRole('manager'), async (req, res) => {
    try {
        const { format = 'json' } = req.query;

        const products = await db.all(`
      SELECT p.id, p.name, p.sku, p.manufacturer, p.category, p.origin_country, p.trust_score,
             (SELECT COUNT(*) FROM scan_events WHERE product_id = p.id) as total_scans,
             (SELECT COUNT(*) FROM scan_events WHERE product_id = p.id AND result = 'valid') as valid_scans,
             (SELECT COUNT(*) FROM fraud_alerts WHERE product_id = p.id) as fraud_alerts,
             (SELECT created_at FROM qr_codes WHERE product_id = p.id ORDER BY created_at DESC LIMIT 1) as last_qr_created
      FROM products p
      ORDER BY p.trust_score DESC
    `);

        const summary = {
            total_products: products.length,
            avg_trust_score: products.length > 0 ? Math.round(products.reduce((a, p) => a + (p.trust_score || 0), 0) / products.length) : 0,
            trust_distribution: {
                excellent: products.filter(p => p.trust_score >= 90).length,
                good: products.filter(p => p.trust_score >= 70 && p.trust_score < 90).length,
                fair: products.filter(p => p.trust_score >= 50 && p.trust_score < 70).length,
                poor: products.filter(p => p.trust_score < 50).length,
            },
            total_scans: products.reduce((a, p) => a + p.total_scans, 0),
            total_fraud_alerts: products.reduce((a, p) => a + p.fraud_alerts, 0),
        };

        if (format === 'csv') {
            const csv = generateCSV(products, ['id', 'name', 'sku', 'manufacturer', 'category', 'trust_score', 'total_scans', 'valid_scans', 'fraud_alerts']);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=product_report.csv');
            return res.send(csv);
        }

        res.json({ report_type: 'product_trust', summary, data: products, generated_at: new Date().toISOString() });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /compliance-report — Compliance & GDPR report ──────
router.get('/compliance-report', requireRole('admin'), async (req, res) => {
    try {
        const gdprExports = (await db.get("SELECT COUNT(*) as c FROM audit_log WHERE action = 'GDPR_EXPORT'"))?.c || 0;
        const gdprDeletions = (await db.get("SELECT COUNT(*) as c FROM audit_log WHERE action = 'GDPR_DELETION'"))?.c || 0;
        const retentionPolicies = await db.all('SELECT * FROM data_retention_policies');
        const certifications = await db.all("SELECT * FROM certifications WHERE status = 'active'");
        const complianceRecords = await db.all('SELECT framework, status, COUNT(*) as count FROM compliance_records GROUP BY framework, status');
        const anomalies = (await db.get("SELECT COUNT(*) as c FROM anomaly_detections WHERE status = 'open'"))?.c || 0;
        const auditEntries = (await db.get('SELECT COUNT(*) as c FROM audit_log'))?.c || 0;

        res.json({
            report_type: 'compliance',
            gdpr: {
                total_exports: gdprExports,
                total_deletions: gdprDeletions,
                retention_policies: retentionPolicies.length,
                policies: retentionPolicies
            },
            certifications: {
                active: certifications.length,
                list: certifications
            },
            compliance_records: complianceRecords,
            security: {
                open_anomalies: anomalies,
                total_audit_entries: auditEntries,
                mfa_enabled_users: (await db.get('SELECT COUNT(*) as c FROM users WHERE mfa_enabled = 1'))?.c || 0,
                total_users: (await db.get('SELECT COUNT(*) as c FROM users'))?.c || 0,
            },
            generated_at: new Date().toISOString()
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /supply-chain-report — SCM analytics ───────────────
router.get('/supply-chain-report', requireRole('manager'), async (req, res) => {
    try {
        const { format = 'json' } = req.query;

        const partners = await db.all('SELECT * FROM partners ORDER BY created_at DESC');
        const events = await db.all("SELECT event_type, COUNT(*) as count FROM supply_chain_events GROUP BY event_type ORDER BY count DESC");
        // supply_chain_leaks table doesn't exist — use fraud_alerts as leak proxy
        let leaks = [];
        try { leaks = await db.all("SELECT status, COUNT(*) as count FROM fraud_alerts GROUP BY status"); } catch (e) { /* table may not exist */ }
        const batches = (await db.get('SELECT COUNT(*) as c FROM batches'))?.c || 0;

        const summary = {
            total_partners: partners.length,
            avg_partner_trust: partners.length > 0 ? Math.round(partners.reduce((a, p) => a + (p.trust_score || 0), 0) / partners.length) : 0,
            total_events: events.reduce((a, e) => a + e.count, 0),
            event_types: events,
            leak_status: leaks,
            total_batches: batches,
            top_partners: partners.slice(0, 5).map(p => ({ name: p.name, trust_score: p.trust_score, tier: p.tier })),
        };

        if (format === 'csv') {
            const csv = generateCSV(partners, ['id', 'name', 'region', 'tier', 'trust_score', 'status', 'created_at']);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=supply_chain_report.csv');
            return res.send(csv);
        }

        res.json({ report_type: 'supply_chain', summary, partners, generated_at: new Date().toISOString() });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /financial-report — Financial & billing report ─────
router.get('/financial-report', requireRole('admin'), async (req, res) => {
    try {
        const invoices = await db.all('SELECT * FROM invoices ORDER BY period_start DESC LIMIT 100');
        const plans = await db.all("SELECT plan_name, COUNT(*) as count FROM billing_plans WHERE status = 'active' GROUP BY plan_name");

        const revenue = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        const paidInvoices = invoices.filter(i => i.status === 'paid');
        const unpaidInvoices = invoices.filter(i => i.status !== 'paid');

        res.json({
            report_type: 'financial',
            revenue: {
                total: revenue,
                currency: 'USD',
                paid_invoices: paidInvoices.length,
                unpaid_invoices: unpaidInvoices.length,
            },
            plan_distribution: plans,
            recent_invoices: invoices.slice(0, 20),
            generated_at: new Date().toISOString()
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /export/:entity — Universal data export ────────────
router.get('/export/:entity', requireRole('manager'), async (req, res) => {
    try {
        const { entity } = req.params;
        const { format = 'csv', limit = 1000 } = req.query;

        const entityMap = {
            users: { sql: 'SELECT id, username, email, role, company, status, created_at FROM users', filename: 'users' },
            products: { sql: 'SELECT * FROM products', filename: 'products' },
            scans: { sql: 'SELECT * FROM scan_events ORDER BY scanned_at DESC', filename: 'scan_events' },
            fraud_alerts: { sql: 'SELECT * FROM fraud_alerts ORDER BY created_at DESC', filename: 'fraud_alerts' },
            evidence: { sql: 'SELECT id, title, sha256_hash, status, tags, created_at FROM evidence_items', filename: 'evidence' },
            partners: { sql: 'SELECT * FROM partners', filename: 'partners' },
            tickets: { sql: 'SELECT * FROM support_tickets ORDER BY created_at DESC', filename: 'tickets' },
            nft: { sql: 'SELECT * FROM nft_certificates', filename: 'nft_certificates' },
            sustainability: { sql: 'SELECT * FROM sustainability_scores', filename: 'sustainability' },
            anomalies: { sql: 'SELECT * FROM anomaly_detections', filename: 'anomalies' },
            audit: { sql: 'SELECT id, actor_id, action, entity_type, entity_id, timestamp FROM audit_log ORDER BY timestamp DESC', filename: 'audit_log' },
        };

        const config = entityMap[entity];
        if (!config) return res.status(400).json({ error: `Invalid entity. Choose: ${Object.keys(entityMap).join(', ')}` });

        const data = await db.all(`${config.sql} LIMIT ?`, [Number(limit)]);

        if (format === 'csv' && data.length > 0) {
            const csv = generateCSV(data, Object.keys(data[0]));
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${config.filename}_export.csv`);
            return res.send(csv);
        }

        res.json({ entity, total: data.length, data, exported_at: new Date().toISOString() });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── CSV Generator ──────────────────────────────────────────
function generateCSV(data, columns) {
    if (data.length === 0) return '';
    const header = columns.join(',');
    const rows = data.map(row => {
        return columns.map(col => {
            const val = row[col];
            if (val === null || val === undefined) return '';
            const str = String(val).replace(/"/g, '""');
            return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
        }).join(',');
    });
    return [header, ...rows].join('\n');
}

module.exports = router;
