/**
 * Network Intelligence Engine v1.0
 * Cross-organization supplier intelligence (anonymized)
 * The KEY to network effects and $1B moat
 */
const db = require("../../db");

class NetworkIntelligenceEngine {
    /**
     * Get anonymized cross-org intelligence for a supplier
     */
    async getSupplierIntelligence(supplierName) {
        var result = await db.all(
            "SELECT * FROM supplier_network_intelligence WHERE supplier_name ILIKE $1",
            [supplierName]
        );
        if (!result[0]) return null;
        var data = result[0];
        return {
            supplier_name: data.supplier_name,
            country: data.country,
            network_score: parseFloat(data.avg_trust_score) || 0,
            score_confidence: this._confidence(parseInt(data.evaluating_orgs), parseInt(data.total_ratings)),
            evaluating_organizations: parseInt(data.evaluating_orgs),
            total_ratings: parseInt(data.total_ratings),
            sentiment: {
                positive: parseInt(data.positive_ratings),
                negative: parseInt(data.negative_ratings),
                ratio: parseInt(data.positive_ratings) / Math.max(1, parseInt(data.total_ratings))
            },
            risk_signals: {
                incident_count: parseInt(data.incident_count),
                last_incident: data.last_incident,
                score_variance: parseFloat(data.score_variance) || 0
            },
            last_updated: data.last_rated
        };
    }

    /**
     * Search suppliers with network intelligence
     */
    async searchSuppliers(query, options) {
        options = options || {};
        var limit = options.limit || 20;
        var minOrgs = options.min_orgs || 2;
        var result = await db.all(
            "SELECT * FROM supplier_network_intelligence WHERE supplier_name ILIKE $1 AND evaluating_orgs >= $2 ORDER BY total_ratings DESC LIMIT $3",
            ["%" + query + "%", minOrgs, limit]
        );
        return result.map(function(r) {
            return {
                supplier_name: r.supplier_name,
                country: r.country,
                network_score: parseFloat(r.avg_trust_score) || 0,
                evaluating_orgs: parseInt(r.evaluating_orgs),
                total_ratings: parseInt(r.total_ratings),
                incident_count: parseInt(r.incident_count)
            };
        });
    }

    /**
     * Get industry benchmarks
     */
    async getIndustryBenchmarks() {
        var result = await db.all(
            "SELECT country, COUNT(*) as suppliers, AVG(avg_trust_score) as avg_score, AVG(incident_count) as avg_incidents FROM supplier_network_intelligence GROUP BY country ORDER BY suppliers DESC LIMIT 20"
        );
        return result.map(function(r) {
            return {
                country: r.country,
                supplier_count: parseInt(r.suppliers),
                avg_trust_score: parseFloat(r.avg_score) || 0,
                avg_incidents: parseFloat(r.avg_incidents) || 0
            };
        });
    }

    /**
     * Refresh the materialized view
     */
    async refreshIntelligence() {
        var start = Date.now();
        await db.all("REFRESH MATERIALIZED VIEW CONCURRENTLY supplier_network_intelligence");
        var duration = Date.now() - start;
        var count = await db.all("SELECT count(*) FROM supplier_network_intelligence");
        await db.all(
            "INSERT INTO materialized_view_refresh_log (view_name, last_refreshed, refresh_duration_ms, row_count) VALUES ($1, NOW(), $2, $3) ON CONFLICT (view_name) DO UPDATE SET last_refreshed = NOW(), refresh_duration_ms = $2, row_count = $3",
            ["supplier_network_intelligence", duration, parseInt(count[0].count)]
        );
        return { duration_ms: duration, row_count: parseInt(count[0].count) };
    }

    _confidence(orgs, ratings) {
        if (orgs >= 10 && ratings >= 50) return "high";
        if (orgs >= 5 && ratings >= 20) return "medium";
        if (orgs >= 2) return "low";
        return "insufficient";
    }
}

module.exports = new NetworkIntelligenceEngine();
