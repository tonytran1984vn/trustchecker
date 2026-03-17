/**
 * Risk Graph Engine v2.0
 * Behavioral risk analysis, fraud graph, link analysis, cross-tenant patterns
 * v2.0 adds: DB-backed risk graph, multi-hop propagation, unified risk scoring
 */

const db = require('../../db');
const { v4: uuidv4 } = require('uuid');

const BEHAVIOR_PATTERNS = {
    high_risk: [
        { name: 'rapid_volume_spike', description: 'Shipment/credit volume > 3σ from 30-day mean', severity: 'high', score: 15 },
        { name: 'circular_routing', description: 'Origin → A → B → Origin pattern within 7 days', severity: 'critical', score: 25 },
        { name: 'phantom_partner', description: 'Partner with zero scan history but active in transactions', severity: 'high', score: 20 },
        { name: 'device_cluster', description: 'Single device fingerprint across 10+ entities', severity: 'medium', score: 10 },
        { name: 'temporal_anomaly', description: '>40% activity during off-hours (22:00-06:00)', severity: 'low', score: 8 },
        { name: 'geographic_mismatch', description: 'Scan location inconsistent with documented route', severity: 'high', score: 18 },
    ]
};

class RiskGraphEngine {

    /**
     * Analyze behavioral risk patterns from transaction data
     */
    analyzeBehavior(shipments = [], credits = [], partners = [], scans = [], routes = []) {
        const signals = [];
        let riskScore = 0;

        // Pattern 1: Volume spike
        if (shipments.length > 0) {
            const dailyCounts = {};
            shipments.forEach(s => {
                const d = (s.created_at || s.timestamp || '').slice(0, 10);
                dailyCounts[d] = (dailyCounts[d] || 0) + 1;
            });
            const counts = Object.values(dailyCounts);
            if (counts.length >= 7) {
                const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
                const std = Math.sqrt(counts.reduce((s, c) => s + (c - mean) ** 2, 0) / counts.length);
                const latestCount = counts[counts.length - 1];
                if (std > 0 && latestCount > mean + 3 * std) {
                    signals.push({ pattern: 'rapid_volume_spike', severity: 'high', score: 15, detail: `Latest day: ${latestCount} vs mean: ${mean.toFixed(1)}` });
                    riskScore += 15;
                }
            }
        }

        // Pattern 2: Circular routing
        const routeMap = {};
        shipments.forEach(s => {
            const key = `${s.origin}-${s.destination}`;
            const reverse = `${s.destination}-${s.origin}`;
            routeMap[key] = (routeMap[key] || 0) + 1;
            if (routeMap[reverse]) {
                const existing = signals.find(sig => sig.pattern === 'circular_routing');
                if (!existing) {
                    signals.push({ pattern: 'circular_routing', severity: 'critical', score: 25, detail: `Circular: ${key} ↔ ${reverse}` });
                    riskScore += 25;
                }
            }
        });

        // Pattern 3: Phantom partners
        const partnerScans = {};
        scans.forEach(s => { if (s.partner_id) partnerScans[s.partner_id] = (partnerScans[s.partner_id] || 0) + 1; });
        const phantoms = partners.filter(p => !partnerScans[p.id] && p.status === 'active');
        if (phantoms.length > 0) {
            signals.push({ pattern: 'phantom_partner', severity: 'high', score: 20, detail: `${phantoms.length} partner(s) with zero scan history` });
            riskScore += 20;
        }

        // Pattern 4: Geographic mismatch
        const geoMismatches = scans.filter(s => s.expected_country && s.scan_country && s.expected_country !== s.scan_country);
        if (geoMismatches.length > 0) {
            signals.push({ pattern: 'geographic_mismatch', severity: 'high', score: 18, detail: `${geoMismatches.length} scan(s) from unexpected location` });
            riskScore += 18;
        }

        // Pattern 5: Device clustering
        const deviceMap = {};
        scans.forEach(s => { const d = s.device_id || s.fingerprint; if (d) deviceMap[d] = (deviceMap[d] || 0) + 1; });
        const hotDevices = Object.entries(deviceMap).filter(([_, c]) => c > 100);
        if (hotDevices.length > 0) {
            signals.push({ pattern: 'device_cluster', severity: 'medium', score: 10, detail: `${hotDevices.length} device(s) with >100 scans` });
            riskScore += 10;
        }

        // Pattern 6: Temporal anomaly
        const offHours = shipments.filter(s => {
            const h = new Date(s.created_at || s.timestamp).getHours();
            return h >= 22 || h < 6;
        });
        if (offHours.length > shipments.length * 0.4 && shipments.length > 10) {
            signals.push({ pattern: 'temporal_anomaly', severity: 'low', score: 8, detail: `${Math.round(offHours.length / shipments.length * 100)}% off-hours activity` });
            riskScore += 8;
        }

        return {
            title: 'Behavioral Risk Analysis (AI-native)',
            risk_score: Math.min(100, riskScore),
            risk_level: riskScore >= 50 ? 'critical' : riskScore >= 30 ? 'high' : riskScore >= 15 ? 'medium' : 'low',
            signals,
            data_points: { shipments: shipments.length, credits: credits.length, partners: partners.length, scans: scans.length, routes: routes.length },
            recommendation: riskScore >= 50 ? 'BLOCK — Immediate investigation required' : riskScore >= 30 ? 'FLAG — Enhanced monitoring' : 'PASS',
            analyzed_at: new Date().toISOString()
        };
    }

