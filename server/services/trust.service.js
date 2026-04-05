/**
 * Trust Service v1.0
 * Business logic for trust score calculation, dashboard, and history.
 * Wraps the TrustEngine and exposes clean API for routes.
 */
const BaseService = require('./base.service');

class TrustService extends BaseService {
    constructor() {
        super('trust');
        try {
            this.engine = require('../engines/core/trust');
        } catch (e) {
            this.logger.warn('Trust engine not loaded', { error: e.message });
        }
    }

    async calculateScore(productId, fraudScore = 0) {
        if (!this.engine) throw this.error('ENGINE_UNAVAILABLE', 'Trust engine not loaded', 503);
        return this.engine.calculate(productId, fraudScore);
    }

    async getOrgTrustScore(orgId) {
        if (this.engine?.calculateOrgTrust) {
            return this.engine.calculateOrgTrust(orgId);
        }
        // Fallback: aggregate from DB
        const result = await this.db.get(
            'SELECT AVG(score) as avg_score, COUNT(*) as product_count FROM trust_scores ts JOIN products p ON p.id = ts.product_id WHERE p.org_id = $1 AND ts.is_latest = true',
            [orgId]
        );
        return { score: Math.round(result?.avg_score || 0), product_count: result?.product_count || 0 };
    }

    async getDashboard(orgId) {
        if (this.engine?.getDashboard) {
            return this.engine.getDashboard(orgId);
        }
        const [scores, trend, distribution] = await Promise.all([
            this.getOrgTrustScore(orgId),
            this.db.all(
                `SELECT DATE(created_at) as date, AVG(score) as avg FROM trust_scores ts
                 JOIN products p ON p.id = ts.product_id
                 WHERE p.org_id = $1 AND ts.created_at > NOW() - INTERVAL '30 days'
                 GROUP BY DATE(created_at) ORDER BY date`,
                [orgId]
            ),
            this.db.all(
                `SELECT CASE WHEN score >= 90 THEN 'excellent' WHEN score >= 70 THEN 'good' WHEN score >= 50 THEN 'fair' ELSE 'poor' END as tier, COUNT(*) as cnt
                 FROM trust_scores ts JOIN products p ON p.id = ts.product_id
                 WHERE p.org_id = $1 AND ts.is_latest = true GROUP BY tier`,
                [orgId]
            ),
        ]);
        return { ...scores, trend, distribution };
    }

    async getHistory(productId, orgId) {
        return this.db.all(
            'SELECT ts.* FROM trust_scores ts JOIN products p ON p.id = ts.product_id WHERE ts.product_id = $1 AND p.org_id = $2 ORDER BY ts.created_at DESC LIMIT 100',
            [productId, orgId]
        );
    }
}

module.exports = new TrustService();
