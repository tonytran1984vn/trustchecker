/**
 * TrustChecker Trust Score Engine
 * Dynamic, explainable trust scoring based on multi-factor analysis
 * TrustScore = f(fraud_probability, scan_consistency, supply_chain_compliance, historical_anomaly)
 */

const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { eventBus, EVENT_TYPES } = require('../events');

class TrustEngine {
    constructor() {
        // Factor weights
        this.WEIGHTS = {
            fraud: 0.35,
            consistency: 0.25,
            compliance: 0.20,
            history: 0.20
        };
    }

    /**
     * Calculate trust score for a product after a scan event
     * @param {string} productId
     * @param {number} fraudScore - from fraud engine (0-1, higher = more fraud)
     * @returns {{ score: number, factors: object, explanation: object }}
     */
    calculate(productId, fraudScore = 0) {
        const factors = {};

        // Factor 1: Fraud probability (inverse - lower fraud = higher trust)
        factors.fraud = Math.max(0, 1 - fraudScore);

        // Factor 2: Scan consistency
        factors.consistency = this.calculateConsistency(productId);

        // Factor 3: Supply chain compliance
        factors.compliance = this.calculateCompliance(productId);

        // Factor 4: Historical anomaly
        factors.history = this.calculateHistory(productId);

        // Weighted score (0-100)
        const rawScore = (
            factors.fraud * this.WEIGHTS.fraud +
            factors.consistency * this.WEIGHTS.consistency +
            factors.compliance * this.WEIGHTS.compliance +
            factors.history * this.WEIGHTS.history
        );

        const score = Math.round(rawScore * 100);

        const explanation = {
            fraud_factor: {
                value: (factors.fraud * 100).toFixed(1),
                weight: this.WEIGHTS.fraud,
                description: factors.fraud > 0.8
                    ? 'No fraud signals detected'
                    : factors.fraud > 0.5
                        ? 'Minor fraud indicators present'
                        : 'Significant fraud risk detected'
            },
            consistency_factor: {
                value: (factors.consistency * 100).toFixed(1),
                weight: this.WEIGHTS.consistency,
                description: factors.consistency > 0.8
                    ? 'Scan patterns are consistent'
                    : 'Irregular scan patterns detected'
            },
            compliance_factor: {
                value: (factors.compliance * 100).toFixed(1),
                weight: this.WEIGHTS.compliance,
                description: factors.compliance > 0.8
                    ? 'Product data is complete and compliant'
                    : 'Missing compliance data'
            },
            history_factor: {
                value: (factors.history * 100).toFixed(1),
                weight: this.WEIGHTS.history,
                description: factors.history > 0.8
                    ? 'Clean historical record'
                    : 'Historical anomalies found'
            }
        };

        // Save trust score record
        const scoreId = uuidv4();
        db.prepare(`
      INSERT INTO trust_scores (id, product_id, score, fraud_factor, consistency_factor, compliance_factor, history_factor, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            scoreId, productId, score,
            factors.fraud, factors.consistency, factors.compliance, factors.history,
            JSON.stringify(explanation)
        );

        // Update product trust score
        db.prepare('UPDATE products SET trust_score = ?, updated_at = datetime("now") WHERE id = ?')
            .run(score, productId);

        // Broadcast
        eventBus.emitEvent(EVENT_TYPES.TRUST_SCORE_UPDATED, {
            product_id: productId,
            score,
            factors,
            grade: this.getGrade(score)
        });

        return { score, factors, explanation, grade: this.getGrade(score) };
    }

    /** Calculate scan consistency factor */
    calculateConsistency(productId) {
        const scans = db.prepare(`
      SELECT result, COUNT(*) as count 
      FROM scan_events 
      WHERE product_id = ? AND scanned_at > datetime('now', '-30 days')
      GROUP BY result
    `).all(productId);

        if (scans.length === 0) return 0.9; // New product, default high

        const total = scans.reduce((s, r) => s + r.count, 0);
        const valid = scans.find(s => s.result === 'valid');
        const validCount = valid ? valid.count : 0;

        return total > 0 ? validCount / total : 0.9;
    }

    /** Calculate supply chain compliance factor */
    calculateCompliance(productId) {
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
        if (!product) return 0;

        let compliance = 0;
        const fields = ['name', 'sku', 'manufacturer', 'batch_number', 'origin_country', 'category'];
        const filledFields = fields.filter(f => product[f] && product[f].trim() !== '');
        compliance = filledFields.length / fields.length;

        // Bonus for active status
        if (product.status === 'active') compliance = Math.min(1, compliance + 0.1);

        return compliance;
    }

    /** Calculate historical anomaly factor */
    calculateHistory(productId) {
        // Count fraud alerts in last 90 days
        const alerts = db.prepare(`
      SELECT COUNT(*) as count, 
             SUM(CASE WHEN severity = 'critical' THEN 3 WHEN severity = 'high' THEN 2 ELSE 1 END) as weighted
      FROM fraud_alerts
      WHERE product_id = ? AND created_at > datetime('now', '-90 days')
    `).get(productId);

        if (!alerts || alerts.count === 0) return 1.0; // Clean history

        // Penalize based on weighted severity
        const penalty = Math.min(1, (alerts.weighted || 0) * 0.05);
        return Math.max(0, 1 - penalty);
    }

    /** Get letter grade from score */
    getGrade(score) {
        if (score >= 90) return 'A+';
        if (score >= 80) return 'A';
        if (score >= 70) return 'B';
        if (score >= 60) return 'C';
        if (score >= 50) return 'D';
        return 'F';
    }

    /** Get trust score history for a product */
    getHistory(productId, limit = 20) {
        return db.prepare(`
      SELECT * FROM trust_scores
      WHERE product_id = ?
      ORDER BY calculated_at DESC
      LIMIT ?
    `).all(productId, limit);
    }
}

module.exports = new TrustEngine();
