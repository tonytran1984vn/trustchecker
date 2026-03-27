/**
 * SCM Trace Engine — Recursive Supply Chain Graph Traceability
 *
 * Endpoints:
 *   GET  /upstream/:batchId    — Recursive upstream trace (who made this?)
 *   GET  /downstream/:batchId  — Recursive downstream trace (where did it go?)
 *   GET  /full/:batchId        — Full lineage graph (both directions)
 *   GET  /org-roles             — Shows org's dual role (buyer + supplier stats)
 *   GET  /batch/:batchId/balance — Batch balance tracking
 *   GET  /recalls               — Active recalls for org
 *   GET  /alerts                — Active alerts for org
 *   POST /recall                — Initiate recall, auto-cascade downstream
 */

const router = require('express').Router();
const db = require('../db');
const { authMiddleware } = require('../auth');

// All routes require authentication
router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════════════════════
// RECURSIVE UPSTREAM TRACE — "Who made this batch?"
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/upstream/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        const maxDepth = parseInt(req.query.depth) || 10;
        const graph = await traceUpstream(batchId, maxDepth);
        res.json({
            ok: true,
            batch_id: batchId,
            direction: 'upstream',
            depth: graph.depth,
            nodes: graph.nodes,
            edges: graph.edges,
        });
    } catch (err) {
        console.error('[SCM-TRACE] Upstream trace error:', err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RECURSIVE DOWNSTREAM TRACE — "Where did this batch go?"
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/downstream/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        const maxDepth = parseInt(req.query.depth) || 10;
        const graph = await traceDownstream(batchId, maxDepth);
        res.json({
            ok: true,
            batch_id: batchId,
            direction: 'downstream',
            depth: graph.depth,
            nodes: graph.nodes,
            edges: graph.edges,
        });
    } catch (err) {
        console.error('[SCM-TRACE] Downstream trace error:', err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// FULL LINEAGE GRAPH — Both directions
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/full/:batchId', async (req, res) => {
    try {
        const { batchId } = req.params;
        const maxDepth = parseInt(req.query.depth) || 10;
        const [upstream, downstream] = await Promise.all([
            traceUpstream(batchId, maxDepth),
            traceDownstream(batchId, maxDepth),
        ]);

        // Merge nodes and edges, dedup by id
        const nodeMap = {};
        [...upstream.nodes, ...downstream.nodes].forEach(n => {
            nodeMap[n.id] = n;
        });
        const edgeSet = new Set();
        const allEdges = [...upstream.edges, ...downstream.edges].filter(e => {
            const key = `${e.type}:${e.from}:${e.to}`;
            if (edgeSet.has(key)) return false;
            edgeSet.add(key);
            return true;
        });

        res.json({
            ok: true,
            batch_id: batchId,
            direction: 'full',
            upstream_depth: upstream.depth,
            downstream_depth: downstream.depth,
            nodes: Object.values(nodeMap),
            edges: allEdges,
        });
    } catch (err) {
        console.error('[SCM-TRACE] Full trace error:', err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ORG ROLE SUMMARY — Transaction-derived roles (not hardcoded)
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/org-roles', async (req, res) => {
    try {
        const orgId = req.user?.org_id || req.user?.orgId;
        if (!orgId) return res.status(400).json({ ok: false, error: 'No org_id' });

        const [asSupplier, asBuyer, asProducer] = await Promise.all([
            db.all(
                `SELECT count(*) as cnt, sum(quantity) as total_qty, sum(carbon_kgco2e) as total_carbon
                    FROM sc_transfers WHERE from_org_id = $1 AND transfer_type != 'return'`,
                [orgId]
            ),
            db.all(
                `SELECT count(*) as cnt, sum(quantity) as total_qty, sum(carbon_kgco2e) as total_carbon
                    FROM sc_transfers WHERE to_org_id = $1 AND transfer_type != 'return'`,
                [orgId]
            ),
            db.all(
                `SELECT count(*) as cnt, count(DISTINCT output_batch_id) as batches_produced
                    FROM sc_transformations WHERE org_id = $1`,
                [orgId]
            ),
        ]);

        const roles = [];
        if (parseInt(asBuyer[0]?.cnt || 0) > 0) roles.push('buyer');
        if (parseInt(asSupplier[0]?.cnt || 0) > 0) roles.push('supplier');
        if (parseInt(asProducer[0]?.cnt || 0) > 0) roles.push('producer');

        res.json({
            ok: true,
            org_id: orgId,
            derived_roles: roles,
            as_buyer: {
                transfers_received: parseInt(asBuyer[0]?.cnt || 0),
                total_quantity: parseInt(asBuyer[0]?.total_qty || 0),
                total_carbon_kgCO2e: parseFloat(asBuyer[0]?.total_carbon || 0),
            },
            as_supplier: {
                transfers_sent: parseInt(asSupplier[0]?.cnt || 0),
                total_quantity: parseInt(asSupplier[0]?.total_qty || 0),
                total_carbon_kgCO2e: parseFloat(asSupplier[0]?.total_carbon || 0),
            },
            as_producer: {
                transformations: parseInt(asProducer[0]?.cnt || 0),
                batches_produced: parseInt(asProducer[0]?.batches_produced || 0),
            },
        });
    } catch (err) {
        console.error('[SCM-TRACE] Org roles error:', err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH BALANCE
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/batch/:batchId/balance', async (req, res) => {
    try {
        const { batchId } = req.params;
        const rows = await db.all(
            `SELECT bb.*, b.batch_number, b.status as batch_status, p.name as product_name
             FROM batch_balances bb
             JOIN batches b ON bb.batch_id = b.id
             JOIN products p ON b.product_id = p.id
             WHERE bb.batch_id = $1`,
            [batchId]
        );
        if (!rows.length) return res.status(404).json({ ok: false, error: 'Batch balance not found' });
        res.json({ ok: true, balance: rows[0] });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RECALLS
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/recalls', async (req, res) => {
    try {
        const orgId = req.user?.org_id || req.user?.orgId;
        const rows = await db.all(
            `SELECT r.*, b.batch_number, p.name as product_name
             FROM sc_recalls r
             JOIN batches b ON r.source_batch_id = b.id
             JOIN products p ON b.product_id = p.id
             WHERE r.initiated_by = $1
             ORDER BY r.created_at DESC`,
            [orgId]
        );
        res.json({ ok: true, recalls: rows });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ALERTS
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/alerts', async (req, res) => {
    try {
        const orgId = req.user?.org_id || req.user?.orgId;
        const rows = await db.all(
            `SELECT a.*, b.batch_number as source_batch_number, ab.batch_number as affected_batch_number
             FROM sc_alerts a
             LEFT JOIN batches b ON a.source_batch_id = b.id
             LEFT JOIN batches ab ON a.affected_batch_id = ab.id
             WHERE a.org_id = $1
             ORDER BY a.created_at DESC`,
            [orgId]
        );
        res.json({ ok: true, alerts: rows });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// POST RECALL — Initiate recall with downstream cascade
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/recall', async (req, res) => {
    try {
        const { batch_id, reason, severity } = req.body;
        const orgId = req.user?.org_id || req.user?.orgId;
        if (!batch_id || !reason) return res.status(400).json({ ok: false, error: 'batch_id and reason required' });

        // Trace all downstream batches
        const downstream = await traceDownstream(batch_id, 20);
        const affectedIds = downstream.nodes.map(n => n.id).filter(id => id !== batch_id);

        // Insert recall
        const recall = await db.all(
            `INSERT INTO sc_recalls (source_batch_id, reason, severity, initiated_by, affected_batch_ids)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [batch_id, reason, severity || 'critical', orgId, `{${affectedIds.join(',')}}`]
        );

        // Create cascade alerts for each affected batch
        for (const id of affectedIds) {
            await db.all(
                `INSERT INTO sc_alerts (alert_type, source_batch_id, affected_batch_id, org_id, severity, message)
                 VALUES ('recall_cascade', $1, $2, $3, $4, $5)`,
                [batch_id, id, orgId, severity || 'high', `Recall cascade: ${reason}`]
            );
        }

        // Flag affected batches
        if (affectedIds.length > 0) {
            await db.all(`UPDATE batches SET status = 'recalled' WHERE id = ANY($1::text[])`, [
                `{${affectedIds.join(',')}}`,
            ]);
        }
        await db.all(`UPDATE batches SET status = 'recalled' WHERE id = $1`, [batch_id]);

        res.json({
            ok: true,
            recall: recall[0],
            affected_batch_count: affectedIds.length,
            affected_batch_ids: affectedIds,
        });
    } catch (err) {
        console.error('[SCM-TRACE] Recall error:', err.message);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// GRAPH SUMMARY — Overview of the entire SC graph
// ═══════════════════════════════════════════════════════════════════════════════
router.get('/summary', async (req, res) => {
    try {
        const orgId = req.user?.org_id || req.user?.orgId;
        const [transfers, transformations, balances, recalls, alerts] = await Promise.all([
            db.all(
                `SELECT count(*) as total,
                           count(*) FILTER (WHERE from_org_id = $1) as sent,
                           count(*) FILTER (WHERE to_org_id = $1) as received
                    FROM sc_transfers`,
                [orgId]
            ),
            db.all(
                `SELECT count(*) as total,
                           count(*) FILTER (WHERE transformation_type = 'production') as productions,
                           count(*) FILTER (WHERE transformation_type = 'relabeling') as relabelings
                    FROM sc_transformations WHERE org_id = $1`,
                [orgId]
            ),
            db.all(
                `SELECT count(*) as tracked,
                           sum(remaining) as total_remaining,
                           count(*) FILTER (WHERE remaining <= 0) as exhausted
                    FROM batch_balances bb
                    JOIN batches b ON bb.batch_id = b.id
                    WHERE b.org_id = $1 OR b.owner_org_id = $1`,
                [orgId]
            ),
            db.all(
                `SELECT count(*) as total,
                           count(*) FILTER (WHERE status = 'active') as active
                    FROM sc_recalls WHERE initiated_by = $1`,
                [orgId]
            ),
            db.all(
                `SELECT count(*) as total,
                           count(*) FILTER (WHERE status = 'open') as open
                    FROM sc_alerts WHERE org_id = $1`,
                [orgId]
            ),
        ]);

        res.json({
            ok: true,
            org_id: orgId,
            transfers: transfers[0],
            transformations: transformations[0],
            batch_balances: balances[0],
            recalls: recalls[0],
            alerts: alerts[0],
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// TRACE ENGINE — Core recursive functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Trace upstream: For a given batch, find what inputs were used to create it,
 * and recursively trace each input.
 */
async function traceUpstream(batchId, maxDepth = 10) {
    const visited = new Set();
    const nodes = [];
    const edges = [];
    let maxReachedDepth = 0;

    async function _trace(currentBatchId, depth) {
        if (depth > maxDepth || visited.has(currentBatchId)) return;
        visited.add(currentBatchId);
        if (depth > maxReachedDepth) maxReachedDepth = depth;

        // Get batch info
        const batchRows = await db.all(
            `SELECT b.id, b.batch_number, b.quantity, b.status, b.org_id, b.owner_org_id, b.carbon_kgco2e,
                    p.name as product_name, p.sku, p.category,
                    o.name as org_name
             FROM batches b
             JOIN products p ON b.product_id = p.id
             LEFT JOIN organizations o ON b.org_id = o.id
             WHERE b.id = $1`,
            [currentBatchId]
        );
        if (!batchRows.length) return;

        const batch = batchRows[0];
        nodes.push({
            id: batch.id,
            batch_number: batch.batch_number,
            product_name: batch.product_name,
            sku: batch.sku,
            category: batch.category,
            quantity: batch.quantity,
            status: batch.status,
            org_id: batch.org_id,
            org_name: batch.org_name,
            carbon_kgCO2e: parseFloat(batch.carbon_kgco2e || 0),
            depth,
        });

        // 1. Check if this batch was OUTPUT of a transformation
        const transformations = await db.all(
            `SELECT t.id as txfm_id, t.transformation_type, t.notes,
                    ti.input_batch_id, ti.quantity_used
             FROM sc_transformations t
             JOIN sc_transformation_inputs ti ON t.id = ti.transformation_id
             WHERE t.output_batch_id = $1`,
            [currentBatchId]
        );

        for (const txfm of transformations) {
            edges.push({
                type: 'transformation',
                from: txfm.input_batch_id,
                to: currentBatchId,
                transformation_type: txfm.transformation_type,
                quantity_used: txfm.quantity_used,
                notes: txfm.notes,
            });
            await _trace(txfm.input_batch_id, depth + 1);
        }

        // 2. Check if this batch was transferred TO the current owner
        const transfers = await db.all(
            `SELECT t.batch_id, t.from_org_id, t.to_org_id, t.quantity, t.transfer_type, t.carbon_kgco2e,
                    o.name as from_org_name
             FROM sc_transfers t
             LEFT JOIN organizations o ON t.from_org_id = o.id
             WHERE t.batch_id = $1 AND t.transfer_type != 'return'
             ORDER BY t.created_at ASC LIMIT 1`,
            [currentBatchId]
        );

        for (const tr of transfers) {
            edges.push({
                type: 'transfer',
                from: `org:${tr.from_org_id}`,
                to: currentBatchId,
                from_org_name: tr.from_org_name,
                transfer_type: tr.transfer_type,
                quantity: tr.quantity,
                carbon_kgCO2e: parseFloat(tr.carbon_kgco2e || 0),
            });
        }
    }

    await _trace(batchId, 0);
    return { depth: maxReachedDepth, nodes, edges };
}

/**
 * Trace downstream: For a given batch, find where it went —
 * either as transfer (sold/distributed) or as input to a transformation.
 */
async function traceDownstream(batchId, maxDepth = 10) {
    const visited = new Set();
    const nodes = [];
    const edges = [];
    let maxReachedDepth = 0;

    async function _trace(currentBatchId, depth) {
        if (depth > maxDepth || visited.has(currentBatchId)) return;
        visited.add(currentBatchId);
        if (depth > maxReachedDepth) maxReachedDepth = depth;

        // Get batch info
        const batchRows = await db.all(
            `SELECT b.id, b.batch_number, b.quantity, b.status, b.org_id, b.owner_org_id, b.carbon_kgco2e,
                    p.name as product_name, p.sku, p.category,
                    o.name as org_name
             FROM batches b
             JOIN products p ON b.product_id = p.id
             LEFT JOIN organizations o ON b.org_id = o.id
             WHERE b.id = $1`,
            [currentBatchId]
        );
        if (!batchRows.length) return;

        const batch = batchRows[0];
        nodes.push({
            id: batch.id,
            batch_number: batch.batch_number,
            product_name: batch.product_name,
            sku: batch.sku,
            category: batch.category,
            quantity: batch.quantity,
            status: batch.status,
            org_id: batch.org_id,
            org_name: batch.org_name,
            carbon_kgCO2e: parseFloat(batch.carbon_kgco2e || 0),
            depth,
        });

        // 1. Check if this batch was INPUT to any transformation
        const transformations = await db.all(
            `SELECT t.id as txfm_id, t.output_batch_id, t.transformation_type, t.notes, ti.quantity_used
             FROM sc_transformation_inputs ti
             JOIN sc_transformations t ON ti.transformation_id = t.id
             WHERE ti.input_batch_id = $1`,
            [currentBatchId]
        );

        for (const txfm of transformations) {
            edges.push({
                type: 'transformation',
                from: currentBatchId,
                to: txfm.output_batch_id,
                transformation_type: txfm.transformation_type,
                quantity_used: txfm.quantity_used,
            });
            await _trace(txfm.output_batch_id, depth + 1);
        }

        // 2. Check if this batch was transferred (sold/distributed)
        const transfers = await db.all(
            `SELECT t.batch_id, t.from_org_id, t.to_org_id, t.quantity, t.transfer_type, t.carbon_kgco2e,
                    o.name as to_org_name
             FROM sc_transfers t
             LEFT JOIN organizations o ON t.to_org_id = o.id
             WHERE t.batch_id = $1 AND t.from_org_id = (
                SELECT org_id FROM batches WHERE id = $1
             )`,
            [currentBatchId]
        );

        for (const tr of transfers) {
            edges.push({
                type: 'transfer',
                from: currentBatchId,
                to: `org:${tr.to_org_id}`,
                to_org_name: tr.to_org_name,
                transfer_type: tr.transfer_type,
                quantity: tr.quantity,
                carbon_kgCO2e: parseFloat(tr.carbon_kgco2e || 0),
            });
        }
    }

    await _trace(batchId, 0);
    return { depth: maxReachedDepth, nodes, edges };
}

module.exports = router;
