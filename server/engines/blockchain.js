/**
 * TrustChecker Blockchain Integrity Layer
 * SHA-256 Merkle tree hash sealing for immutable audit trail
 * Pipeline: Event → Hash → Merkle Tree → Seal
 */

const crypto = require('crypto');
const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { eventBus, EVENT_TYPES } = require('../events');

class BlockchainEngine {
    constructor() {
        this.BATCH_SIZE = 10; // Merkle tree batch size
        this.pendingEvents = [];
    }

    /** Hash data using SHA-256 */
    hash(data) {
        return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    }

    /** Build Merkle root from list of hashes */
    buildMerkleRoot(hashes) {
        if (hashes.length === 0) return this.hash('empty');
        if (hashes.length === 1) return hashes[0];

        const nextLevel = [];
        for (let i = 0; i < hashes.length; i += 2) {
            const left = hashes[i];
            const right = i + 1 < hashes.length ? hashes[i + 1] : left;
            nextLevel.push(this.hash(left + right));
        }

        return this.buildMerkleRoot(nextLevel);
    }

    /**
     * Seal an event to the blockchain
     * @param {string} eventType - e.g., 'QRScanned', 'FraudFlagged'
     * @param {string} eventId - ID of the event
     * @param {object} eventData - Event payload to hash
     * @returns {Promise<{ seal_id, data_hash, prev_hash, merkle_root, block_index }>}
     */
    async seal(eventType, eventId, eventData) {
        const dataHash = this.hash({
            event_type: eventType,
            event_id: eventId,
            data: eventData,
            timestamp: new Date().toISOString()
        });

        // Get previous seal for chain linking
        const prevSeal = await db.prepare(`
      SELECT data_hash, block_index FROM blockchain_seals
      ORDER BY block_index DESC LIMIT 1
    `).get();

        const prevHash = prevSeal ? prevSeal.data_hash : '0'.repeat(64);
        const blockIndex = prevSeal ? prevSeal.block_index + 1 : 0;

        // Add to pending events for Merkle batching
        this.pendingEvents.push(dataHash);

        // Calculate Merkle root for current batch
        const merkleRoot = this.buildMerkleRoot(this.pendingEvents);

        // Simple PoW nonce
        const nonce = this.findNonce(dataHash + prevHash, 2); // 2 leading zeros

        const sealId = uuidv4();
        await db.prepare(`
      INSERT INTO blockchain_seals (id, event_type, event_id, data_hash, prev_hash, merkle_root, block_index, nonce)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sealId, eventType, eventId, dataHash, prevHash, merkleRoot, blockIndex, nonce);

        // Reset batch if full
        if (this.pendingEvents.length >= this.BATCH_SIZE) {
            this.pendingEvents = [];
        }

        // Broadcast
        eventBus.emitEvent(EVENT_TYPES.BLOCKCHAIN_SEALED, {
            seal_id: sealId,
            event_type: eventType,
            data_hash: dataHash.substring(0, 16) + '...',
            block_index: blockIndex,
            merkle_root: merkleRoot.substring(0, 16) + '...'
        });

        return {
            seal_id: sealId,
            data_hash: dataHash,
            prev_hash: prevHash,
            merkle_root: merkleRoot,
            block_index: blockIndex,
            nonce
        };
    }

    /** Simple proof-of-work: find nonce where hash starts with N zeros */
    findNonce(data, difficulty) {
        let nonce = 0;
        const target = '0'.repeat(difficulty);
        while (nonce < 100000) {
            const h = this.hash(data + nonce);
            if (h.startsWith(target)) return nonce;
            nonce++;
        }
        return nonce;
    }

    /** Verify integrity of the blockchain chain */
    async verifyChain(limit = 100) {
        const seals = await db.prepare(`
      SELECT * FROM blockchain_seals ORDER BY block_index ASC LIMIT ?
    `).all(limit);

        const results = { valid: true, blocks_checked: seals.length, errors: [] };

        for (let i = 1; i < seals.length; i++) {
            if (seals[i].prev_hash !== seals[i - 1].data_hash) {
                results.valid = false;
                results.errors.push({
                    block_index: seals[i].block_index,
                    error: 'Chain break: prev_hash does not match previous block data_hash'
                });
            }
        }

        return results;
    }

    /** Get chain stats */
    async getStats() {
        const total = await db.prepare('SELECT COUNT(*) as count FROM blockchain_seals').get();
        const latest = await db.prepare('SELECT * FROM blockchain_seals ORDER BY block_index DESC LIMIT 1').get();

        return {
            total_seals: total?.count || 0,
            latest_block: latest ? latest.block_index : -1,
            latest_hash: latest ? latest.data_hash : null,
            latest_merkle_root: latest ? latest.merkle_root : null,
            pending_batch: this.pendingEvents.length,
            chain_integrity: await this.verifyChain()
        };
    }

    /** Get recent seals */
    async getRecent(limit = 20) {
        return await db.prepare(`
      SELECT * FROM blockchain_seals ORDER BY block_index DESC LIMIT ?
    `).all(limit);
    }
}

module.exports = new BlockchainEngine();
