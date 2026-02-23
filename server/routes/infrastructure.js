/**
 * Infrastructure Layer Routes v1.1
 * Incentive Architecture + Entity Structuring + Cryptographic Governance
 * Mount: /api/incentive-arch, /api/entity, /api/crypto-gov
 * 
 * RBAC:
 *   /incentive-arch → L3+ admin (business model visibility)
 *   /entity         → L4+ risk_committee (legal entity structure = sensitive corporate info)
 *   /crypto-gov     → L5 super_admin (HSM, key recovery, ceremony = HIGHEST security sensitivity)
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../auth');
const { asyncHandler: h } = require('../middleware/asyncHandler');

router.use(authMiddleware);

const incentive = require('../engines/incentive-architecture-engine');
const entity = require('../engines/entity-structuring-engine');
const crypto = require('../engines/cryptographic-governance-engine');

// ═══════════════════════════════════════════════════════════════════
// INCENTIVE ARCHITECTURE — /incentive-arch [L3+ admin]
// ═══════════════════════════════════════════════════════════════════

router.get('/incentive-arch/framework', requireRole('admin'), (req, res) => { res.json(incentive.getFullArchitecture()); });
router.get('/incentive-arch/participants', requireRole('admin'), (req, res) => { res.json(incentive.getParticipantIncentives()); });
router.get('/incentive-arch/fee-topology', requireRole('admin'), (req, res) => { res.json(incentive.getFeeTopology()); });
router.get('/incentive-arch/moat', requireRole('admin'), (req, res) => { res.json(incentive.getSwitchingMoat()); });
router.get('/incentive-arch/carbon-market', requireRole('admin'), (req, res) => { res.json(incentive.getCarbonMarket()); });

router.post('/incentive-arch/network-value', requireRole('risk_committee'), (req, res) => {
    res.json(incentive.calculateNetworkValue(req.body.tenant_count));
});

// ═══════════════════════════════════════════════════════════════════
// ENTITY STRUCTURING — /entity [L4+ risk_committee]
// ═══════════════════════════════════════════════════════════════════

router.get('/entity/framework', requireRole('risk_committee'), (req, res) => { res.json(entity.getFullFramework()); });
router.get('/entity/architecture', requireRole('risk_committee'), (req, res) => { res.json(entity.getEntityArchitecture()); });
router.get('/entity/inter-entity', requireRole('risk_committee'), (req, res) => { res.json(entity.getInterEntity()); });
router.get('/entity/external-trust', requireRole('risk_committee'), (req, res) => { res.json(entity.getExternalTrust()); });

router.get('/entity/lookup/:name', requireRole('risk_committee'), (req, res) => {
    const e = entity.getEntity(req.params.name);
    if (!e) return res.status(404).json({ error: 'Entity not found' });
    res.json(e);
});

// ═══════════════════════════════════════════════════════════════════
// CRYPTOGRAPHIC GOVERNANCE — /crypto-gov [L5 super_admin]
// HSM architecture, key recovery, ceremony protocols = HIGHEST security
// ═══════════════════════════════════════════════════════════════════

router.get('/crypto-gov/framework', requireRole('super_admin'), (req, res) => { res.json(crypto.getFullFramework()); });
router.get('/crypto-gov/hsm', requireRole('super_admin'), (req, res) => { res.json(crypto.getHSMArchitecture()); });
router.get('/crypto-gov/multisig', requireRole('super_admin'), (req, res) => { res.json(crypto.getMultisigPolicy()); });
router.get('/crypto-gov/key-recovery', requireRole('super_admin'), (req, res) => { res.json(crypto.getKeyRecovery()); });
router.get('/crypto-gov/rotation', requireRole('super_admin'), (req, res) => { res.json(crypto.getKeyRotation()); });
router.get('/crypto-gov/ceremony', requireRole('super_admin'), (req, res) => { res.json(crypto.getCeremonyProtocol()); });
router.get('/crypto-gov/zero-trust', requireRole('super_admin'), (req, res) => { res.json(crypto.getZeroTrust()); });

router.post('/crypto-gov/assess-health', requireRole('super_admin'), (req, res) => {
    const { keys_rotated, hsm_operational, custodians_available } = req.body;
    res.json(crypto.assessKeyHealth(keys_rotated, hsm_operational, custodians_available));
});

module.exports = router;
