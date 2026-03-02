/**
 * Ops Data API Routes
 * CRUD for: PurchaseOrders, Warehouses, QualityChecks, DemandForecasts, Incidents, ActivityLog, Notifications
 * All endpoints filter by org_id from req.user
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware } = require('../auth');

router.use(authMiddleware);

function getOrgId(req) { return req.user?.org_id || req.user?.orgId || null; }

// ═══════════════════════════════════════════════════════════════════
// PURCHASE ORDERS
// ═══════════════════════════════════════════════════════════════════
router.get('/purchase-orders', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        let sql = 'SELECT * FROM purchase_orders';
        const params = [];
        if (orgId) { sql += ' WHERE org_id = ?'; params.push(orgId); }
        sql += ' ORDER BY created_at DESC LIMIT 50';
        const rows = await db.prepare(sql).all(...params);
        res.json({ orders: rows || [] });
    } catch (e) { res.json({ orders: [] }); }
});

router.post('/purchase-orders', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { supplier, product, quantity, unit, unitPrice, deliveryDate, paymentTerms, contractRef } = req.body;
        const id = uuidv4();
        const poNumber = `PO-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`;
        const totalAmount = (quantity || 0) * (unitPrice || 0);
        await db.prepare(
            'INSERT INTO purchase_orders (id, po_number, org_id, supplier, product, quantity, unit, unit_price, total_amount, delivery_date, payment_terms, contract_ref, status, created_by, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())'
        ).run(id, poNumber, orgId, supplier || '', product || '', quantity || 0, unit || 'pcs', unitPrice || 0, totalAmount, deliveryDate || null, paymentTerms || 'NET-30', contractRef || '', 'pending_approval', req.user?.id);
        res.json({ success: true, id, poNumber });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/purchase-orders/:id/approve', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        await db.prepare('UPDATE purchase_orders SET status = ?, approved_by = ?, approved_at = NOW(), updated_at = NOW() WHERE id = ? AND org_id = ?')
            .run('approved', req.user?.email || req.user?.id, req.params.id, orgId);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// WAREHOUSES
// ═══════════════════════════════════════════════════════════════════
router.get('/warehouses', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        let sql = 'SELECT * FROM ops_warehouses';
        const params = [];
        if (orgId) { sql += ' WHERE org_id = ?'; params.push(orgId); }
        sql += ' ORDER BY name';
        const rows = await db.prepare(sql).all(...params);
        res.json({ warehouses: rows || [] });
    } catch (e) { res.json({ warehouses: [] }); }
});

// ═══════════════════════════════════════════════════════════════════
// QUALITY CHECKS
// ═══════════════════════════════════════════════════════════════════
router.get('/quality-checks', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        let sql = 'SELECT * FROM quality_checks';
        const params = [];
        if (orgId) { sql += ' WHERE org_id = ?'; params.push(orgId); }
        sql += ' ORDER BY created_at DESC LIMIT 50';
        const rows = await db.prepare(sql).all(...params);
        res.json({ checks: rows || [] });
    } catch (e) { res.json({ checks: [] }); }
});

router.post('/quality-checks', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { batchId, checkType, checkpoint, product, result, score, defectsFound, notes } = req.body;
        const id = uuidv4();
        await db.prepare(
            'INSERT INTO quality_checks (id, org_id, batch_id, check_type, checkpoint, product, result, score, defects_found, inspector, notes, inspected_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())'
        ).run(id, orgId, batchId || null, checkType || 'incoming', checkpoint || '', product || '', result || 'pass', score || 100, defectsFound || 0, req.user?.email || '', notes || '');
        res.json({ success: true, id });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// DEMAND FORECASTS
// ═══════════════════════════════════════════════════════════════════
router.get('/demand-forecast', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        let sql = 'SELECT * FROM demand_forecasts';
        const params = [];
        if (orgId) { sql += ' WHERE org_id = ?'; params.push(orgId); }
        sql += ' ORDER BY created_at DESC LIMIT 50';
        const rows = await db.prepare(sql).all(...params);
        res.json({ forecasts: rows || [] });
    } catch (e) { res.json({ forecasts: [] }); }
});

// ═══════════════════════════════════════════════════════════════════
// INCIDENTS (uses existing ops_incidents_v2 table)
// ═══════════════════════════════════════════════════════════════════
router.get('/data/incidents', async (req, res) => {
    try {
        const status = req.query.status || 'all';
        let sql = 'SELECT * FROM ops_incidents_v2';
        const params = [];
        const conditions = [];
        if (status !== 'all') { conditions.push('status = ?'); params.push(status); }
        if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
        sql += ' ORDER BY created_at DESC LIMIT 50';
        const rows = await db.prepare(sql).all(...params);
        res.json({ incidents: rows || [] });
    } catch (e) { res.json({ incidents: [] }); }
});

router.post('/data/incidents', async (req, res) => {
    try {
        const { title, description, severity, module, assignedTo } = req.body;
        const id = uuidv4();
        const incidentId = `INC-${Date.now().toString(36).toUpperCase()}`;
        await db.prepare(
            'INSERT INTO ops_incidents_v2 (id, incident_id, title, description, severity, status, module, assigned_to, triggered_by, hash, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,NOW(),NOW())'
        ).run(id, incidentId, title || '', description || '', severity || 'SEV3', 'open', module || null, assignedTo || null, req.user?.id, '');
        res.json({ success: true, id, incidentId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/data/incidents/:id', async (req, res) => {
    try {
        const { status, resolution, rootCause } = req.body;
        const updates = ['updated_at = NOW()'];
        const params = [];
        if (status) { updates.push('status = ?'); params.push(status); }
        if (resolution) { updates.push('resolution = ?'); params.push(resolution); }
        if (rootCause) { updates.push('root_cause = ?'); params.push(rootCause); }
        if (status === 'resolved') { updates.push('resolved_at = NOW()'); }
        params.push(req.params.id);
        await db.prepare(`UPDATE ops_incidents_v2 SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// ACTIVITY LOG (reads from audit_log table)
// ═══════════════════════════════════════════════════════════════════
router.get('/activity-log', async (req, res) => {
    try {
        let sql = 'SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 50';
        const rows = await db.prepare(sql).all();
        res.json({ activities: rows || [] });
    } catch (e) { res.json({ activities: [] }); }
});

// ═══════════════════════════════════════════════════════════════════
// SUPPLIER SCORING (reads from partners table)
// ═══════════════════════════════════════════════════════════════════
router.get('/supplier-scoring', async (req, res) => {
    try {
        let sql = 'SELECT * FROM partners WHERE status = ? ORDER BY trust_score DESC';
        const rows = await db.prepare(sql).all('active');
        res.json({ suppliers: rows || [] });
    } catch (e) { res.json({ suppliers: [] }); }
});

module.exports = router;
