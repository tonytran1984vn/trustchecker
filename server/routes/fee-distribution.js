/**
 * Fee Distribution Routes v2.0 — Constitutional Enforcement
 * Validator Incentives + Partner Revenue Sharing + Payouts
 * Endpoints: 8 | Mount: /api/distribution
 * 
 * CONSTITUTIONAL: Payouts and distributions require dual-key treasury enforcement
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission } = require('../auth');
const distribution = require('../engines/fee-distribution-engine');
const { v4: uuidv4 } = require('uuid');

router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════════
// Constitutional enforcement + audit (same pattern as infra-maturity)
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
    };
    console.log(`[CONSTITUTIONAL-AUDIT] ${JSON.stringify(entry)}`);
    try {
        const db = require('../db');
        db.prepare(`INSERT INTO audit_log (id, action, actor_id, actor_role, resource_type, resource_id, details, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(uuidv4(), `CONSTITUTIONAL:${action}`, entry.user_id, entry.role, 'constitutional_enforcement', action,
                JSON.stringify({ allowed: entry.allowed, reason: entry.reason }), entry.ip, entry.timestamp);
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
                error: 'Constitutional constraint violation', code: 'CONSTITUTIONAL_BLOCK',
                action, role: req.user.role, reason: result.reason,
                charter: result.charter, article: result.article,
            });
        }
        req._constitutional = result;
        next();
    };
}

function requireDualKey(action, requiredRoles) {
    return (req, res, next) => {
        const secondApprover = req.headers['x-second-approver'];
        const secondRole = req.headers['x-second-approver-role'];
        if (!secondApprover || !secondRole) {
            logConstitutionalAction(req, action, { allowed: false, reason: `Dual-key required: ${requiredRoles.join(' + ')}` });
            return res.status(403).json({
                error: 'Dual-key authorization required', code: 'DUAL_KEY_REQUIRED',
                action, required_roles: requiredRoles,
                instruction: 'Provide x-second-approver and x-second-approver-role headers',
            });
        }
        if (secondApprover === req.user?.id) {
            return res.status(403).json({ error: 'Self-approval not allowed', code: 'DUAL_KEY_SELF_REJECT' });
        }
        if (!requiredRoles.includes(secondRole)) {
            return res.status(403).json({ error: `Role mismatch`, code: 'DUAL_KEY_ROLE_MISMATCH', required: requiredRoles });
        }
        req._dual_key = { first: req.user.id, second: secondApprover, first_role: req.user.role, second_role: secondRole };
        next();
    };
}

// ═══════════════════════════════════════════════════════════════════
// READ ENDPOINTS
// ═══════════════════════════════════════════════════════════════════

router.get('/policy', (req, res) => {
    res.json({
        distribution_policy: distribution.getDistributionPolicy(),
        partner_tiers: distribution.getPartnerTiers(),
        region_scarcity: distribution.getRegionScarcity(),
    });
});

router.get('/breakdown', (req, res) => {
    const total = parseFloat(req.query.revenue) || 10000;
    res.json(distribution.getRevenueBreakdown(total));
});

router.get('/validators/balances', requirePermission('admin:manage'), (req, res) => {
    res.json(distribution.getValidatorBalances());
});

router.get('/partners/balances', requirePermission('admin:manage'), (req, res) => {
    res.json(distribution.getPartnerBalances());
});

router.get('/history', requirePermission('admin:manage'), (req, res) => {
    const limit = parseInt(req.query.limit) || 20;
    res.json({ distributions: distribution.getDistributionHistory(limit), payouts: distribution.getPayoutHistory(limit) });
});

// ═══════════════════════════════════════════════════════════════════
// MUTATION ENDPOINTS — Constitutional + Dual-Key enforced
// ═══════════════════════════════════════════════════════════════════

// Distribute to validators → constitutional (treasury domain)
router.post('/validators/distribute',
    requireConstitutionalWithAudit('monetization.treasury.payout'),
    (req, res) => {
        const { total_revenue, validators } = req.body;
        if (!total_revenue) return res.status(400).json({ error: 'total_revenue required' });
        const result = distribution.calculateValidatorDistribution(total_revenue, validators || []);
        res.status(201).json(result);
    }
);

// Partner revenue calculation → constitutional
router.post('/partners/calculate',
    requireConstitutionalWithAudit('monetization.treasury.payout'),
    (req, res) => {
        const { partner_id, referral_volume, transaction_revenue } = req.body;
        if (!partner_id || !transaction_revenue) return res.status(400).json({ error: 'partner_id and transaction_revenue required' });
        const result = distribution.calculatePartnerRevenue(partner_id, referral_volume || 0, transaction_revenue);
        res.json(result);
    }
);

// Process payout → constitutional + DUAL-KEY (treasury operation)
router.post('/payout',
    requireConstitutionalWithAudit('monetization.treasury.payout'),
    requireDualKey('monetization.treasury.payout', ['risk_committee', 'compliance_officer']),
    (req, res) => {
        const { entity_type, entity_id } = req.body;
        if (!entity_type || !entity_id) return res.status(400).json({ error: 'entity_type and entity_id required' });
        const result = distribution.processPayout(entity_type, entity_id, req._dual_key);
        if (result.error) return res.status(400).json(result);
        res.json(result);
    }
);

module.exports = router;