    /**
     * Fraud graph — link analysis between entities
     */
    buildFraudGraph(entities = [], relationships = []) {
        const nodes = entities.map(e => ({
            id: e.id || e.did, type: e.type || e.entity_type,
            label: e.name || e.id, risk_score: e.risk_score || 0, flags: e.flags || []
        }));
        const edges = relationships.map(r => ({
            source: r.from, target: r.to, type: r.type || 'associated',
            weight: r.weight || 1, suspicious: r.suspicious || false
        }));

        const adjacency = {};
        edges.forEach(e => {
            if (!adjacency[e.source]) adjacency[e.source] = [];
            if (!adjacency[e.target]) adjacency[e.target] = [];
            adjacency[e.source].push(e.target);
            adjacency[e.target].push(e.source);
        });

        const visited = new Set();
        const clusters = [];
        const dfs = (node, cluster) => {
            if (visited.has(node)) return;
            visited.add(node); cluster.push(node);
            (adjacency[node] || []).forEach(n => dfs(n, cluster));
        };
        Object.keys(adjacency).forEach(node => {
            if (!visited.has(node)) { const cluster = []; dfs(node, cluster); clusters.push(cluster); }
        });

        const suspiciousEdges = edges.filter(e => e.suspicious);
        const highRiskNodes = nodes.filter(n => n.risk_score > 50);

        return {
            title: 'Fraud Graph Analysis',
            graph: { nodes: nodes.length, edges: edges.length, clusters: clusters.length },
            clusters: clusters.map((c, i) => ({ cluster_id: i + 1, size: c.length, members: c })),
            suspicious_links: suspiciousEdges.length,
            high_risk_nodes: highRiskNodes.length,
            risk_density: nodes.length > 0 ? Math.round(suspiciousEdges.length / edges.length * 100) || 0 : 0,
            topology: {
                avg_connections: nodes.length > 0 ? Math.round(edges.length * 2 / nodes.length * 10) / 10 : 0,
                max_cluster_size: clusters.length > 0 ? Math.max(...clusters.map(c => c.length)) : 0,
                isolated_nodes: nodes.filter(n => !adjacency[n.id] || adjacency[n.id].length === 0).length
            },
            analyzed_at: new Date().toISOString()
        };
    }

    /**
     * Link analysis — detect hidden connections
     */
    detectHiddenLinks(entities = [], shipments = [], scans = []) {
        const links = [];

        // Shared device detection
        const deviceEntities = {};
        scans.forEach(s => {
            const device = s.device_fingerprint || s.device_id || s.fingerprint;
            if (!device) return;
            if (!deviceEntities[device]) deviceEntities[device] = new Set();
            deviceEntities[device].add(s.entity_id || s.product_id || s.partner_id);
        });
        Object.entries(deviceEntities).forEach(([device, ents]) => {
            if (ents.size > 1) {
                const arr = [...ents];
                for (let i = 0; i < arr.length; i++)
                    for (let j = i + 1; j < arr.length; j++)
                        links.push({ type: 'shared_device', entity_a: arr[i], entity_b: arr[j], device, risk: 'medium' });
            }
        });

        // Shared route detection
        const routeEntities = {};
        shipments.forEach(s => {
            const route = `${s.origin}-${s.destination}`;
            if (!routeEntities[route]) routeEntities[route] = new Set();
            routeEntities[route].add(s.partner_id || s.carrier_id);
        });
        Object.entries(routeEntities).forEach(([route, partners]) => {
            if (partners.size > 3)
                links.push({ type: 'route_concentration', route, entities: [...partners], count: partners.size, risk: 'low' });
        });

        return {
            title: 'Hidden Link Analysis', total_links: links.length,
            by_type: { shared_device: links.filter(l => l.type === 'shared_device').length, route_concentration: links.filter(l => l.type === 'route_concentration').length },
            links: links.slice(0, 50), analyzed_at: new Date().toISOString()
        };
    }

