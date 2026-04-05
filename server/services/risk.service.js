/**
 * Risk Service v1.0
 * Business logic for risk graph, anomaly detection, and fraud alerts.
 */
const BaseService = require('./base.service');

class RiskService extends BaseService {
    constructor() {
        super('risk');
        try {
            this.riskEngine = require('../engines/core/risk-graph-engine');
            this.anomalyEngine = require('../engines/core/anomaly');
            this.fraudEngine = require('../engines/core/fraud');
        } catch (e) {}
    }

    async getRiskGraph(orgId) {
        const nodes = await this.db.all(
            'SELECT * FROM risk_graph_nodes WHERE org_id = $1 ORDER BY risk_score DESC LIMIT 100',
            [orgId]
        );
        const edges = await this.db.all(
            'SELECT e.* FROM risk_graph_edges e JOIN risk_graph_nodes n ON n.id = e.source_node_id WHERE n.org_id = $1 LIMIT 500',
            [orgId]
        );
        return { nodes, edges };
    }

    async getAnomalies(orgId, { page = 1, limit = 20 } = {}) {
        return this.paginate('SELECT * FROM anomaly_alerts WHERE org_id = $1 ORDER BY created_at DESC', [orgId], {
            page,
            limit,
        });
    }

    async getFraudAlerts(orgId, { page = 1, limit = 20 } = {}) {
        return this.paginate(
            'SELECT * FROM fraud_alerts WHERE org_id = $1 ORDER BY severity DESC, created_at DESC',
            [orgId],
            { page, limit }
        );
    }

    async propagateRisk(sourceNodeId, maxHops = 3) {
        if (this.riskEngine?.propagateRiskCTE) {
            return this.riskEngine.propagateRiskCTE(sourceNodeId, maxHops);
        }
        return [];
    }
}

module.exports = new RiskService();
