/**
 * SCM Partner Management Routes (FR-INTEG-013 + FR-INTEG-015)
 * Partner onboarding, KYC-Business, trust scoring, SAP/Oracle sync
 */
const { withTransaction } = require('../middleware/transaction');
const { cacheInvalidate } = require('../middleware/cache-invalidate');
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const { requireScope, scopeFilter } = require('../auth/scope-engine');
const engineClient = require('../engines/infrastructure/engine-client');
const { eventBus } = require('../events');
const logger = require('../lib/logger');

const router = express.Router();

// GOV-1: All routes require authentication + org context + scope loading
router.use(authMiddleware);

// ─── GET /api/scm/partners – List partners ───────────────────────────────────
router.get('/', scopeFilter('supplier'), async (req, res) => {
    try {
        const orgId = req.orgId || null;
        const { type, status, kyc_status } = req.query;
        let query = 'SELECT * FROM partners WHERE 1=1';
        const params = [];
        if (orgId) {
            query += ' AND org_id = ?';
            params.push(orgId);
        }

        // Scope filter: restrict to scoped supplier IDs if user has scopes
        const scopedIds = req.scopedIds?.supplier;
        if (scopedIds !== null && scopedIds !== undefined) {
            if (scopedIds.length === 0) return res.json({ partners: [] });
            const placeholders = scopedIds.map(() => '?').join(',');
            query += ` AND id IN (${placeholders})`;
            params.push(...scopedIds);
        }

        if (type) {
            query += ' AND type = ?';
            params.push(type);
        }
        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (kyc_status) {
            query += ' AND kyc_status = ?';
            params.push(kyc_status);
        }
        query += ' ORDER BY trust_score DESC';

        res.json({ partners: await db.prepare(query).all(...params) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch partners' });
    }
});

// ─── POST /api/scm/partners – Onboard partner ───────────────────────────────
router.post('/', requirePermission('partner:create'), async (req, res) => {
    // v9.5.0: Rate limit — max 10 suppliers per hour per org
    const orgId = req.orgId || req.user?.org_id;
    const recentCount = await db.get(
        "SELECT COUNT(*) as c FROM partners WHERE org_id = ? AND created_at > NOW() - INTERVAL '1 hour'",
        [orgId]
    );
    if (recentCount?.c >= 10) {
        return res.status(429).json({ error: 'Rate limit: maximum 10 suppliers per hour' });
    }
    try {
        const { name, type, country, region, contact_email, supply_chain_id } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const id = uuidv4();
        const apiKey = `tc_${uuidv4().replace(/-/g, '').substring(0, 24)}`;

        const orgId = req.orgId || null;
        await db.run(
            `
      INSERT INTO partners (id, name, type, country, region, contact_email, api_key, org_id, supply_chain_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
            [
                id,
                name,
                type || 'distributor',
                country || '',
                region || '',
                contact_email || '',
                apiKey,
                orgId,
                supply_chain_id || null,
            ]
        );

        eventBus.emitEvent('PartnerOnboarded', { id, name, type: type || 'distributor' });
        res.status(201).json({ id, name, api_key: apiKey, kyc_status: 'pending' });
    } catch (err) {
        logger.error('Onboard partner error:', err);
        res.status(500).json({ error: 'Failed to onboard partner' });
    }
});

// ─── GET /api/scm/partners/:id – Partner detail + trust score ────────────────
router.get('/:id', requireScope('supplier', 'id'), async (req, res) => {
    try {
        const orgId = req.orgId || null;
        let pQuery = 'SELECT * FROM partners WHERE id = ?';
        const pParams = [req.params.id];
        if (orgId) {
            pQuery += ' AND org_id = ?';
            pParams.push(orgId);
        }
        const partner = await db.prepare(pQuery).get(...pParams);
        if (!partner) return res.status(404).json({ error: 'Partner not found' });

        const shipments = await db.all(
            `
      SELECT * FROM shipments WHERE from_partner_id = ? OR to_partner_id = ? ORDER BY created_at DESC LIMIT 20
    `,
            [req.params.id, req.params.id]
        );

        const violations = await db.all('SELECT * FROM sla_violations WHERE partner_id = ?', [req.params.id]);
        const alerts = await db.all(
            `
      SELECT * FROM fraud_alerts WHERE product_id IN (
        SELECT DISTINCT product_id FROM supply_chain_events WHERE partner_id = ?
      )
    `,
            [req.params.id]
        );

        const riskScore = await engineClient.scmPartnerRisk(partner, alerts, shipments, violations);

        // Update trust score in DB
        await db.run('UPDATE partners SET trust_score = ?, risk_level = ? WHERE id = ?', [
            riskScore.score,
            riskScore.risk_level,
            req.params.id,
        ]);

        const events = await db.all(
            `
      SELECT * FROM supply_chain_events WHERE partner_id = ? ORDER BY created_at DESC LIMIT 20
    `,
            [req.params.id]
        );

        res.json({
            partner: { ...partner, trust_score: riskScore.score },
            risk: riskScore,
            shipments,
            violations,
            events,
        });
    } catch (err) {
        logger.error('Partner detail error:', err);
        res.status(500).json({ error: 'Failed to fetch partner' });
    }
});

// ─── POST /api/scm/partners/:id/verify – KYC-Business verify ────────────────
router.post('/:id/verify', requirePermission('partner:verify'), requireScope('supplier', 'id'), async (req, res) => {
    try {
        const orgId = req.orgId || null;
        let vQuery = 'SELECT * FROM partners WHERE id = ?';
        const vParams = [req.params.id];
        if (orgId) {
            vQuery += ' AND org_id = ?';
            vParams.push(orgId);
        }
        const partner = await db.prepare(vQuery).get(...vParams);
        if (!partner) return res.status(404).json({ error: 'Partner not found' });

        // Simulated KYC verification (in production: Veriff/Onfido API)
        const checks = {
            registry_check: { status: 'passed', source: 'Business Registry API' },
            sanction_check: { status: 'passed', source: 'OFAC + EU Sanctions List' },
            vies_check: {
                status: partner.country && ['VN', 'US', 'SG'].includes(partner.country) ? 'passed' : 'not_applicable',
                source: 'VIES API',
            },
            identity_check: { status: 'passed', source: 'Veriff/Onfido (simulated)' },
        };

        const allPassed = Object.values(checks).every(c => c.status === 'passed' || c.status === 'not_applicable');

        await db
            .prepare('UPDATE partners SET kyc_status = ?, kyc_verified_at = NOW() WHERE id = ?')
            .run(allPassed ? 'verified' : 'failed', req.params.id);

        eventBus.emitEvent('KYCVerification', { partner_id: req.params.id, result: allPassed ? 'verified' : 'failed' });

        res.json({
            partner_id: req.params.id,
            kyc_status: allPassed ? 'verified' : 'failed',
            checks,
            verified_at: new Date().toISOString(),
            badge: allPassed ? '✅ Đã xác thực' : '❌ Xác thực thất bại',
        });
    } catch (err) {
        res.status(500).json({ error: 'KYC verification failed' });
    }
});

// ─── POST /api/scm/connectors/sync – SAP/Oracle sync (simulated) ────────────
router.post('/connectors/sync', authMiddleware, requirePermission('org:settings_update'), async (req, res) => {
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
                status: 'completed',
            })),
            retry_count: 0,
            next_sync: new Date(Date.now() + 3600000).toISOString(),
        };

        const totalSynced = results.results.reduce((s, r) => s + r.synced, 0);
        const totalErrors = results.results.reduce((s, r) => s + r.errors, 0);

        eventBus.emitEvent('ConnectorSync', { connector: type, synced: totalSynced, errors: totalErrors });

        res.json({
            ...results,
            total_synced: totalSynced,
            total_errors: totalErrors,
            health: totalErrors === 0 ? 'healthy' : totalErrors <= 3 ? 'warning' : 'degraded',
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
                {
                    name: 'SAP S/4HANA',
                    status: 'connected',
                    last_sync: new Date(Date.now() - 1800000).toISOString(),
                    health: 'healthy',
                    entities: ['SKU', 'PurchaseOrder', 'Inventory'],
                },
                {
                    name: 'Oracle ERP',
                    status: 'connected',
                    last_sync: new Date(Date.now() - 3600000).toISOString(),
                    health: 'healthy',
                    entities: ['Shipment', 'Invoice'],
                },
                {
                    name: 'WMS Integration',
                    status: 'connected',
                    last_sync: new Date(Date.now() - 900000).toISOString(),
                    health: 'healthy',
                    entities: ['Inventory', 'Location'],
                },
            ],
            overall_health: 'healthy',
            total_synced_today: Math.floor(Math.random() * 500) + 200,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch connector status' });
    }
});

module.exports = router;
