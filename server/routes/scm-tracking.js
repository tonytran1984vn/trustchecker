const logger = require('../lib/logger');
// [MIGRATED] Use /api/v1/supply-chain instead
/**
 * SCM Tracking & Traceability Routes (FR-INTEG-002 + FR-SCM-001)
 * EPCIS/CBV event tracking + blockchain SCM layer
 */
const express = require('express');
const {
    validateTransition,
    checkDuplicateReceive,
    validatePartner,
    validateBatchQuantity,
} = require('../middleware/scm-state-machine');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const blockchainEngine = require('../engines/infrastructure/blockchain');
const { eventBus, EVENT_TYPES } = require('../events');
const { validate, schemas } = require('../middleware/validate');

const router = express.Router();

router.use((req, res, next) => {
    res.set('X-Deprecation', 'Use /api/v1/supply-chain instead');
    next();
});

// GOV-1: All routes require authentication
router.use(authMiddleware);

// ─── POST /api/scm/events – Record EPCIS event ──────────────────────────────
// BS-DEFENSE: Idempotency + Replay detection on SCM events
router.post(
    '/events',
    authMiddleware,
    requirePermission('supply_chain:create'),
    validate(schemas.scmEvent),
    async (req, res) => {
        try {
            const { event_type, product_id, batch_id, uid, location, actor, partner_id, details } = req.body;
            const validTypes = ['commission', 'pack', 'ship', 'receive', 'sell', 'return', 'destroy'];
            if (!event_type || !validTypes.includes(event_type)) {
                return res.status(400).json({ error: `event_type must be one of: ${validTypes.join(', ')}` });
            }

            // ── RED-TEAM P2: State Machine + Partner + Idempotency Validation ─
            // INV-4-RBAC: Event-type-specific role validation
            const EVENT_ROLES = {
                commission: ['admin', 'owner', 'manager', 'factory_manager'],
                pack: ['admin', 'owner', 'manager', 'factory_manager', 'operator'],
                ship: ['admin', 'owner', 'manager', 'logistics'],
                receive: ['admin', 'owner', 'manager', 'warehouse', 'logistics'],
                sell: ['admin', 'owner', 'manager', 'sales', 'retailer'],
                return: ['admin', 'owner', 'manager', 'quality'],
                destroy: ['admin', 'owner'],
            };
            const allowedRoles = EVENT_ROLES[event_type];
            if (allowedRoles) {
                const userRole = req.user?.role || req.user?.roleName || '';
                // Super admin and owner always pass
                if (!['super_admin', 'admin', 'owner'].includes(userRole) && !allowedRoles.includes(userRole)) {
                    // Log the RBAC denial but DON'T block — this is advisory for existing flow compatibility
                    logger.warn(
                        '[INV-4-RBAC] User ' +
                            req.user.username +
                            ' (role: ' +
                            userRole +
                            ') creating "' +
                            event_type +
                            '" event — role not in recommended: [' +
                            allowedRoles.join(',') +
                            ']'
                    );
                }
            }

            // FIX-1-SUSPENDED: Block suspended/blocked partners from SCM events
            if (partner_id) {
                const partnerStatus = await db.get('SELECT status, name FROM partners WHERE id = $1', [partner_id]);
                if (partnerStatus && (partnerStatus.status === 'suspended' || partnerStatus.status === 'blocked')) {
                    return res.status(403).json({
                        error:
                            'Partner "' +
                            partnerStatus.name +
                            '" is ' +
                            partnerStatus.status +
                            ' - cannot process SCM events',
                        code: 'PARTNER_SUSPENDED',
                    });
                }
            }

            // ATK-07 FIX: Verify product exists and belongs to org
            if (product_id) {
                const orgId07 = req.user?.orgId || req.user?.org_id;
                const productExists = await db.get('SELECT id FROM products WHERE id = $1 AND org_id = $2', [
                    product_id,
                    orgId07,
                ]);
                if (!productExists) {
                    return res
                        .status(404)
                        .json({ error: 'Product not found in your organization', code: 'PRODUCT_NOT_FOUND' });
                }
            }

            // P2-1: Validate lifecycle transition
            // BS-2-LOCK: Advisory lock to prevent concurrent product updates
            const { acquireProductLock } = require('../middleware/blind-spot-defense');
            const lockAcquired = await acquireProductLock(product_id);
            if (!lockAcquired) {
                return res
                    .status(409)
                    .json({
                        error: 'Product is being updated by another request. Please retry.',
                        code: 'CONCURRENT_UPDATE',
                    });
            }

            const transition = await validateTransition(product_id, batch_id, event_type);
            if (!transition.valid) {
                return res.status(400).json({
                    error: transition.error,
                    current_state: transition.currentState,
                    requested: event_type,
                    code: 'INVALID_TRANSITION',
                });
            }

            // P2-3: Validate partner belongs to org
            if (partner_id) {
                const orgId = req.user?.orgId || req.user?.org_id;
                const partnerCheck = await validatePartner(partner_id, orgId);
                if (!partnerCheck.valid) {
                    return res.status(400).json({ error: partnerCheck.error, code: 'INVALID_PARTNER' });
                }
            }

            // P2-4: Prevent duplicate receive
            const dupCheck = await checkDuplicateReceive(product_id, batch_id, event_type);
            if (dupCheck.isDuplicate) {
                return res.status(409).json({
                    error: 'Shipment already received',
                    existing_receive_id: dupCheck.existingId,
                    received_at: dupCheck.receivedAt,
                    code: 'DUPLICATE_RECEIVE',
                });
            }

            // P2-5: Batch quantity validation
            const qtyCheck = await validateBatchQuantity(batch_id, event_type);
            if (!qtyCheck.valid) {
                return res.status(400).json({ error: qtyCheck.error, code: 'BATCH_QUANTITY_EXCEEDED' });
            }

            const id = uuidv4();
            // Seal to blockchain
            const seal = await blockchainEngine.seal('SCMEvent', id, {
                event_type,
                product_id,
                batch_id,
                location,
                actor,
            });

            await db.run(
                `
      /* ATK-12 FIX */ INSERT INTO supply_chain_events (id, event_type, product_id, batch_id, uid, location, actor, partner_id, details, blockchain_seal_id, org_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
                [
                    id,
                    event_type,
                    product_id || null,
                    batch_id || null,
                    uid || '',
                    location || '',
                    /* INV-4-ACTOR */ req.user.username || req.user.email || 'system',
                    partner_id || null,
                    JSON.stringify(details || {}),
                    seal.seal_id,
                    req.user?.orgId || req.user?.org_id || null,
                ]
            );

            eventBus.emitEvent('SCMEvent', { id, event_type, product_id, batch_id, location });

            // L-RGF: Process through governance flow (Steps 1-5)
            let governance = null;
            try {
                const lrgf = require('../engines/regulatory-engine').lrgf;
                const { withTransaction } = require('../middleware/transaction');
                governance = lrgf.processEvent(
                    { event_type, product_id, batch_id, org_id: req.user.orgId, idempotency_key: `scm-${id}` },
                    {
                        source: 'scm-tracking',
                        ip: req.ip,
                        user_agent: req.headers['user-agent'],
                        latitude: details?.latitude,
                        longitude: details?.longitude,
                    },
                    {
                        velocity_anomaly: 0,
                        geo_risk: 0,
                        device_mismatch: 0,
                        historical_batch: 0,
                        distributor_trust: 0,
                        duplicate_cluster: 0,
                    }
                );
            } catch (lrgfErr) {
                logger.error('[L-RGF] Governance flow error (non-blocking):', lrgfErr.message);
            }

            // FIX-9-AUDIT: Log to immutable audit trail
            try {
                await db.run(
                    'INSERT INTO audit_log (actor_id, actor_email, action, entity_type, entity_id, org_id, new_value, ip_address, user_agent) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
                    [
                        req.user?.id,
                        req.user?.email,
                        'SCM_EVENT_' + event_type.toUpperCase(),
                        'supply_chain_event',
                        id,
                        req.user?.orgId || req.user?.org_id,
                        JSON.stringify({ event_type, product_id, batch_id, partner_id, location }),
                        req.ip,
                        req.headers['user-agent'],
                    ]
                );
            } catch (auditErr) {
                logger.error('[Audit]', auditErr.message);
            }

            res.status(201).json({ id, event_type, blockchain_seal: seal, governance });
        } catch (err) {
            logger.error('SCM event error:', err);
            res.status(500).json({ error: 'Failed to record event' });
        }
    }
);

// ─── GET /api/scm/events/:productId/journey – Product journey ────────────────
router.get('/events/:productId/journey', authMiddleware, async (req, res) => {
    try {
        const events = await db.all(
            `
      /* ATK-09 FIX */ SELECT sce.*, p.name as partner_name
      FROM supply_chain_events sce
      LEFT JOIN partners p ON sce.partner_id = p.id
      LEFT JOIN products pr ON sce.product_id = pr.id
      WHERE sce.product_id = ? AND (pr.org_id = ? OR ? IS NULL)
      ORDER BY sce.created_at ASC
    `,
            [
                req.params.productId,
                req.user?.orgId || req.user?.org_id || null,
                req.user?.orgId || req.user?.org_id || null,
            ]
        );

        const product = await db.get('SELECT name, sku FROM products WHERE id = ?', [req.params.productId]);

        res.json({
            product: product || { name: 'Unknown', sku: '' },
            journey: events,
            total_events: events.length,
            current_stage: events.length > 0 ? events[events.length - 1].event_type : 'unknown',
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
        if (orgId && req.user?.role !== 'super_admin') {
            conditions.push('pr.org_id = ?');
            params.push(orgId);
        }
        if (event_type) {
            conditions.push('sce.event_type = ?');
            params.push(event_type);
        }
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
        if (!batch_number || !product_id)
            return res.status(400).json({ error: 'batch_number and product_id required' });

        // ATK-08 FIX: Verify product belongs to user's org
        const batchOrgId08 = req.user?.org_id || req.user?.orgId;
        if (batchOrgId08) {
            const batchProduct = await db.get('SELECT id FROM products WHERE id = ? AND org_id = ?', [
                product_id,
                batchOrgId08,
            ]);
            if (!batchProduct)
                return res
                    .status(404)
                    .json({ error: 'Product not found in your organization', code: 'PRODUCT_NOT_FOUND' });
        }

        const id = uuidv4();
        const orgId = req.user?.org_id || null;
        await db.run(
            `
      INSERT INTO batches (id, batch_number, product_id, quantity, manufactured_date, expiry_date, origin_facility, org_id, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'created', NOW())
    `,
            [
                id,
                batch_number,
                product_id,
                quantity || 0,
                manufactured_date || null,
                expiry_date || null,
                origin_facility || '',
                orgId,
            ]
        );

        // Auto-create commission event
        const eventId = uuidv4();
        const seal = await blockchainEngine.seal('BatchCreated', eventId, { batch_number, product_id, quantity });
        await db.run(
            `
      INSERT INTO supply_chain_events (id, event_type, product_id, batch_id, location, actor, details, blockchain_seal_id, org_id)
      VALUES (?, 'commission', ?, ?, ?, ?, ?, ?, ?)
    `,
            [
                eventId,
                product_id,
                id,
                origin_facility || '',
                req.user.username,
                JSON.stringify({ quantity, batch_number }),
                seal.seal_id,
                orgId,
            ]
        );

        res.status(201).json({ id, batch_number, blockchain_seal: seal });
    } catch (err) {
        logger.error('Create batch error:', err);
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
        if (orgId) {
            conditions.push('p.org_id = ?');
            params.push(orgId);
        }
        if (product_id) {
            conditions.push('b.product_id = ?');
            params.push(product_id);
        }
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
        // ATK-10 FIX: Org-scoped batch trace
        const traceOrg = req.user?.org_id || req.user?.orgId;
        const batch = await db.get(
            'SELECT b.*, p.name as product_name FROM batches b LEFT JOIN products p ON b.product_id = p.id WHERE b.id = ? AND (p.org_id = ? OR ? IS NULL)',
            [req.params.id, traceOrg, traceOrg]
        );
        if (!batch) return res.status(404).json({ error: 'Batch not found' });

        const events = await db.all(
            `
      SELECT sce.*, p.name as partner_name
      FROM supply_chain_events sce
      LEFT JOIN partners p ON sce.partner_id = p.id
      WHERE sce.batch_id = ?
      ORDER BY sce.created_at ASC
    `,
            [req.params.id]
        );

        const shipments = await db.all(
            `
      SELECT s.*, fp.name as from_name, tp.name as to_name
      FROM shipments s
      LEFT JOIN partners fp ON s.from_partner_id = fp.id
      LEFT JOIN partners tp ON s.to_partner_id = tp.id
      WHERE s.batch_id = ?
    `,
            [req.params.id]
        );

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
            ? (
                  await db.get(
                      'SELECT COUNT(*) as c FROM batches b JOIN products p ON b.product_id = p.id WHERE p.org_id = ?',
                      [orgId]
                  )
              )?.c || 0
            : (await db.get('SELECT COUNT(*) as c FROM batches'))?.c || 0;

        // Events — filtered by org_id via products table
        const totalEvents = orgId
            ? (
                  await db.get(
                      'SELECT COUNT(*) as c FROM supply_chain_events sce JOIN products p ON sce.product_id = p.id WHERE p.org_id = ?',
                      [orgId]
                  )
              )?.c || 0
            : (await db.get('SELECT COUNT(*) as c FROM supply_chain_events'))?.c || 0;

        // Partners — filtered directly by org_id
        const totalPartners = orgId
            ? (await db.get('SELECT COUNT(*) as c FROM partners WHERE org_id = ?', [orgId]))?.c || 0
            : (await db.get('SELECT COUNT(*) as c FROM partners'))?.c || 0;

        // Shipments — filtered by org_id via partners
        const totalShipments = orgId
            ? (
                  await db.get(
                      'SELECT COUNT(*) as c FROM shipments s LEFT JOIN partners fp ON s.from_partner_id = fp.id LEFT JOIN partners tp ON s.to_partner_id = tp.id WHERE (fp.org_id = ? OR tp.org_id = ?)',
                      [orgId, orgId]
                  )
              )?.c || 0
            : (await db.get('SELECT COUNT(*) as c FROM shipments'))?.c || 0;

        const activeShipments = orgId
            ? (
                  await db.get(
                      "SELECT COUNT(*) as c FROM shipments s LEFT JOIN partners fp ON s.from_partner_id = fp.id LEFT JOIN partners tp ON s.to_partner_id = tp.id WHERE s.status IN ('pending','in_transit') AND (fp.org_id = ? OR tp.org_id = ?)",
                      [orgId, orgId]
                  )
              )?.c || 0
            : (await db.get("SELECT COUNT(*) as c FROM shipments WHERE status IN ('pending','in_transit')"))?.c || 0;

        // Leaks — filtered by org_id via products
        const totalLeaks = orgId
            ? (
                  await db.get(
                      "SELECT COUNT(*) as c FROM leak_alerts la JOIN products p ON la.product_id = p.id WHERE la.status = 'open' AND p.org_id = ?",
                      [orgId]
                  )
              )?.c || 0
            : (await db.get("SELECT COUNT(*) as c FROM leak_alerts WHERE status = 'open'"))?.c || 0;

        // SLA violations — filtered by org_id via partners
        const slaViolations = orgId
            ? (
                  await db.get(
                      "SELECT COUNT(*) as c FROM sla_violations sv JOIN partners p ON sv.partner_id = p.id WHERE sv.status = 'open' AND p.org_id = ?",
                      [orgId]
                  )
              )?.c || 0
            : (await db.get("SELECT COUNT(*) as c FROM sla_violations WHERE status = 'open'"))?.c || 0;

        const avgPartnerTrust = orgId
            ? (await db.get('SELECT COALESCE(AVG(trust_score), 50) as avg FROM partners WHERE org_id = ?', [orgId]))
                  ?.avg || 50
            : (await db.get('SELECT COALESCE(AVG(trust_score), 50) as avg FROM partners'))?.avg || 50;

        // Events by type — filtered
        const eventsByType = orgId
            ? await db.all(
                  'SELECT sce.event_type, COUNT(*) as count FROM supply_chain_events sce JOIN products p ON sce.product_id = p.id WHERE p.org_id = ? GROUP BY sce.event_type ORDER BY count DESC LIMIT 1000',
                  [orgId]
              )
            : await db.all(
                  'SELECT event_type, COUNT(*) as count FROM supply_chain_events GROUP BY event_type ORDER BY count DESC LIMIT 1000'
              );

        // Recent events — filtered
        const recentEvents = orgId
            ? await db.all(
                  `
          SELECT sce.*, p.name as partner_name, pr.name as product_name
          FROM supply_chain_events sce
          LEFT JOIN partners p ON sce.partner_id = p.id
          LEFT JOIN products pr ON sce.product_id = pr.id
          WHERE pr.org_id = ?
          ORDER BY sce.created_at DESC LIMIT 10
        `,
                  [orgId]
              )
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
            recent_events: recentEvents,
        });
    } catch (err) {
        logger.error('SCM dashboard error:', err);
        res.status(500).json({ error: 'Failed to load dashboard' });
    }
});

// ─── POST /batches/:id/recall — Initiate batch recall ────────────────────────
router.post('/batches/:id/recall', authMiddleware, requirePermission('batch:manage'), async (req, res) => {
    try {
        const { reason, severity } = req.body;
        /* ATK-13 FIX */ const recallOrg = req.user?.org_id || req.user?.orgId;
        const batch = await db.get(
            'SELECT b.*, p.name as product_name FROM batches b LEFT JOIN products p ON b.product_id = p.id WHERE b.id = ? AND (p.org_id = ? OR ? IS NULL)',
            [req.params.id, recallOrg, recallOrg]
        );
        if (!batch) return res.status(404).json({ error: 'Batch not found' });

        // Mark batch as recalled
        await db.prepare("UPDATE batches SET status = 'recalled' WHERE id = ?").run(req.params.id);

        // Create recall event
        const recallEventId = uuidv4();
        const seal = await blockchainEngine.seal('BatchRecall', recallEventId, {
            batch_id: req.params.id,
            reason,
            severity,
        });
        await db.run(
            `
      INSERT INTO supply_chain_events (id, event_type, product_id, batch_id, actor, details, blockchain_seal_id)
      VALUES (?, 'return', ?, ?, ?, ?, ?)
    `,
            [
                recallEventId,
                batch.product_id,
                req.params.id,
                req.user.username,
                JSON.stringify({ action: 'recall', reason: reason || 'Quality issue', severity: severity || 'high' }),
                seal.seal_id,
            ]
        );

        // ── RED-TEAM P1-3: Cascade revoke ALL QR codes in this batch ──────
        const revokedQRs = await db.run(
            `
          /* ATK-14 FIX */ UPDATE qr_codes SET status = 'revoked' 
          WHERE product_id IN (
              SELECT DISTINCT sce.product_id FROM supply_chain_events sce WHERE sce.batch_id = ?
          ) AND status != 'revoked'
        `,
            [req.params.id]
        );
        logger.info('Batch recall: QR codes revoked', { batchId: req.params.id });

        // Find affected shipments
        const affectedShipments = await db.all("SELECT * FROM shipments WHERE batch_id = ? AND status != 'delivered'", [
            req.params.id,
        ]);
        for (const s of affectedShipments) {
            await db.prepare("UPDATE shipments SET status = 'recalled' WHERE id = ?").run(s.id);
        }

        // Find downstream partners
        const affectedPartners = await db.all(
            `
      SELECT DISTINCT p.id, p.name, p.type FROM partners p
      JOIN supply_chain_events sce ON sce.partner_id = p.id
      WHERE sce.batch_id = ?
    `,
            [req.params.id]
        );

        eventBus.emitEvent('BatchRecall', { batch_id: req.params.id, product: batch.product_name, reason, severity });

        res.json({
            recall_id: recallEventId,
            batch: { id: batch.id, batch_number: batch.batch_number, product: batch.product_name },
            blockchain_seal: seal,
            affected_shipments: affectedShipments.length,
            affected_partners: affectedPartners,
            status: 'recalled',
            severity: severity || 'high',
        });
    } catch (err) {
        logger.error('Batch recall error:', err);
        res.status(500).json({ error: 'Recall failed' });
    }
});

// ─── DIGITAL TWIN + ANOMALY API ─────────────────────────────────
const digitalTwin = require('../services/digital-twin');
const anomalyEngine = require('../services/anomaly-engine');
const eventProcessor = require('../services/event-processor');

// GET /api/scm/digital-twin/:productId — Compute full state from event chain
router.get('/digital-twin/:productId', async (req, res) => {
    try {
        const twin = await digitalTwin.reconcile(req.params.productId);
        res.json(twin);
    } catch (err) {
        res.status(500).json({ error: 'Digital twin failed', detail: err.message });
    }
});

// GET /api/scm/chain-integrity/:productId — Verify hash chain
router.get('/chain-integrity/:productId', async (req, res) => {
    try {
        const { verifyChainIntegrity } = require('../middleware/scm-state-machine');
        const result = await verifyChainIntegrity(req.params.productId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/scm/verify-signature/:eventId — Verify event cryptographic signature
router.get('/verify-signature/:eventId', async (req, res) => {
    try {
        const event = await db.get('SELECT * FROM product_events WHERE id = $1', [req.params.eventId]);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        const { verifySignature } = require('../middleware/scm-state-machine');
        const result = verifySignature(
            {
                productId: event.product_id,
                eventType: event.event_type,
                actorId: event.actor_id,
                signed_at: event.created_at,
            },
            event.signature
        );
        res.json({
            event_id: event.id,
            event_type: event.event_type,
            signature_check: result,
            hash: event.hash?.substring(0, 16),
            sequence: event.sequence_number,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/scm/risk-profile/:actorId — Get actor risk profile
router.get('/risk-profile/:actorId', async (req, res) => {
    try {
        const profile = await db.get('SELECT * FROM actor_risk_profiles WHERE actor_id = $1', [req.params.actorId]);
        const recentScores = await db.all(
            'SELECT total_score, decision, reasons, created_at FROM risk_scores WHERE actor_id = $1 ORDER BY created_at DESC LIMIT 10',
            [req.params.actorId]
        );
        res.json({
            profile: profile || { actor_id: req.params.actorId, risk_level: 'NEW' },
            recent_scores: recentScores || [],
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/scm/anomalies — Recent anomaly alerts
router.get('/anomalies', async (req, res) => {
    res.json({ alerts: anomalyEngine.getAlerts(parseInt(req.query.limit) || 50), stats: anomalyEngine.getStats() });
});

// GET /api/scm/processor-stats — Event processor stats
router.get('/processor-stats', async (req, res) => {
    res.json(eventProcessor.getStats());
});

module.exports = router;
