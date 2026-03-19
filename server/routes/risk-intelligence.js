/**
 * Risk Intelligence API Routes — V21.6
 * 
 * Exposes Risk Engine V20-V21.6 functions as REST endpoints.
 * Auth: JWT (authMiddleware) OR API key (apiKeyAuth)
 * 
 * Endpoints:
 *   /api/risk-intel/trust/*     — Trust network & contract
 *   /api/risk-intel/org/*       — Org credibility & incentives
 *   /api/risk-intel/network/*   — Network confidence & conflicts
 *   /api/risk-intel/insight/*   — Network insights (cross-org, geo, shared)
 *   /api/risk-intel/roi/*       — ROI dashboard
 *   /api/risk-intel/market/*    — Market intelligence
 */

const express = require('express');
const db = require('../db');

const R = require('../services/risk-scoring-engine');

const router = express.Router();

// ─── Auth: direct DB API key lookup OR fallback to JWT ───
const crypto = require('crypto');
let authMw;
try { authMw = require('../auth').authMiddleware; } catch(e) { authMw = (req, res, next) => next(); }

async function riskIntelAuth(req, res, next) {
    // Check API key first
    const apiKey = req.headers['x-api-key']
        || (req.headers.authorization && req.headers.authorization.startsWith('ApiKey ')
            ? req.headers.authorization.slice(7) : null);

    if (apiKey) {
        try {
            const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
            const row = await db.get(
                `SELECT ak.org_id, ak.name, ak.scopes, o.name as org_name
                 FROM api_keys ak JOIN organizations o ON o.id = ak.org_id::text
                 WHERE ak.key_hash = $1 AND ak.revoked = false`, [hash]
            );
            if (row) {
                req.user = { id: 'api-key', org_id: row.org_id, role: 'api_key', api_key_name: row.name };
                req.orgId = row.org_id;
                db.run('UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1', [hash]).catch(() => {});
                return next();
            }
        } catch(e) { console.error('[risk-intel-auth]', e.message); }
        return res.status(401).json({ error: 'Invalid API key' });
    }

    // Fallback to JWT
    return authMw(req, res, next);
}

router.use(riskIntelAuth);

// Helper: get org from request
function getOrg(req) {
    return req.orgId || req.user?.org_id || req.apiOrg?.org_id || 'unknown';
}

// ═══════════════════════════════════════════════════════════════
// TRUST ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// POST /trust/share — Share trust data to network
router.post('/trust/share', async (req, res) => {
    try {
        const { actor_id, trust_score, metadata } = req.body;
        if (!actor_id || trust_score === undefined) {
            return res.status(400).json({ error: 'actor_id and trust_score required' });
        }
        const orgId = getOrg(req);
        
        // Engine in-memory
        const result = R.trustNetworkShare(orgId, actor_id, trust_score);
        
        // Persist to DB
        await db.run(
            `INSERT INTO trust_network_data (org_id, actor_id, trust_score, metadata) VALUES ($1, $2, $3, $4)`,
            [orgId, actor_id, trust_score, JSON.stringify(metadata || {})]
        );
        
        res.json({ success: true, ...result });
    } catch (err) {
        console.error('Trust share error:', err.message);
        res.status(500).json({ error: 'Failed to share trust data' });
    }
});

// GET /trust/query/:actorId — Query trust network for an actor
router.get('/trust/query/:actorId', async (req, res) => {
    try {
        const result = R.trustNetworkQuery(req.params.actorId);
        
        // Also check DB for persisted data
        const dbData = await db.all(
            `SELECT org_id, trust_score, created_at FROM trust_network_data WHERE actor_id = $1 ORDER BY created_at DESC LIMIT 20`,
            [req.params.actorId]
        );
        
        res.json({ ...result, persisted_records: dbData.length, history: dbData });
    } catch (err) {
        res.status(500).json({ error: 'Failed to query trust network' });
    }
});

// GET /trust/platform/:actorId — Credibility-weighted platform trust score
router.get('/trust/platform/:actorId', async (req, res) => {
    try {
        const score = req.query.local_score ? parseFloat(req.query.local_score) : 50;
        const result = R.platformTrustScore(req.params.actorId, score);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get platform trust score' });
    }
});

// GET /trust/contract — Get trust contract for a decision
router.get('/trust/contract', (req, res) => {
    try {
        const score = parseFloat(req.query.score || 50);
        const decision = req.query.decision || 'suspicious';
        const category = req.query.category || 'default';
        const result = R.trustContract(score, decision, category);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get trust contract' });
    }
});

