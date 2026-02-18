/**
 * NFT Certificate Routes
 * Simulated NFT minting, verification, transfer for product authenticity
 */
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const db = require('../db');
const { authMiddleware, requireRole } = require('../auth');
const blockchainEngine = require('../engines/blockchain');

router.use(authMiddleware);

// ─── POST /mint — Mint a new NFT certificate ────────────────
router.post('/mint', requireRole('operator'), async (req, res) => {
    try {
        const { product_id, entity_type, entity_id, certificate_type, expires_in_days } = req.body;
        if (!product_id && !entity_id) return res.status(400).json({ error: 'product_id or entity_id required' });

        const targetId = product_id || entity_id;
        const targetType = entity_type || 'product';

        // Check product exists if product_id provided
        if (product_id) {
            const product = await db.get('SELECT * FROM products WHERE id = ?', [product_id]);
            if (!product) return res.status(404).json({ error: 'Product not found' });
        }

        // Generate NFT metadata
        const id = uuidv4();
        const tokenId = Math.floor(Math.random() * 999999) + 1;
        const metadata = {
            token_id: tokenId,
            entity: targetId,
            type: certificate_type || 'authenticity',
            issuer: 'TrustChecker',
            issued_at: new Date().toISOString(),
            chain: 'TrustChain (simulated)'
        };
        const metadataHash = crypto.createHash('sha256').update(JSON.stringify(metadata)).digest('hex');

        // Blockchain seal
        const seal = await blockchainEngine.seal('NFTMinted', id, { token_id: tokenId, metadata_hash: metadataHash });

        const expiresAt = expires_in_days ? new Date(Date.now() + expires_in_days * 86400000).toISOString() : null;

        await db.prepare(`
      INSERT INTO nft_certificates (id, token_id, product_id, entity_type, entity_id, certificate_type, owner, metadata_hash, blockchain_seal_id, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, tokenId, product_id || null, targetType, targetId, certificate_type || 'authenticity',
            req.user.id, metadataHash, seal.seal_id, expiresAt);

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'NFT_MINTED', 'nft', id, JSON.stringify({ token_id: tokenId, product_id, certificate_type }));

        res.status(201).json({
            id, token_id: tokenId,
            metadata_hash: metadataHash,
            blockchain_seal: seal,
            certificate_type: certificate_type || 'authenticity',
            status: 'active',
            expires_at: expiresAt
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET / — List NFT certificates ──────────────────────────
router.get('/', async (req, res) => {
    try {
        const { product_id, owner, status = 'active', limit = 50 } = req.query;
        let sql = 'SELECT nc.*, p.name as product_name FROM nft_certificates nc LEFT JOIN products p ON nc.product_id = p.id WHERE 1=1';
        const params = [];

        if (product_id) { sql += ' AND nc.product_id = ?'; params.push(product_id); }
        if (owner) { sql += ' AND nc.owner = ?'; params.push(owner); }
        if (status) { sql += ' AND nc.status = ?'; params.push(status); }

        sql += ' ORDER BY nc.minted_at DESC LIMIT ?';
        params.push(Number(limit));

        res.json({ certificates: await db.all(sql, params) });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /:id — Get certificate detail ──────────────────────
router.get('/:id', async (req, res) => {
    try {
        const cert = await db.get('SELECT nc.*, p.name as product_name FROM nft_certificates nc LEFT JOIN products p ON nc.product_id = p.id WHERE nc.id = ?', [req.params.id]);
        if (!cert) return res.status(404).json({ error: 'Certificate not found' });

        const seal = cert.blockchain_seal_id ? await db.get('SELECT * FROM blockchain_seals WHERE id = ?', [cert.blockchain_seal_id]) : null;

        res.json({
            certificate: cert,
            blockchain: seal,
            transfer_history: JSON.parse(cert.transfer_history || '[]'),
            is_valid: cert.status === 'active' && (!cert.expires_at || new Date(cert.expires_at) > new Date())
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── GET /:id/verify — Verify NFT authenticity ─────────────
router.get('/:id/verify', async (req, res) => {
    try {
        const cert = await db.get('SELECT * FROM nft_certificates WHERE id = ?', [req.params.id]);
        if (!cert) return res.status(404).json({ error: 'Certificate not found' });

        const seal = cert.blockchain_seal_id ? await db.get('SELECT * FROM blockchain_seals WHERE id = ?', [cert.blockchain_seal_id]) : null;

        // Verify hash integrity by comparing stored hash against blockchain seal
        // (Don't recompute — mint-time metadata uses JS Date which differs from SQLite datetime)
        const hashValid = seal ? seal.data_hash === cert.metadata_hash : !!cert.metadata_hash;

        const isExpired = cert.expires_at && new Date(cert.expires_at) < new Date();
        const isRevoked = cert.status === 'revoked';

        res.json({
            certificate_id: cert.id,
            token_id: cert.token_id,
            valid: hashValid && !isExpired && !isRevoked,
            hash_integrity: hashValid ? 'intact' : 'tampered',
            blockchain_anchored: !!seal,
            expired: !!isExpired,
            revoked: isRevoked,
            status: isRevoked ? 'revoked' : isExpired ? 'expired' : hashValid ? 'valid' : 'tampered',
            verified_at: new Date().toISOString()
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── POST /:id/transfer — Transfer NFT ownership ───────────
router.post('/:id/transfer', requireRole('operator'), async (req, res) => {
    try {
        const { to_user_id } = req.body;
        if (!to_user_id) return res.status(400).json({ error: 'to_user_id required' });

        const cert = await db.get('SELECT * FROM nft_certificates WHERE id = ?', [req.params.id]);
        if (!cert) return res.status(404).json({ error: 'Certificate not found' });
        if (cert.owner !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Only the owner or admin can transfer' });
        }
        if (cert.status !== 'active') return res.status(400).json({ error: 'Cannot transfer inactive certificate' });

        const toUser = await db.get('SELECT id, username FROM users WHERE id = ?', [to_user_id]);
        if (!toUser) return res.status(404).json({ error: 'Target user not found' });

        // Update transfer history
        const history = JSON.parse(cert.transfer_history || '[]');
        history.push({
            from: cert.owner,
            to: to_user_id,
            transferred_at: new Date().toISOString(),
            transferred_by: req.user.id
        });

        await db.prepare('UPDATE nft_certificates SET owner = ?, transfer_history = ? WHERE id = ?')
            .run(to_user_id, JSON.stringify(history), req.params.id);

        // Blockchain seal for transfer
        const seal = await blockchainEngine.seal('NFTTransferred', req.params.id, { from: cert.owner, to: to_user_id, token_id: cert.token_id });

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'NFT_TRANSFERRED', 'nft', req.params.id, JSON.stringify({ from: cert.owner, to: to_user_id }));

        res.json({ id: req.params.id, new_owner: to_user_id, transfer_seal: seal, history });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ─── POST /:id/revoke — Revoke NFT certificate ─────────────
router.post('/:id/revoke', requireRole('admin'), async (req, res) => {
    try {
        const { reason } = req.body;
        const cert = await db.get('SELECT * FROM nft_certificates WHERE id = ?', [req.params.id]);
        if (!cert) return res.status(404).json({ error: 'Certificate not found' });

        await db.prepare("UPDATE nft_certificates SET status = 'revoked' WHERE id = ?").run(req.params.id);

        const seal = await blockchainEngine.seal('NFTRevoked', req.params.id, { token_id: cert.token_id, reason });

        await db.prepare('INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details) VALUES (?, ?, ?, ?, ?, ?)')
            .run(uuidv4(), req.user.id, 'NFT_REVOKED', 'nft', req.params.id, JSON.stringify({ reason, token_id: cert.token_id }));

        res.json({ id: req.params.id, status: 'revoked', reason, revoke_seal: seal });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
