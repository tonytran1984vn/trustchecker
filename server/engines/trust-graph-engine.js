/**
 * Trust Graph Infrastructure Engine v1.0
 * 
 * NOT visualization. Structural Intelligence Layer.
 * 
 * Connects: Logistics → SCM → Risk → Carbon → Case → Governance
 * 
 * Capabilities:
 *   1. Snapshot Engine (time-based freeze)
 *   2. Risk Propagation Simulator
 *   3. Structural Anomaly Detection (cycles, hubs, concentration)
 *   4. Graph Integrity Scoring
 *   5. Carbon Linkage Scoring
 *   6. Degree/Betweenness Centrality
 *   7. Tenant-Isolated Graph Operations
 *
 * Nodes: Company, Distributor, Warehouse, SKU, Batch, Route, Device, Shipment
 * Edges: ships_to, supplied_by, scanned_by, transferred_to, associated_with,
 *         emits_from, certified_by, overrides, escalated_to
 * 
 * Each edge: { timestamp, weight, risk_contribution, confidence, evidence_hash }
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// ─── NODE TYPES ──────────────────────────────────────────────────────────────
const NODE_TYPES = [
    'company', 'distributor', 'warehouse', 'sku', 'batch',
    'route', 'device', 'shipment', 'carbon_project', 'wallet'
];

// ─── EDGE TYPES ──────────────────────────────────────────────────────────────
const EDGE_TYPES = [
    'ships_to', 'supplied_by', 'scanned_by', 'transferred_to',
    'associated_with', 'emits_from', 'certified_by', 'overrides', 'escalated_to'
];

// ═══════════════════════════════════════════════════════════════════════════════
// 1. GRAPH CONSTRUCTION — Build in-memory graph from DB
// ═══════════════════════════════════════════════════════════════════════════════

function loadGraph(tenantId) {
    const nodes = db.prepare(`
        SELECT tgn.*, p.trust_score, p.risk_level
        FROM trust_graph_nodes tgn
        LEFT JOIN partners p ON tgn.entity_id = p.id
        WHERE tgn.tenant_id = ?
    `).all(tenantId);

    const edges = db.prepare(`
        SELECT * FROM trust_graph_edges WHERE tenant_id = ?
    `).all(tenantId);

    // Build adjacency list
    const adjacency = {};
    const reverseAdj = {};
    for (const node of nodes) {
        adjacency[node.id] = [];
        reverseAdj[node.id] = [];
    }
    for (const edge of edges) {
        if (!adjacency[edge.from_id]) adjacency[edge.from_id] = [];
        if (!reverseAdj[edge.to_id]) reverseAdj[edge.to_id] = [];
        adjacency[edge.from_id].push(edge);
        reverseAdj[edge.to_id].push(edge);
    }

    return { nodes, edges, adjacency, reverseAdj };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. CENTRALITY METRICS — Degree, Betweenness, Risk Propagation Score
// ═══════════════════════════════════════════════════════════════════════════════

function computeCentrality(graph) {
    const metrics = {};

    for (const node of graph.nodes) {
        const outDegree = (graph.adjacency[node.id] || []).length;
        const inDegree = (graph.reverseAdj[node.id] || []).length;
        const totalDegree = outDegree + inDegree;

        // Risk-weighted degree: edges to high-risk nodes count more
        let riskWeightedDegree = 0;
        for (const edge of (graph.adjacency[node.id] || [])) {
            riskWeightedDegree += (edge.risk_contribution || 0.1) * (edge.weight || 1);
        }
        for (const edge of (graph.reverseAdj[node.id] || [])) {
            riskWeightedDegree += (edge.risk_contribution || 0.1) * (edge.weight || 1);
        }

        metrics[node.id] = {
            node_id: node.id,
            node_type: node.node_type,
            entity_name: node.entity_name,
            in_degree: inDegree,
            out_degree: outDegree,
            total_degree: totalDegree,
            risk_weighted_degree: Math.round(riskWeightedDegree * 100) / 100,
            // Normalized centrality (0-1)
            centrality: graph.nodes.length > 1
                ? totalDegree / ((graph.nodes.length - 1) * 2) : 0,
        };
    }

    return metrics;
}

/**
 * Simplified betweenness centrality using BFS.
 * Counts how many shortest paths pass through each node.
 */
