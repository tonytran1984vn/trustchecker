/**
 * Score Validation API v1.0
 * GET  /api/score-validation/metrics     — accuracy metrics
 * GET  /api/score-validation/pending      — pending validations
 * POST /api/score-validation/record       — record a prediction
 * POST /api/score-validation/:id/validate — validate outcome
 */
const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../auth");
const engine = require("../engines/core/score-validation-engine");

router.use(authMiddleware);

router.get("/metrics", async function(req, res) {
    try {
        var metrics = await engine.getAccuracyMetrics(req.user.org_id);
        res.json({ metrics: metrics, timestamp: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ error: "Failed to load metrics" });
    }
});

router.get("/pending", async function(req, res) {
    try {
        var pending = await engine.getPendingValidations(req.user.org_id, parseInt(req.query.limit) || 50);
        res.json({ validations: pending, count: pending.length });
    } catch (err) {
        res.status(500).json({ error: "Failed to load pending validations" });
    }
});

router.post("/record", async function(req, res) {
    try {
        var body = req.body;
        if (!body.entity_type || !body.entity_id || body.predicted_score === undefined) {
            return res.status(400).json({ error: "entity_type, entity_id, predicted_score required" });
        }
        var result = await engine.recordPrediction(req.user.org_id, body.entity_type, body.entity_id, body.predicted_score, body.risk_level);
        res.json({ id: result.id, status: "recorded" });
    } catch (err) {
        res.status(500).json({ error: "Failed to record prediction" });
    }
});

router.post("/:id/validate", async function(req, res) {
    try {
        var body = req.body;
        if (!body.actual_outcome) {
            return res.status(400).json({ error: "actual_outcome required (incident|no_incident|fraud|compliant)" });
        }
        var result = await engine.validateOutcome(req.params.id, body.actual_outcome, req.user.id);
        if (!result) return res.status(404).json({ error: "Validation not found" });
        res.json({ validation: result, status: "validated" });
    } catch (err) {
        res.status(500).json({ error: "Failed to validate" });
    }
});

module.exports = router;
