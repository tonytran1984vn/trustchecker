const { safeError } = require('../utils/safe-error');
/**
 * SSI Wallet & Payment Gateway (Simulated) Routes
 * Self-Sovereign Identity, DID management, payment checkout simulation
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const blockchainEngine = require('../engines/blockchain');

router.use(authMiddleware);

// ===========================================================
// SSI (Self-Sovereign Identity) — Simulated
// ===========================================================

// ─── POST /ssi/did/create — Create a DID (Decentralized ID)
router.post('/ssi/did/create', async (req, res) => {
    try {
        const { display_name } = req.body;

        // Generate simulated DID
        const didId = `did:trust:${crypto.randomBytes(16).toString('hex')}`;
        const keyPair = {
            public: crypto.randomBytes(32).toString('hex'),
            private_hash: crypto.createHash('sha256').update(crypto.randomBytes(32)).digest('hex')
        };

        // Blockchain seal for DID creation
        const seal = await blockchainEngine.seal('DIDCreated', didId, { owner: req.user.id });

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'DID_CREATED', 'ssi', didId,
                JSON.stringify({ did: didId, display_name, public_key: keyPair.public, blockchain_seal: seal.seal_id }));

        res.status(201).json({
            did: didId,
            display_name: display_name || req.user.username,
            public_key: keyPair.public,
            blockchain_seal: seal,
            status: 'active',
            created_at: new Date().toISOString(),
            note: 'This is a simulated DID for demonstration. In production, this would be anchored to a public blockchain (e.g. Ethereum, Polygon).'
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /ssi/did — List user's DIDs ────────────────────────
router.get('/ssi/did', async (req, res) => {
    try {
        const dids = await db.all(
            "SELECT entity_id as did, details, timestamp as created_at FROM audit_log WHERE action = 'DID_CREATED' AND actor_id = ? ORDER BY timestamp DESC",
            [req.user.id]
        );

        res.json({
            dids: dids.map(d => {
                const details = JSON.parse(d.details || '{}');
                return { did: d.did, display_name: details.display_name, public_key: details.public_key, created_at: d.created_at };
            }),
            total: dids.length
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /ssi/credential/issue — Issue verifiable credential
router.post('/ssi/credential/issue', requireRole('operator'), async (req, res) => {
    try {
        const { subject_did, credential_type, claims } = req.body;
        if (!subject_did || !credential_type) return res.status(400).json({ error: 'subject_did and credential_type required' });

        const credId = `vc:trust:${uuidv4()}`;
        const credential = {
            '@context': ['https://www.w3.org/2018/credentials/v1'],
            type: ['VerifiableCredential', credential_type],
            issuer: `did:trust:platform`,
            issuanceDate: new Date().toISOString(),
            credentialSubject: {
                id: subject_did,
                ...claims
            }
        };

        const credHash = crypto.createHash('sha256').update(JSON.stringify(credential)).digest('hex');
        const seal = await blockchainEngine.seal('VCIssued', credId, { hash: credHash, subject: subject_did, type: credential_type });

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'VC_ISSUED', 'ssi', credId,
                JSON.stringify({ credential_id: credId, subject_did, type: credential_type, hash: credHash }));

        res.status(201).json({
            credential_id: credId,
            credential,
            proof: { type: 'TrustChainSeal', blockchain_seal: seal, hash: credHash },
            status: 'active'
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /ssi/credential/verify — Verify a credential ─────
router.post('/ssi/credential/verify', async (req, res) => {
    try {
        const { credential_id } = req.body;
        if (!credential_id) return res.status(400).json({ error: 'credential_id required' });

        const record = await db.get("SELECT * FROM audit_log WHERE action = 'VC_ISSUED' AND entity_id = ?", [credential_id]);
        if (!record) return res.status(404).json({ error: 'Credential not found', valid: false });

        const details = JSON.parse(record.details || '{}');
        const revoked = await db.get("SELECT * FROM audit_log WHERE action = 'VC_REVOKED' AND entity_id = ?", [credential_id]);

        res.json({
            credential_id,
            valid: !revoked,
            status: revoked ? 'revoked' : 'active',
            issuer: 'did:trust:platform',
            subject: details.subject_did,
            type: details.type,
            issued_at: record.timestamp,
            hash: details.hash,
            verified_at: new Date().toISOString()
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ===========================================================
// Payment Gateway — Simulated
// ===========================================================

// ─── POST /payment/checkout — Create checkout session ───────
router.post('/payment/checkout', async (req, res) => {
    try {
        const { plan_name, amount, currency, payment_method } = req.body;
        if (!plan_name || !amount) return res.status(400).json({ error: 'plan_name and amount required' });

        const sessionId = `cs_${crypto.randomBytes(16).toString('hex')}`;
        const validMethods = ['card', 'bank_transfer', 'crypto', 'paypal'];

        const checkout = {
            session_id: sessionId,
            plan_name,
            amount: Number(amount),
            currency: currency || 'USD',
            payment_method: validMethods.includes(payment_method) ? payment_method : 'card',
            status: 'pending',
            created_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            checkout_url: `/checkout/${sessionId}`,
        };

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'CHECKOUT_CREATED', 'payment', sessionId, JSON.stringify(checkout));

        res.status(201).json({
            ...checkout,
            note: 'Simulated payment gateway. In production, this would redirect to Stripe/PayPal.'
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /payment/confirm — Confirm payment (sim) ─────────
router.post('/payment/confirm', async (req, res) => {
    try {
        const { session_id } = req.body;
        if (!session_id) return res.status(400).json({ error: 'session_id required' });

        const session = await db.get("SELECT * FROM audit_log WHERE action = 'CHECKOUT_CREATED' AND entity_id = ? AND actor_id = ?", [session_id, req.user.id]);
        if (!session) return res.status(404).json({ error: 'Checkout session not found' });

        const details = JSON.parse(session.details || '{}');
        const paymentId = `pi_${crypto.randomBytes(16).toString('hex')}`;

        // Create payment record
        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'PAYMENT_CONFIRMED', 'payment', paymentId,
                JSON.stringify({
                    session_id, payment_id: paymentId,
                    amount: details.amount, currency: details.currency,
                    plan_name: details.plan_name, method: details.payment_method
                }));

        // Auto-upgrade plan if applicable
        // Plan names must match billing system: free, starter, pro, enterprise
        const planMap = { 'Starter': 'starter', 'starter': 'starter', 'Pro': 'pro', 'pro': 'pro', 'Enterprise': 'enterprise', 'enterprise': 'enterprise' };
        const tier = planMap[details.plan_name];
        if (tier) {
            await db.prepare("UPDATE billing_plans SET plan_name = ?, status = 'active', updated_at = datetime('now') WHERE user_id = ?")
                .run(tier, req.user.id);  // Use lowercase tier, not display name
        }

        res.json({
            payment_id: paymentId,
            session_id,
            status: 'succeeded',
            amount: details.amount,
            currency: details.currency,
            plan_name: details.plan_name,
            receipt_url: `/receipt/${paymentId}`,
            confirmed_at: new Date().toISOString()
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /payment/history — Payment history ─────────────────
router.get('/payment/history', async (req, res) => {
    try {
        const payments = await db.all(
            "SELECT entity_id as payment_id, details, timestamp FROM audit_log WHERE action = 'PAYMENT_CONFIRMED' AND actor_id = ? ORDER BY timestamp DESC LIMIT 50",
            [req.user.id]
        );

        res.json({
            payments: payments.map(p => ({
                payment_id: p.payment_id,
                ...JSON.parse(p.details || '{}'),
                date: p.timestamp
            })),
            total: payments.length
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── POST /payment/refund — Request refund (sim) ────────────
router.post('/payment/refund', async (req, res) => {
    try {
        const { payment_id, reason } = req.body;
        if (!payment_id) return res.status(400).json({ error: 'payment_id required' });

        const payment = await db.get("SELECT * FROM audit_log WHERE action = 'PAYMENT_CONFIRMED' AND entity_id = ? AND actor_id = ?", [payment_id, req.user.id]);
        if (!payment) return res.status(404).json({ error: 'Payment not found' });

        const details = JSON.parse(payment.details || '{}');
        const refundId = `re_${crypto.randomBytes(16).toString('hex')}`;

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'PAYMENT_REFUNDED', 'payment', refundId,
                JSON.stringify({ payment_id, refund_id: refundId, amount: details.amount, reason: reason || 'User requested' }));

        res.json({
            refund_id: refundId,
            payment_id,
            amount: details.amount,
            status: 'refunded',
            reason: reason || 'User requested',
            processed_at: new Date().toISOString()
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ===========================================================
// IPFS Cost Monitoring — Simulated
// ===========================================================

// ─── GET /ipfs/stats — IPFS storage statistics ─────────────
router.get('/ipfs/stats', requireRole('admin'), async (req, res) => {
    try {
        // Simulate IPFS storage costs based on evidence and blockchain data
        const evidenceCount = (await db.get('SELECT COUNT(*) as c FROM evidence_items'))?.c || 0;
        const sealCount = (await db.get('SELECT COUNT(*) as c FROM blockchain_seals'))?.c || 0;
        const nftCount = (await db.get('SELECT COUNT(*) as c FROM nft_certificates'))?.c || 0;
        const totalEvents = (await db.get('SELECT COUNT(*) as c FROM supply_chain_events'))?.c || 0;

        // Estimated storage (simulated)
        const evidenceStorageMB = evidenceCount * 0.5;  // ~500KB avg per evidence item
        const sealStorageMB = sealCount * 0.002;        // ~2KB per seal
        const nftStorageMB = nftCount * 0.01;           // ~10KB per NFT metadata

        const totalStorageMB = evidenceStorageMB + sealStorageMB + nftStorageMB;
        const costPerGB = 0.08; // Filecoin/IPFS average cost per GB/month
        const monthlyCost = (totalStorageMB / 1024) * costPerGB;

        res.json({
            storage: {
                evidence: { items: evidenceCount, size_mb: Math.round(evidenceStorageMB * 100) / 100 },
                blockchain_seals: { items: sealCount, size_mb: Math.round(sealStorageMB * 100) / 100 },
                nft_metadata: { items: nftCount, size_mb: Math.round(nftStorageMB * 100) / 100 },
                supply_chain_events: { items: totalEvents },
                total_size_mb: Math.round(totalStorageMB * 100) / 100,
                total_size_gb: Math.round((totalStorageMB / 1024) * 1000) / 1000,
            },
            cost: {
                rate_per_gb_month: costPerGB,
                estimated_monthly_usd: Math.round(monthlyCost * 100) / 100,
                estimated_annual_usd: Math.round(monthlyCost * 12 * 100) / 100,
                currency: 'USD',
            },
            network: {
                provider: 'TrustChain (simulated IPFS/Filecoin)',
                pinning_service: 'Self-hosted',
                replication_factor: 3,
                availability: '99.9%'
            },
            recommendations: totalStorageMB > 1000 ? [
                { action: 'Enable data compression', savings: '~30%' },
                { action: 'Archive old evidence items', savings: '~20%' },
                { action: 'Use tiered storage', savings: '~15%' }
            ] : [
                { action: 'Current usage is within optimal range', savings: 'N/A' }
            ]
        });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

// ─── GET /ipfs/pins — List pinned content ───────────────────
router.get('/ipfs/pins', requireRole('admin'), async (req, res) => {
    try {
        const recentSeals = await db.all('SELECT id, event_type, data_hash, sealed_at as created_at FROM blockchain_seals ORDER BY sealed_at DESC LIMIT 20');
        const recentEvidence = await db.all('SELECT id, title, sha256_hash, created_at FROM evidence_items ORDER BY created_at DESC LIMIT 20');

        const pins = [
            ...recentSeals.map(s => ({ cid: s.data_hash, type: 'blockchain_seal', ref_id: s.id, created_at: s.created_at, status: 'pinned' })),
            ...recentEvidence.map(e => ({ cid: e.sha256_hash, type: 'evidence', ref_id: e.id, title: e.title, created_at: e.created_at, status: 'pinned' }))
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        res.json({ pins: pins.slice(0, 30), total: pins.length });
    } catch (e) {
        safeError(res, 'Operation failed', e);
    }
});

module.exports = router;
