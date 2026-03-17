/**
 * Network Intelligence Engine v2.0
 * Cross-organization supplier intelligence (anonymized)
 * v2.0 adds: trend detection, supplier alerts, contribution stats, network health
 */
const db = require("../../db");
const { v4: uuidv4 } = require('uuid');

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
                supplier_name: r.supplier_name, country: r.country,
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
                country: r.country, supplier_count: parseInt(r.suppliers),
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

        // v2.0: Snapshot scores for trend tracking
        await this._snapshotScores();

        return { duration_ms: duration, row_count: parseInt(count[0].count) };
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.0: TREND DETECTION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get supplier score trend over time
     */
    async getSupplierTrend(supplierName, days = 30) {
        const history = await db.all(`
            SELECT score, evaluating_orgs, incident_count, snapshot_date
            FROM supplier_score_history
            WHERE supplier_name ILIKE $1 AND snapshot_date > CURRENT_DATE - $2
            ORDER BY snapshot_date ASC
        `, [supplierName, days]);

        if (history.length < 2) {
            return { trend: 'insufficient_data', data_points: history.length, supplier: supplierName };
        }

        const scores = history.map(h => parseFloat(h.score));
        const current = scores[scores.length - 1];
        const previous = scores[0];
        const change = current - previous;
        const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

        let trend = 'stable';
        if (change > 5) trend = 'improving';
        else if (change < -5) trend = 'declining';

        return {
            supplier: supplierName, trend, days,
            current_score: current,
            previous_score: previous,
            change: Math.round(change * 10) / 10,
            average: Math.round(avg * 10) / 10,
            min: Math.min(...scores),
            max: Math.max(...scores),
            data_points: history.length,
            history: history.map(h => ({
                date: h.snapshot_date,
                score: parseFloat(h.score),
                orgs: parseInt(h.evaluating_orgs),
            })),
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.0: SUPPLIER ALERTS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get suppliers with significant score drops (alerts)
     */
    async getAlerts(orgId, options = {}) {
        const threshold = options.threshold || -10;
        const days = options.days || 7;

        // Get suppliers this org works with
        const orgSuppliers = await db.all(`
            SELECT DISTINCT partner_name as supplier_name
            FROM scm_partners
            WHERE org_id = $1 AND partner_type IN ('supplier', 'manufacturer')
        `, [orgId]);

        if (orgSuppliers.length === 0) return { alerts: [], count: 0 };

        const alerts = [];
        for (const sup of orgSuppliers) {
            const trend = await this.getSupplierTrend(sup.supplier_name, days);
            if (trend.trend === 'declining' && trend.change <= threshold) {
                alerts.push({
                    supplier: sup.supplier_name,
                    score_change: trend.change,
                    current_score: trend.current_score,
                    severity: trend.change <= -20 ? 'critical' : trend.change <= -10 ? 'high' : 'medium',
                    recommendation: trend.change <= -20
                        ? 'Immediate review required — consider alternative suppliers'
                        : 'Monitor closely — schedule supplier review',
                });
            }
        }

        return {
            alerts: alerts.sort((a, b) => a.score_change - b.score_change),
            count: alerts.length,
            suppliers_monitored: orgSuppliers.length,
            period_days: days,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.0: CONTRIBUTION STATS
    // ═══════════════════════════════════════════════════════════════

    /**
     * How does this org's rating compare to network consensus?
     */
    async getContribution(orgId, supplierName) {
        // Get org's own rating
        const orgRating = await db.get(`
            SELECT trust_score, last_review_date
            FROM scm_partners
            WHERE org_id = $1 AND partner_name ILIKE $2
            LIMIT 1
        `, [orgId, supplierName]);

        // Get network average
        const network = await this.getSupplierIntelligence(supplierName);

        if (!orgRating || !network) {
            return { available: false, reason: 'No rating data found' };
        }

        const orgScore = parseFloat(orgRating.trust_score) || 0;
        const networkScore = network.network_score;
        const deviation = orgScore - networkScore;

        return {
            available: true,
            supplier: supplierName,
            org_score: orgScore,
            network_score: networkScore,
            deviation: Math.round(deviation * 10) / 10,
            alignment: Math.abs(deviation) < 10 ? 'aligned' : deviation > 0 ? 'org_rates_higher' : 'org_rates_lower',
            network_confidence: network.score_confidence,
            evaluating_orgs: network.evaluating_organizations,
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.0: NETWORK HEALTH
    // ═══════════════════════════════════════════════════════════════

    /**
     * Platform-wide network intelligence health metrics
     */
    async getNetworkHealth() {
        const stats = await db.get(`
            SELECT
                COUNT(*) as total_suppliers,
                COUNT(CASE WHEN evaluating_orgs >= 3 THEN 1 END) as high_coverage,
                COUNT(CASE WHEN evaluating_orgs = 1 THEN 1 END) as single_org,
                AVG(avg_trust_score) as avg_score,
                AVG(evaluating_orgs) as avg_coverage,
                COUNT(CASE WHEN incident_count > 0 THEN 1 END) as with_incidents
            FROM supplier_network_intelligence
        `);

        const recentTrends = await db.all(`
            SELECT supplier_name,
                   MAX(score) - MIN(score) as score_range,
                   MAX(score) as max_score, MIN(score) as min_score
            FROM supplier_score_history
            WHERE snapshot_date > CURRENT_DATE - 30
            GROUP BY supplier_name
            HAVING MAX(score) - MIN(score) > 15
            ORDER BY score_range DESC
            LIMIT 10
        `);

        return {
            total_suppliers: parseInt(stats?.total_suppliers || 0),
            high_coverage_suppliers: parseInt(stats?.high_coverage || 0),
            single_org_suppliers: parseInt(stats?.single_org || 0),
            average_trust_score: Math.round(parseFloat(stats?.avg_score || 0) * 10) / 10,
            average_coverage: Math.round(parseFloat(stats?.avg_coverage || 0) * 10) / 10,
            suppliers_with_incidents: parseInt(stats?.with_incidents || 0),
            volatile_suppliers: recentTrends.map(t => ({
                supplier: t.supplier_name,
                score_range: parseFloat(t.score_range),
                current: parseFloat(t.max_score),
            })),
            generated_at: new Date().toISOString(),
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // INTERNAL HELPERS
    // ═══════════════════════════════════════════════════════════════

    /**
     * Snapshot current scores for trend tracking (called during refresh)
     */
    async _snapshotScores() {
        try {
            const suppliers = await db.all(
                "SELECT supplier_name, avg_trust_score, evaluating_orgs, total_ratings, incident_count FROM supplier_network_intelligence"
            );
            for (const s of suppliers) {
                await db.all(`
                    INSERT INTO supplier_score_history (id, supplier_name, score, evaluating_orgs, total_ratings, incident_count)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT DO NOTHING
                `, [uuidv4(), s.supplier_name, s.avg_trust_score, s.evaluating_orgs, s.total_ratings, s.incident_count]);
            }
        } catch (e) {
            // Non-critical — log but don't fail refresh
            console.warn('[NetworkIntelligence] Snapshot failed:', e.message);
        }
    }

    _confidence(orgs, ratings) {
        if (orgs >= 10 && ratings >= 50) return "high";
        if (orgs >= 5 && ratings >= 20) return "medium";
        if (orgs >= 2) return "low";
        return "insufficient";
    }
}

module.exports = new NetworkIntelligenceEngine();
