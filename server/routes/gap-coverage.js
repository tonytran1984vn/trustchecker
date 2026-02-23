/**
 * Gap Coverage Routes v1.1
 * Data Ownership + Infrastructure Metrics + Upgrade Governance
 * Mount: /api/data-ownership, /api/infra-metrics, /api/upgrade-gov
 * 
 * RBAC:
 *   /data-ownership  → L3+ admin (data policy visibility for compliance officers)
 *   /infra-metrics   → L3+ admin read, L4+ risk_committee for surveillance, L5 calculate
 *   /upgrade-gov     → L4+ risk_committee read, L5 super_admin classify changes
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../auth');
const { asyncHandler: h } = require('../middleware/asyncHandler');

router.use(authMiddleware);

const dataOwn = require('../engines/data-ownership-engine');
const metrics = require('../engines/infrastructure-metrics-engine');
const upgrade = require('../engines/upgrade-governance-engine');

// ═══════════════════════════════════════════════════════════════════
// DATA OWNERSHIP — /data-ownership [L3+ admin]
// ═══════════════════════════════════════════════════════════════════

router.get('/data-ownership/framework', requireRole('admin'), (req, res) => { res.json(dataOwn.getFullFramework()); });
router.get('/data-ownership/ownership', requireRole('admin'), (req, res) => { res.json(dataOwn.getOwnership()); });
router.get('/data-ownership/exit-protocol', requireRole('admin'), (req, res) => { res.json(dataOwn.getExitProtocol()); });
router.get('/data-ownership/immutability', requireRole('admin'), (req, res) => { res.json(dataOwn.getImmutability()); });
router.get('/data-ownership/merkle-export', requireRole('admin'), (req, res) => { res.json(dataOwn.getMerkleExport()); });
router.get('/data-ownership/deletion-certificate', requireRole('admin'), (req, res) => { res.json(dataOwn.getDeletionCertificate()); });
router.get('/data-ownership/sovereignty', requireRole('admin'), (req, res) => { res.json(dataOwn.getSovereignty()); });

// ═══════════════════════════════════════════════════════════════════
// INFRASTRUCTURE METRICS — /infra-metrics [L3+ admin read, L4+ surveillance]
// ═══════════════════════════════════════════════════════════════════

router.get('/infra-metrics/framework', requireRole('admin'), (req, res) => { res.json(metrics.getFullFramework()); });
router.get('/infra-metrics/network', requireRole('admin'), (req, res) => { res.json(metrics.getNetworkMetrics()); });
router.get('/infra-metrics/operational', requireRole('admin'), (req, res) => { res.json(metrics.getOperationalMetrics()); });
router.get('/infra-metrics/financial', requireRole('risk_committee'), (req, res) => { res.json(metrics.getFinancialMetrics()); });
router.get('/infra-metrics/composite', requireRole('risk_committee'), (req, res) => { res.json(metrics.getCompositeScore()); });
router.get('/infra-metrics/governance-surveillance', requireRole('risk_committee'), (req, res) => { res.json(metrics.getGovernanceSurveillance()); });

router.post('/infra-metrics/calculate-composite', requireRole('super_admin'), (req, res) => {
    const { network, operational, financial, governance } = req.body;
    res.json(metrics.calculateComposite(network, operational, financial, governance));
});

// ═══════════════════════════════════════════════════════════════════
// UPGRADE GOVERNANCE — /upgrade-gov [L4+ risk_committee read, L5 classify]
// ═══════════════════════════════════════════════════════════════════

router.get('/upgrade-gov/framework', requireRole('risk_committee'), (req, res) => { res.json(upgrade.getFullFramework()); });
router.get('/upgrade-gov/classification', requireRole('risk_committee'), (req, res) => { res.json(upgrade.getClassification()); });
router.get('/upgrade-gov/cab-process', requireRole('risk_committee'), (req, res) => { res.json(upgrade.getCABProcess()); });
router.get('/upgrade-gov/rollback', requireRole('risk_committee'), (req, res) => { res.json(upgrade.getRollback()); });
router.get('/upgrade-gov/versioning', requireRole('risk_committee'), (req, res) => { res.json(upgrade.getVersionGovernance()); });

router.post('/upgrade-gov/classify', requireRole('super_admin'), (req, res) => {
    const { description, impacts_scoring, impacts_settlement, impacts_schema, impacts_constitution } = req.body;
    res.json(upgrade.classifyChange(description, impacts_scoring, impacts_settlement, impacts_schema, impacts_constitution));
});

module.exports = router;
