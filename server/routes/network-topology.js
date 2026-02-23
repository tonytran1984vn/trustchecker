/**
 * Network Topology Routes v2.0 — Constitutional Enforcement
 * Validator Network Management + Consensus + Peer Discovery
 * Endpoints: 12 | Mount: /api/network
 * 
 * CONSTITUTIONAL: Validator admission, suspension, and slashing
 * require multi-party approval via requireConstitutional + dual-key
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission } = require('../auth');
const network = require('../engines/network-topology-engine');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════════
// Constitutional enforcement + audit logging (shared with infra-maturity)
// ═══════════════════════════════════════════════════════════════════

function logConstitutionalAction(req, action, result) {
    const entry = {
        timestamp: new Date().toISOString(),
        action,
        user_id: req.user?.id || 'unknown',
        role: req.user?.role || 'unknown',
        ip: req.ip || 'unknown',
        allowed: result.allowed || false,
        reason: result.reason || null,
        charter: result.charter || null,
    };
    console.log(`[CONSTITUTIONAL-AUDIT] ${JSON.stringify(entry)}`);
    try {
        const db = require('../db');
        db.prepare(`INSERT INTO audit_log (id, action, actor_id, actor_role, resource_type, resource_id, details, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), `CONSTITUTIONAL:${action}`, entry.user_id, entry.role, 'constitutional_enforcement', action,
                JSON.stringify({ allowed: entry.allowed, reason: entry.reason, charter: entry.charter }), entry.ip, entry.timestamp);
    } catch (e) { /* fallback to console */ }
}

function requireConstitutionalWithAudit(action) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });
        const constitutionalRBAC = require('../engines/constitutional-rbac-engine');
        const result = constitutionalRBAC.enforce(req.user.role, action);
        logConstitutionalAction(req, action, result);
        if (!result.allowed) {
            return res.status(403).json({
                error: 'Constitutional constraint violation',
                code: 'CONSTITUTIONAL_BLOCK',
                action, role: req.user.role,
                reason: result.reason, charter: result.charter, article: result.article,
                separation: result.separation || null, immutable: result.immutable || false,
            });
        }
        req._constitutional = result;
        next();
    };
}

function requireMultiPartyApproval(action, requiredRoles) {
    return (req, res, next) => {
        const secondApprover = req.headers['x-second-approver'];
        const secondRole = req.headers['x-second-approver-role'];

        if (!secondApprover || !secondRole) {
            logConstitutionalAction(req, action, { allowed: false, reason: `Multi-party required: ${requiredRoles.join(' + ')}` });
            return res.status(403).json({
                error: 'Multi-party authorization required',
                code: 'MULTI_PARTY_REQUIRED',
                action,
                required_roles: requiredRoles,
                instruction: 'Provide x-second-approver (user_id) and x-second-approver-role headers',
            });
        }

        if (secondApprover === req.user?.id) {
            return res.status(403).json({ error: 'Self-approval not allowed', code: 'SELF_APPROVAL_REJECT' });
        }

        if (!requiredRoles.includes(secondRole)) {
            return res.status(403).json({
                error: `Second approver role "${secondRole}" not in required: ${requiredRoles.join(', ')}`,
                code: 'ROLE_MISMATCH',
            });
        }

        logConstitutionalAction(req, `${action}:multi_party_passed`, { allowed: true, reason: `${req.user.role} + ${secondRole}` });
        req._multi_party = { first: req.user.id, second: secondApprover, first_role: req.user.role, second_role: secondRole };
        next();
    };
}

// ═══════════════════════════════════════════════════════════════════
// READ ENDPOINTS — no constitutional enforcement needed
// ═══════════════════════════════════════════════════════════════════

router.get('/topology', (req, res) => { res.json(network.getTopology()); });
router.get('/health', (req, res) => { res.json(network.getNetworkHealth()); });
router.get('/nodes', (req, res) => {
    const { type, region, status } = req.query;
    res.json({ nodes: network.getNodes({ type, region, status }) });
});
router.get('/nodes/:id', (req, res) => {
    const node = network.getNode(req.params.id);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    res.json(node);
});
router.get('/nodes/:id/peers', (req, res) => {
    const result = network.discoverPeers(req.params.id);
    if (result.error) return res.status(404).json(result);
    res.json(result);
});
router.get('/consensus/history', (req, res) => {
    res.json({ rounds: network.getConsensusHistory(parseInt(req.query.limit) || 20) });
});
router.get('/config', (req, res) => {
    res.json({ node_types: network.getNodeTypes(), regions: network.getRegions(), consensus: network.getConsensusParams() });
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION: Register node → Constitutional (GGC only) + multi-party
// ═══════════════════════════════════════════════════════════════════

router.post('/nodes',
    requireConstitutionalWithAudit('network.validator.admit'),
    requireMultiPartyApproval('network.validator.admit', ['ggc_member']),
    (req, res) => {
        const result = network.registerNode({
            ...req.body,
            operator_id: req.user?.id || 'unknown',
            approved_by: req._multi_party,
        });
        if (result.error) return res.status(400).json(result);
        res.status(201).json(result);
    }
);

// MUTATION: Activate node → Constitutional (GGC only)
router.post('/nodes/:id/activate',
    requireConstitutionalWithAudit('network.validator.admit'),
    (req, res) => {
        const result = network.activateNode(req.params.id);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    }
);

// Heartbeat — automated, no constitutional check needed
router.post('/nodes/:id/heartbeat', (req, res) => {
    const result = network.heartbeat(req.params.id, req.body);
    if (result.error) return res.status(404).json(result);
    res.json(result);
});

// MUTATION: Suspend node → Constitutional + dual-key (risk + ggc)
router.post('/nodes/:id/suspend',
    requireConstitutionalWithAudit('network.validator.suspend'),
    requireMultiPartyApproval('network.validator.suspend', ['risk_committee', 'ggc_member']),
    (req, res) => {
        const result = network.suspendNode(req.params.id, req.body.reason || 'Constitutional action', req._multi_party);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    }
);

// MUTATION: Run consensus → read from constitutional (view only, system-initiated)
router.post('/consensus',
    requireConstitutionalWithAudit('network.consensus.view'),
    (req, res) => {
        const result = network.runConsensusRound({
            ...req.body,
            initiator: req.user?.id || 'system',
        });
        if (result.error) return res.status(400).json(result);
        res.status(201).json(result);
    }
);

module.exports = router;
