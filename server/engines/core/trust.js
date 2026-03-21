/**
 * TrustChecker Trust Score Engine v2.0
 * Dynamic, explainable trust scoring based on multi-factor analysis
 * TrustScore = f(fraud_probability, scan_consistency, supply_chain_compliance, historical_anomaly)
 *
 * v2.0 adds: org-level trust, trend detection, signal pipeline, dashboard
 */
/**
 * ⚠️ ORG ISOLATION: This engine relies on PostgreSQL RLS for data isolation.
 * The calling route must set db.setOrgContext(orgId) before invoking engine methods.
 * All SQL queries in this file are filtered at the database level by RLS policies.
 */

const db = require('../../db');
const { v4: uuidv4 } = require('uuid');
const { eventBus, EVENT_TYPES } = require('../../events');

class TrustEngine {
    constructor() {
        this.WEIGHTS = {
            fraud: 0.35,
            consistency: 0.25,
            compliance: 0.20,
            history: 0.20
        };
    }

    /**
     * Calculate trust score for a product after a scan event
     */
    async calculate(productId, fraudScore = 0) {
        const factors = {};
        factors.fraud = Math.max(0, 1 - fraudScore);
        factors.consistency = await this.calculateConsistency(productId);
        factors.compliance = await this.calculateCompliance(productId);
        factors.history = await this.calculateHistory(productId);

        const rawScore = (
            factors.fraud * this.WEIGHTS.fraud +
            factors.consistency * this.WEIGHTS.consistency +
            factors.compliance * this.WEIGHTS.compliance +
            factors.history * this.WEIGHTS.history
        );
        const score = Math.round(rawScore * 100);

        const explanation = {
            fraud_factor: {
                value: (factors.fraud * 100).toFixed(1), weight: this.WEIGHTS.fraud,
                description: factors.fraud > 0.8 ? 'No fraud signals detected' : factors.fraud > 0.5 ? 'Minor fraud indicators present' : 'Significant fraud risk detected'
            },
            consistency_factor: {
                value: (factors.consistency * 100).toFixed(1), weight: this.WEIGHTS.consistency,
                description: factors.consistency > 0.8 ? 'Scan patterns are consistent' : 'Irregular scan patterns detected'
            },
            compliance_factor: {
                value: (factors.compliance * 100).toFixed(1), weight: this.WEIGHTS.compliance,
                description: factors.compliance > 0.8 ? 'Product data is complete and compliant' : 'Missing compliance data'
            },
            history_factor: {
                value: (factors.history * 100).toFixed(1), weight: this.WEIGHTS.history,
                description: factors.history > 0.8 ? 'Clean historical record' : 'Historical anomalies found'
            }
        };

        const scoreId = uuidv4();
        await db.run(`
            INSERT INTO trust_scores (id, product_id, score, fraud_factor, consistency_factor, compliance_factor, history_factor, explanation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [scoreId, productId, score, factors.fraud, factors.consistency, factors.compliance, factors.history, JSON.stringify(explanation)]);
        await db.run("UPDATE products SET trust_score = ?, updated_at = NOW() WHERE id = ?", [score, productId]);

        eventBus.emitEvent(EVENT_TYPES.TRUST_SCORE_UPDATED, {
            product_id: productId, score, factors, grade: this.getGrade(score)
        });

        return { score, factors, explanation, grade: this.getGrade(score) };
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.0: ORGANIZATION-LEVEL TRUST
    // ═══════════════════════════════════════════════════════════════

    /**
     * Calculate aggregate trust score for an organization
     * Weighted by product activity (more scans = more weight)
     */
    async calculateOrgTrust(orgId) {
        const products = await db.all(`
            SELECT p.id, p.trust_score, p.status,
                   COALESCE(s.scan_count, 0) as scan_count
            FROM products p
            LEFT JOIN (
                SELECT product_id, COUNT(*) as scan_count
                FROM scan_events
                WHERE scanned_at > NOW() - INTERVAL '90 days'
                GROUP BY product_id
            ) s ON s.product_id = p.id
            WHERE p.org_id = ?
        `, [orgId]);

        if (products.length === 0) return { score: 0, grade: 'N/A', product_count: 0 };

        const activeProducts = products.filter(p => p.trust_score != null && p.trust_score > 0);
        if (activeProducts.length === 0) return { score: 0, grade: 'N/A', product_count: products.length };

        // Weighted average: products with more scans have more influence
        const totalWeight = activeProducts.reduce((s, p) => s + Math.max(1, p.scan_count), 0);
        const weightedScore = activeProducts.reduce((s, p) => {
            const weight = Math.max(1, p.scan_count) / totalWeight;
            return s + p.trust_score * weight;
        }, 0);

        const score = Math.round(weightedScore);

        // Distribution breakdown
        const distribution = {
            excellent: activeProducts.filter(p => p.trust_score >= 90).length,
            good: activeProducts.filter(p => p.trust_score >= 70 && p.trust_score < 90).length,
            fair: activeProducts.filter(p => p.trust_score >= 50 && p.trust_score < 70).length,
            poor: activeProducts.filter(p => p.trust_score < 50).length,
        };

        return {
            score,
            grade: this.getGrade(score),
            product_count: products.length,
            scored_products: activeProducts.length,
            distribution,
            confidence: activeProducts.length >= 10 ? 'high' : activeProducts.length >= 3 ? 'medium' : 'low',
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.0: TRUST TREND DETECTION
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get trust score trend for a product over time windows
     */
    async getTrend(productId, window = '30d') {
        const intervals = { '7d': 7, '30d': 30, '90d': 90 };
        const days = intervals[window] || 30;

        const history = await db.all(`
            SELECT score, calculated_at::date as date
            FROM trust_scores
            WHERE product_id = ? AND calculated_at > NOW() - INTERVAL '${days} days'
            ORDER BY calculated_at ASC
        `, [productId]);

        if (history.length < 2) return { trend: 'insufficient_data', data_points: history.length };

        // Simple linear regression for trend direction
        const scores = history.map(h => h.score);
        const n = scores.length;
        const sumX = n * (n - 1) / 2;
        const sumY = scores.reduce((a, b) => a + b, 0);
        const sumXY = scores.reduce((sum, y, x) => sum + x * y, 0);
        const sumX2 = n * (n - 1) * (2 * n - 1) / 6;
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

        const current = scores[scores.length - 1];
        const avg = sumY / n;
        const min = Math.min(...scores);
        const max = Math.max(...scores);

        let trend = 'stable';
        if (slope > 0.5) trend = 'improving';
        else if (slope < -0.5) trend = 'declining';

        let alert = null;
        if (current < avg - 15) {
            alert = { type: 'significant_drop', severity: 'high', message: `Trust score dropped ${Math.round(avg - current)} points below ${days}d average` };
        }

        return {
            window, trend, slope: Math.round(slope * 100) / 100,
            current, average: Math.round(avg), min, max,
            data_points: n,
            alert,
            history: history.slice(-10).map(h => ({ date: h.date, score: h.score })),
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.0: SIGNAL PIPELINE
    // ═══════════════════════════════════════════════════════════════

    /**
     * Ingest an external signal that modifies trust
     * Signal types: epcis_event, compliance_change, fraud_alert, manual_override
     */
    async ingestSignal(signal) {
        const { product_id, type, impact, source, metadata } = signal;
        if (!product_id || !type) throw new Error('signal requires product_id and type');

        const impacts = {
            epcis_event: 0.02,        // Small positive: data visibility
            compliance_change: -0.05,  // Negative: compliance issue detected
            fraud_alert: -0.15,        // Significant negative
            positive_verification: 0.05, // Positive: verified by 3rd party
            manual_override: impact || 0,
        };

        const modifier = impacts[type] || 0;
        if (modifier === 0) return { applied: false, reason: 'unknown signal type' };

        // Get current trust score
        const product = await db.get('SELECT trust_score FROM products WHERE id = ?', [product_id]);
        if (!product) return { applied: false, reason: 'product not found' };

        const currentScore = product.trust_score || 50;
        const newScore = Math.max(0, Math.min(100, Math.round(currentScore + modifier * 100)));

        if (newScore !== currentScore) {
            await db.run("UPDATE products SET trust_score = ?, updated_at = NOW() WHERE id = ?", [newScore, product_id]);

            // Log the signal
            await db.run(`
                INSERT INTO trust_scores (id, product_id, score, explanation)
                VALUES (?, ?, ?, ?)
            `, [uuidv4(), product_id, newScore, JSON.stringify({ signal_type: type, modifier, source, previous_score: currentScore })]);

            eventBus.emitEvent(EVENT_TYPES.TRUST_SCORE_UPDATED, {
                product_id, score: newScore, source: 'signal_pipeline', signal_type: type
            });
        }

        return { applied: true, type, previous_score: currentScore, new_score: newScore, modifier };
    }

    // ═══════════════════════════════════════════════════════════════
    // v2.0: TRUST DASHBOARD
    // ═══════════════════════════════════════════════════════════════

    /**
     * Get comprehensive trust dashboard for an org
     */
    async getDashboard(orgId) {
        const orgTrust = await this.calculateOrgTrust(orgId);

        // Recent trust changes (products with biggest score changes in last 7d)
        const recentChanges = await db.all(`
            SELECT ts.product_id, p.name as product_name,
                   ts.score as current_score,
                   LAG(ts.score) OVER (PARTITION BY ts.product_id ORDER BY ts.calculated_at) as previous_score
            FROM trust_scores ts
            JOIN products p ON p.id = ts.product_id
            WHERE p.org_id = ? AND ts.calculated_at > NOW() - INTERVAL '7 days'
            ORDER BY ts.calculated_at DESC
            LIMIT 20
        `, [orgId]);

        const significantChanges = recentChanges
            .filter(c => c.previous_score != null && Math.abs(c.current_score - c.previous_score) >= 5)
            .map(c => ({
                product_id: c.product_id,
                product_name: c.product_name,
                change: c.current_score - c.previous_score,
                current: c.current_score,
            }));

        // Low-trust products needing attention
        const atRisk = await db.all(`
            SELECT id, name, trust_score, status
            FROM products
            WHERE org_id = ? AND trust_score IS NOT NULL AND trust_score < 60
            ORDER BY trust_score ASC
            LIMIT 10
        `, [orgId]);

        return {
            org_trust: orgTrust,
            recent_changes: significantChanges,
            at_risk_products: atRisk,
            generated_at: new Date().toISOString(),
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // EXISTING FACTOR CALCULATIONS (unchanged)
    // ═══════════════════════════════════════════════════════════════

    async calculateConsistency(productId) {
        const scans = await db.all(`
            SELECT result, COUNT(*) as count
            FROM scan_events
            WHERE product_id = ? AND scanned_at > NOW() - INTERVAL '30 days'
            GROUP BY result
        `, [productId]);
        if (scans.length === 0) return 0.9;
        const total = scans.reduce((s, r) => s + r.count, 0);
        const valid = scans.find(s => s.result === 'valid');
        return total > 0 ? (valid ? valid.count : 0) / total : 0.9;
    }

    async calculateCompliance(productId) {
        const product = await db.get('SELECT * FROM products WHERE id = ?', [productId]);
        if (!product) return 0;
        const fields = ['name', 'sku', 'manufacturer', 'batch_number', 'origin_country', 'category'];
        const filledFields = fields.filter(f => product[f] && product[f].trim() !== ' LIMIT 1000');
        let compliance = filledFields.length / fields.length;
        if (product.status === 'active') compliance = Math.min(1, compliance + 0.1);
        return compliance;
    }

    async calculateHistory(productId) {
        const recent = await db.get(`
            SELECT COUNT(*) as count,
                   COALESCE(SUM(CASE WHEN severity = 'critical' THEN 3 WHEN severity = 'high' THEN 2 ELSE 1 END), 0) as weighted
            FROM fraud_alerts WHERE product_id = ? AND created_at > NOW() - INTERVAL '30 days'
        `, [productId]);
        const medium = await db.get(`
            SELECT COUNT(*) as count,
                   COALESCE(SUM(CASE WHEN severity = 'critical' THEN 3 WHEN severity = 'high' THEN 2 ELSE 1 END), 0) as weighted
            FROM fraud_alerts WHERE product_id = ? AND created_at BETWEEN NOW() - INTERVAL '180 days' AND NOW() - INTERVAL '30 days'
        `, [productId]);
        const lifetime = await db.get(`
            SELECT COUNT(*) as count,
                   COALESCE(SUM(CASE WHEN severity = 'critical' THEN 3 WHEN severity = 'high' THEN 2 ELSE 1 END), 0) as weighted
            FROM fraud_alerts WHERE product_id = ? AND created_at < NOW() - INTERVAL '180 days'
        `, [productId]);

        const totalCount = (recent?.count || 0) + (medium?.count || 0) + (lifetime?.count || 0);
        if (totalCount === 0) return 1.0;
        const decayedScore = (recent?.weighted || 0) * 1.0 + (medium?.weighted || 0) * 0.5 + (lifetime?.weighted || 0) * 0.2;
        const penalty = Math.min(0.8, decayedScore * 0.04);
        return Math.max(0.2, 1 - penalty);
    }

    getGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    }

    getHistory(productId, limit = 20) {
        return db.all(`
            SELECT * FROM trust_scores WHERE product_id = ? ORDER BY calculated_at DESC LIMIT ?
        `, [productId, limit]);
    }
}

module.exports = new TrustEngine();