// GET /trust/api-standard/:actorId — Full interoperable API output
router.get('/trust/api-standard/:actorId', (req, res) => {
    try {
        const score = parseFloat(req.query.score || 50);
        const decision = req.query.decision || 'suspicious';
        const category = req.query.category || 'default';
        const result = R.trustApiStandard(score, decision, category, req.params.actorId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get API standard output' });
    }
});

// ═══════════════════════════════════════════════════════════════
// ORG ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// POST /org/credibility — Report org credibility
router.post('/org/credibility', async (req, res) => {
    try {
        const orgId = req.body.org_id || getOrg(req);
        const { accurate, agreed } = req.body;
        
        const result = R.orgCredibility(orgId, accurate !== false, agreed !== false);
        
        // Persist
        await db.run(
            `INSERT INTO org_credibility (org_id, total_reports, accurate, agreed, false_positives, credibility_score)
             VALUES ($1, 1, $2, $3, $4, $5)
             ON CONFLICT (org_id) DO UPDATE SET
                total_reports = org_credibility.total_reports + 1,
                accurate = CASE WHEN $2 = 1 THEN org_credibility.accurate + 1 ELSE org_credibility.accurate END,
                agreed = CASE WHEN $3 = 1 THEN org_credibility.agreed + 1 ELSE org_credibility.agreed END,
                credibility_score = $5,
                updated_at = NOW()`,
            [orgId, accurate !== false ? 1 : 0, agreed !== false ? 1 : 0, 0, result.credibility_score]
        );
        
        res.json(result);
    } catch (err) {
        console.error('Org credibility error:', err.message);
        res.status(500).json({ error: 'Failed to update org credibility' });
    }
});

// GET /org/credibility — List all org credibilities
router.get('/org/credibility', async (req, res) => {
    try {
        const inMemory = R.getOrgCredibility();
        const persisted = await db.all(
            `SELECT org_id, total_reports, accurate, agreed, false_positives, credibility_score, updated_at
             FROM org_credibility ORDER BY credibility_score DESC LIMIT 100`
        );
        res.json({ in_memory: inMemory, persisted, total: persisted.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get org credibility' });
    }
});

// GET /org/incentive — Cross-org incentive tiers
router.get('/org/incentive', (req, res) => {
    try {
        const result = R.crossOrgIncentive();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get incentive data' });
    }
});

// ═══════════════════════════════════════════════════════════════
// NETWORK ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// GET /network/confidence — Network confidence maturity
router.get('/network/confidence', (req, res) => {
    try {
        const result = R.networkConfidence();
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get network confidence' });
    }
});

// GET /network/conflict/:actorId — Conflict detection for an actor
router.get('/network/conflict/:actorId', (req, res) => {
    try {
        const result = R.conflictDetection(req.params.actorId);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to check conflict' });
    }
});

// ═══════════════════════════════════════════════════════════════
// INSIGHT ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// POST /insight/cross-org — Check cross-org alert for actor
router.post('/insight/cross-org', async (req, res) => {
    try {
        const { actor_id } = req.body;
        if (!actor_id) return res.status(400).json({ error: 'actor_id required' });
        
        const result = R.networkInsight('cross_org_alert', { actor_id });
        
        // Persist if found
        if (result.orgs >= 2) {
            await db.run(
                `INSERT INTO network_insights (type, actor_id, severity, data, org_id) VALUES ($1, $2, $3, $4, $5)`,
                ['cross_org_alert', actor_id, result.severity, JSON.stringify(result), getOrg(req)]
            );
        }
        
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to check cross-org alert' });
    }
});

// POST /insight/geo-anomaly — Check geographic anomaly
router.post('/insight/geo-anomaly', async (req, res) => {
    try {
        const { batch_id, locations, time_window_hours } = req.body;
        if (!batch_id || !locations) return res.status(400).json({ error: 'batch_id and locations required' });
        
        const result = R.networkInsight('geographic_anomaly', {
            batch_id, locations, time_window_hours: time_window_hours || 24
        });
        
        // Persist
        await db.run(
            `INSERT INTO network_insights (type, batch_id, severity, data, org_id) VALUES ($1, $2, $3, $4, $5)`,
            ['geographic_anomaly', batch_id, result.suspicious ? 'critical' : 'info', JSON.stringify(result), getOrg(req)]
        );
        
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to check geo anomaly' });
    }
});

// GET /insight/shared-actors — Detect actors across multiple orgs
router.get('/insight/shared-actors', (req, res) => {
    try {
        const result = R.networkInsight('shared_actor', {});
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get shared actors' });
    }
});

// GET /insights — All network insights (persisted)
router.get('/insights', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const insights = await db.all(
            `SELECT id, type, actor_id, batch_id, severity, data, org_id, created_at
             FROM network_insights ORDER BY created_at DESC LIMIT $1`,
            [limit]
        );
        const inMemory = R.getNetworkInsights();
        res.json({ persisted: insights, in_memory_count: inMemory.length, total: insights.length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get insights' });
    }
});

// ═══════════════════════════════════════════════════════════════
// ROI ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// POST /roi/record — Record a decision for ROI tracking
router.post('/roi/record', async (req, res) => {
    try {
        const { decision, value } = req.body;
        const result = R.roiDashboard('record', { decision, value: value || 100 });
        
        const orgId = getOrg(req);
        // Upsert ROI tracker
        const isBlock = decision === 'block' || decision === 'HARD_BLOCK';
        await db.run(
            `INSERT INTO roi_tracker (org_id, total_scans, fraud_detected, blocked_value, passed_value)
             VALUES ($1, 1, $2, $3, $4)
             ON CONFLICT (org_id) DO UPDATE SET
                total_scans = roi_tracker.total_scans + 1,
                fraud_detected = roi_tracker.fraud_detected + $2,
                blocked_value = roi_tracker.blocked_value + $3,
                passed_value = roi_tracker.passed_value + $4,
                updated_at = NOW()`,
            [orgId, isBlock ? 1 : 0, isBlock ? (value || 100) : 0, isBlock ? 0 : (value || 100)]
        );
        
        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ error: 'Failed to record ROI data' });
    }
});

// GET /roi/report — ROI dashboard report
router.get('/roi/report', async (req, res) => {
    try {
        const inMemory = R.roiDashboard('report');
        
        // Also get persistent data
        const orgId = getOrg(req);
        const dbData = await db.get(
            `SELECT total_scans, fraud_detected, blocked_value, passed_value, baseline_loss_rate FROM roi_tracker WHERE org_id = $1`,
            [orgId]
        );
        
        res.json({
            live: inMemory,
            persisted: dbData || { total_scans: 0, fraud_detected: 0, blocked_value: 0 },
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get ROI report' });
    }
});

// ═══════════════════════════════════════════════════════════════
// MARKET INTELLIGENCE ENDPOINTS
// ═══════════════════════════════════════════════════════════════

// POST /market/record — Record market data point
router.post('/market/record', async (req, res) => {
    try {
        const { region, category, risk_score, is_fraud } = req.body;
        if (!region) return res.status(400).json({ error: 'region required' });
        
        const result = R.marketIntelligence('record', { region, category, risk_score, is_fraud });
        
        // Persist
        await db.run(
            `INSERT INTO market_data (region, category, risk_score, is_fraud, org_id) VALUES ($1, $2, $3, $4, $5)`,
            [region, category || 'default', risk_score || 0, is_fraud || false, getOrg(req)]
        );
        
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: 'Failed to record market data' });
    }
});

// GET /market/report — Market intelligence report
router.get('/market/report', async (req, res) => {
    try {
        const inMemory = R.marketIntelligence('report');
        
        // Get persistent hotspots
        const hotspots = await db.all(
            `SELECT region, COUNT(*) as scans,
                    SUM(CASE WHEN is_fraud THEN 1 ELSE 0 END) as fraud_count,
                    ROUND(AVG(risk_score)::numeric, 1) as avg_risk
             FROM market_data
             GROUP BY region ORDER BY fraud_count DESC LIMIT 20`
        );
        
        res.json({
            live: inMemory,
            persisted_hotspots: hotspots,
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get market report' });
    }
});

// GET /status — Engine status overview
router.get('/status', (req, res) => {
    try {
        const awareness = R.systemSelfAwareness();
        const confidence = R.networkConfidence();
        const trust = R.getTrustNetwork();
        const cred = R.getOrgCredibility();
        
        res.json({
            engine_version: '21.6',
            protocol_version: '21.5',
            health: awareness,
            network: {
                confidence: confidence.confidence,
                maturity: confidence.maturity,
                trust_entries: trust.length,
                org_credibilities: Object.keys(cred).length,
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get status' });
    }
});

module.exports = router;