function computeBetweenness(graph) {
    const betweenness = {};
    const nodeIds = graph.nodes.map(n => n.id);
    for (const id of nodeIds) betweenness[id] = 0;

    for (const source of nodeIds) {
        // BFS to find shortest paths from source
        const dist = {};
        const paths = {};
        const pred = {};
        const queue = [source];

        dist[source] = 0;
        paths[source] = 1;

        while (queue.length > 0) {
            const current = queue.shift();
            for (const edge of (graph.adjacency[current] || [])) {
                const neighbor = edge.to_id;
                if (dist[neighbor] === undefined) {
                    dist[neighbor] = dist[current] + 1;
                    paths[neighbor] = 0;
                    pred[neighbor] = [];
                    queue.push(neighbor);
                }
                if (dist[neighbor] === dist[current] + 1) {
                    paths[neighbor] += paths[current];
                    if (!pred[neighbor]) pred[neighbor] = [];
                    pred[neighbor].push(current);
                }
            }
        }

        // Accumulate betweenness
        const delta = {};
        for (const id of nodeIds) delta[id] = 0;

        // Process in reverse BFS order
        const sorted = Object.entries(dist)
            .sort((a, b) => b[1] - a[1])
            .map(e => e[0]);

        for (const w of sorted) {
            if (w === source) continue;
            for (const v of (pred[w] || [])) {
                delta[v] += (paths[v] / (paths[w] || 1)) * (1 + delta[w]);
            }
            if (w !== source) {
                betweenness[w] += delta[w];
            }
        }
    }

    // Normalize
    const n = nodeIds.length;
    const normalizer = n > 2 ? (n - 1) * (n - 2) : 1;
    for (const id of nodeIds) {
        betweenness[id] = Math.round((betweenness[id] / normalizer) * 10000) / 10000;
    }

    return betweenness;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. STRUCTURAL ANOMALY DETECTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detect cycles (circular flows) in the graph.
 * A→B→C→A = cycle anomaly (reverse flow, potential fraud).
 */
function detectCycles(graph) {
    const cycles = [];
    const visited = new Set();
    const recursionStack = new Set();

    function dfs(nodeId, path) {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        path.push(nodeId);

        for (const edge of (graph.adjacency[nodeId] || [])) {
            if (recursionStack.has(edge.to_id)) {
                // Cycle found — extract it
                const cycleStart = path.indexOf(edge.to_id);
                const cycle = path.slice(cycleStart);
                cycle.push(edge.to_id); // close the cycle
                cycles.push({
                    type: 'CIRCULAR_FLOW',
                    severity: cycle.length <= 3 ? 'critical' : 'high',
                    nodes: cycle,
                    length: cycle.length - 1,
                    detail: `Circular flow detected: ${cycle.length - 1} nodes`,
                });
            } else if (!visited.has(edge.to_id)) {
                dfs(edge.to_id, [...path]);
            }
        }

        recursionStack.delete(nodeId);
    }

    for (const node of graph.nodes) {
        if (!visited.has(node.id)) {
            dfs(node.id, []);
        }
    }

    return cycles;
}

/**
 * Detect hub anomalies — nodes with disproportionate connections.
 * A node connecting >30% of all edges is a concentration risk.
 */
function detectHubAnomalies(graph, centrality) {
    const anomalies = [];
    const totalEdges = graph.edges.length || 1;

    for (const [nodeId, metrics] of Object.entries(centrality)) {
        const edgeShare = metrics.total_degree / totalEdges;
        if (edgeShare > 0.3) {
            anomalies.push({
                type: 'HUB_CONCENTRATION',
                severity: edgeShare > 0.5 ? 'critical' : 'high',
                node_id: nodeId,
                node_name: metrics.entity_name,
                edge_share: `${(edgeShare * 100).toFixed(1)}%`,
                detail: `Node controls ${(edgeShare * 100).toFixed(1)}% of all edges — concentration risk`,
            });
        }
    }

    return anomalies;
}

/**
 * Detect velocity clusters — nodes with unusual temporal patterns.
 */
function detectVelocityClusters(graph) {
    const clusters = [];

    // Group edges by time window (1 hour)
    const timeWindows = {};
    for (const edge of graph.edges) {
        if (!edge.created_at) continue;
        const hour = edge.created_at.substring(0, 13); // YYYY-MM-DDTHH
        if (!timeWindows[hour]) timeWindows[hour] = [];
        timeWindows[hour].push(edge);
    }

    for (const [window, edges] of Object.entries(timeWindows)) {
        if (edges.length > 10) {
            // High activity in single hour
            const uniqueNodes = new Set(edges.flatMap(e => [e.from_id, e.to_id]));
            clusters.push({
                type: 'VELOCITY_CLUSTER',
                severity: edges.length > 20 ? 'critical' : 'high',
                time_window: window,
                edge_count: edges.length,
                unique_nodes: uniqueNodes.size,
                detail: `${edges.length} edges in 1-hour window involving ${uniqueNodes.size} nodes`,
            });
        }
    }

    return clusters;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. GRAPH INTEGRITY SCORING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute overall graph integrity score (0-100).
 * Combines structural health, risk distribution, and anomaly count.
 */
function computeIntegrityScore(graph, anomalies) {
    let score = 100;

    // Penalty for cycles (-20 per cycle)
    const cycleCount = anomalies.filter(a => a.type === 'CIRCULAR_FLOW').length;
    score -= cycleCount * 20;

    // Penalty for hub concentration (-15 per hub)
    const hubCount = anomalies.filter(a => a.type === 'HUB_CONCENTRATION').length;
    score -= hubCount * 15;

    // Penalty for velocity clusters (-10 per cluster)
    const clusterCount = anomalies.filter(a => a.type === 'VELOCITY_CLUSTER').length;
    score -= clusterCount * 10;

    // Penalty for disconnected components
    const components = findConnectedComponents(graph);
    if (components.length > 1) {
        score -= (components.length - 1) * 5;
    }

    // Bonus for evidence coverage on edges
    const edgesWithEvidence = graph.edges.filter(e => e.evidence_hash).length;
    const evidenceCoverage = graph.edges.length > 0
        ? edgesWithEvidence / graph.edges.length : 1;
    if (evidenceCoverage < 0.5) score -= 10;

    return {
        score: Math.max(0, Math.min(100, score)),
        grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
        factors: {
            cycles: cycleCount,
            hub_concentrations: hubCount,
            velocity_clusters: clusterCount,
            disconnected_components: components.length,
            evidence_coverage: `${(evidenceCoverage * 100).toFixed(0)}%`,
        },
    };
}

function findConnectedComponents(graph) {
    const visited = new Set();
    const components = [];

    for (const node of graph.nodes) {
        if (visited.has(node.id)) continue;
        const component = [];
        const queue = [node.id];
        while (queue.length > 0) {
            const current = queue.shift();
            if (visited.has(current)) continue;
            visited.add(current);
            component.push(current);
            for (const edge of (graph.adjacency[current] || [])) {
                if (!visited.has(edge.to_id)) queue.push(edge.to_id);
            }
            for (const edge of (graph.reverseAdj[current] || [])) {
                if (!visited.has(edge.from_id)) queue.push(edge.from_id);
            }
        }
        components.push(component);
    }

    return components;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. RISK PROPAGATION SIMULATOR
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Simulate risk propagation from a source node.
 * Multi-hop: risk decays by edge weight at each hop.
 * Returns exposure map.
 */
function simulateRiskPropagation(graph, sourceNodeId, initialRisk = 1.0, maxHops = 5) {
    const exposure = {};
    const queue = [{ nodeId: sourceNodeId, risk: initialRisk, hop: 0, path: [sourceNodeId] }];
    const visited = new Set();

    while (queue.length > 0) {
        const { nodeId, risk, hop, path } = queue.shift();
        if (hop > maxHops || visited.has(nodeId)) continue;
        visited.add(nodeId);

        exposure[nodeId] = {
            risk: Math.round(risk * 1000) / 1000,
            hop,
            path,
        };

        // Propagate through outgoing edges
        for (const edge of (graph.adjacency[nodeId] || [])) {
            const propagatedRisk = risk * (edge.weight || 0.5) * (edge.risk_contribution || 0.5);
            if (propagatedRisk > 0.01 && !visited.has(edge.to_id)) {
                queue.push({
                    nodeId: edge.to_id,
                    risk: propagatedRisk,
                    hop: hop + 1,
                    path: [...path, edge.to_id],
                });
            }
        }
    }

    // Summary
    const totalExposed = Object.keys(exposure).length - 1; // exclude source
    const maxExposure = Math.max(...Object.values(exposure).map(e => e.risk));
    const avgExposure = totalExposed > 0
        ? Object.values(exposure).reduce((s, e) => s + e.risk, 0) / Object.keys(exposure).length
        : 0;

    return {
        source: sourceNodeId,
        initial_risk: initialRisk,
        max_hops: maxHops,
        exposed_nodes: totalExposed,
        max_exposure: maxExposure,
        avg_exposure: Math.round(avgExposure * 1000) / 1000,
        exposure_map: exposure,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CARBON LINKAGE SCORING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute carbon linkage score for a supply chain path.
 * If any node on the carbon supply chain has high fraud risk,
 * the carbon credit integrity drops.
 */
function computeCarbonLinkage(graph, carbonProjectId) {
    // Find all nodes connected to carbon project
    const connected = [];
    const visited = new Set();
    const queue = [carbonProjectId];

    while (queue.length > 0) {
        const current = queue.shift();
        if (visited.has(current)) continue;
        visited.add(current);
        connected.push(current);

        for (const edge of (graph.adjacency[current] || [])) {
            if (!visited.has(edge.to_id)) queue.push(edge.to_id);
        }
        for (const edge of (graph.reverseAdj[current] || [])) {
            if (!visited.has(edge.from_id)) queue.push(edge.from_id);
        }
    }

    // Compute integrity based on connected node risk
    let totalRisk = 0;
    let riskCount = 0;
    for (const nodeId of connected) {
        const node = graph.nodes.find(n => n.id === nodeId);
        if (node?.trust_score !== undefined) {
            totalRisk += (100 - (node.trust_score || 50)) / 100;
            riskCount++;
        }
    }

    const avgRisk = riskCount > 0 ? totalRisk / riskCount : 0.5;
    const integrityScore = Math.max(0, Math.round((1 - avgRisk) * 100));

    return {
        carbon_project_id: carbonProjectId,
        connected_nodes: connected.length,
        integrity_score: integrityScore,
        mint_allowed: integrityScore >= 60,
        risk_assessment: integrityScore >= 80 ? 'LOW' : integrityScore >= 60 ? 'MEDIUM' : 'HIGH',
        detail: integrityScore < 60
            ? 'Carbon mint BLOCKED — supply chain integrity below threshold'
            : 'Carbon mint allowed — supply chain integrity sufficient',
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. SNAPSHOT ENGINE — Time-based graph freeze
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an immutable snapshot of the graph state.
 * Used when case is confirmed or for periodic audit.
 */
function createSnapshot(tenantId, reason) {
    const graph = loadGraph(tenantId);
    const centrality = computeCentrality(graph);
    const cycles = detectCycles(graph);
    const hubs = detectHubAnomalies(graph, centrality);
    const velocity = detectVelocityClusters(graph);
    const allAnomalies = [...cycles, ...hubs, ...velocity];
    const integrity = computeIntegrityScore(graph, allAnomalies);

    const snapshot = {
        tenant_id: tenantId,
        timestamp: new Date().toISOString(),
        reason,
        node_count: graph.nodes.length,
        edge_count: graph.edges.length,
        integrity,
        anomalies: allAnomalies,
        centrality_top10: Object.values(centrality)
            .sort((a, b) => b.centrality - a.centrality)
            .slice(0, 10),
    };

    const snapshotHash = crypto.createHash('sha256')
        .update(JSON.stringify(snapshot))
        .digest('hex');

    const snapshotId = uuidv4();
    db.prepare(`
        INSERT INTO trust_graph_snapshots (
            id, tenant_id, snapshot_hash, reason, node_count, edge_count,
            integrity_score, integrity_grade, anomaly_count,
            snapshot_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
        snapshotId, tenantId, snapshotHash, reason,
        graph.nodes.length, graph.edges.length,
        integrity.score, integrity.grade, allAnomalies.length,
        JSON.stringify(snapshot)
    );

    return {
        snapshot_id: snapshotId,
        snapshot_hash: snapshotHash,
        ...snapshot,
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. FULL ANALYSIS — CEO / Board KPIs
// ═══════════════════════════════════════════════════════════════════════════════

function fullAnalysis(tenantId) {
    const graph = loadGraph(tenantId);
    if (graph.nodes.length === 0) {
        return {
            tenant_id: tenantId,
            status: 'empty',
            message: 'No graph data for this tenant',
        };
    }

    const centrality = computeCentrality(graph);
    const betweenness = computeBetweenness(graph);
    const cycles = detectCycles(graph);
    const hubs = detectHubAnomalies(graph, centrality);
    const velocity = detectVelocityClusters(graph);
    const allAnomalies = [...cycles, ...hubs, ...velocity];
    const integrity = computeIntegrityScore(graph, allAnomalies);
    const components = findConnectedComponents(graph);

    // CEO KPIs
    return {
        tenant_id: tenantId,
        network_metrics: {
            total_nodes: graph.nodes.length,
            total_edges: graph.edges.length,
            connected_components: components.length,
            density: graph.nodes.length > 1
                ? graph.edges.length / (graph.nodes.length * (graph.nodes.length - 1)) : 0,
        },
        integrity,
        anomalies: {
            total: allAnomalies.length,
            critical: allAnomalies.filter(a => a.severity === 'critical').length,
            high: allAnomalies.filter(a => a.severity === 'high').length,
            cycles: cycles.length,
            hub_concentrations: hubs.length,
            velocity_clusters: velocity.length,
        },
        top_central_nodes: Object.values(centrality)
            .sort((a, b) => b.centrality - a.centrality)
            .slice(0, 5)
            .map(n => ({
                ...n,
                betweenness: betweenness[n.node_id] || 0,
            })),
        risk_density: graph.nodes.length > 0
            ? allAnomalies.length / graph.nodes.length : 0,
        concentration_index: hubs.length > 0
            ? Math.max(...hubs.map(h => parseFloat(h.edge_share))) : 0,
        generated_at: new Date().toISOString(),
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDGE OPERATIONS — Add edge with evidence hash
// ═══════════════════════════════════════════════════════════════════════════════

function addEdge(tenantId, fromId, toId, edgeType, metadata = {}) {
    if (!EDGE_TYPES.includes(edgeType)) {
        return { error: `Invalid edge type. Must be one of: ${EDGE_TYPES.join(', ')}` };
    }

    const edgeId = uuidv4();
    const evidenceHash = metadata.evidence_hash || crypto
        .createHash('sha256')
        .update(`${fromId}:${toId}:${edgeType}:${Date.now()}`)
        .digest('hex').substring(0, 32);

    db.prepare(`
        INSERT INTO trust_graph_edges (
            id, tenant_id, from_id, to_id, edge_type,
            weight, risk_contribution, confidence,
            evidence_hash, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
        edgeId, tenantId, fromId, toId, edgeType,
        metadata.weight || 1.0,
        metadata.risk_contribution || 0.1,
        metadata.confidence || 0.8,
        evidenceHash
    );

    return { edge_id: edgeId, evidence_hash: evidenceHash };
}

function addNode(tenantId, entityId, nodeType, entityName) {
    if (!NODE_TYPES.includes(nodeType)) {
        return { error: `Invalid node type. Must be one of: ${NODE_TYPES.join(', ')}` };
    }

    const nodeId = uuidv4();
    db.prepare(`
        INSERT INTO trust_graph_nodes (id, tenant_id, entity_id, node_type, entity_name, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(nodeId, tenantId, entityId, nodeType, entityName);

    return { node_id: nodeId };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DB SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

function initSchema() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS trust_graph_nodes (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            entity_id TEXT,
            node_type TEXT NOT NULL,
            entity_name TEXT,
            trust_score REAL DEFAULT 50,
            risk_level TEXT DEFAULT 'medium',
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS trust_graph_edges (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            from_id TEXT NOT NULL,
            to_id TEXT NOT NULL,
            edge_type TEXT NOT NULL,
            weight REAL DEFAULT 1.0,
            risk_contribution REAL DEFAULT 0.1,
            confidence REAL DEFAULT 0.8,
            evidence_hash TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS trust_graph_snapshots (
            id TEXT PRIMARY KEY,
            tenant_id TEXT NOT NULL,
            snapshot_hash TEXT NOT NULL,
            reason TEXT,
            node_count INTEGER,
            edge_count INTEGER,
            integrity_score INTEGER,
            integrity_grade TEXT,
            anomaly_count INTEGER,
            snapshot_data TEXT,
            created_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_tg_nodes_tenant ON trust_graph_nodes(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tg_edges_tenant ON trust_graph_edges(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_tg_edges_from ON trust_graph_edges(from_id);
        CREATE INDEX IF NOT EXISTS idx_tg_edges_to ON trust_graph_edges(to_id);
        CREATE INDEX IF NOT EXISTS idx_tg_snapshots_tenant ON trust_graph_snapshots(tenant_id);
    `);
}

try { initSchema(); } catch (e) { /* Schema may already exist */ }

module.exports = {
    // Graph construction
    loadGraph,
    addNode,
    addEdge,
    // Centrality
    computeCentrality,
    computeBetweenness,
    // Anomaly detection
    detectCycles,
    detectHubAnomalies,
    detectVelocityClusters,
    // Integrity
    computeIntegrityScore,
    findConnectedComponents,
    // Risk propagation
    simulateRiskPropagation,
    // Carbon linkage
    computeCarbonLinkage,
    // Snapshot
    createSnapshot,
    // Full analysis (CEO KPIs)
    fullAnalysis,
    // Constants
    NODE_TYPES,
    EDGE_TYPES,
    // Schema
    initSchema,
};
