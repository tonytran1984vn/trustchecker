/**
 * TrustGraph Routes (FR-SCM / TrustGraph)
 * Supply chain graph analysis, PageRank, centrality, toxic node detection
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const engineClient = require('../engines/engine-client');

const router = express.Router();


// GOV-1: All routes require authentication
router.use(authMiddleware);

// ─── GET /api/scm/graph/nodes – All supply chain nodes ───────────────────────
router.get('/nodes', async (req, res) => {
    try {
        const partners = await db.prepare('SELECT id, name, type, country, trust_score, risk_level, kyc_status, status FROM partners').all();
        // Also add products as nodes
        const products = await db.prepare("SELECT id, name, 'product' as type, origin_country as country, trust_score, status FROM products LIMIT 50").all();

        const nodes = [
            ...partners.map(p => ({ id: p.id, name: p.name, type: p.type, group: 'partner', country: p.country, trust_score: p.trust_score, risk_level: p.risk_level, kyc_status: p.kyc_status, status: p.status })),
            ...products.map(p => ({ id: p.id, name: p.name, type: 'product', group: 'product', country: p.country, trust_score: p.trust_score, status: p.status }))
        ];

        res.json({ nodes, total: nodes.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch nodes' });
    }
});

// ─── GET /api/scm/graph/edges – All relationships ───────────────────────────
router.get('/edges', async (req, res) => {
    try {
        const edges = await db.prepare(`
      SELECT scg.*, fp.name as from_name, tp.name as to_name
      FROM supply_chain_graph scg
      LEFT JOIN partners fp ON scg.from_node_id = fp.id
      LEFT JOIN partners tp ON scg.to_node_id = tp.id
    `).all();

        // Also derive edges from supply chain events
        const eventEdges = await db.prepare(`
      SELECT partner_id, product_id, COUNT(*) as weight
      FROM supply_chain_events
      WHERE partner_id IS NOT NULL AND product_id IS NOT NULL
      GROUP BY partner_id, product_id
    `).all();

        const derived = eventEdges.map(e => ({
            from_node_id: e.partner_id,
            to_node_id: e.product_id,
            relationship: 'handles',
            weight: e.weight,
            risk_score: 0,
            derived: true
        }));

        res.json({ edges: [...edges, ...derived], total: edges.length + derived.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch edges' });
    }
});

// ─── GET /api/scm/graph/analysis – PageRank + centrality + risk ──────────────
router.get('/analysis', async (req, res) => {
    try {
        const partners = await db.prepare('SELECT * FROM partners').all();
        const products = await db.prepare('SELECT * FROM products LIMIT 50').all();
        const edges = await db.prepare('SELECT * FROM supply_chain_graph').all();
        const alerts = await db.prepare('SELECT * FROM fraud_alerts').all();
        const leaks = await db.prepare('SELECT * FROM leak_alerts').all();

        const allNodes = [
            ...partners.map(p => ({ id: p.id, name: p.name, type: p.type, trust_score: p.trust_score })),
            ...products.map(p => ({ id: p.id, name: p.name, type: 'product', trust_score: p.trust_score }))
        ];

        const analysis = await engineClient.scmToxicNodes(allNodes, edges, [...alerts, ...leaks.map(l => ({ partner_id: null, product_id: l.product_id }))]);

        const toxicNodes = analysis.filter(n => n.is_toxic);
        const riskDistribution = {
            critical: analysis.filter(n => n.risk_level === 'critical').length,
            high: analysis.filter(n => n.risk_level === 'high').length,
            medium: analysis.filter(n => n.risk_level === 'medium').length,
            low: analysis.filter(n => n.risk_level === 'low').length
        };

        // Network health
        const avgToxicity = analysis.length > 0 ? analysis.reduce((s, n) => s + n.toxicity_score, 0) / analysis.length : 0;

        res.json({
            nodes: analysis,
            toxic_count: toxicNodes.length,
            risk_distribution: riskDistribution,
            network_health: avgToxicity < 0.2 ? 'healthy' : avgToxicity < 0.4 ? 'warning' : 'critical',
            avg_toxicity: Math.round(avgToxicity * 100) / 100,
            total_nodes: analysis.length,
            total_edges: edges.length
        });
    } catch (err) {
        console.error('Graph analysis error:', err);
        res.status(500).json({ error: 'Analysis failed' });
    }
});

// ─── GET /api/scm/graph/toxic – Toxic supplier detection ─────────────────────
router.get('/toxic', async (req, res) => {
    try {
        const partners = await db.prepare('SELECT * FROM partners').all();
        const edges = await db.prepare('SELECT * FROM supply_chain_graph').all();
        const alerts = await db.prepare('SELECT * FROM fraud_alerts').all();

        const nodes = partners.map(p => ({ id: p.id, name: p.name, type: p.type, trust_score: p.trust_score }));
        const analysis = await engineClient.scmToxicNodes(nodes, edges, alerts);
        const toxic = analysis.filter(n => n.is_toxic);

        res.json({
            toxic_suppliers: toxic,
            total_toxic: toxic.length,
            total_analyzed: analysis.length,
            recommendations: toxic.map(t => ({
                partner: t.name,
                action: t.risk_level === 'critical' ? 'IMMEDIATE REVIEW — Consider suspension' : 'MONITOR — Schedule audit',
                toxicity: t.toxicity_score,
                reasons: [
                    t.alert_count > 0 ? `${t.alert_count} fraud alerts` : null,
                    t.trust_score < 50 ? `Low trust score (${t.trust_score})` : null,
                    t.centrality > 0.5 ? `High centrality (${t.centrality}) — critical supply chain position` : null
                ].filter(Boolean)
            }))
        });
    } catch (err) {
        res.status(500).json({ error: 'Toxic detection failed' });
    }
});

// ─── POST /api/scm/graph/edges – Add relationship ───────────────────────────
router.post('/edges', authMiddleware, requireRole('operator'), async (req, res) => {
    try {
        const { from_node_id, from_node_type, to_node_id, to_node_type, relationship, weight } = req.body;
        if (!from_node_id || !to_node_id) return res.status(400).json({ error: 'from_node_id and to_node_id required' });

        const id = uuidv4();
        await db.prepare(`
      INSERT INTO supply_chain_graph (id, from_node_id, from_node_type, to_node_id, to_node_type, relationship, weight)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, from_node_id, from_node_type || 'partner', to_node_id, to_node_type || 'partner', relationship || 'supplies', weight || 1.0);

        res.status(201).json({ id, relationship: relationship || 'supplies' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to add edge' });
    }
});

// ─── GET /api/scm/graph/route – Optimized route ─────────────────────────────
router.get('/route', async (req, res) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) return res.status(400).json({ error: 'from and to parameters required' });

        const edges = await db.prepare('SELECT * FROM supply_chain_graph').all();
        const result = await engineClient.scmOptimizeRoute(edges, from, to);

        const enriched = [];
        for (const nodeId of result.path) {
            const partner = await db.prepare('SELECT name, type FROM partners WHERE id = ?').get(nodeId);
            enriched.push({ id: nodeId, name: partner ? partner.name : nodeId, type: partner ? partner.type : 'unknown' });
        }

        res.json({ ...result, enriched_path: enriched });
    } catch (err) {
        res.status(500).json({ error: 'Route optimization failed' });
    }
});

// ─── GET /impact/:nodeId — Simulate removal of a node, show cascade effect ──
router.get('/impact/:nodeId', async (req, res) => {
    try {
        const nodeId = req.params.nodeId;
        const partner = await db.get('SELECT * FROM partners WHERE id = ?', [nodeId]);
        const product = !partner ? await db.get('SELECT * FROM products WHERE id = ?', [nodeId]) : null;
        const node = partner || product;
        if (!node) return res.status(404).json({ error: 'Node not found' });

        // Find directly connected nodes
        const directEdges = await db.all('SELECT * FROM supply_chain_graph WHERE from_node_id = ? OR to_node_id = ?', [nodeId, nodeId]);
        const connectedIds = new Set();
        directEdges.forEach(e => {
            connectedIds.add(e.from_node_id === nodeId ? e.to_node_id : e.from_node_id);
        });

        // Find products handled by this partner
        const affectedProducts = await db.all('SELECT DISTINCT product_id FROM supply_chain_events WHERE partner_id = ?', [nodeId]);
        const affectedBatches = await db.all('SELECT DISTINCT batch_id FROM supply_chain_events WHERE partner_id = ?', [nodeId]);

        // Cascade: find nodes that ONLY connect through this node
        const allEdges = await db.all('SELECT * FROM supply_chain_graph');
        const isolatedNodes = [];
        connectedIds.forEach(cid => {
            const otherEdges = allEdges.filter(e =>
                (e.from_node_id === cid || e.to_node_id === cid) &&
                e.from_node_id !== nodeId && e.to_node_id !== nodeId
            );
            if (otherEdges.length === 0) isolatedNodes.push(cid);
        });

        res.json({
            node: { id: nodeId, name: node.name, type: partner ? partner.type : 'product' },
            direct_connections: connectedIds.size,
            affected_products: affectedProducts.length,
            affected_batches: affectedBatches.length,
            isolated_if_removed: isolatedNodes.length,
            isolated_nodes: await (async () => {
                const nodes = [];
                for (const id of isolatedNodes) {
                    const p = await db.get('SELECT name, type FROM partners WHERE id = ?', [id]);
                    nodes.push(p ? { id, name: p.name, type: p.type } : { id, name: 'Unknown' });
                }
                return nodes;
            })(),
            risk_assessment: isolatedNodes.length > 0 ? 'HIGH — removing this node would isolate supply chain segments' :
                connectedIds.size > 3 ? 'MEDIUM — highly connected node' : 'LOW — limited connections'
        });
    } catch (err) {
        res.status(500).json({ error: 'Impact simulation failed' });
    }
});

// ─── GET /clusters — Detect connected component clusters ─────────────────────
router.get('/clusters', async (req, res) => {
    try {
        const edges = await db.all('SELECT * FROM supply_chain_graph');
        const partners = await db.all('SELECT id, name, type, trust_score FROM partners');

        // Build adjacency list
        const adj = {};
        const allNodes = new Set();
        edges.forEach(e => {
            allNodes.add(e.from_node_id);
            allNodes.add(e.to_node_id);
            if (!adj[e.from_node_id]) adj[e.from_node_id] = [];
            if (!adj[e.to_node_id]) adj[e.to_node_id] = [];
            adj[e.from_node_id].push(e.to_node_id);
            adj[e.to_node_id].push(e.from_node_id);
        });

        // BFS to find connected components
        const visited = new Set();
        const clusters = [];
        allNodes.forEach(nodeId => {
            if (visited.has(nodeId)) return;
            const cluster = [];
            const queue = [nodeId];
            while (queue.length > 0) {
                const current = queue.shift();
                if (visited.has(current)) continue;
                visited.add(current);
                cluster.push(current);
                (adj[current] || []).forEach(n => { if (!visited.has(n)) queue.push(n); });
            }
            clusters.push(cluster);
        });

        // Enrich clusters
        const partnerMap = {};
        partners.forEach(p => { partnerMap[p.id] = p; });

        const enrichedClusters = clusters.map((c, i) => ({
            cluster_id: i + 1,
            size: c.length,
            nodes: c.map(id => partnerMap[id] || { id, name: 'Unknown', type: 'unknown' }),
            avg_trust: c.reduce((s, id) => s + (partnerMap[id]?.trust_score || 50), 0) / c.length
        }));

        res.json({
            total_clusters: clusters.length,
            largest_cluster_size: Math.max(...clusters.map(c => c.length), 0),
            clusters: enrichedClusters.sort((a, b) => b.size - a.size)
        });
    } catch (err) {
        res.status(500).json({ error: 'Cluster detection failed' });
    }
});

module.exports = router;

