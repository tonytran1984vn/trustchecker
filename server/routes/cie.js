/**
 * CIE v2.0 API Routes
 * Carbon Integrity Engine — Backend API for passports, snapshots, anchoring, and org config
 *
 * Endpoints:
 *   POST   /api/cie/passport           — Create/seal a CIP
 *   GET    /api/cie/passport/:id        — Get CIP details + snapshot
 *   GET    /api/cie/passports           — List all CIPs for org
 *   POST   /api/cie/calculate           — Calculate emission (single input)
 *   POST   /api/cie/anchor              — Anchor hash to blockchain
 *   GET    /api/cie/anchors             — List anchors for org
 *   GET    /api/cie/snapshot/:cipId     — Get snapshot capsule for CIP
 *   GET    /api/cie/regulatory/:country — Get regulatory mapping
 *   GET    /api/cie/gaps/:country       — Get compliance gaps
 *   GET    /api/cie/factors             — Get active emission factors
 *   GET    /api/cie/config              — Get tenant CIE config
 *   PUT    /api/cie/config              — Update tenant CIE config
 *   GET    /api/cie/overview            — Dashboard summary
 */

const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole, requirePermission } = require('../auth');
const cie = require('../engines/intelligence/cie-engine');
const { v4: uuidv4 } = require('uuid');

// Lazy DB reference
let db;
function getDb() {
    if (!db) db = require('../db');
const { orgGuard } = require('../middleware/org-middleware');
    return db;
}

router.use(authMiddleware);
router.use(orgGuard());

// Tables managed by Prisma migrations (schema.prisma: CiePassport, CieSnapshot, CieAnchor, CieTenantConfig)
logger.info('✅ CIE v2.0 routes loaded (PostgreSQL via Prisma)');

// ═══════════════════════════════════════════════════════════════════════════════
// PASSPORT ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/cie/passport — Create and optionally seal a CIP
router.post('/passport', requirePermission('esg:manage'), async (req, res) => {
    try {
        const d = getDb();
        const orgId = req.user?.org_id || req.user?.orgId;
        const { product_name, batch_id, scope_1, scope_2, scope_3, benchmark_score, seal } = req.body;

        if (!product_name) return res.status(400).json({ error: 'product_name is required' });

        const id = uuidv4();
        const cipId = `CIP-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 99999)).padStart(5, '0')}`;
        const total = (scope_1 || 0) + (scope_2 || 0) + (scope_3 || 0);

        // Risk assessment
        const risk = cie.assessRisk({ scope_1, scope_2, scope_3 });
        const status = seal ? (risk.action === 'approved' ? 'sealed' : risk.action) : 'draft';

        // Create passport
        await d
            .prepare(
                `INSERT INTO cie_passports 
            (id, cip_id, org_id, product_name, batch_id, scope_1, scope_2, scope_3, total_emission, 
             benchmark_score, risk_score, risk_action, status, methodology, factor_version, sealed_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
                id,
                cipId,
                orgId,
                product_name,
                batch_id || null,
                scope_1 || 0,
                scope_2 || 0,
                scope_3 || 0,
                total,
                benchmark_score || 0,
                risk.composite_risk,
                risk.action,
                status,
                cie.METHODOLOGY.id,
                cie.ACTIVE_FACTOR_VERSION,
                seal ? new Date().toISOString() : null
            );

        // If sealed, create snapshot capsule
        let snapshot = null;
        if (status === 'sealed') {
            snapshot = cie.createSnapshotCapsule(cipId, {
                scope_1,
                scope_2,
                scope_3,
                governance_chain: 'CO→IVU→Compliance→BC',
                benchmark_ref: `IND-${product_name.toUpperCase().replace(/\s+/g, '-')}-${new Date().getFullYear()}-Q${Math.ceil((new Date().getMonth() + 1) / 3)}`,
            });
            await d
                .prepare(
                    `INSERT INTO cie_snapshots
                (id, cip_id, org_id, capsule_hash, data_hash, method_version, method_hash, 
                 factor_version, factor_hash, governance_chain, benchmark_ref, scope_snapshot, risk_thresholds)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
                )
                .run(
                    uuidv4(),
                    cipId,
                    orgId,
                    snapshot.capsule_hash,
                    snapshot.data_hash,
                    snapshot.method_version,
                    snapshot.method_hash,
                    snapshot.factor_version,
                    snapshot.factor_hash,
                    snapshot.governance_chain,
                    snapshot.benchmark_ref,
                    JSON.stringify(snapshot.scope_snapshot),
                    JSON.stringify(snapshot.risk_thresholds_at_seal)
                );
        }

        res.status(201).json({
            cip_id: cipId,
            status,
            risk,
            total_emission: total,
            unit: 'kgCO2e',
            methodology: cie.METHODOLOGY.id,
            factor_version: cie.ACTIVE_FACTOR_VERSION,
            snapshot: snapshot ? { capsule_hash: snapshot.capsule_hash, storage: 'WORM' } : null,
        });
    } catch (err) {
        logger.error('CIE passport error:', err);
        res.status(500).json({ error: 'Passport creation failed' });
    }
});

