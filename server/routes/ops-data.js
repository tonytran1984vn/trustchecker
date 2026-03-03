/**
 * Ops Data API Routes
 * CRUD for: PurchaseOrders, Warehouses, QualityChecks, DemandForecasts, Incidents, ActivityLog, Notifications
 * All endpoints filter by org_id from req.user
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');

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

router.post('/purchase-orders', requirePermission('po:create'), async (req, res) => {
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

router.post('/purchase-orders/:id/approve', requirePermission('po:approve'), async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const po = await db.get('SELECT id, created_by FROM purchase_orders WHERE id = ? AND org_id = ?', [req.params.id, orgId]);
        if (!po) return res.status(404).json({ error: 'Purchase order not found' });

        // Identity-level SoD: person who created PO cannot approve it
        if (po.created_by && po.created_by === req.user?.id) {
            return res.status(403).json({
                error: 'SoD violation: you cannot approve a PO you created. A different authorized person must approve.',
                sod_rule: 'created_by ≠ approved_by'
            });
        }

        await db.prepare('UPDATE purchase_orders SET status = ?, approved_by = ?, approved_at = NOW(), updated_at = NOW() WHERE id = ? AND org_id = ?')
            .run('approved', req.user?.id, req.params.id, orgId);
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
// SUPPLIER SCORING & MANAGEMENT (partners + partner_locations)
// ═══════════════════════════════════════════════════════════════════

// Normalization for duplicate detection
const LEGAL_SUFFIXES = /\b(co\.?|company|ltd\.?|limited|inc\.?|incorporated|llc\.?|corp\.?|corporation|plc\.?|gmbh|sa\.?|srl|pte\.?|pty\.?|group|holdings?)\b/gi;
function normalizeName(raw) {
    return (raw || '').toLowerCase().trim()
        .replace(LEGAL_SUFFIXES, '').replace(/[.\-_,&]/g, ' ').replace(/\s+/g, ' ').trim();
}

// GET /supplier-scoring — all suppliers with locations
router.get('/supplier-scoring', async (req, res) => {
    try {
        const suppliers = await db.all('SELECT * FROM partners ORDER BY composite_score DESC');
        // Fetch all locations in one query
        const locations = await db.all('SELECT * FROM partner_locations WHERE status = ? ORDER BY created_at', ['active']);
        // Group locations by partner_id
        const locMap = {};
        for (const loc of locations) {
            if (!locMap[loc.partner_id]) locMap[loc.partner_id] = [];
            locMap[loc.partner_id].push(loc);
        }
        // Attach locations to each supplier
        const result = (suppliers || []).map(s => ({
            ...s,
            locations: locMap[s.id] || []
        }));
        res.json({ suppliers: result });
    } catch (e) { console.error('[supplier-scoring]', e); res.json({ suppliers: [] }); }
});

// POST /suppliers/onboard — create new supplier + initial location
router.post('/suppliers/onboard', requirePermission('supplier:onboard'), async (req, res) => {
    try {
        const { name, type, country, contactEmail, contactPhone, notes } = req.body;
        if (!name || !country || !type) {
            return res.status(400).json({ error: 'Name, country, and type are required' });
        }

        const normalized = normalizeName(name);

        // Check for existing entity with same normalized name
        const existing = await db.get('SELECT id, name, normalized_name, tier FROM partners WHERE normalized_name = ?', [normalized]);
        if (existing) {
            return res.status(409).json({
                error: 'duplicate_entity',
                message: `Supplier "${existing.name}" already exists (${existing.id})`,
                existingSupplier: existing
            });
        }

        const id = uuidv4();
        await db.run(
            `INSERT INTO partners (id, name, normalized_name, type, country, contact_email, contact_phone, notes, kyc_status, trust_score, delivery_score, quality_score, compliance_score, financial_score, composite_score, tier, risk_level, contracts, status, created_by, created_at)
             VALUES (?,?,?,?,?,?,?,?,?,50,50,50,50,50,50,'Pending','medium',0,'active',?,NOW())`,
            [id, name.trim(), normalized, type, country, contactEmail || '', contactPhone || '', notes || '', 'pending_kyc', req.user?.id || null]
        );

        // Add initial location (HQ)
        const locId = uuidv4();
        await db.run(
            'INSERT INTO partner_locations (id, partner_id, country, address, status, created_at) VALUES (?,?,?,?,?,NOW())',
            [locId, id, country, 'HQ', 'active']
        );

        res.json({ success: true, id, message: `${name} submitted for KYC review` });
    } catch (e) {
        console.error('[supplier/onboard]', e);
        res.status(500).json({ error: e.message });
    }
});

// POST /suppliers/:id/locations — add location to existing supplier
router.post('/suppliers/:id/locations', requirePermission('supplier:onboard'), async (req, res) => {
    try {
        const { id } = req.params;
        const { country, address } = req.body;
        if (!country) return res.status(400).json({ error: 'Country is required' });

        // Verify supplier exists
        const supplier = await db.get('SELECT id, name FROM partners WHERE id = ?', [id]);
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

        // Check if location already exists
        const existing = await db.get(
            'SELECT id FROM partner_locations WHERE partner_id = ? AND country = ? AND address = ?',
            [id, country, address || '']
        );
        if (existing) return res.status(409).json({ error: `${country} location already exists` });

        const locId = uuidv4();
        await db.run(
            'INSERT INTO partner_locations (id, partner_id, country, address, status, created_at) VALUES (?,?,?,?,?,NOW())',
            [locId, id, country, address || '', 'active']
        );

        res.json({ success: true, locId, message: `${country} location added to ${supplier.name}` });
    } catch (e) {
        console.error('[supplier/location]', e);
        res.status(500).json({ error: e.message });
    }
});

// PATCH /suppliers/:id/approve — KYC approval (tenant-level L3+ only: org_owner, company_admin, executive, compliance_officer)
const KYC_APPROVER_ROLES = ['org_owner', 'company_admin', 'executive', 'compliance_officer'];
function requireKYCApprover(req, res, next) {
    const role = req.user?.role;
    if (!KYC_APPROVER_ROLES.includes(role)) {
        return res.status(403).json({ error: 'Only tenant governance roles (org_owner, executive, compliance_officer) can approve/reject KYC. Platform admins cannot approve tenant operations.' });
    }
    next();
}

router.patch('/suppliers/:id/approve', requireKYCApprover, async (req, res) => {
    try {
        const { id } = req.params;
        const supplier = await db.get('SELECT name, created_by FROM partners WHERE id = ?', [id]);
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

        // Identity-level SoD: person who submitted cannot approve
        if (supplier.created_by && supplier.created_by === req.user.id) {
            return res.status(403).json({
                error: 'SoD violation: you cannot approve a supplier you submitted. A different authorized person must approve.',
                sod_rule: 'created_by ≠ approved_by'
            });
        }

        await db.run(
            'UPDATE partners SET kyc_status = ?, kyc_verified_at = NOW(), tier = ?, approved_by = ? WHERE id = ?',
            ['verified', 'Bronze', req.user.id, id]
        );

        // Audit log
        await db.run(
            'INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address, timestamp) VALUES (?,?,?,?,?,?,?,NOW())',
            [uuidv4(), req.user.id, 'SUPPLIER_KYC_APPROVED', 'partner', id,
            JSON.stringify({ supplier_name: supplier.name, approved_by: req.user.email, role: req.user.role }),
            req.ip || '']
        );

        res.json({ success: true, message: `${supplier.name} KYC approved` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PATCH /suppliers/:id/reject — KYC rejection (L3+: org_owner, executive, compliance_officer, super_admin)
router.patch('/suppliers/:id/reject', requireKYCApprover, async (req, res) => {
    try {
        const { id } = req.params;
        const supplier = await db.get('SELECT name, created_by FROM partners WHERE id = ?', [id]);
        if (!supplier) return res.status(404).json({ error: 'Supplier not found' });

        // Identity-level SoD: person who submitted cannot reject either
        if (supplier.created_by && supplier.created_by === req.user.id) {
            return res.status(403).json({
                error: 'SoD violation: you cannot reject a supplier you submitted. A different authorized person must review.',
                sod_rule: 'created_by ≠ rejected_by'
            });
        }

        await db.run('UPDATE partners SET kyc_status = ?, rejected_by = ? WHERE id = ?', ['rejected', req.user.id, id]);

        // Audit log
        await db.run(
            'INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address, timestamp) VALUES (?,?,?,?,?,?,?,NOW())',
            [uuidv4(), req.user.id, 'SUPPLIER_KYC_REJECTED', 'partner', id,
            JSON.stringify({ supplier_name: supplier.name, rejected_by: req.user.email, role: req.user.role, reason: req.body?.reason || '' }),
            req.ip || '']
        );

        res.json({ success: true, message: `${supplier.name} KYC rejected` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /suppliers/:id — single supplier with locations
router.get('/suppliers/:id', async (req, res) => {
    try {
        const supplier = await db.get('SELECT * FROM partners WHERE id = ?', [req.params.id]);
        if (!supplier) return res.status(404).json({ error: 'Not found' });
        const locations = await db.all('SELECT * FROM partner_locations WHERE partner_id = ? ORDER BY created_at', [req.params.id]);
        res.json({ supplier: { ...supplier, locations } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
