/**
 * TrustChecker Supply Chain AI Engine
 * Statistical analysis for delay prediction, route optimization,
 * inventory forecast, bottleneck detection, and partner risk scoring
 */

class ScmAI {
    /**
     * Predict delivery delay based on historical shipment data
     * Uses exponential weighted moving average
     */
    predictDelay(shipments) {
        if (!shipments || shipments.length < 2) return { predicted_delay_hours: 0, confidence: 0.5, risk: 'low' };

        const delays = shipments
            .filter(s => s.actual_delivery && s.estimated_delivery)
            .map(s => {
                const est = new Date(s.estimated_delivery).getTime();
                const act = new Date(s.actual_delivery).getTime();
                return (act - est) / (1000 * 3600); // hours
            });

        if (delays.length === 0) return { predicted_delay_hours: 0, confidence: 0.6, risk: 'low' };

        // Exponential weighted moving average (alpha=0.3)
        const alpha = 0.3;
        let ewma = delays[0];
        for (let i = 1; i < delays.length; i++) {
            ewma = alpha * delays[i] + (1 - alpha) * ewma;
        }

        const variance = delays.reduce((s, d) => s + Math.pow(d - ewma, 2), 0) / delays.length;
        const stdDev = Math.sqrt(variance);
        const confidence = Math.max(0.3, Math.min(0.95, 1 - (stdDev / (Math.abs(ewma) + 1)) * 0.5));

        return {
            predicted_delay_hours: Math.round(ewma * 10) / 10,
            std_deviation: Math.round(stdDev * 10) / 10,
            confidence: Math.round(confidence * 100) / 100,
            risk: ewma > 24 ? 'high' : ewma > 8 ? 'medium' : 'low',
            samples: delays.length
        };
    }

    /**
     * Inventory forecast using exponential smoothing
     * Predicts stock levels for next N periods
     */
    forecastInventory(history, periodsAhead = 7) {
        if (!history || history.length < 3) {
            return { forecast: [], trend: 'stable', confidence: 0.4, alert: null };
        }

        const values = history.map(h => h.quantity);
        const alpha = 0.4;
        const beta = 0.1;

        // Double exponential smoothing (Holt's method)
        let level = values[0];
        let trend = values.length > 1 ? values[1] - values[0] : 0;

        for (let i = 1; i < values.length; i++) {
            const newLevel = alpha * values[i] + (1 - alpha) * (level + trend);
            trend = beta * (newLevel - level) + (1 - beta) * trend;
            level = newLevel;
        }

        const forecast = [];
        for (let i = 1; i <= periodsAhead; i++) {
            forecast.push({
                period: i,
                predicted: Math.max(0, Math.round(level + trend * i)),
                lower: Math.max(0, Math.round(level + trend * i - values.length * 0.1 * i)),
                upper: Math.round(level + trend * i + values.length * 0.1 * i)
            });
        }

        const lastPrediction = forecast[forecast.length - 1].predicted;
        const trendDirection = trend > 1 ? 'increasing' : trend < -1 ? 'decreasing' : 'stable';

        let alert = null;
        if (lastPrediction < 10) alert = { type: 'understock', message: 'Stock predicted to reach critical low', severity: 'high' };
        else if (lastPrediction > 900) alert = { type: 'overstock', message: 'Stock predicted to exceed capacity', severity: 'medium' };

        return {
            forecast,
            trend: trendDirection,
            confidence: Math.min(0.9, 0.5 + values.length * 0.05),
            current_level: values[values.length - 1],
            alert
        };
    }

