/**
 * Infrastructure Custody Routes — Security, Keys, Isolation, Governance Matrix
 * Endpoints: 7 | Mount: /api/infra-custody
 */
const express = require('express');
const router = express.Router();
const { authMiddleware, requirePermission } = require('../auth');
const custodyEngine = require('../engines/infrastructure-custody-engine');
const { cacheMiddleware } = require('../cache');
router.use(authMiddleware);

// GET /security — Security posture assessment
router.get('/security', cacheMiddleware(120), async (req, res) => {
    try { res.json(custodyEngine.assessSecurityPosture()); }
    catch (err) { res.status(500).json({ error: 'Security assessment failed' }); }
});

// GET /isolation — Tenant isolation check
router.get('/isolation', requirePermission('admin:manage'), async (req, res) => {
    try { res.json(custodyEngine.checkTenantIsolation([])); }
    catch (err) { res.status(500).json({ error: 'Isolation check failed' }); }
});

// GET /hash-chain — Hash chain integrity
router.get('/hash-chain', cacheMiddleware(300), async (req, res) => {
    try { res.json(custodyEngine.verifyHashChain([])); }
    catch (err) { res.status(500).json({ error: 'Hash chain verification failed' }); }
});

// GET /keys — Key management status
router.get('/keys', requirePermission('admin:manage'), async (req, res) => {
    try { res.json(custodyEngine.getKeyManagementStatus()); }
    catch (err) { res.status(500).json({ error: 'Key status failed' }); }
});

// GET /disaster-recovery — DR readiness
router.get('/disaster-recovery', cacheMiddleware(300), async (req, res) => {
    try { res.json(custodyEngine.checkDisasterRecovery()); }
    catch (err) { res.status(500).json({ error: 'DR check failed' }); }
});

// GET /separation-of-powers — Governance matrix verification
router.get('/separation-of-powers', async (req, res) => {
    try { res.json(custodyEngine.verifySeparationOfPowers()); }
    catch (err) { res.status(500).json({ error: 'SoP verification failed' }); }
});

// GET /boundary — IT role boundary
router.get('/boundary', (req, res) => { res.json({ title: 'IT Role Boundary (Cryptographic Custodian)', ...custodyEngine.getITBoundary() }); });

module.exports = router;
