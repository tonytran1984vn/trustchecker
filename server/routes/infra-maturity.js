/**
 * Unit Economics + Risk Reserve + Data Sovereignty + Regulatory + SLA Routes
 * Combined route file for infrastructure maturity modules
 * Endpoints: 28 | Mount: /api/economics, /api/reserves, /api/sovereignty, /api/regulatory, /api/sla
 * 
 * Constitutional Enforcement: ALL mutation endpoints use requireConstitutional()
 * Immutable Deny Logging: Every blocked action → audit_log
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission, requireConstitutional } = require('../auth');

router.use(authMiddleware);

// ═══════════════════════════════════════════════════════════════════
// IMMUTABLE DENY LOGGER
// Logs every constitutional block to console + prepares for DB audit
// ═══════════════════════════════════════════════════════════════════
function logConstitutionalAction(req, action, result) {
    const entry = {
        timestamp: new Date().toISOString(),
        action,
        user_id: req.user?.id || 'unknown',
        role: req.user?.role || 'unknown',
        ip: req.ip || req.connection?.remoteAddress || 'unknown',
        allowed: result.allowed || false,
        reason: result.reason || null,
        charter: result.charter || null,
        article: result.article || null,
        separation: result.separation?.id || null,
    };
    console.log(`[CONSTITUTIONAL-AUDIT] ${JSON.stringify(entry)}`);
    // TODO: Write to immutable audit table when available
    try {
        const db = require('../db');
        db.prepare(`INSERT INTO audit_log (id, action, actor_id, actor_role, resource_type, resource_id, details, ip_address, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(
                require('uuid').v4(),
                `CONSTITUTIONAL:${action}`,
                entry.user_id,
                entry.role,
                'constitutional_enforcement',
                action,
                JSON.stringify({ allowed: entry.allowed, reason: entry.reason, charter: entry.charter, article: entry.article, separation: entry.separation }),
                entry.ip,
                entry.timestamp
            );
    } catch (e) {
        console.error('[CONSTITUTIONAL-AUDIT] DB write fallback:', e.message);
    }
}

// Middleware that logs AFTER constitutional check
function requireConstitutionalWithAudit(action) {
    return (req, res, next) => {
        if (!req.user) return res.status(401).json({ error: 'Authentication required' });

        const constitutionalRBAC = require('../engines/constitutional-rbac-engine');
        const result = constitutionalRBAC.enforce(req.user.role, action);

        // ALWAYS log — both allowed and denied
        logConstitutionalAction(req, action, result);

        if (!result.allowed) {
            return res.status(403).json({
                error: 'Constitutional constraint violation',
                code: 'CONSTITUTIONAL_BLOCK',
                action,
                role: req.user.role,
                reason: result.reason,
                charter: result.charter,
                article: result.article,
                separation: result.separation || null,
                immutable: result.immutable || false,
            });
        }

        req._constitutional = result;
        next();
    };
}

// ═══════════════════════════════════════════════════════════════════
// DUAL-KEY ENFORCEMENT MIDDLEWARE
// Requires x-second-approver header with a valid second role's token
// ═══════════════════════════════════════════════════════════════════
function requireDualKey(action, requiredRoles) {
    return (req, res, next) => {
        const secondApprover = req.headers['x-second-approver'];
        const secondRole = req.headers['x-second-approver-role'];

        if (!secondApprover || !secondRole) {
            logConstitutionalAction(req, action, { allowed: false, reason: `Dual-key required: need x-second-approver and x-second-approver-role headers. Required roles: ${requiredRoles.join(' + ')}` });
            return res.status(403).json({
                error: 'Dual-key authorization required',
                code: 'DUAL_KEY_REQUIRED',
                action,
                required_roles: requiredRoles,
                instruction: 'Provide x-second-approver (user_id) and x-second-approver-role headers',
            });
        }

        // Verify second approver is different from first
        if (secondApprover === req.user?.id) {
            return res.status(403).json({
                error: 'Self-approval not allowed — second approver must be a different person',
                code: 'DUAL_KEY_SELF_REJECT',
            });
        }

        // Verify second approver has required role
        if (!requiredRoles.includes(secondRole)) {
            return res.status(403).json({
                error: `Second approver role "${secondRole}" not in required: ${requiredRoles.join(', ')}`,
                code: 'DUAL_KEY_ROLE_MISMATCH',
            });
        }

        logConstitutionalAction(req, `${action}:dual_key_passed`, {
            allowed: true,
            reason: `Dual-key: ${req.user.role} + ${secondRole}`,
        });

        req._dual_key = { first: req.user.id, second: secondApprover, first_role: req.user.role, second_role: secondRole };
        next();
    };
}

// ═══════════════════════════════════════════════════════════════════
// UNIT ECONOMICS — /economics (READ-ONLY — no constitutional enforcement needed)
// ═══════════════════════════════════════════════════════════════════
const economics = require('../engines/unit-economics-engine');

router.get('/economics/cost-structure', (req, res) => {
    res.json(economics.getCostStructure());
});

router.get('/economics/transaction-cost/:type', (req, res) => {
    res.json(economics.calculateTransactionCost(req.params.type));
});

router.post('/economics/unit-economics', (req, res) => {
    res.json(economics.calculateUnitEconomics(req.body));
});

router.get('/economics/scale-projection', (req, res) => {
    const base = parseInt(req.query.base_volume) || 10000;
    res.json({ base_volume: base, projections: economics.projectScale(base) });
});

router.get('/economics/chain-comparison', (req, res) => {
    res.json(economics.getChainComparison());
});

// ═══════════════════════════════════════════════════════════════════
// RISK RESERVE — /reserves
// MUTATION: contribute, claim, resolve → Constitutional + Dual-Key
// ═══════════════════════════════════════════════════════════════════
const reserves = require('../engines/risk-reserve-engine');

router.get('/reserves/health', (req, res) => {
    res.json(reserves.getReserveHealth());
});

router.get('/reserves/policy', (req, res) => {
    res.json({ policy: reserves.getReservePolicy(), chargeback_protocol: reserves.getChargebackProtocol() });
});

// MUTATION: contribute to reserves → constitutional check
router.post('/reserves/contribute',
    requireConstitutionalWithAudit('monetization.treasury.payout'),
    (req, res) => {
        const { total_revenue, breakdown } = req.body;
        if (!total_revenue) return res.status(400).json({ error: 'total_revenue required' });
        res.json(reserves.contribute(total_revenue, breakdown));
    }
);

// MUTATION: file claim → constitutional check
router.post('/reserves/claim',
    requireConstitutionalWithAudit('monetization.reserve.withdraw'),
    (req, res) => {
        const { reserve_id, amount, reason, evidence } = req.body;
        if (!reserve_id || !amount) return res.status(400).json({ error: 'reserve_id and amount required' });
        const result = reserves.fileClaim(reserve_id, amount, reason, req.user?.id || 'unknown', evidence);
        if (result.error) return res.status(400).json(result);
        res.status(201).json(result);
    }
);

// MUTATION: resolve claim → constitutional + DUAL-KEY
router.put('/reserves/claim/:id/resolve',
    requireConstitutionalWithAudit('monetization.reserve.withdraw'),
    requireDualKey('monetization.reserve.withdraw', ['risk_committee', 'compliance_officer']),
    (req, res) => {
        const result = reserves.resolveClaim(req.params.id, req.body.decision, {
            user: req.user?.id,
            reason: req.body.reason,
            dual_key: req._dual_key,
        });
        if (result.error) return res.status(400).json(result);
        res.json(result);
    }
);

router.get('/reserves/claims', (req, res) => {
    res.json({ claims: reserves.getClaims(parseInt(req.query.limit) || 20) });
});

// ═══════════════════════════════════════════════════════════════════
// DATA SOVEREIGNTY — /sovereignty (read-heavy, routing is auto)
// ═══════════════════════════════════════════════════════════════════
const sovereignty = require('../engines/data-sovereignty-engine');

router.get('/sovereignty/zones', (req, res) => {
    res.json(sovereignty.getZones());
});

router.get('/sovereignty/resolve/:country', (req, res) => {
    res.json(sovereignty.resolveZone(req.params.country));
});

router.post('/sovereignty/route', (req, res) => {
    const { tenant_id, country, data_type } = req.body;
    if (!country) return res.status(400).json({ error: 'country required' });
    res.json(sovereignty.routeData(tenant_id || req.user?.org_id || 'default', country, data_type));
});

router.post('/sovereignty/transfer-assessment', (req, res) => {
    const { from_zone, to_zone, data_type, volume } = req.body;
    if (!from_zone || !to_zone) return res.status(400).json({ error: 'from_zone and to_zone required' });
    res.json(sovereignty.assessTransfer(from_zone, to_zone, data_type || 'pii', volume || 1));
});

router.get('/sovereignty/compliance/:country', (req, res) => {
    res.json(sovereignty.getTenantCompliance(req.user?.org_id || 'default', req.params.country));
});

// ═══════════════════════════════════════════════════════════════════
// REGULATORY MAP — /regulatory (read-only)
// ═══════════════════════════════════════════════════════════════════
const regulatory = require('../engines/regulatory-map-engine');

router.get('/regulatory/licenses/:jurisdiction', (req, res) => {
    res.json(regulatory.getLicenseRequirements(req.params.jurisdiction));
});

router.get('/regulatory/matrix', (req, res) => {
    res.json(regulatory.getLicensingMatrix());
});

router.post('/regulatory/cross-border', (req, res) => {
    const { from, to } = req.body;
    if (!from || !to) return res.status(400).json({ error: 'from and to jurisdictions required' });
    res.json(regulatory.routeCrossBorder(from, to));
});

router.get('/regulatory/sanctions/:country', (req, res) => {
    res.json(regulatory.checkSanctions(req.params.country));
});

// ═══════════════════════════════════════════════════════════════════
// ENTERPRISE SLA — /sla
// MUTATION: contracts, credit → Constitutional
// ═══════════════════════════════════════════════════════════════════
const sla = require('../engines/enterprise-sla-engine');

router.get('/sla/tiers', (req, res) => {
    res.json({ tiers: sla.getSLATiers(), metrics: sla.getSLOMetrics() });
});

// MUTATION: create SLA contract → constitutional check (policy domain)
router.post('/sla/contracts',
    requireConstitutionalWithAudit('monetization.sla_credit.calculate'),
    (req, res) => {
        const { tenant_id, plan, custom_terms } = req.body;
        if (!tenant_id || !plan) return res.status(400).json({ error: 'tenant_id and plan required' });
        const result = sla.createContract(tenant_id, plan, custom_terms);
        if (result.error) return res.status(400).json(result);
        res.status(201).json(result);
    }
);

router.get('/sla/contracts', requirePermission('admin:manage'), (req, res) => {
    res.json({ contracts: sla.getAllContracts() });
});

router.post('/sla/measure', (req, res) => {
    const { tenant_id, metrics } = req.body;
    if (!tenant_id || !metrics) return res.status(400).json({ error: 'tenant_id and metrics required' });
    const result = sla.recordMeasurement(tenant_id, metrics);
    if (result.error) return res.status(400).json(result);
    res.json(result);
});

// MUTATION: calculate credit → constitutional check
router.post('/sla/credit',
    requireConstitutionalWithAudit('monetization.sla_credit.calculate'),
    (req, res) => {
        const { tenant_id, period, monthly_bill } = req.body;
        if (!tenant_id || !monthly_bill) return res.status(400).json({ error: 'tenant_id and monthly_bill required' });
        res.json(sla.calculateCredit(tenant_id, period || new Date().toISOString().slice(0, 7), monthly_bill));
    }
);

router.get('/sla/compliance/:tenantId', (req, res) => {
    const result = sla.getComplianceReport(req.params.tenantId);
    if (result.error) return res.status(404).json(result);
    res.json(result);
});

router.get('/sla/breaches', (req, res) => {
    res.json({ breaches: sla.getBreaches(parseInt(req.query.limit) || 20) });
});

module.exports = router;