    /**
     * Cross-tenant fraud pattern detection (Super Admin)
     */
    detectCrossTenantPatterns(tenants = []) {
        const patterns = [];

        const globalDevices = {};
        tenants.forEach(t => {
            (t.devices || []).forEach(d => {
                if (!globalDevices[d]) globalDevices[d] = [];
                globalDevices[d].push(t.org_id);
            });
        });
        const sharedDevices = Object.entries(globalDevices).filter(([_, ts]) => new Set(ts).size > 1);
        if (sharedDevices.length > 0)
            patterns.push({ type: 'cross_tenant_device', severity: 'critical', count: sharedDevices.length, detail: 'Same device used across multiple tenants' });

        const creditFlows = {};
        tenants.forEach(t => {
            (t.transfers || []).forEach(tr => {
                const key = `${tr.from}→${tr.to}`;
                creditFlows[key] = (creditFlows[key] || 0) + 1;
            });
        });
        const circular = Object.entries(creditFlows).filter(([key]) => {
            const [from, to] = key.split('→');
            return creditFlows[`${to}→${from}`] > 0;
        });
        if (circular.length > 0)
            patterns.push({ type: 'circular_credits', severity: 'critical', count: circular.length, detail: 'Circular credit transfers between tenants' });

        return {
            title: 'Cross-Tenant Fraud Detection', tenants_analyzed: tenants.length,
            patterns_found: patterns.length, patterns,
            risk_level: patterns.some(p => p.severity === 'critical') ? 'critical' : patterns.length > 0 ? 'medium' : 'low',
            analyzed_at: new Date().toISOString()
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.0: DB-BACKED RISK GRAPH
    // ═══════════════════════════════════════════════════════════════

    /**
     * Upsert a node into the persistent risk graph
     */
    async upsertNode(node) {
        const { entity_type, entity_id, risk_score = 0, metadata = {}, org_id } = node;
        const id = node.id || uuidv4();

        await db.run(`
            INSERT INTO risk_graph_nodes (id, entity_type, entity_id, risk_score, metadata, org_id, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            ON CONFLICT (id) DO UPDATE SET risk_score = $4, metadata = $5, updated_at = NOW()
        `, [id, entity_type, entity_id, risk_score, JSON.stringify(metadata), org_id]);

        return { id, entity_type, entity_id, risk_score };
    }

    /**
     * Upsert an edge into the persistent risk graph
     */
    async upsertEdge(sourceId, targetId, relationship, weight = 1, metadata = {}, orgId = null) {
        const id = uuidv4();
        await db.run(`
            INSERT INTO risk_graph_edges (id, source_id, target_id, relationship, weight, metadata, org_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `, [id, sourceId, targetId, relationship, weight, JSON.stringify(metadata), orgId]);
        return { id, source_id: sourceId, target_id: targetId, relationship, weight };
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.0: MULTI-HOP RISK PROPAGATION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Propagate risk from a source node through N hops with decay
     * @param {string} sourceId - risk_graph_nodes.id
     * @param {number} maxHops - max propagation depth (default 3)
     * @param {number} decayFactor - risk decay per hop (default 0.4)
     */
    async propagateRisk(sourceId, maxHops = 3, decayFactor = 0.4) {
        const source = await db.get('SELECT * FROM risk_graph_nodes WHERE id = $1', [sourceId]);
        if (!source) return { error: 'Source node not found' };

        const sourceRisk = parseFloat(source.risk_score) || 0;
        const affected = [];
        const visited = new Set([sourceId]);

        let frontier = [{ id: sourceId, risk: sourceRisk, hop: 0 }];

        for (let hop = 1; hop <= maxHops; hop++) {
            const nextFrontier = [];
            for (const node of frontier) {
                // Get neighbors via edges
                const edges = await db.all(`
                    SELECT e.target_id as neighbor, e.weight, n.entity_type, n.entity_id, n.risk_score
                    FROM risk_graph_edges e
                    JOIN risk_graph_nodes n ON n.id = e.target_id
                    WHERE e.source_id = $1
                    UNION
                    SELECT e.source_id as neighbor, e.weight, n.entity_type, n.entity_id, n.risk_score
                    FROM risk_graph_edges e
                    JOIN risk_graph_nodes n ON n.id = e.source_id
                    WHERE e.target_id = $1
                `, [node.id]);

                for (const edge of edges) {
                    if (visited.has(edge.neighbor)) continue;
                    visited.add(edge.neighbor);

                    const propagatedRisk = node.risk * parseFloat(edge.weight) * Math.pow(decayFactor, hop - 1);
                    const roundedRisk = Math.round(propagatedRisk * 10) / 10;

                    if (roundedRisk >= 1) {
                        affected.push({
                            node_id: edge.neighbor,
                            entity_type: edge.entity_type,
                            entity_id: edge.entity_id,
                            hop,
                            propagated_risk: roundedRisk,
                            original_risk: parseFloat(edge.risk_score) || 0,
                            combined_risk: Math.min(100, (parseFloat(edge.risk_score) || 0) + roundedRisk),
                        });
                        nextFrontier.push({ id: edge.neighbor, risk: propagatedRisk, hop });
                    }
                }
            }
            frontier = nextFrontier;
        }

        return {
            source: { id: sourceId, entity_type: source.entity_type, entity_id: source.entity_id, risk_score: sourceRisk },
            max_hops: maxHops, decay_factor: decayFactor,
            affected_nodes: affected.sort((a, b) => b.propagated_risk - a.propagated_risk),
            total_affected: affected.length,
            high_risk_count: affected.filter(a => a.combined_risk >= 50).length,
            propagated_at: new Date().toISOString(),
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.0: GRAPH QUERY API
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get neighbors of a node up to N depth
     */
    async getNeighbors(nodeId, depth = 1) {
        const node = await db.get('SELECT * FROM risk_graph_nodes WHERE id = $1', [nodeId]);
        if (!node) return { error: 'Node not found' };

        const neighbors = await db.all(`
            SELECT DISTINCT n.*, e.relationship, e.weight
            FROM risk_graph_edges e
            JOIN risk_graph_nodes n ON (n.id = e.target_id OR n.id = e.source_id)
            WHERE (e.source_id = $1 OR e.target_id = $1) AND n.id != $1
        `, [nodeId]);

        return {
            node: { id: node.id, entity_type: node.entity_type, entity_id: node.entity_id, risk_score: parseFloat(node.risk_score) },
            neighbors: neighbors.map(n => ({
                id: n.id, entity_type: n.entity_type, entity_id: n.entity_id,
                risk_score: parseFloat(n.risk_score), relationship: n.relationship, weight: parseFloat(n.weight),
            })),
            count: neighbors.length,
        };
    }

    /**
     * Get unified risk score combining behavioral + graph-based analysis
     */
    async getUnifiedRiskScore(entityId, orgId) {
        const node = await db.get(
            'SELECT * FROM risk_graph_nodes WHERE entity_id = $1 AND org_id = $2',
            [entityId, orgId]
        );

        const graphRisk = node ? parseFloat(node.risk_score) : 0;

        // Check propagated risk from neighbors
        let propagatedRisk = 0;
        if (node) {
            const neighbors = await db.all(`
                SELECT n.risk_score, e.weight
                FROM risk_graph_edges e
                JOIN risk_graph_nodes n ON (n.id = CASE WHEN e.source_id = $1 THEN e.target_id ELSE e.source_id END)
                WHERE e.source_id = $1 OR e.target_id = $1
            `, [node.id]);

            propagatedRisk = neighbors.reduce((sum, n) => {
                return sum + (parseFloat(n.risk_score) * parseFloat(n.weight) * 0.3);
            }, 0);
        }

        const unified = Math.min(100, Math.round(graphRisk * 0.6 + propagatedRisk * 0.4));

        return {
            entity_id: entityId,
            graph_risk: Math.round(graphRisk),
            propagated_risk: Math.round(propagatedRisk),
            unified_score: unified,
            risk_level: unified >= 50 ? 'critical' : unified >= 30 ? 'high' : unified >= 15 ? 'medium' : 'low',
            has_graph_data: !!node,
        };
    }

    getPatterns() { return BEHAVIOR_PATTERNS; }
}

module.exports = new RiskGraphEngine();
