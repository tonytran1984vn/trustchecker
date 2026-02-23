/**
 * Identity & Trust Routes — DID + Verifiable Credentials
 * Endpoints: 8 | Mount: /api/identity
 */
const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware, requirePermission } = require('../auth');
const identityEngine = require('../engines/identity-engine');
const { v4: uuidv4 } = require('uuid');
router.use(authMiddleware);

const init = async () => {
    try {
        await db.exec(`
    CREATE TABLE IF NOT EXISTS did_registry (id TEXT PRIMARY KEY, did TEXT UNIQUE NOT NULL, entity_type TEXT, entity_id TEXT, tenant_id TEXT, did_document TEXT, public_key TEXT, status TEXT DEFAULT 'active', created_at DATETIME DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS verifiable_credentials (id TEXT PRIMARY KEY, vc_id TEXT UNIQUE NOT NULL, credential_type TEXT, issuer_did TEXT, subject_did TEXT, credential TEXT, proof_hash TEXT, status TEXT DEFAULT 'active', valid_until DATETIME, tenant_id TEXT, created_at DATETIME DEFAULT (datetime('now')));
`);
    } catch (e) { }
};
init();

// POST /did — Generate DID
router.post('/did', requirePermission('esg:manage'), async (req, res) => {
    try {
        const { entity_type, entity_id } = req.body;
        const result = identityEngine.generateDID(entity_type, entity_id, req.user?.org_id || 'default');
        if (result.error) return res.status(400).json(result);
        await db.prepare('INSERT INTO did_registry (id,did,entity_type,entity_id,tenant_id,did_document,public_key) VALUES (?,?,?,?,?,?,?)')
            .run(uuidv4(), result.did, entity_type, entity_id, req.user?.org_id || 'default', JSON.stringify(result.did_document), result.keys.publicKey);
        res.status(201).json(result);
    } catch (err) { res.status(500).json({ error: 'DID generation failed' }); }
});

// GET /did/resolve/:did — Resolve DID
router.get('/did/resolve/:did', async (req, res) => {
    try {
        const row = await db.prepare('SELECT * FROM did_registry WHERE did = ?').get(decodeURIComponent(req.params.did));
        if (!row) return res.status(404).json({ error: 'DID not found' });
        res.json(identityEngine.resolveDID(row.did, { did_document: JSON.parse(row.did_document), metadata: { created: row.created_at } }));
    } catch (err) { res.status(500).json({ error: 'DID resolution failed' }); }
});

// GET /did/registry — List all DIDs
router.get('/did/registry', async (req, res) => {
    try {
        const rows = await db.prepare('SELECT did,entity_type,entity_id,tenant_id,status,created_at FROM did_registry ORDER BY created_at DESC LIMIT 50').all();
        res.json({ title: 'DID Registry', total: rows.length, dids: rows });
    } catch (err) { res.status(500).json({ error: 'Registry query failed' }); }
});

// POST /vc/issue — Issue Verifiable Credential
router.post('/vc/issue', requirePermission('esg:manage'), async (req, res) => {
    try {
        const { issuer_did, subject_did, credential_type, claims } = req.body;
        const result = identityEngine.issueVC({ issuer_did, subject_did, credential_type, claims, tenant_id: req.user?.org_id });
        if (result.error) return res.status(400).json(result);
        await db.prepare('INSERT INTO verifiable_credentials (id,vc_id,credential_type,issuer_did,subject_did,credential,proof_hash,valid_until,tenant_id) VALUES (?,?,?,?,?,?,?,?,?)')
            .run(uuidv4(), result.vc_id, credential_type, issuer_did, subject_did, JSON.stringify(result.credential), result.credential.proof.proofValue, result.metadata.valid_until, req.user?.org_id);
        res.status(201).json(result);
    } catch (err) { res.status(500).json({ error: 'VC issuance failed' }); }
});

// POST /vc/verify — Verify credential
router.post('/vc/verify', async (req, res) => {
    try { res.json(identityEngine.verifyVC(req.body)); } catch (err) { res.status(500).json({ error: 'Verification failed' }); }
});

// GET /vc/registry — List VCs
router.get('/vc/registry', async (req, res) => {
    try {
        const rows = await db.prepare('SELECT vc_id,credential_type,issuer_did,subject_did,status,valid_until,created_at FROM verifiable_credentials ORDER BY created_at DESC LIMIT 50').all();
        res.json({ title: 'Verifiable Credentials Registry', total: rows.length, credentials: rows });
    } catch (err) { res.status(500).json({ error: 'VC registry failed' }); }
});

// GET /trust-chain/:did — Build trust chain
router.get('/trust-chain/:did', async (req, res) => {
    try {
        const did = decodeURIComponent(req.params.did);
        const creds = await db.prepare('SELECT * FROM verifiable_credentials WHERE subject_did = ? AND status = ?').all(did, 'active');
        const linked = await db.prepare('SELECT * FROM did_registry WHERE tenant_id = (SELECT tenant_id FROM did_registry WHERE did = ?) AND did != ?').all(did, did);
        const parsedCreds = creds.map(c => ({ ...c, credential: JSON.parse(c.credential || '{}') }));
        const parsedLinked = linked.map(l => ({ did: l.did, entity_type: l.entity_type, relationship: 'same_tenant' }));
        res.json(identityEngine.buildTrustChain(did, parsedCreds, parsedLinked));
    } catch (err) { res.status(500).json({ error: 'Trust chain failed' }); }
});

// GET /types — Entity + VC types
router.get('/types', (req, res) => {
    res.json({ entity_types: identityEngine.getEntityTypes(), vc_types: identityEngine.getVCTypes() });
});

module.exports = router;
