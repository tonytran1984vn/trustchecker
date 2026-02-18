/**
 * EPCIS 2.0 Routes — GS1 Compliant Supply Chain Event API
 * Provides EPCIS JSON-LD event query, capture, and document export
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const epcisEngine = require('../engines/epcis-engine');
const { cacheMiddleware } = require('../cache');

router.use(authMiddleware);

// ─── GET /api/scm/epcis/events — Query EPCIS events ─────────────────────────
router.get('/events', async (req, res) => {
    try {
        const {
            eventType, bizStep, action, disposition,
            GE_eventTime, LT_eventTime, MATCH_epc,
            limit = 50, offset = 0
        } = req.query;

        // Fetch internal events
        const events = await db.prepare(`
      SELECT sce.*, p.name as product_name, p.sku, pt.name as partner_name,
             b.batch_number
      FROM supply_chain_events sce
      LEFT JOIN products p ON sce.product_id = p.id
      LEFT JOIN partners pt ON sce.partner_id = pt.id
      LEFT JOIN batches b ON sce.batch_id = b.id
      ORDER BY sce.created_at DESC LIMIT ? OFFSET ?
    `).all(parseInt(limit), parseInt(offset));

        // Convert to EPCIS format
        const epcisEvents = events.map(e => epcisEngine.toEpcisEvent(e, {
            id: e.product_id, name: e.product_name, sku: e.sku
        }, {
            id: e.partner_id, name: e.partner_name
        }, {
            id: e.batch_id, batch_number: e.batch_number
        }));

        // Apply EPCIS query filters
        const filtered = epcisEngine.queryEvents(epcisEvents, {
            eventType, bizStep, EQ_action: action,
            EQ_disposition: disposition,
            GE_eventTime, LT_eventTime, MATCH_epc
        });

        res.json({
            '@context': 'https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld',
            type: 'EPCISQueryDocument',
            schemaVersion: '2.0',
            epcisBody: {
                queryResults: {
                    queryName: 'SimpleEventQuery',
                    resultsBody: {
                        eventList: filtered
                    }
                }
            },
            'trustchecker:metadata': {
                total: filtered.length,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (err) {
        console.error('EPCIS query error:', err);
        res.status(500).json({ error: 'EPCIS query failed' });
    }
});

// ─── GET /api/scm/epcis/events/:id — Single EPCIS event ─────────────────────
router.get('/events/:id', async (req, res) => {
    try {
        const event = await db.prepare(`
      SELECT sce.*, p.name as product_name, p.sku, pt.name as partner_name,
             b.batch_number
      FROM supply_chain_events sce
      LEFT JOIN products p ON sce.product_id = p.id
      LEFT JOIN partners pt ON sce.partner_id = pt.id
      LEFT JOIN batches b ON sce.batch_id = b.id
      WHERE sce.id = ?
    `).get(req.params.id);

        if (!event) return res.status(404).json({ error: 'Event not found' });

        const epcisEvent = epcisEngine.toEpcisEvent(event, {
            id: event.product_id, name: event.product_name, sku: event.sku
        }, {
            id: event.partner_id, name: event.partner_name
        }, {
            id: event.batch_id, batch_number: event.batch_number
        });

        res.json({
            '@context': 'https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld',
            type: 'EPCISQueryDocument',
            epcisBody: { eventList: [epcisEvent] }
        });
    } catch (err) {
        console.error('EPCIS event error:', err);
        res.status(500).json({ error: 'Failed to fetch EPCIS event' });
    }
});

// ─── POST /api/scm/epcis/capture — Ingest external EPCIS events ─────────────
router.post('/capture', requireRole('operator'), async (req, res) => {
    try {
        const { epcisBody } = req.body;
        if (!epcisBody?.eventList) {
            return res.status(400).json({ error: 'Invalid EPCIS document: missing epcisBody.eventList' });
        }

        const results = [];
        for (const epcisEvent of epcisBody.eventList) {
            const internal = epcisEngine.fromEpcisEvent(epcisEvent);
            const id = uuidv4();

            await db.prepare(`
        INSERT INTO supply_chain_events (id, event_type, location, actor, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, internal.event_type, internal.location, internal.actor, internal.details, internal.created_at);

            results.push({ id, event_type: internal.event_type, status: 'captured' });
        }

        res.status(201).json({
            captured: results.length,
            events: results,
            message: `Successfully captured ${results.length} EPCIS events`
        });
    } catch (err) {
        console.error('EPCIS capture error:', err);
        res.status(500).json({ error: 'EPCIS capture failed' });
    }
});

// ─── GET /api/scm/epcis/document — Full EPCISDocument export ─────────────────
// Cache 90s — queries 4 tables for full export
router.get('/document', cacheMiddleware(90), async (req, res) => {
    try {
        const events = await db.prepare(`
      SELECT sce.* FROM supply_chain_events sce
      ORDER BY sce.created_at DESC LIMIT 200
    `).all();

        const products = await db.prepare('SELECT * FROM products').all();
        const partners = await db.prepare('SELECT * FROM partners').all();
        const batches = await db.prepare('SELECT * FROM batches').all();

        const epcisDocument = epcisEngine.toEpcisDocument(events, products, partners, batches);

        res.json(epcisDocument);
    } catch (err) {
        console.error('EPCIS document error:', err);
        res.status(500).json({ error: 'EPCIS document generation failed' });
    }
});

// ─── GET /api/scm/epcis/stats — EPCIS compliance overview ───────────────────
// Cache 60s — aggregate counts
router.get('/stats', cacheMiddleware(60), async (req, res) => {
    try {
        const totalEvents = (await db.prepare('SELECT COUNT(*) as c FROM supply_chain_events').get())?.c || 0;
        const byType = await db.prepare(`
      SELECT event_type, COUNT(*) as count FROM supply_chain_events GROUP BY event_type ORDER BY count DESC
    `).all();

        const sealed = (await db.prepare("SELECT COUNT(*) as c FROM supply_chain_events WHERE blockchain_seal_id IS NOT NULL AND blockchain_seal_id != ''").get())?.c || 0;
        const products = (await db.prepare('SELECT COUNT(DISTINCT product_id) as c FROM supply_chain_events WHERE product_id IS NOT NULL').get())?.c || 0;
        const partners = (await db.prepare('SELECT COUNT(DISTINCT partner_id) as c FROM supply_chain_events WHERE partner_id IS NOT NULL').get())?.c || 0;

        // Map internal types to EPCIS types
        const epcisTypeBreakdown = byType.map(t => ({
            internal_type: t.event_type,
            epcis_type: ({ 'commission': 'ObjectEvent', 'pack': 'AggregationEvent', 'ship': 'ObjectEvent', 'receive': 'ObjectEvent', 'sell': 'ObjectEvent', 'transform': 'TransformationEvent', 'return': 'ObjectEvent' })[t.event_type] || 'ObjectEvent',
            cbv_biz_step: ({ 'commission': 'commissioning', 'pack': 'packing', 'ship': 'shipping', 'receive': 'receiving', 'sell': 'retail_selling', 'transform': 'transforming', 'return': 'returning' })[t.event_type] || t.event_type,
            count: t.count
        }));

        res.json({
            epcis_version: '2.0',
            total_events: totalEvents,
            blockchain_sealed_pct: totalEvents > 0 ? Math.round((sealed / totalEvents) * 100) : 0,
            products_tracked: products,
            partners_tracked: partners,
            event_types: epcisTypeBreakdown,
            compliance: {
                epcis_2_0: true,
                cbv_2_0: true,
                gs1_digital_link: true,
                json_ld: true,
                sensor_data: true
            }
        });
    } catch (err) {
        console.error('EPCIS stats error:', err);
        res.status(500).json({ error: 'EPCIS stats failed' });
    }
});

module.exports = router;