    /**
     * Detect supply chain bottlenecks
     * Analyzes throughput at each node
     */
    detectBottlenecks(events, partners) {
        const nodeStats = {};

        (events || []).forEach(e => {
            const key = e.partner_id || e.location || 'unknown';
            if (!nodeStats[key]) {
                nodeStats[key] = { node: key, events: 0, types: {}, avg_dwell: 0, delays: [] };
            }
            nodeStats[key].events++;
            nodeStats[key].types[e.event_type] = (nodeStats[key].types[e.event_type] || 0) + 1;
        });

        // Calculate throughput scores
        const nodes = Object.values(nodeStats);
        if (nodes.length === 0) return { bottlenecks: [], health: 'healthy' };

        const avgEvents = nodes.reduce((s, n) => s + n.events, 0) / nodes.length;

        const bottlenecks = nodes
            .map(n => {
                const ratio = n.events / avgEvents;
                const partnerInfo = (partners || []).find(p => p.id === n.node);
                return {
                    node_id: n.node,
                    node_name: partnerInfo ? partnerInfo.name : n.node,
                    throughput: n.events,
                    throughput_ratio: Math.round(ratio * 100) / 100,
                    event_breakdown: n.types,
                    is_bottleneck: ratio < 0.5 || ratio > 2.0,
                    severity: ratio < 0.3 ? 'critical' : ratio < 0.5 ? 'high' : ratio > 2.0 ? 'warning' : 'normal'
                };
            })
            .sort((a, b) => a.throughput_ratio - b.throughput_ratio);

        const bottleneckCount = bottlenecks.filter(b => b.is_bottleneck).length;

        return {
            bottlenecks,
            health: bottleneckCount === 0 ? 'healthy' : bottleneckCount <= 2 ? 'warning' : 'critical',
            total_nodes: nodes.length,
            bottleneck_count: bottleneckCount
        };
    }

    /**
     * Route optimization — weighted shortest path
     * Considers distance, delay history, and partner risk
     */
    optimizeRoute(graph, fromId, toId) {
        if (!graph || graph.length === 0) return { path: [], cost: 0, optimized: false };

        // Build adjacency list
        const adj = {};
        graph.forEach(edge => {
            if (!adj[edge.from_node_id]) adj[edge.from_node_id] = [];
            adj[edge.from_node_id].push({
                to: edge.to_node_id,
                weight: edge.weight * (1 + edge.risk_score),
                risk: edge.risk_score
            });
        });

        // Dijkstra's algorithm
        const dist = {};
        const prev = {};
        const visited = new Set();
        const queue = [];

        Object.keys(adj).forEach(n => { dist[n] = Infinity; });
        graph.forEach(e => { if (!(e.to_node_id in dist)) dist[e.to_node_id] = Infinity; });
        dist[fromId] = 0;
        queue.push({ node: fromId, cost: 0 });

        while (queue.length > 0) {
            queue.sort((a, b) => a.cost - b.cost);
            const { node } = queue.shift();
            if (visited.has(node)) continue;
            visited.add(node);

            (adj[node] || []).forEach(edge => {
                const newCost = dist[node] + edge.weight;
                if (newCost < dist[edge.to]) {
                    dist[edge.to] = newCost;
                    prev[edge.to] = node;
                    queue.push({ node: edge.to, cost: newCost });
                }
            });
        }

        // Reconstruct path
        const path = [];
        let current = toId;
        while (current && current !== fromId) {
            path.unshift(current);
            current = prev[current];
        }
        if (current === fromId) path.unshift(fromId);

        return {
            path,
            cost: Math.round((dist[toId] || 0) * 100) / 100,
            optimized: path.length > 0 && dist[toId] !== Infinity,
            hops: path.length - 1
        };
    }

    /**
     * Partner risk scoring — composite multi-factor
     */
    scorePartnerRisk(partner, alerts, shipments, violations) {
        let score = 50; // base score

        // Factor 1: KYC status (+20)
        if (partner.kyc_status === 'verified') score += 20;
        else if (partner.kyc_status === 'pending') score += 5;

        // Factor 2: Fraud alert history (-5 per alert)
        const alertCount = (alerts || []).length;
        score -= Math.min(30, alertCount * 5);

        // Factor 3: Delivery reliability (+15 if good)
        const completed = (shipments || []).filter(s => s.status === 'delivered');
        const onTime = completed.filter(s => {
            if (!s.actual_delivery || !s.estimated_delivery) return true;
            return new Date(s.actual_delivery) <= new Date(s.estimated_delivery);
        });
        const reliability = completed.length > 0 ? onTime.length / completed.length : 0.5;
        score += Math.round(reliability * 15);

        // Factor 4: SLA violations (-10 per violation)
        score -= Math.min(20, (violations || []).length * 10);

        // Factor 5: Tenure bonus
        if (partner.created_at) {
            const months = (Date.now() - new Date(partner.created_at).getTime()) / (1000 * 3600 * 24 * 30);
            score += Math.min(10, Math.floor(months));
        }

        score = Math.max(0, Math.min(100, score));

        return {
            score,
            grade: score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
            risk_level: score >= 80 ? 'low' : score >= 60 ? 'medium' : score >= 40 ? 'high' : 'critical',
            factors: {
                kyc: partner.kyc_status,
                alert_count: alertCount,
                delivery_reliability: Math.round(reliability * 100) + '%',
                sla_violations: (violations || []).length,
                overall: score
            }
        };
    }

