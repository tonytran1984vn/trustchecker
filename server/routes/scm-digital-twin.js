/**
 * Digital Twin Routes — Virtual Supply Chain Model API
 * Real-time twin state, KPIs, anomaly detection, simulation
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const engineClient = require('../engines/engine-client');
const { cacheMiddleware } = require('../cache');

router.use(authMiddleware);

// ─── GET /api/scm/twin/model — Current digital twin state ───────────────────
// Cache 30s — queries 7 tables in parallel
router.get('/model', cacheMiddleware(30), async (req, res) => {
    try {
        const [partners, products, batches, shipments, inventory, events, seals] = await Promise.all([
            db.prepare('SELECT * FROM partners').all(),
            db.prepare('SELECT * FROM products').all(),
            db.prepare('SELECT * FROM batches').all(),
            db.prepare('SELECT * FROM shipments').all(),
            db.prepare('SELECT * FROM inventory').all(),
            db.prepare('SELECT * FROM supply_chain_events ORDER BY created_at DESC LIMIT 500').all(),
            db.prepare('SELECT * FROM blockchain_seals ORDER BY block_index DESC LIMIT 200').all()
        ]);

        const model = await engineClient.digitalTwinBuild({ partners, products, batches, shipments, inventory, events, seals });

        res.json(model);
    } catch (err) {
        console.error('Digital twin model error:', err);
        res.status(500).json({ error: 'Digital twin model failed' });
    }
});

// ─── GET /api/scm/twin/kpis — Real-time KPI dashboard ───────────────────────
// Cache 60s — aggregated metrics
router.get('/kpis', cacheMiddleware(60), async (req, res) => {
    try {
        const [shipments, inventory, events, batches] = await Promise.all([
            db.prepare('SELECT * FROM shipments').all(),
            db.prepare('SELECT * FROM inventory').all(),
            db.prepare('SELECT * FROM supply_chain_events').all(),
            db.prepare('SELECT * FROM batches').all()
        ]);

        const kpis = await engineClient.digitalTwinKPIs({ shipments, inventory, events, batches });

        res.json(kpis);
    } catch (err) {
        console.error('KPI computation error:', err);
        res.status(500).json({ error: 'KPI computation failed' });
    }
});

// ─── GET /api/scm/twin/anomalies — AI-detected anomalies ────────────────────
// Cache 60s — detection results don't change rapidly  
router.get('/anomalies', cacheMiddleware(60), async (req, res) => {
    try {
        const [inventory, shipments, events] = await Promise.all([
            db.prepare('SELECT * FROM inventory').all(),
            db.prepare('SELECT * FROM shipments').all(),
            db.prepare('SELECT * FROM supply_chain_events ORDER BY created_at DESC LIMIT 500').all()
        ]);

        const anomalies = await engineClient.digitalTwinAnomalies({ inventory, shipments, events });

        res.json(anomalies);
    } catch (err) {
        console.error('Anomaly detection error:', err);
        res.status(500).json({ error: 'Anomaly detection failed' });
    }
});

// ─── POST /api/scm/twin/simulate — Run simulation scenario ──────────────────
router.post('/simulate', requireRole('manager'), async (req, res) => {
    try {
        const scenario = req.body;
        if (!scenario.type) return res.status(400).json({ error: 'Scenario type required (node_offline, capacity_reduction)' });

        const [partners, products, batches, shipments, inventory, events, seals] = await Promise.all([
            db.prepare('SELECT * FROM partners').all(),
            db.prepare('SELECT * FROM products').all(),
            db.prepare('SELECT * FROM batches').all(),
            db.prepare('SELECT * FROM shipments').all(),
            db.prepare('SELECT * FROM inventory').all(),
            db.prepare('SELECT * FROM supply_chain_events ORDER BY created_at DESC LIMIT 500').all(),
            db.prepare('SELECT * FROM blockchain_seals ORDER BY block_index DESC LIMIT 200').all()
        ]);

        const model = await engineClient.digitalTwinBuild({ partners, products, batches, shipments, inventory, events, seals });
        const result = await engineClient.digitalTwinSimulate(model, scenario);

        res.json({
            simulation: 'digital_twin_disruption',
            ...result,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('Twin simulation error:', err);
        res.status(500).json({ error: 'Twin simulation failed' });
    }
});

module.exports = router;
