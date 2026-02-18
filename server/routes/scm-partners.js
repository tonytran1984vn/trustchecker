/**
 * SCM Partner Management Routes (FR-INTEG-013 + FR-INTEG-015)
 * Partner onboarding, KYC-Business, trust scoring, SAP/Oracle sync
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const engineClient = require('../engines/engine-client');
const { eventBus } = require('../events');

const router = express.Router();

// ─── GET /api/scm/partners – List partners ───────────────────────────────────
router.get('/', async (req, res) => {
    try {
        const { type, status, kyc_status } = req.query;
        let query = 'SELECT * FROM partners WHERE 1=1';
        const params = [];
        if (type) { query += ' AND type = ?'; params.push(type); }
        if (status) { query += ' AND status = ?'; params.push(status); }
        if (kyc_status) { query += ' AND kyc_status = ?'; params.push(kyc_status); }
        query += ' ORDER BY trust_score DESC';

        res.json({ partners: await db.prepare(query).all(...params) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch partners' });
    }
});

// ─── POST /api/scm/partners – Onboard partner ───────────────────────────────
router.post('/', authMiddleware, requireRole('operator'), async (req, res) => {
    try {
        const { name, type, country, region, contact_email } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const id = uuidv4();
        const apiKey = `tc_${uuidv4().replace(/-/g, '').substring(0, 24)}`;

        await db.prepare(`
      INSERT INTO partners (id, name, type, country, region, contact_email, api_key)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, type || 'distributor', country || '', region || '', contact_email || '', apiKey);

        eventBus.emitEvent('PartnerOnboarded', { id, name, type: type || 'distributor' });
        res.status(201).json({ id, name, api_key: apiKey, kyc_status: 'pending' });
    } catch (err) {
        console.error('Onboard partner error:', err);
        res.status(500).json({ error: 'Failed to onboard partner' });
    }
});

// ─── GET /api/scm/partners/:id – Partner detail + trust score ────────────────
router.get('/:id', async (req, res) => {
    try {
        const partner = await db.prepare('SELECT * FROM partners WHERE id = ?').get(req.params.id);
        if (!partner) return res.status(404).json({ error: 'Partner not found' });

        const shipments = await db.prepare(`
      SELECT * FROM shipments WHERE from_partner_id = ? OR to_partner_id = ? ORDER BY created_at DESC LIMIT 20
    `).all(req.params.id, req.params.id);

        const violations = await db.prepare('SELECT * FROM sla_violations WHERE partner_id = ?').all(req.params.id);
        const alerts = await db.prepare(`
      SELECT * FROM fraud_alerts WHERE product_id IN (
        SELECT DISTINCT product_id FROM supply_chain_events WHERE partner_id = ?
      )
    `).all(req.params.id);

        const riskScore = await engineClient.scmPartnerRisk(partner, alerts, shipments, violations);

        // Update trust score in DB
        await db.prepare('UPDATE partners SET trust_score = ?, risk_level = ? WHERE id = ?')
            .run(riskScore.score, riskScore.risk_level, req.params.id);

        const events = await db.prepare(`
      SELECT * FROM supply_chain_events WHERE partner_id = ? ORDER BY created_at DESC LIMIT 20
    `).all(req.params.id);

        res.json({ partner: { ...partner, trust_score: riskScore.score }, risk: riskScore, shipments, violations, events });
    } catch (err) {
        console.error('Partner detail error:', err);
        res.status(500).json({ error: 'Failed to fetch partner' });
    }
});

// ─── POST /api/scm/partners/:id/verify – KYC-Business verify ────────────────
router.post('/:id/verify', authMiddleware, requireRole('manager'), async (req, res) => {
    try {
        const partner = await db.prepare('SELECT * FROM partners WHERE id = ?').get(req.params.id);
        if (!partner) return res.status(404).json({ error: 'Partner not found' });

        // Simulated KYC verification (in production: Veriff/Onfido API)
        const checks = {
            registry_check: { status: 'passed', source: 'Business Registry API' },
            sanction_check: { status: 'passed', source: 'OFAC + EU Sanctions List' },
            vies_check: { status: partner.country && ['VN', 'US', 'SG'].includes(partner.country) ? 'passed' : 'not_applicable', source: 'VIES API' },
            identity_check: { status: 'passed', source: 'Veriff/Onfido (simulated)' }
        };

        const allPassed = Object.values(checks).every(c => c.status === 'passed' || c.status === 'not_applicable');

        await db.prepare('UPDATE partners SET kyc_status = ?, kyc_verified_at = datetime("now") WHERE id = ?')
            .run(allPassed ? 'verified' : 'failed', req.params.id);

        eventBus.emitEvent('KYCVerification', { partner_id: req.params.id, result: allPassed ? 'verified' : 'failed' });

        res.json({
            partner_id: req.params.id,
            kyc_status: allPassed ? 'verified' : 'failed',
            checks,
            verified_at: new Date().toISOString(),
            badge: allPassed ? '✅ Đã xác thực' : '❌ Xác thực thất bại'
        });
    } catch (err) {
        res.status(500).json({ error: 'KYC verification failed' });
    }
});

// ─── POST /api/scm/connectors/sync – SAP/Oracle sync (simulated) ────────────
router.post('/connectors/sync', authMiddleware, requireRole('manager'), async (req, res) => {
    try {
        const { connector_type, sync_scope } = req.body;
        const type = connector_type || 'SAP';
        const scope = sync_scope || ['sku', 'inventory', 'purchase_orders', 'shipment_status'];

        // Simulated sync operation
        const results = {
            connector: type,
            sync_id: uuidv4(),
            started_at: new Date().toISOString(),
            scope,
            results: scope.map(s => ({
                entity: s,
                synced: Math.floor(Math.random() * 50) + 10,
                errors: Math.floor(Math.random() * 3),
                status: 'completed'
            })),
            retry_count: 0,
            next_sync: new Date(Date.now() + 3600000).toISOString()
        };

        const totalSynced = results.results.reduce((s, r) => s + r.synced, 0);
        const totalErrors = results.results.reduce((s, r) => s + r.errors, 0);

        eventBus.emitEvent('ConnectorSync', { connector: type, synced: totalSynced, errors: totalErrors });

        res.json({
            ...results,
            total_synced: totalSynced,
            total_errors: totalErrors,
            health: totalErrors === 0 ? 'healthy' : totalErrors <= 3 ? 'warning' : 'degraded'
        });
    } catch (err) {
        res.status(500).json({ error: 'Sync failed' });
    }
});

// ─── GET /api/scm/connectors/status – Integration health ────────────────────
router.get('/connectors/status', async (req, res) => {
    try {
        res.json({
            connectors: [
                { name: 'SAP S/4HANA', status: 'connected', last_sync: new Date(Date.now() - 1800000).toISOString(), health: 'healthy', entities: ['SKU', 'PurchaseOrder', 'Inventory'] },
                { name: 'Oracle ERP', status: 'connected', last_sync: new Date(Date.now() - 3600000).toISOString(), health: 'healthy', entities: ['Shipment', 'Invoice'] },
                { name: 'WMS Integration', status: 'connected', last_sync: new Date(Date.now() - 900000).toISOString(), health: 'healthy', entities: ['Inventory', 'Location'] }
            ],
            overall_health: 'healthy',
            total_synced_today: Math.floor(Math.random() * 500) + 200
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch connector status' });
    }
});

module.exports = router;
