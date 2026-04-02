const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const logger = require('../lib/logger');
const { promotionEngine } = require('../engines/platform-ops-engine/promotion-engine');
const { governanceEngine } = require('../engines/platform-ops-engine/governance-engine');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);
// Enforce strict Super Admin isolation for predictive control plane
router.use((req, res, next) => {
    if (req.user?.role !== 'super_admin' && req.user?.user_type !== 'platform') {
        return res.status(403).json({ error: 'Institutional access denied. Requires super_admin privilege.' });
    }
    next();
});

// ─── CANARY & KILL SWITCH ──────────────────────────────────────────
router.get('/canary/status', async (req, res) => {
    try {
        const state = promotionEngine.getGovernanceState();
        res.json({
            mode: state.mode,
            kill_switch_engaged: state.kill_switch_engaged,
            active_model: state.active_model_id,
            canary_model: state.canary_model_id,
            total_traffic: 100,
            canary_percentage: state.mode === 'CANARY' ? 5 : 0,
        });
    } catch (e) {
        logger.error('[OpsIntel] Canary Status Error:', e);
        res.status(500).json({ error: 'Failed to retrieve canary state' });
    }
});

router.post('/canary/kill-switch', async (req, res) => {
    try {
        const result = await promotionEngine.engageKillSwitch(
            req.user.id,
            req.body.reason || 'Emergency manual override'
        );
        res.json({ success: true, message: 'Kill Switch Engaged', state: result });
    } catch (e) {
        logger.error('[OpsIntel] Canary Kill Switch Error:', e);
        res.status(500).json({ error: 'Failed to engage kill switch' });
    }
});

// ─── ACTION PROPOSALS ──────────────────────────────────────────────
router.get('/proposals', async (req, res) => {
    try {
        const proposals = await db.all(
            `SELECT id, action, target, root_cause, confidence, status, risk_tier, created_at, expires_at 
             FROM action_proposals 
             ORDER BY created_at DESC LIMIT 50`
        );
        res.json({ proposals });
    } catch (e) {
        logger.error('[OpsIntel] Proposals Fetch Error:', e);
        res.status(500).json({ error: 'Failed to fetch action proposals' });
    }
});

router.post('/proposals/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await governanceEngine.approveAction(id, req.user.id);
        res.json(result);
    } catch (e) {
        logger.error('[OpsIntel] Proposal Approve Error:', e);
        res.status(400).json({ error: e.message || 'Failed to approve action' });
    }
});

router.post('/proposals/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        // Move to rejected safely without action executor
        await db.run(`UPDATE action_proposals SET status = 'REJECTED' WHERE id = $1 AND status = 'PENDING'`, [id]);
        res.json({ success: true, status: 'REJECTED' });
    } catch (e) {
        logger.error('[OpsIntel] Proposal Reject Error:', e);
        res.status(400).json({ error: 'Failed to reject action' });
    }
});

// ─── REPLAY DIFF LAB ───────────────────────────────────────────────
router.get('/diffs', async (req, res) => {
    try {
        const diffs = await db.all(
            `SELECT id, run_id, ts, metric_name, event_type, diff_type, score_delta, created_at
             FROM replay_diff_results
             ORDER BY created_at DESC LIMIT 50`
        );
        // Stats
        const stats = await db.all(`SELECT diff_type, COUNT(*) as count FROM replay_diff_results GROUP BY diff_type`);
        res.json({ diffs, stats });
    } catch (e) {
        logger.error('[OpsIntel] Diff Lab Fetch Error:', e);
        res.status(500).json({ error: 'Failed to fetch diffs' });
    }
});

// ─── CAUSAL GRAPH (L5) ─────────────────────────────────────────────
router.get('/causal-graph', async (req, res) => {
    try {
        const edges = await db.all(
            `SELECT source_metric, target_metric, weight, confidence_score, temporal_lag_ms
             FROM causal_graph_weights
             WHERE weight > 0.3
             ORDER BY weight DESC LIMIT 100`
        );
        // Map to nodes and edges
        const nodes = new Map();
        const outputEdges = [];
        for (const edge of edges) {
            nodes.set(edge.source_metric, { id: edge.source_metric, label: edge.source_metric });
            nodes.set(edge.target_metric, { id: edge.target_metric, label: edge.target_metric });
            outputEdges.push({
                source: edge.source_metric,
                target: edge.target_metric,
                weight: edge.weight,
                confidence: edge.confidence_score,
                lag_ms: edge.temporal_lag_ms,
            });
        }
        res.json({ nodes: Array.from(nodes.values()), edges: outputEdges });
    } catch (e) {
        logger.error('[OpsIntel] Causal Graph Fetch Error:', e);
        res.status(500).json({ error: 'Failed to fetch causal graph' });
    }
});

// ─── POLICY LEARNING & MAB STATS (L5.2) ────────────────────────────
router.get('/policy-stats', async (req, res) => {
    try {
        const stats = await db.all(
            `SELECT id, policy_id, sample_size, success_rate, failure_rate, ema_resolution_time_ms, last_cluster_size, updated_at
             FROM policy_learning_stats
             ORDER BY updated_at DESC`
        );
        res.json({ stats });
    } catch (e) {
        logger.error('[OpsIntel] Policy Stats Fetch Error:', e);
        res.status(500).json({ error: 'Failed to fetch policy stats' });
    }
});

module.exports = router;