// GET /api/cie/passports — List CIPs for org
router.get('/passports', async (req, res) => {
    try {
        const d = getDb();
        const orgId = req.user?.org_id || req.user?.orgId;
        const { status, limit = 50 } = req.query;
        let q = 'SELECT * FROM cie_passports WHERE org_id = ?';
        const params = [orgId];
        if (status) {
            q += ' AND status = ?';
            params.push(status);
        }
        q += ' ORDER BY created_at DESC LIMIT ?';
        params.push(parseInt(limit));
        const rows = await d.prepare(q).all(...params);
        res.json({ passports: rows || [], total: (rows || []).length });
    } catch (err) {
        res.status(500).json({ error: 'Failed to list passports' });
    }
});

// GET /api/cie/passport/:cipId — Get single CIP with snapshot
router.get('/passport/:cipId', async (req, res) => {
    try {
        const d = getDb();
        const passport = await d.prepare('SELECT * FROM cie_passports WHERE cip_id = ?').get(req.params.cipId);
        if (!passport) return res.status(404).json({ error: 'CIP not found' });
        const snapshot = await d.prepare('SELECT * FROM cie_snapshots WHERE cip_id = ?').get(req.params.cipId);
        const anchors = await d.prepare('SELECT * FROM cie_anchors WHERE target_id = ?').all(req.params.cipId);
        res.json({ passport, snapshot: snapshot || null, anchors: anchors || [] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to get passport' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// CALCULATION & ANCHORING
// ═══════════════════════════════════════════════════════════════════════════════

// POST /api/cie/calculate — Calculate emission for single input
router.post('/calculate', async (req, res) => {
    try {
        const result = cie.calculateEmission(req.body);
        res.json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// POST /api/cie/anchor — Anchor hash to blockchain
router.post('/anchor', requirePermission('esg:manage'), async (req, res) => {
    try {
        const d = getDb();
        const orgId = req.user?.org_id || req.user?.orgId;
        const { type, target_id, data } = req.body;
        if (!type || !data) return res.status(400).json({ error: 'type and data required' });

        const anchor = cie.generateAnchorHash(type, data);
        const id = uuidv4();

        await d
            .prepare(
                `INSERT INTO cie_anchors 
            (id, org_id, anchor_type, target_id, anchor_hash, payload_hash, chain, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'confirmed')`
            )
            .run(
                id,
                orgId,
                anchor.anchor_type,
                target_id || null,
                anchor.anchor_hash,
                anchor.payload_hash,
                anchor.chain
            );

        res.status(201).json({ id, ...anchor, status: 'confirmed' });
    } catch (err) {
        logger.error('Anchor error:', err);
        res.status(500).json({ error: 'Anchoring failed' });
    }
});

// GET /api/cie/anchors — List anchors for org
router.get('/anchors', async (req, res) => {
    try {
        const d = getDb();
        const orgId = req.user?.org_id || req.user?.orgId;
        const rows = await d
            .prepare('SELECT * FROM cie_anchors WHERE org_id = ? ORDER BY created_at DESC LIMIT 50')
            .all(orgId);
        res.json({ anchors: rows || [] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to list anchors' });
    }
});

// GET /api/cie/snapshot/:cipId — Get snapshot capsule
router.get('/snapshot/:cipId', async (req, res) => {
    try {
        const d = getDb();
        const snap = await d.prepare('SELECT * FROM cie_snapshots WHERE cip_id = ?').get(req.params.cipId);
        if (!snap) return res.status(404).json({ error: 'Snapshot not found' });
        snap.scope_snapshot = JSON.parse(snap.scope_snapshot || '{}');
        snap.risk_thresholds = JSON.parse(snap.risk_thresholds || '{}');
        res.json(snap);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get snapshot' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// REGULATORY & FACTORS
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/cie/regulatory/:country — Regulatory mapping
router.get('/regulatory/:country', (req, res) => {
    const mapping = cie.getRegulatoryMapping(req.params.country.toUpperCase());
    res.json(mapping);
});

// GET /api/cie/gaps/:country — Compliance gaps
router.get('/gaps/:country', (req, res) => {
    const gaps = cie.getComplianceGaps(req.params.country.toUpperCase());
    res.json(gaps);
});

// GET /api/cie/factors — Active emission factors
router.get('/factors', (req, res) => {
    const version = req.query.version || cie.ACTIVE_FACTOR_VERSION;
    const factorSet = cie.FACTOR_VERSIONS[version];
    if (!factorSet) return res.status(404).json({ error: 'Factor version not found' });
    res.json({
        version,
        active: version === cie.ACTIVE_FACTOR_VERSION,
        frozen_by: factorSet.frozen_by,
        frozen_at: factorSet.frozen_at,
        hash: factorSet.hash,
        factors: factorSet.factors,
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MULTI-TENANT CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/cie/config — Get tenant CIE config
router.get('/config', async (req, res) => {
    try {
        const d = getDb();
        const orgId = req.user?.org_id || req.user?.orgId;
        let config = await d.prepare('SELECT * FROM cie_tenant_config WHERE org_id = ?').get(orgId);
        if (!config) {
            // Create default config
            await d.prepare(`INSERT INTO cie_tenant_config (org_id) VALUES (?)`).run(orgId);
            config = await d.prepare('SELECT * FROM cie_tenant_config WHERE org_id = ?').get(orgId);
        }
        config.modules = JSON.parse(config.modules || '{}');
        config.risk_thresholds = JSON.parse(config.risk_thresholds || '{}');
        config.rme_countries = JSON.parse(config.rme_countries || '["EU"]');
        res.json(config);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get config' });
    }
});

// PUT /api/cie/config — Update tenant CIE config
router.put('/config', requirePermission('org:settings_update'), async (req, res) => {
    try {
        const d = getDb();
        const orgId = req.user?.org_id || req.user?.orgId;
        const { tier, batch_limit, modules, risk_thresholds, rme_countries, mgb_enabled, snapshot_enabled } = req.body;

        // Ensure config exists
        const existing = await d.prepare('SELECT org_id FROM cie_tenant_config WHERE org_id = ?').get(orgId);
        if (!existing) {
            await d.prepare('INSERT INTO cie_tenant_config (org_id) VALUES (?)').run(orgId);
        }

        // Update fields individually
        if (tier) await d.prepare('UPDATE cie_tenant_config SET tier = ? WHERE org_id = ?').run(tier, orgId);
        if (batch_limit)
            await d.prepare('UPDATE cie_tenant_config SET batch_limit = ? WHERE org_id = ?').run(batch_limit, orgId);
        if (modules)
            await d
                .prepare('UPDATE cie_tenant_config SET modules = ?::jsonb WHERE org_id = ?')
                .run(JSON.stringify(modules), orgId);
        if (risk_thresholds)
            await d
                .prepare('UPDATE cie_tenant_config SET risk_thresholds = ?::jsonb WHERE org_id = ?')
                .run(JSON.stringify(risk_thresholds), orgId);
        if (rme_countries)
            await d
                .prepare('UPDATE cie_tenant_config SET rme_countries = ?::jsonb WHERE org_id = ?')
                .run(JSON.stringify(rme_countries), orgId);
        if (mgb_enabled != null)
            await d.prepare('UPDATE cie_tenant_config SET mgb_enabled = ? WHERE org_id = ?').run(!!mgb_enabled, orgId);
        if (snapshot_enabled != null)
            await d
                .prepare('UPDATE cie_tenant_config SET snapshot_enabled = ? WHERE org_id = ?')
                .run(!!snapshot_enabled, orgId);
        await d.prepare('UPDATE cie_tenant_config SET updated_at = NOW() WHERE org_id = ?').run(orgId);

        const config = await d.prepare('SELECT * FROM cie_tenant_config WHERE org_id = ?').get(orgId);
        res.json({ message: 'Config updated', config });
    } catch (err) {
        logger.error('Config update error:', err);
        res.status(500).json({ error: 'Config update failed' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// OVERVIEW / DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

// GET /api/cie/overview — Dashboard summary for org
router.get('/overview', async (req, res) => {
    try {
        const d = getDb();
        const orgId = req.user?.org_id || req.user?.orgId;

        const total = (await d.prepare('SELECT COUNT(*) as c FROM cie_passports WHERE org_id = ?').get(orgId))?.c || 0;
        const sealed =
            (
                await d
                    .prepare("SELECT COUNT(*) as c FROM cie_passports WHERE org_id = ? AND status = 'sealed'")
                    .get(orgId)
            )?.c || 0;
        const blocked =
            (
                await d
                    .prepare("SELECT COUNT(*) as c FROM cie_passports WHERE org_id = ? AND status = 'block_approval'")
                    .get(orgId)
            )?.c || 0;
        const anchors = (await d.prepare('SELECT COUNT(*) as c FROM cie_anchors WHERE org_id = ?').get(orgId))?.c || 0;
        const snapshots =
            (await d.prepare('SELECT COUNT(*) as c FROM cie_snapshots WHERE org_id = ?').get(orgId))?.c || 0;

        res.json({
            version: 'CIE v2.0',
            org_id: orgId,
            passports: { total, sealed, blocked, pending: total - sealed - blocked },
            anchors,
            snapshots,
            methodology: cie.METHODOLOGY.id,
            factor_version: cie.ACTIVE_FACTOR_VERSION,
        });
    } catch (err) {
        res.status(500).json({ error: 'Overview failed' });
    }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════════════════

const cieRoles = require('../engines/infrastructure/cie-role-engine');
const { withTransaction } = require('../middleware/transaction');
const logger = require('../lib/logger');

// GET /api/cie/roles — All roles (platform + company)
router.get('/roles', (req, res) => {
    res.json(cieRoles.getAllRoles());
});

// GET /api/cie/roles/sod — SoD matrix
router.get('/roles/sod', (req, res) => {
    res.json(cieRoles.getSoDMatrix());
});

// GET /api/cie/roles/lifecycle — CIP lifecycle stages
router.get('/roles/lifecycle', (req, res) => {
    res.json(cieRoles.getCipLifecycle());
});

// GET /api/cie/roles/escalation — Escalation chain
router.get('/roles/escalation', (req, res) => {
    res.json(cieRoles.getEscalationChain());
});

// GET /api/cie/roles/principles — Access principles
router.get('/roles/principles', (req, res) => {
    res.json(cieRoles.getAccessPrinciples());
});

// GET /api/cie/roles/liability — Liability containment
router.get('/roles/liability', (req, res) => {
    res.json(cieRoles.getLiabilityMatrix());
});

// GET /api/cie/roles/:roleId — Single role detail
router.get('/roles/:roleId', (req, res) => {
    const role = cieRoles.getRoleById(req.params.roleId);
    if (!role) return res.status(404).json({ error: 'Role not found' });
    res.json(role);
});

// POST /api/cie/roles/check — Check if role can perform action
router.post('/roles/check', (req, res) => {
    const { role_id, action } = req.body;
    if (!role_id || !action) return res.status(400).json({ error: 'role_id and action required' });
    res.json({
        role_id,
        action,
        allowed: cieRoles.canPerform(role_id, action),
        blocked: cieRoles.isBlocked(role_id, action),
        replay_level: cieRoles.getReplayLevel(role_id),
    });
});

// POST /api/cie/roles/validate-transition — Validate CIP stage transition
router.post('/roles/validate-transition', (req, res) => {
    const { current_stage, target_stage, role_id } = req.body;
    if (!current_stage || !target_stage || !role_id) {
        return res.status(400).json({ error: 'current_stage, target_stage, and role_id required' });
    }
    res.json(cieRoles.validateTransition(current_stage, target_stage, role_id));
});

// GET /api/cie/architecture — Full architecture export
router.get('/architecture', (req, res) => {
    res.json({
        version: 'CIE v2.0 Role Architecture',
        roles: cieRoles.getAllRoles(),
        sod_matrix: cieRoles.getSoDMatrix(),
        lifecycle: cieRoles.getCipLifecycle(),
        replay_access: cieRoles.getReplayAccessLevels(),
        escalation: cieRoles.getEscalationChain(),
        methodology_flow: cieRoles.getMethodologyChangeFlow(),
        access_principles: cieRoles.getAccessPrinciples(),
        liability: cieRoles.getLiabilityMatrix(),
    });
});

module.exports = router;
