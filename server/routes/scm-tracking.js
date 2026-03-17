/**
 * SCM Tracking & Traceability Routes (FR-INTEG-002 + FR-SCM-001)
 * EPCIS/CBV event tracking + blockchain SCM layer
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const blockchainEngine = require('../engines/blockchain');
const { eventBus, EVENT_TYPES } = require('../events');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();


// GOV-1: All routes require authentication
router.use(authMiddleware);

// ─── POST /api/scm/events – Record EPCIS event ──────────────────────────────
router.post('/events', authMiddleware, requirePermission('supply_chain:create'), validate(schemas.scmEvent), async (req, res) => {
    try {
        const { event_type, product_id, batch_id, uid, location, actor, partner_id, details } = req.body;
        const validTypes = ['commission', 'pack', 'ship', 'receive', 'sell', 'return', 'destroy'];
        if (!event_type || !validTypes.includes(event_type)) {
            return res.status(400).json({ error: `event_type must be one of: ${validTypes.join(', ')}` });
        }

        const id = uuidv4();
        // Seal to blockchain
        const seal = await blockchainEngine.seal('SCMEvent', id, { event_type, product_id, batch_id, location, actor });

        await db.run(`
      INSERT INTO supply_chain_events (id, event_type, product_id, batch_id, uid, location, actor, partner_id, details, blockchain_seal_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, event_type, product_id || null, batch_id || null, uid || '', location || '', actor || req.user.username, partner_id || null, JSON.stringify(details || {}), seal.seal_id]);

        eventBus.emitEvent('SCMEvent', { id, event_type, product_id, batch_id, location });

        // L-RGF: Process through governance flow (Steps 1-5)
        let governance = null;
        try {
            const lrgf = require('../engines/regulatory-engine').lrgf;
const { withTransaction } = require('../middleware/transaction');
            governance = lrgf.processEvent(
                { event_type, product_id, batch_id, org_id: req.user.orgId, idempotency_key: `scm-${id}` },
                { source: 'scm-tracking', ip: req.ip, user_agent: req.headers['user-agent'], latitude: details?.latitude, longitude: details?.longitude },
                { velocity_anomaly: 0, geo_risk: 0, device_mismatch: 0, historical_batch: 0, distributor_trust: 0, duplicate_cluster: 0 }
            );
        } catch (lrgfErr) {
            console.error('[L-RGF] Governance flow error (non-blocking):', lrgfErr.message);
        }

        res.status(201).json({ id, event_type, blockchain_seal: seal, governance });
    } catch (err) {
        console.error('SCM event error:', err);
        res.status(500).json({ error: 'Failed to record event' });
    }
});

// ─── GET /api/scm/events/:productId/journey – Product journey ────────────────
router.get('/events/:productId/journey', authMiddleware, async (req, res) => {
    try {
        const events = await db.all(`
      SELECT sce.*, p.name as partner_name
      FROM supply_chain_events sce
      LEFT JOIN partners p ON sce.partner_id = p.id
      WHERE sce.product_id = ?
      ORDER BY sce.created_at ASC
    `, [req.params.productId]);

        const product = await db.get('SELECT name, sku FROM products WHERE id = ?', [req.params.productId]);

        res.json({
            product: product || { name: 'Unknown', sku: '' },
            journey: events,
            total_events: events.length,
            current_stage: events.length > 0 ? events[events.length - 1].event_type : 'unknown'
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch journey' });
    }
});

// ─── GET /api/scm/events – All SCM events ────────────────────────────────────
router.get('/events', authMiddleware, async (req, res) => {
    try {
        const { limit = 50, event_type } = req.query;
        const orgId = req.user?.org_id || req.user?.orgId;
        let query = `
      SELECT sce.*, p.name as partner_name, pr.name as product_name
      FROM supply_chain_events sce
      LEFT JOIN partners p ON sce.partner_id = p.id
      LEFT JOIN products pr ON sce.product_id = pr.id
    `;
        const params = [];
        const conditions = [];
        if (orgId && req.user?.role !== 'super_admin') { conditions.push('pr.org_id = ?'); params.push(orgId); }
        if (event_type) { conditions.push('sce.event_type = ?'); params.push(event_type); }
        if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY sce.created_at DESC LIMIT ?';
        params.push(Math.min(Number(limit) || 50, 200));

        res.json({ events: await db.prepare(query).all(...params) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

// ─── POST /api/scm/batches – Create batch ────────────────────────────────────
router.post('/batches', authMiddleware, requireRole('operator', 'admin', 'company_admin'), async (req, res) => {
    try {
        const { batch_number, product_id, quantity, manufactured_date, expiry_date, origin_facility } = req.body;
        if (!batch_number || !product_id) return res.status(400).json({ error: 'batch_number and product_id required' });

        const id = uuidv4();
        const orgId = req.user?.org_id || null;
        await db.run(`
      INSERT INTO batches (id, batch_number, product_id, quantity, manufactured_date, expiry_date, origin_facility, org_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'created', NOW())
    `, [id, batch_number, product_id, quantity || 0, manufactured_date || null, expiry_date || null, origin_facility || '', orgId]);

        // Auto-create commission event
        const eventId = uuidv4();
        const seal = await blockchainEngine.seal('BatchCreated', eventId, { batch_number, product_id, quantity });
        await db.run(`
      INSERT INTO supply_chain_events (id, event_type, product_id, batch_id, location, actor, details, blockchain_seal_id, org_id)
      VALUES (?, 'commission', ?, ?, ?, ?, ?, ?, ?)
    `, [eventId, product_id, id, origin_facility || '', req.user.username, JSON.stringify({ quantity, batch_number }), seal.seal_id, orgId]);

        res.status(201).json({ id, batch_number, blockchain_seal: seal });
    } catch (err) {
        console.error('Create batch error:', err);
        res.status(500).json({ error: 'Failed to create batch' });
    }
});

// ─── GET /api/scm/batches ────────────────────────────────────────────────────
router.get('/batches', authMiddleware, async (req, res) => {
    try {
        const { product_id, limit = 50 } = req.query;
        const orgId = req.user?.org_id;
        let query = `
      SELECT b.*, p.name as product_name, p.sku as product_sku
      FROM batches b
      LEFT JOIN products p ON b.product_id = p.id
    `;
        const params = [];
        const conditions = [];
        if (orgId) { conditions.push('p.org_id = ?'); params.push(orgId); }
        if (product_id) { conditions.push('b.product_id = ?'); params.push(product_id); }
        if (conditions.length) query += ' WHERE ' + conditions.join(' AND ');
        query += ' ORDER BY b.created_at DESC LIMIT ?';
        params.push(Math.min(Number(limit) || 20, 100));

        res.json({ batches: await db.prepare(query).all(...params) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch batches' });
    }
});

// ─── GET /api/scm/batches/:id/trace – Trace batch through chain ──────────────
router.get('/batches/:id/trace', authMiddleware, async (req, res) => {
    try {
        const batch = await db.get('SELECT b.*, p.name as product_name FROM batches b LEFT JOIN products p ON b.product_id = p.id WHERE b.id = ?', [req.params.id]);
        if (!batch) return res.status(404).json({ error: 'Batch not found' });

        const events = await db.all(`
      SELECT sce.*, p.name as partner_name
      FROM supply_chain_events sce
      LEFT JOIN partners p ON sce.partner_id = p.id
      WHERE sce.batch_id = ?
      ORDER BY sce.created_at ASC
    `, [req.params.id]);

        const shipments = await db.all(`
      SELECT s.*, fp.name as from_name, tp.name as to_name
      FROM shipments s
      LEFT JOIN partners fp ON s.from_partner_id = fp.id
      LEFT JOIN partners tp ON s.to_partner_id = tp.id
      WHERE s.batch_id = ?
    `, [req.params.id]);

        res.json({ batch, events, shipments });
    } catch (err) {
        res.status(500).json({ error: 'Failed to trace batch' });
    }
});

// ─── GET /api/scm/dashboard – SCM overview stats ─────────────────────────────
router.get('/dashboard', authMiddleware, async (req, res) => {
    try {
        const orgId = req.user?.org_id || req.user?.orgId || null;

        // Batches — filtered by org_id via products table
        const totalBatches = orgId
            ? (await db.get('SELECT COUNT(*) as c FROM batches b JOIN products p ON b.product_id = p.id WHERE p.org_id = ?', [orgId]))?.c || 0
            : (await db.get('SELECT COUNT(*) as c FROM batches'))?.c || 0;

        // Events — filtered by org_id via products table
        const totalEvents = orgId
            ? (await db.get('SELECT COUNT(*) as c FROM supply_chain_events sce JOIN products p ON sce.product_id = p.id WHERE p.org_id = ?', [orgId]))?.c || 0
            : (await db.get('SELECT COUNT(*) as c FROM supply_chain_events'))?.c || 0;

        // Partners — filtered directly by org_id
        const totalPartners = orgId
            ? (await db.get('SELECT COUNT(*) as c FROM partners WHERE org_id = ?', [orgId]))?.c || 0
            : (await db.get('SELECT COUNT(*) as c FROM partners'))?.c || 0;

        // Shipments — filtered by org_id via partners
        const totalShipments = orgId
            ? (await db.get('SELECT COUNT(*) as c FROM shipments s LEFT JOIN partners fp ON s.from_partner_id = fp.id LEFT JOIN partners tp ON s.to_partner_id = tp.id WHERE (fp.org_id = ? OR tp.org_id = ?)', [orgId, orgId]))?.c || 0
            : (await db.get('SELECT COUNT(*) as c FROM shipments'))?.c || 0;

        const activeShipments = orgId
            ? (await db.get("SELECT COUNT(*) as c FROM shipments s LEFT JOIN partners fp ON s.from_partner_id = fp.id LEFT JOIN partners tp ON s.to_partner_id = tp.id WHERE s.status IN ('pending','in_transit') AND (fp.org_id = ? OR tp.org_id = ?)", [orgId, orgId]))?.c || 0
            : (await db.get("SELECT COUNT(*) as c FROM shipments WHERE status IN ('pending','in_transit')"))?.c || 0;

        // Leaks — filtered by org_id via products
        const totalLeaks = orgId
            ? (await db.get("SELECT COUNT(*) as c FROM leak_alerts la JOIN products p ON la.product_id = p.id WHERE la.status = 'open' AND p.org_id = ?", [orgId]))?.c || 0
            : (await db.get("SELECT COUNT(*) as c FROM leak_alerts WHERE status = 'open'"))?.c || 0;

        // SLA violations — filtered by org_id via partners
        const slaViolations = orgId
            ? (await db.get("SELECT COUNT(*) as c FROM sla_violations sv JOIN partners p ON sv.partner_id = p.id WHERE sv.status = 'open' AND p.org_id = ?", [orgId]))?.c || 0
            : (await db.get("SELECT COUNT(*) as c FROM sla_violations WHERE status = 'open'"))?.c || 0;

        const avgPartnerTrust = orgId
            ? (await db.get('SELECT COALESCE(AVG(trust_score), 50) as avg FROM partners WHERE org_id = ?', [orgId]))?.avg || 50
            : (await db.get('SELECT COALESCE(AVG(trust_score), 50) as avg FROM partners'))?.avg || 50;

        // Events by type — filtered
        const eventsByType = orgId
            ? await db.all('SELECT sce.event_type, COUNT(*) as count FROM supply_chain_events sce JOIN products p ON sce.product_id = p.id WHERE p.org_id = ? GROUP BY sce.event_type ORDER BY count DESC LIMIT 1000', [orgId])
            : await db.all('SELECT event_type, COUNT(*) as count FROM supply_chain_events GROUP BY event_type ORDER BY count DESC LIMIT 1000');

        // Recent events — filtered
        const recentEvents = orgId
            ? await db.all(`
          SELECT sce.*, p.name as partner_name, pr.name as product_name
          FROM supply_chain_events sce
          LEFT JOIN partners p ON sce.partner_id = p.id
          LEFT JOIN products pr ON sce.product_id = pr.id
          WHERE pr.org_id = ?
          ORDER BY sce.created_at DESC LIMIT 10
        `, [orgId])
            : await db.all(`
          SELECT sce.*, p.name as partner_name, pr.name as product_name
          FROM supply_chain_events sce
          LEFT JOIN partners p ON sce.partner_id = p.id
          LEFT JOIN products pr ON sce.product_id = pr.id
          ORDER BY sce.created_at DESC LIMIT 10
        `);

        res.json({
            total_batches: totalBatches,
            total_events: totalEvents,
            total_partners: totalPartners,
            total_shipments: totalShipments,
            active_shipments: activeShipments,
            open_leaks: totalLeaks,
            sla_violations: slaViolations,
            avg_partner_trust: Math.round(avgPartnerTrust),
            events_by_type: eventsByType,
            recent_events: recentEvents
        });
    } catch (err) {
        console.error('SCM dashboard error:', err);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

// ─── POST /batches/:id/recall — Initiate batch recall ────────────────────────
router.post('/batches/:id/recall', authMiddleware, requirePermission('batch:manage'), async (req, res) => {
    try {
        const { reason, severity } = req.body;
        const batch = await db.get('SELECT b.*, p.name as product_name FROM batches b LEFT JOIN products p ON b.product_id = p.id WHERE b.id = ?', [req.params.id]);
        if (!batch) return res.status(404).json({ error: 'Batch not found' });

        // Mark batch as recalled
        await db.prepare("UPDATE batches SET status = 'recalled' WHERE id = ?").run(req.params.id);

        // Create recall event
        const recallEventId = uuidv4();
        const seal = await blockchainEngine.seal('BatchRecall', recallEventId, { batch_id: req.params.id, reason, severity });
        await db.run(`
      INSERT INTO supply_chain_events (id, event_type, product_id, batch_id, actor, details, blockchain_seal_id)
      VALUES (?, 'return', ?, ?, ?, ?, ?)
    `, [recallEventId, batch.product_id, req.params.id, req.user.username,
            JSON.stringify({ action: 'recall', reason: reason || 'Quality issue', severity: severity || 'high' }), seal.seal_id]);

        // Find affected shipments
        const affectedShipments = await db.all("SELECT * FROM shipments WHERE batch_id = ? AND status != 'delivered'", [req.params.id]);
        for (const s of affectedShipments) {
            await db.prepare("UPDATE shipments SET status = 'recalled' WHERE id = ?").run(s.id);
        }

        // Find downstream partners
        const affectedPartners = await db.all(`
      SELECT DISTINCT p.id, p.name, p.type FROM partners p
      JOIN supply_chain_events sce ON sce.partner_id = p.id
      WHERE sce.batch_id = ?
    `, [req.params.id]);

        eventBus.emitEvent('BatchRecall', { batch_id: req.params.id, product: batch.product_name, reason, severity });

        res.json({
            recall_id: recallEventId,
            batch: { id: batch.id, batch_number: batch.batch_number, product: batch.product_name },
            blockchain_seal: seal,
            affected_shipments: affectedShipments.length,
            affected_partners: affectedPartners,
            status: 'recalled',
            severity: severity || 'high'
        });
    } catch (err) {
        console.error('Batch recall error:', err);
        res.status(500).json({ error: 'Recall failed' });
    }
});

module.exports = router;