    /**
     * PageRank-style graph analysis for TrustGraph
     */
    pageRank(nodes, edges, iterations = 20, damping = 0.85) {
        const n = nodes.length;
        if (n === 0) return {};

        const nodeIds = nodes.map(n => n.id);
        let ranks = {};
        nodeIds.forEach(id => { ranks[id] = 1 / n; });

        // Build outgoing edge map
        const outgoing = {};
        const incoming = {};
        nodeIds.forEach(id => { outgoing[id] = []; incoming[id] = []; });

        edges.forEach(e => {
            if (outgoing[e.from_node_id]) outgoing[e.from_node_id].push(e.to_node_id);
            if (incoming[e.to_node_id]) incoming[e.to_node_id].push(e.from_node_id);
        });

        for (let iter = 0; iter < iterations; iter++) {
            const newRanks = {};
            nodeIds.forEach(id => {
                let incomingRank = 0;
                incoming[id].forEach(fromId => {
                    const outDegree = outgoing[fromId].length || 1;
                    incomingRank += ranks[fromId] / outDegree;
                });
                newRanks[id] = (1 - damping) / n + damping * incomingRank;
            });
            ranks = newRanks;
        }

        return ranks;
    }

    /**
     * Detect toxic suppliers using graph centrality + risk data
     */
    detectToxicNodes(nodes, edges, alerts) {
        const ranks = this.pageRank(nodes, edges);

        // Calculate betweenness approximation (degree centrality)
        const inDegree = {};
        const outDegree = {};
        nodes.forEach(n => { inDegree[n.id] = 0; outDegree[n.id] = 0; });
        edges.forEach(e => {
            if (inDegree[e.to_node_id] !== undefined) inDegree[e.to_node_id]++;
            if (outDegree[e.from_node_id] !== undefined) outDegree[e.from_node_id]++;
        });

        // Alert count per node
        const alertMap = {};
        (alerts || []).forEach(a => {
            const key = a.partner_id || a.product_id;
            alertMap[key] = (alertMap[key] || 0) + 1;
        });

        return nodes.map(n => {
            const rank = ranks[n.id] || 0;
            const centrality = (inDegree[n.id] + outDegree[n.id]) / Math.max(1, nodes.length - 1);
            const alertCount = alertMap[n.id] || 0;

            // Toxicity = high centrality + high alerts + low trust
            const toxicity = (centrality * 0.3 + (alertCount / 10) * 0.4 + (1 - (n.trust_score || 50) / 100) * 0.3);

            return {
                id: n.id,
                name: n.name,
                type: n.type,
                pagerank: Math.round(rank * 10000) / 10000,
                centrality: Math.round(centrality * 100) / 100,
                in_degree: inDegree[n.id],
                out_degree: outDegree[n.id],
                alert_count: alertCount,
                trust_score: n.trust_score || 50,
                toxicity_score: Math.round(toxicity * 100) / 100,
                is_toxic: toxicity > 0.5,
                risk_level: toxicity > 0.7 ? 'critical' : toxicity > 0.5 ? 'high' : toxicity > 0.3 ? 'medium' : 'low'
            };
        }).sort((a, b) => b.toxicity_score - a.toxicity_score);
    }
}

module.exports = new ScmAI();
