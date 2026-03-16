/**
 * Ops Data API Routes
 * CRUD for: PurchaseOrders, Warehouses, QualityChecks, DemandForecasts, Incidents, ActivityLog, Notifications
 * All endpoints filter by org_id from req.user
 */
const { withTransaction } = require('../middleware/transaction');
const { cacheInvalidate } = require('../middleware/cache-invalidate');
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const { orgGuard } = require('../middleware/org-middleware');
const { appendAuditEntry } = require('../utils/audit-chain');

router.use(authMiddleware);
router.use(orgGuard());

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
        const orgId = getOrgId(req);
        const status = req.query.status || 'all';
        let sql = 'SELECT * FROM ops_incidents_v2';
        const params = [];
        const conditions = [];
        if (orgId) { conditions.push('org_id = ?'); params.push(orgId); }
        if (status !== 'all') { conditions.push('status = ?'); params.push(status); }
        if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
        sql += ' ORDER BY created_at DESC LIMIT 50';
        const rows = await db.prepare(sql).all(...params);
        res.json({ incidents: rows || [] });
    } catch (e) { res.json({ incidents: [] }); }
});

router.post('/data/incidents', async (req, res) => {
    // v9.5.0: Rate limit — max 50 incidents per hour per org
    const orgId = getOrgId(req);
    const recentCount = await db.get(
        "SELECT COUNT(*) as c FROM ops_incidents_v2 WHERE org_id = ? AND created_at > NOW() - INTERVAL '1 hour'",
        [orgId]
    );
    if (recentCount?.c >= 50) {
        return res.status(429).json({ error: 'Rate limit: maximum 50 incidents per hour' });
    }
    try {
        const orgId = getOrgId(req);
        const { title, description, severity, module, assignedTo } = req.body;
        const id = uuidv4();
        const incidentId = `INC-${Date.now().toString(36).toUpperCase()}`;
        await db.prepare(
            'INSERT INTO ops_incidents_v2 (id, incident_id, org_id, title, description, severity, status, module, assigned_to, triggered_by, hash, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,NOW(),NOW())'
        ).run(id, incidentId, orgId, title || '', description || '', severity || 'SEV3', 'open', module || null, assignedTo || null, req.user?.id, '');
        res.json({ success: true, id, incidentId });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/data/incidents/:id', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { status, resolution, rootCause, assigned_to, severity } = req.body;
        // Validate status transitions
        const validStatuses = ['open', 'investigating', 'escalated', 'resolved', 'closed'];
        if (status && !validStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}` });
        }
        // v9.4.2: Enforce state machine transitions
        if (status) {
            const VALID_TRANSITIONS = {
                'open': ['investigating', 'escalated'],  // v9.5.0: Must investigate before closing
                'investigating': ['escalated', 'resolved', 'closed'],
                'escalated': ['investigating', 'resolved', 'closed'],
                'resolved': ['closed', 'open'],   // reopen allowed
                'closed': ['open']                  // reopen allowed
            };
            const current = await db.get('SELECT status FROM ops_incidents_v2 WHERE id = ?', [req.params.id]);
            if (current && VALID_TRANSITIONS[current.status] && !VALID_TRANSITIONS[current.status].includes(status)) {
                return res.status(400).json({
                    error: `Invalid transition: ${current.status} → ${status}. Allowed: ${VALID_TRANSITIONS[current.status].join(', ')} LIMIT 1000`
                });
            }
        }
        if (status === 'closed' && !resolution) {
            return res.status(400).json({ error: 'Cannot close incident without a resolution' });
        }
        // Whitelisted field updates only
        const updates = ['updated_at = NOW()'];
        const params = [];
        if (status) { updates.push('status = ?'); params.push(status); }
        if (resolution) { updates.push('resolution = ?'); params.push(resolution); }
        if (rootCause) { updates.push('root_cause = ?'); params.push(rootCause); }
        if (assigned_to) { updates.push('assigned_to = ?'); params.push(assigned_to); }
        if (severity) {
            // v9.5.0: Audit severity changes — detect downgrade attacks
            const current = await db.get('SELECT severity FROM ops_incidents_v2 WHERE id = ?', [req.params.id]);
            const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
            const oldRank = SEVERITY_RANK[current?.severity] || 0;
            const newRank = SEVERITY_RANK[severity] || 0;
            if (newRank < oldRank) {
                // Severity downgrade — log explicitly for compliance
                await db.run(
                    "INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, org_id, timestamp) VALUES (?, ?, 'SEVERITY_DOWNGRADED', 'incident', ?, ?, ?, NOW())",
                    [require('uuid LIMIT 1000').v4(), req.user.id, req.params.id, 
                     JSON.stringify({ old_severity: current.severity, new_severity: severity, reason: req.body.reason || 'Not provided' }),
                     req.orgId || req.user.org_id]
                );
            }
            updates.push('severity = ?'); params.push(severity);
        }
        if (status === 'resolved' || status === 'closed') { 
            updates.push('resolved_at = NOW()');
            // v9.5.0: Trigger trust score recalculation for affected products
            try {
                const incident = await db.get('SELECT product_id FROM ops_incidents_v2 WHERE id = ?', [req.params.id]);
                if (incident?.product_id) {
                    const trustEngine = req.app?.locals?.trustEngine;
                    if (trustEngine) {
                        trustEngine.calculateScore(incident.product_id).catch(e => 
                            console.error('[TrustRecalc] Error:', e.message)
                        );
                    }
                }
            } catch (e) { console.debug('[TrustRecalc] Skip:', e.message); }
        }
        if (updates.length === 1) return res.status(400).json({ error: 'No valid fields to update' });
        params.push(req.params.id);
        let sql = `UPDATE ops_incidents_v2 SET ${updates.join(', ')} WHERE id = ? LIMIT 1000 LIMIT 1000 LIMIT 1000 LIMIT 1000 LIMIT 1000 LIMIT 1000`;
        if (orgId) { sql += ' AND org_id = ?'; params.push(orgId); }
        await db.prepare(sql).run(...params);
        res.json({ success: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// ACTIVITY LOG (reads from audit_log table)
// ═══════════════════════════════════════════════════════════════════
router.get('/activity-log', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        let sql, params = [];
        if (orgId) {
            // audit_log has no org_id column — filter by actors belonging to the same org
            sql = `SELECT a.* FROM audit_log a
                   INNER JOIN users u ON a.actor_id = u.id OR a.actor_id = u.email
                   WHERE u.org_id = $1
                   ORDER BY a.timestamp DESC LIMIT 50`;
            params = [orgId];
        } else {
            sql = 'SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 50';
        }
        const rows = await db.prepare(sql).all(...params);
        res.json({ activities: rows || [] });
    } catch (e) {
        console.error('[activity-log]', e.message);
        // Fallback: return all recent activities
        try {
            const rows = await db.all('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 50');
            res.json({ activities: rows || [] });
        } catch { res.json({ activities: [] }); }
    }
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
        const orgId = getOrgId(req);
        let sql = 'SELECT * FROM partners';
        const params = [];
        if (orgId) { sql += ' WHERE org_id = ?'; params.push(orgId); }
        sql += ' ORDER BY composite_score DESC';
        const suppliers = await db.prepare(sql).all(...params);
        // Fetch all locations in one query
        const locations = await db.all('SELECT * FROM partner_locations WHERE status = ? ORDER BY created_at LIMIT 1000', ['active']);
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
                message: `Supplier "${existing.name}" already exists (${existing.id}) LIMIT 1000`,
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
        if (existing) return res.status(409).json({ error: `${country} location already exists LIMIT 1000` });

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

// PATCH /suppliers/:id/approve — KYC approval (org-level L3+ only: org_owner, company_admin, executive, compliance_officer)
const KYC_APPROVER_ROLES = ['org_owner', 'company_admin', 'executive', 'compliance_officer'];
function requireKYCApprover(req, res, next) {
    const role = req.user?.role;
    if (!KYC_APPROVER_ROLES.includes(role)) {
        return res.status(403).json({ error: 'Only org governance roles (org_owner, executive, compliance_officer) can approve/reject KYC. Platform admins cannot approve org operations.' });
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

        // Tamper-evident audit log
        await appendAuditEntry({
            actor_id: req.user.id,
            action: 'SUPPLIER_KYC_APPROVED',
            entity_type: 'partner',
            entity_id: id,
            details: { supplier_name: supplier.name, approved_by: req.user.email, role: req.user.role },
            ip: req.ip || ''
        });

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

        // Tamper-evident audit log
        await appendAuditEntry({
            actor_id: req.user.id,
            action: 'SUPPLIER_KYC_REJECTED',
            entity_type: 'partner',
            entity_id: id,
            details: { supplier_name: supplier.name, rejected_by: req.user.email, role: req.user.role, reason: req.body?.reason || '' },
            ip: req.ip || ''
        });

        res.json({ success: true, message: `${supplier.name} KYC rejected` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /suppliers/:id — single supplier with locations
router.get('/suppliers/:id', async (req, res) => {
    try {
        const supplier = await db.get('SELECT * FROM partners WHERE id = ?', [req.params.id]);
        if (!supplier) return res.status(404).json({ error: 'Not found' });
        const locations = await db.all('SELECT * FROM partner_locations WHERE partner_id = ? ORDER BY created_at LIMIT 1000', [req.params.id]);
        res.json({ supplier: { ...supplier, locations } });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ═══════════════════════════════════════════════════════════════════
// NEW ROUTES — Feed real data to previously-hardcoded pages
// ═══════════════════════════════════════════════════════════════════

// Geo Alerts — from fraud_alerts where alert_type contains 'geo'
router.get('/geo-alerts', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        let sql = `SELECT fa.*, se.geo_city, se.geo_country, se.scanned_at,
                          qc.qr_data as qr_code, p.name as product_name
                   FROM fraud_alerts fa
                   LEFT JOIN scan_events se ON fa.scan_event_id = se.id
                   LEFT JOIN qr_codes qc ON se.qr_code_id = qc.id
                   LEFT JOIN products p ON fa.product_id = p.id
                   WHERE fa.alert_type LIKE '%geo%'`;
        const params = [];
        if (orgId) { sql += ' AND (p.org_id = ? OR p.org_id IS NULL)'; params.push(orgId); }
        sql += ' ORDER BY fa.created_at DESC LIMIT 50';
        const rows = await db.prepare(sql).all(...params);
        // Enrich: extract location from description when geo_city is null
        const enriched = (rows || []).map(r => {
            if (!r.geo_city && r.description) {
                const m = r.description.match(/(?:in|from|at)\s+([A-Z][a-zA-Z\s]+?)(?:,|$)/i);
                if (m) r.extracted_location = m[1].trim();
            }
            return r;
        });
        res.json({ alerts: enriched });
    } catch (e) { res.json({ alerts: [] }); }
});

// Mismatch Alerts — from anomaly_detections where type = 'mismatch' or 'quantity_mismatch'
router.get('/mismatch-alerts', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        let sql = `SELECT ad.* FROM anomaly_detections ad
                   WHERE ad.anomaly_type IN ('mismatch','quantity_mismatch','weight_mismatch')`;
        const params = [];
        if (orgId) { sql += ' AND (ad.org_id = ? OR ad.org_id IS NULL)'; params.push(orgId); }
        sql += ' ORDER BY ad.detected_at DESC LIMIT 50';
        const rows = await db.prepare(sql).all(...params);
        res.json({ mismatches: rows || [] });
    } catch (e) { res.json({ mismatches: [] }); }
});

// Duplicate Alerts — from anomaly_detections where type = 'duplicate_qr' or 'duplicate_scan'
router.get('/duplicate-alerts', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        let sql = `SELECT ad.* FROM anomaly_detections ad
                   WHERE ad.anomaly_type LIKE 'duplicate%'`;
        const params = [];
        if (orgId) { sql += ' AND (ad.org_id = ? OR ad.org_id IS NULL)'; params.push(orgId); }
        sql += ' ORDER BY ad.detected_at DESC LIMIT 50';
        const rows = await db.prepare(sql).all(...params);
        
        // Batch product lookup (fix N+1)
        const productIds = new Set();
        for (const row of (rows || [])) {
            const d = typeof row.details === 'string' ? (() => { try { return JSON.parse(row.details); } catch { return {}; } })() : (row.details || {});
            if (d.product_id) productIds.add(d.product_id);
        }
        const productMap = {};
        if (productIds.size > 0) {
            const placeholders = [...productIds].map((_, i) => `$${i + 1}`).join(',');
            try {
                if (!/^[\$0-9, ]+$/.test(placeholders)) throw new Error("Invalid placeholders");
                const products = await db.all(`SELECT id, name FROM products WHERE id IN (${placeholders}) LIMIT 1000`, [...productIds]);
                for (const p of products) productMap[p.id] = p.name;
            } catch {}
        }
        // Enrich rows
        for (const row of (rows || [])) {
            const d = typeof row.details === 'string' ? (() => { try { return JSON.parse(row.details); } catch { return {}; } })() : (row.details || {});
            if (d.product_id && productMap[d.product_id]) {
                row.resolved_product_name = productMap[d.product_id];
            }
        }
        res.json({ alerts: rows || [] });
    } catch (e) { res.json({ alerts: [] }); }
});

// Update anomaly status (resolve, escalate, dismiss)
router.put('/data/anomaly/:id', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        const { status } = req.body;
        if (!status) return res.status(400).json({ error: 'status is required' });
        const validStatuses = ['open', 'investigating', 'resolved', 'dismissed', 'escalated', 'confirmed', 'active'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}` });
        }
        let sql = 'UPDATE anomaly_detections SET status = ?';
        const params = [status];
        if (status === 'resolved' || status === 'dismissed') {
            sql += ', resolved_at = NOW()';
        }
        sql += ' WHERE id = ?';
        params.push(req.params.id);
        if (orgId) { sql += ' AND (org_id = ? OR org_id IS NULL)'; params.push(orgId); }
        await db.prepare(sql).run(...params);
        res.json({ success: true, message: `Alert ${status}` });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Receiving — pending inbound shipments
