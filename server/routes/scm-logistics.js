/**
 * SCM Logistics + SLA Routes (FR-INTEG-012 + FR-SCM-010)
 * Shipment tracking, IoT sensors, SLA monitoring
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const blockchainEngine = require('../engines/blockchain');
const engineClient = require('../engines/engine-client');
const { eventBus } = require('../events');

const router = express.Router();


// GOV-1: All routes require authentication
router.use(authMiddleware);

// ─── POST /api/scm/shipments – Create shipment ──────────────────────────────
router.post('/shipments', authMiddleware, requirePermission('logistics:create'), async (req, res) => {
    try {
        const { batch_id, from_partner_id, to_partner_id, carrier, tracking_number, estimated_delivery } = req.body;
        if (!batch_id) return res.status(400).json({ error: 'batch_id is required' });

        const id = uuidv4();
        await db.prepare(`
      INSERT INTO shipments (id, batch_id, from_partner_id, to_partner_id, carrier, tracking_number, status, estimated_delivery)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `).run(id, batch_id, from_partner_id || null, to_partner_id || null, carrier || '', tracking_number || `TRK-${Date.now()}`, estimated_delivery || null);

        // Create ship event
        const seal = await blockchainEngine.seal('Shipment', id, { batch_id, from: from_partner_id, to: to_partner_id });
        await db.prepare(`
      INSERT INTO supply_chain_events (id, event_type, batch_id, partner_id, details, blockchain_seal_id)
      VALUES (?, 'ship', ?, ?, ?, ?)
    `).run(uuidv4(), batch_id, from_partner_id || null, JSON.stringify({ shipment_id: id, carrier }), seal.seal_id);

        eventBus.emitEvent('ShipmentCreated', { id, batch_id, carrier });
        res.status(201).json({ id, tracking_number: tracking_number || `TRK-${Date.now()}`, blockchain_seal: seal });
    } catch (err) {
        console.error('Create shipment error:', err);
        res.status(500).json({ error: 'Failed to create shipment' });
    }
});

// ─── GET /api/scm/shipments – List shipments ────────────────────────────────
router.get('/shipments', async (req, res) => {
    try {
        const { status, limit = 50 } = req.query;
        let query = `
      SELECT s.*, fp.name as from_name, tp.name as to_name, b.batch_number, p.name as product_name
      FROM shipments s
      LEFT JOIN partners fp ON s.from_partner_id = fp.id
      LEFT JOIN partners tp ON s.to_partner_id = tp.id
      LEFT JOIN batches b ON s.batch_id = b.id
      LEFT JOIN products p ON b.product_id = p.id
    `;
        const params = [];
        if (status) { query += ' WHERE s.status = ?'; params.push(status); }
        query += ' ORDER BY s.created_at DESC LIMIT ?';
        params.push(Math.min(Number(limit) || 20, 100));

        res.json({ shipments: await db.prepare(query).all(...params) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch shipments' });
    }
});

// ─── PUT /api/scm/shipments/:id/update – Update shipment ────────────────────
router.put('/shipments/:id/update', authMiddleware, requireRole('operator'), async (req, res) => {
    try {
        const { status, current_lat, current_lng } = req.body;
        const shipment = await db.prepare('SELECT * FROM shipments WHERE id = ?').get(req.params.id);
        if (!shipment) return res.status(404).json({ error: 'Shipment not found' });

        // Update GPS trail
        let trail = [];
        try { trail = JSON.parse(shipment.gps_trail || '[]'); } catch (e) { trail = []; }
        if (current_lat && current_lng) {
            trail.push({ lat: current_lat, lng: current_lng, timestamp: new Date().toISOString() });
        }

        const newStatus = status || shipment.status;
        const actualDelivery = newStatus === 'delivered' ? new Date().toISOString() : shipment.actual_delivery;

        await db.prepare(`
      UPDATE shipments SET status = ?, current_lat = ?, current_lng = ?, gps_trail = ?, actual_delivery = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, current_lat || shipment.current_lat, current_lng || shipment.current_lng, JSON.stringify(trail), actualDelivery, req.params.id);

        // Record event
        if (newStatus === 'delivered') {
            await db.prepare(`
        INSERT INTO supply_chain_events (id, event_type, batch_id, partner_id, details)
        VALUES (?, 'receive', ?, ?, ?)
      `).run(uuidv4(), shipment.batch_id, shipment.to_partner_id, JSON.stringify({ shipment_id: req.params.id }));

            // Check SLA
            _checkSLA(shipment, actualDelivery);
        }

        res.json({ message: 'Shipment updated', status: newStatus });
    } catch (err) {
        console.error('Update shipment error:', err);
        res.status(500).json({ error: 'Failed to update shipment' });
    }
});

// ─── POST /api/scm/shipments/:id/iot – Record IoT reading ───────────────────
router.post('/shipments/:id/iot', async (req, res) => {
    try {
        const { sensor_type, value, unit, threshold_min, threshold_max } = req.body;
        if (value === undefined) return res.status(400).json({ error: 'value is required' });

        const tMin = threshold_min !== undefined ? threshold_min : (sensor_type === 'temperature' ? -5 : 20);
        const tMax = threshold_max !== undefined ? threshold_max : (sensor_type === 'temperature' ? 25 : 80);
        const alertTriggered = value < tMin || value > tMax ? 1 : 0;

        const id = uuidv4();
        await db.prepare(`
      INSERT INTO iot_readings (id, shipment_id, sensor_type, value, unit, threshold_min, threshold_max, alert_triggered)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, sensor_type || 'temperature', value, unit || 'C', tMin, tMax, alertTriggered);

        if (alertTriggered) {
            eventBus.emitEvent('IoTAlert', { shipment_id: req.params.id, sensor_type, value, threshold: `${tMin}-${tMax}` });
        }

        res.status(201).json({ id, alert_triggered: !!alertTriggered, value, threshold: { min: tMin, max: tMax } });
    } catch (err) {
        res.status(500).json({ error: 'Failed to record IoT reading' });
    }
});

// ─── GET /api/scm/shipments/:id/iot-alerts – IoT threshold violations ────────
router.get('/shipments/:id/iot-alerts', async (req, res) => {
    try {
        const alerts = await db.prepare('SELECT * FROM iot_readings WHERE shipment_id = ? AND alert_triggered = 1 ORDER BY recorded_at DESC').all(req.params.id);
        const allReadings = await db.prepare('SELECT * FROM iot_readings WHERE shipment_id = ? ORDER BY recorded_at DESC LIMIT 100').all(req.params.id);
        res.json({ alerts, all_readings: allReadings });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch IoT alerts' });
    }
});

// ─── POST /api/scm/sla – Define SLA ─────────────────────────────────────────
router.post('/sla', authMiddleware, requirePermission('logistics:manage'), async (req, res) => {
    try {
        const { partner_id, sla_type, metric, threshold_value, threshold_unit, penalty_amount, penalty_currency } = req.body;
        if (!partner_id) return res.status(400).json({ error: 'partner_id required' });

        const id = uuidv4();
        await db.prepare(`
      INSERT INTO sla_definitions (id, partner_id, sla_type, metric, threshold_value, threshold_unit, penalty_amount, penalty_currency)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, partner_id, sla_type || 'delivery', metric || 'delivery_time', threshold_value || 48, threshold_unit || 'hours', penalty_amount || 0, penalty_currency || 'USD');

        res.status(201).json({ id, sla_type: sla_type || 'delivery' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to create SLA' });
    }
});

// ─── GET /api/scm/sla/violations – SLA breach report ────────────────────────
router.get('/sla/violations', async (req, res) => {
    try {
        const violations = await db.prepare(`
      SELECT sv.*, sd.sla_type, sd.metric, sd.penalty_currency, p.name as partner_name
      FROM sla_violations sv
      JOIN sla_definitions sd ON sv.sla_id = sd.id
      LEFT JOIN partners p ON sv.partner_id = p.id
      ORDER BY sv.created_at DESC LIMIT 50
    `).all();

        const summary = await db.prepare(`
      SELECT sv.status, COUNT(*) as count, SUM(sv.penalty_amount) as total_penalty
      FROM sla_violations sv
      GROUP BY sv.status
    `).all();

        res.json({ violations, summary });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch SLA violations' });
    }
});

// ─── GET /api/scm/optimization – AI pipeline ────────────────────────────────
router.get('/optimization', async (req, res) => {
    try {
        const shipments = await db.prepare('SELECT * FROM shipments ORDER BY created_at DESC LIMIT 100').all();
        const events = await db.prepare('SELECT * FROM supply_chain_events ORDER BY created_at DESC LIMIT 200').all();
        const partners = await db.prepare('SELECT * FROM partners').all();

        const delayPrediction = await engineClient.scmPredictDelay(shipments);
        const bottlenecks = await engineClient.scmBottlenecks(events, partners);

        res.json({ delay_prediction: delayPrediction, bottlenecks });
    } catch (err) {
        res.status(500).json({ error: 'Failed to run optimization' });
    }
});

// ── Helper: Check SLA on delivery ────────────────────────────────────────────
async function _checkSLA(shipment, actualDelivery) {
    const slas = await db.prepare('SELECT * FROM sla_definitions WHERE partner_id = ? AND status = \'active\'')
        .all(shipment.from_partner_id || shipment.to_partner_id);

    for (const sla of slas) {
        if (sla.sla_type === 'delivery' && shipment.estimated_delivery) {
            const est = new Date(shipment.estimated_delivery).getTime();
            const act = new Date(actualDelivery).getTime();
            const delayHours = (act - est) / (1000 * 3600);

            if (delayHours > sla.threshold_value) {
                const id = uuidv4();
                await db.prepare(`
          INSERT INTO sla_violations (id, sla_id, partner_id, shipment_id, violation_type, actual_value, threshold_value, penalty_amount)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, sla.id, shipment.from_partner_id || shipment.to_partner_id, shipment.id, 'late_delivery', delayHours, sla.threshold_value, sla.penalty_amount);

                eventBus.emitEvent('SLAViolation', { sla_id: sla.id, delay_hours: delayHours, penalty: sla.penalty_amount });
            }
        }
    }
}

module.exports = router;
