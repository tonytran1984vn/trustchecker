class CausalGraph {
    constructor() {
        this.nodes = new Map();
        this.edges = new Map();
    }

    addNode(id, type, value, trend, ts) {
        this.nodes.set(id, { id, type, value, trend, ts });
    }

    // Weight initialized from historical correlation, dynamically tuned by Action Engine
    addEdge(from, to, weight, lagSec, type = 'causal') {
        if (!this.edges.has(to)) {
            this.edges.set(to, []);
        }

        const targetEdges = this.edges.get(to);
        const existing = targetEdges.find(e => e.from === from);

        if (existing) {
            existing.weight = weight;
            existing.lag = lagSec;
        } else {
            targetEdges.push({ from, to, weight, lag: lagSec, type });
        }
    }

    getIncomingEdges(nodeId) {
        return this.edges.get(nodeId) || [];
    }

    // Heuristics lag penalty: If signal lag is > 60s, it's unlikely a direct causal predecessor in microservices
    scoreEdge(weight, stabilityCorr, lag) {
        const lagPenalty = Math.max(0, lag - 10) * 0.01;
        return Math.max(0, weight * 0.6 + stabilityCorr * 0.3 - lagPenalty);
    }
}

class RootCauseEngine {
    constructor() {
        this.graph = new CausalGraph();
        this.THRESHOLD = 0.5;
    }

    buildTopology(metricsSnapshotContext) {
        // Mocking topological relationships. In reality, this correlates via streaming lag.
        // E.g., 'traffic' directly impacts 'latency' with 5s lag, which impacts 'error_rate' with 10s lag.
        this.graph.addEdge('traffic', 'latency', 0.9, 5);
        this.graph.addEdge('latency', 'error_rate', 0.85, 10);
        this.graph.addEdge('database_io', 'latency', 0.7, 15);
    }

    syncNodes(metricStateMap, currentTs) {
        for (const [metric, state] of metricStateMap.entries()) {
            this.graph.addNode(
                metric,
                'metric',
                state.lastValue,
                state.trendSlope > 0 ? 'increasing' : 'stable',
                state.lastTs
            );
        }
    }

    /**
     * Recursive backtracking topology search
     * Target: the node currently experiencing anomaly limits (e.g. error_rate)
     */
    findRootCause(targetNodeId) {
        const current = this.graph.nodes.get(targetNodeId);
        if (!current) return null;

        let bestCause = current.id;
        let cumulativeConfidence = 1.0;
        const path = [current.id];

        let currentNodeId = targetNodeId;

        while (true) {
            const parents = this.graph.getIncomingEdges(currentNodeId);
            if (!parents.length) break;

            // Select highest weighted parent exceeding anomaly threshold
            let strongestEdge = null;
            let maxScore = 0;

            for (const edge of parents) {
                const parentNode = this.graph.nodes.get(edge.from);

                // If parent node is not exhibiting anomaly/high stress, it cannot be the cause
                if (parentNode && parentNode.trend === 'increasing') {
                    const score = this.graph.scoreEdge(edge.weight, 0.9, edge.lag);
                    if (score > maxScore) {
                        maxScore = score;
                        strongestEdge = edge;
                    }
                }
            }

            if (!strongestEdge || maxScore < this.THRESHOLD) break;

            cumulativeConfidence = cumulativeConfidence * maxScore;
            bestCause = strongestEdge.from;
            currentNodeId = strongestEdge.from;
            path.push(currentNodeId);
        }

        return {
            rootCause: bestCause,
            confidence: Number(cumulativeConfidence.toFixed(2)),
            path: path.reverse(), // from root cause -> victim node
        };
    }
}

module.exports = { CausalGraph, RootCauseEngine };
