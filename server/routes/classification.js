const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const classificationService = require('../services/classification-service');
const policyEngine = require('../engines/policy-engine');

// Middleware to mock current user context since we don't have auth middleware here explicitly via 'req.user' in this snippet
const mockAuth = (req, res, next) => {
    req.user = req.user || { id: 'admin1', orgId: 'org1', role: 'admin' };
    next();
};

router.use(mockAuth);

/**
 * ─── SCHEMA MANAGEMENT ──────────────────────────────────────────
 */
router.post('/schemas', async (req, res) => {
    try {
        const { name } = req.body;
        const schema = await prisma.classificationSchema.create({
            data: {
                orgId: req.user.orgId,
                name: name,
            },
        });
        res.json(schema);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/labels', async (req, res) => {
    try {
        const { schema_id, name, code, risk_level, color, description } = req.body;
        const label = await prisma.classificationLabel.create({
            data: {
                schemaId: schema_id,
                name,
                code,
                riskLevel: risk_level,
                color,
                description,
            },
        });
        res.json(label);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * ─── ASSET CLASSIFICATION ──────────────────────────────────────────
 */

// Batch Evaluate (Internal/System Trigger)
router.post('/batch-evaluate', async (req, res) => {
    try {
        const { items } = req.body; // [{ dataAssetId, payload }]
        const results = [];

        for (const item of items) {
            const labels = await classificationService.evaluateAndTagAsset(
                item.dataAssetId,
                req.user.orgId,
                item.payload,
                'system'
            );
            results.push({ dataAssetId: item.dataAssetId, labels });
        }
        res.json({ success: true, evaluatedCount: items.length, results });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Manual Classify
router.post('/data/:id/classify', async (req, res) => {
    try {
        const { label_ids } = req.body;
        const assetId = req.params.id;

        await classificationService.manualTagAsset(assetId, req.user.orgId, label_ids, req.user.id);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * ─── POLICY SIMULATION ──────────────────────────────────────────
 */
router.post('/policy/simulate', async (req, res) => {
    try {
        const { actor, data_labels, action } = req.body;

        const decision = await policyEngine.evaluatePolicy({
            actor: actor || req.user,
            dataLabels: data_labels,
            action: action || 'access',
            orgId: req.user.orgId,
        });

        res.json({ decision });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
