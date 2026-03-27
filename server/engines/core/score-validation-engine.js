/**
 * Score Validation Engine v1.0
 * Tracks trust score accuracy against real-world outcomes
 * Enables: precision/recall metrics, accuracy tracking, score calibration
 */
const db = require('../../db');

class ScoreValidationEngine {
    /**
     * Record a score prediction for later validation
     */
    async recordPrediction(orgId, entityType, entityId, predictedScore, riskLevel) {
        const result = await db.all(
            'INSERT INTO score_validations (org_id, entity_type, entity_id, predicted_score, predicted_risk_level) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [orgId, entityType, entityId, predictedScore, riskLevel]
        );
        return result[0];
    }

    /**
     * Validate a prediction against actual outcome
     */
    async validateOutcome(validationId, actualOutcome, validatorId) {
        const outcomeScore = this._outcomeToScore(actualOutcome);
        const result = await db.all(
            'UPDATE score_validations SET actual_outcome = $1, outcome_date = NOW(), validation_status = $2, accuracy_delta = ABS(predicted_score - $3), validated_at = NOW(), validator_id = $4 WHERE id = $5 RETURNING *',
            [actualOutcome, 'validated', outcomeScore, validatorId, validationId]
        );
        return result[0];
    }

    /**
     * Auto-validate: when an incident occurs, find matching predictions
     */
    async autoValidateFromIncident(orgId, entityType, entityId) {
        const result = await db.all(
            'UPDATE score_validations SET actual_outcome = $1, outcome_date = NOW(), validation_status = $2, accuracy_delta = ABS(predicted_score - 0.0) WHERE org_id = $3 AND entity_type = $4 AND entity_id = $5 AND validation_status = $6 RETURNING id',
            ['incident', 'validated', orgId, entityType, entityId, 'pending']
        );
        return result;
    }

    /**
     * Get accuracy metrics for an org
     */
    async getAccuracyMetrics(orgId) {
        // Compute aggregation directly since we don't use the SQL view in PostgreSQL
        const result = await db.all(
            `
            SELECT 
                entity_type,
                COUNT(*) as total_validations,
                SUM(CASE WHEN validation_status = 'validated' THEN 1 ELSE 0 END) as validated_count,
                AVG(accuracy_delta) as avg_accuracy_delta,
                SUM(CASE WHEN validation_status = 'validated' AND accuracy_delta < 0.2 THEN 1 ELSE 0 END) as true_positives,
                SUM(CASE WHEN validation_status = 'validated' AND accuracy_delta >= 0.2 THEN 1 ELSE 0 END) as false_positives,
                0 as false_negatives,
                0 as true_negatives
            FROM score_validations
            WHERE org_id = $1
            GROUP BY entity_type
        `,
            [orgId]
        );

        const metrics = result;

        // Calculate precision, recall, F1 per entity type
        return metrics.map(function (m) {
            const tp = parseInt(m.true_positives) || 0;
            const fp = parseInt(m.false_positives) || 0;
            const fn = parseInt(m.false_negatives) || 0;
            const tn = parseInt(m.true_negatives) || 0;
            const precision = tp + fp > 0 ? tp / (tp + fp) : null;
            const recall = tp + fn > 0 ? tp / (tp + fn) : null;
            const f1 = precision && recall ? (2 * (precision * recall)) / (precision + recall) : null;
            return {
                entity_type: m.entity_type,
                total_validations: parseInt(m.total_validations),
                validated_count: parseInt(m.validated_count),
                avg_accuracy_delta: parseFloat(m.avg_accuracy_delta) || null,
                precision: precision,
                recall: recall,
                f1_score: f1,
                true_positives: tp,
                true_negatives: tn,
                false_positives: fp,
                false_negatives: fn,
            };
        });
    }

    /**
     * Get pending validations
     */
    async getPendingValidations(orgId, limit) {
        limit = limit || 50;
        const result = await db.all(
            'SELECT sv.*, EXTRACT(EPOCH FROM (NOW() - sv.created_at))/86400 as days_pending FROM score_validations sv WHERE sv.org_id = $1 AND sv.validation_status = $2 ORDER BY sv.created_at DESC LIMIT $3',
            [orgId, 'pending', limit]
        );
        return result;
    }

    _outcomeToScore(outcome) {
        const scores = {
            incident: 0.0,
            fraud: 0.0,
            non_compliant: 0.2,
            warning: 0.4,
            compliant: 0.8,
            no_incident: 1.0,
        };
        return scores[outcome] !== undefined ? scores[outcome] : 0.5;
    }
}

module.exports = new ScoreValidationEngine();
