const express = require('express');
const router = express.Router();
const riskMemoryEngine = require('../engines/crisis-module/risk-memory');
const policyEngine = require('../engines/infrastructure/policy-engine');
const rollbackEngine = require('../engines/infrastructure/rollback-engine');

// Fake auth middleware for V5 demo to set generic actor if missing
const ensureActor = (req, res, next) => {
    // Tự động mock Actor nếu chạy qua UI để POC
    if (!req.body.actor) {
        req.actor = { role: 'risk_chair', user_id: 'u-admin-1', org_id: 'GLOBAL' };
    } else {
        req.actor = req.body.actor;
    }
    next();
};

/**
 * 1. Timeline Viewer
 * GET /api/v5/observability/timeline/:scenario_hash
 */
router.get('/timeline/:scenario_hash', (req, res) => {
    const hash = req.params.scenario_hash;

    // Lấy toàn bộ stream và lọc
    const events = riskMemoryEngine.eventStream.filter(e => e.scenario_hash === hash);
    const pendingReqs = Array.from(policyEngine.approvalCache.values()).filter(
        req => req.target_params?.scenario_hash === hash
    );

    if (events.length === 0) {
        return res.status(404).json({ error: 'Scenario not found or no events' });
    }

    res.json({
        scenario_hash: hash,
        total_events: events.length,
        max_sequence: events[events.length - 1].sequence_no || 0,
        events: events.map(e => ({
            id: e.event_id,
            type: e.event_type,
            sequence: e.sequence_no,
            time: e.occurred_at,
            data: e.data,
        })),
        pending_approvals: pendingReqs,
    });
});

/**
 * 2. Diff Engine (So sánh State)
 * POST /api/v5/observability/diff
 * Body: { scenario_hash, until_sequence_no }
 */
router.post('/diff', ensureActor, (req, res) => {
    const { scenario_hash, until_sequence_no } = req.body;

    if (!scenario_hash || until_sequence_no === undefined) {
        return res.status(400).json({ error: 'Missing parameters' });
    }

    try {
        // Thực thi Rollback Dry-run (cơ chế này dựng Diff rất hoàn hảo)
        const dryRunResult = rollbackEngine.rollback(scenario_hash, 'dry-run', { until_sequence_no, actor: req.actor });

        // Trả về UI Data
        res.json({
            scenario_hash,
            target_sequence: until_sequence_no,
            metrics_diff: {
                events_dropped: dryRunResult.data?.rollback_summary?.total_rolled_back || 0,
                impact: 'Critical data removed from timeline',
                status: dryRunResult.success ? 'RECOVERABLE' : 'INVALID_OR_DENIED',
            },
            simulated_state: dryRunResult.data?.restored_state || {},
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * 3. Dry-run Simulate Trigger (or Actual Mutative Commit via Multi-sig)
 * POST /api/v5/observability/dry-run
 * Body: { scenario_hash, until_sequence_no, mode: 'dry-run' | 'commit' }
 */
router.post('/execute', ensureActor, (req, res) => {
    const { scenario_hash, until_sequence_no, mode } = req.body;
    const executeMode = mode === 'commit' ? 'commit' : 'dry-run';

    try {
        // policyEngine + rollbackEngine sẽ xử lý multi-sig
        const rbResult = rollbackEngine.rollback(scenario_hash, executeMode, {
            until_sequence_no: parseInt(until_sequence_no, 10),
            actor: req.actor,
        });

        res.json(rbResult);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

/**
 * 4. Sign Pending Request
 * POST /api/v5/observability/sign
 */
router.post('/sign', ensureActor, (req, res) => {
    const { request_id } = req.body;

    try {
        const result = policyEngine.grantApproval(req.actor, request_id);
        res.json(result);
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;
