/**
 * Digital Twin Routes — Virtual Supply Chain Model API
 * Real-time twin state, KPIs, anomaly detection, simulation
 *
 * SEC: All queries org-scoped via req.orgId (tenant isolation)
 */

function _safeId(name) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) throw new Error("Invalid identifier: " + name);
  return name;
}

const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const engineClient = require('../engines/engine-client');
const { cacheMiddleware } = require('../cache');
const { orgGuard } = require('../middleware/org-middleware');
const { withTransaction } = require('../middleware/transaction');

router.use(authMiddleware);
router.use(orgGuard());

// Helper: org-scoped table query (platform admin sees all if no orgId)
function orgAll(table, orgId, extra = '', limit = null) {
    let sql = `SELECT * FROM ${_safeId(table)}`;
    const params = [];
    if (orgId) { sql += ' WHERE org_id = ?'; params.push(orgId); }
    if (extra) sql += (orgId ? ' AND ' : ' WHERE ') + extra;
    if (limit) sql += ` LIMIT ${parseInt(limit)}`;
    return db.prepare(sql).all(...params);
}

// ─── GET /api/scm/twin/model — Current digital twin state ───────────────────
// Cache 30s — queries 7 tables in parallel
router.get('/model', cacheMiddleware(30), async (req, res) => {
    try {
        const oid = req.orgId;
        const [partners, products, batches, shipments, inventory, events, seals] = await Promise.all([
            orgAll('partners', oid),
            orgAll('products', oid),
            orgAll('batches', oid),
            orgAll('shipments', oid),
            orgAll('inventory', oid),
            orgAll('supply_chain_events', oid, 'created_at IS NOT NULL ORDER BY created_at DESC LIMIT 1000', 500),
            orgAll('blockchain_seals', oid, 'block_index IS NOT NULL ORDER BY block_index DESC LIMIT 1000', 200),
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
        const oid = req.orgId;
        const [shipments, inventory, events, batches] = await Promise.all([
            orgAll('shipments', oid),
            orgAll('inventory', oid),
            orgAll('supply_chain_events', oid),
            orgAll('batches', oid),
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
        const oid = req.orgId;
        const [inventory, shipments, events] = await Promise.all([
            orgAll('inventory', oid),
            orgAll('shipments', oid),
            orgAll('supply_chain_events', oid, 'created_at IS NOT NULL ORDER BY created_at DESC LIMIT 1000', 500),
        ]);

        const anomalies = await engineClient.digitalTwinAnomalies({ inventory, shipments, events });

        res.json(anomalies);
    } catch (err) {
        console.error('Anomaly detection error:', err);
        res.status(500).json({ error: 'Anomaly detection failed' });
    }
});

// ─── POST /api/scm/twin/simulate — Run simulation scenario ──────────────────
router.post('/simulate', requirePermission('digital_twin:simulate'), async (req, res) => {
    try {
        const scenario = req.body;
        if (!scenario.type) return res.status(400).json({ error: 'Scenario type required (node_offline, capacity_reduction)' });

        const oid = req.orgId;
        const [partners, products, batches, shipments, inventory, events, seals] = await Promise.all([
            orgAll('partners', oid),
            orgAll('products', oid),
            orgAll('batches', oid),
            orgAll('shipments', oid),
            orgAll('inventory', oid),
            orgAll('supply_chain_events', oid, 'created_at IS NOT NULL ORDER BY created_at DESC LIMIT 1000', 500),
            orgAll('blockchain_seals', oid, 'block_index IS NOT NULL ORDER BY block_index DESC LIMIT 1000', 200),
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