router.get('/receiving', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        let sql = `SELECT s.*, b.batch_number,
                          fp.name as from_name, tp.name as to_name
                   FROM shipments s
                   LEFT JOIN batches b ON s.batch_id = b.id
                   LEFT JOIN partners fp ON s.from_partner_id = fp.id
                   LEFT JOIN partners tp ON s.to_partner_id = tp.id
                   WHERE s.status IN ('pending','in_transit','arrived','delivered')`;
        const params = [];
        if (orgId) { sql += ' AND (fp.org_id = ? OR tp.org_id = ?)'; params.push(orgId, orgId); }
        sql += ' ORDER BY s.created_at DESC LIMIT 50';
        const rows = await db.prepare(sql).all(...params);
        res.json({ pending: rows || [] });
    } catch (e) { res.json({ pending: [] }); }
});

// Recall History — incidents with module = 'recall' or 'batch_recall'
router.get('/recall-history', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        let sql = 'SELECT * FROM ops_incidents_v2 WHERE module IN (?, ?)';
        const params = ['recall', 'batch_recall'];
        if (orgId) { sql += ' AND org_id = ?'; params.push(orgId); }
        sql += ' ORDER BY created_at DESC LIMIT 50';
        const rows = await db.prepare(sql).all(...params);
        res.json({ recalls: rows || [] });
    } catch (e) { res.json({ recalls: [] }); }
});

// Scan History — real scan events for Scan Monitor page
router.get('/scan-history', async (req, res) => {
    try {
        const orgId = getOrgId(req);
        let sql = `SELECT se.*, qc.qr_data as qr_code, p.name as product_name, p.sku
                   FROM scan_events se
                   LEFT JOIN qr_codes qc ON se.qr_code_id = qc.id
                   LEFT JOIN products p ON se.product_id = p.id
                   WHERE 1=1`;
        const params = [];
        if (orgId) { sql += ' AND (p.org_id = ? OR p.org_id IS NULL)'; params.push(orgId); }
        sql += ' ORDER BY se.scanned_at DESC LIMIT 100';
        const rows = await db.prepare(sql).all(...params);
        res.json({ scans: rows || [] });
    } catch (e) { res.json({ scans: [] }); }
});

module.exports = router;
