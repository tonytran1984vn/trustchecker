/**
 * TrustChecker Blockchain Integrity Layer
 * SHA-256 Merkle tree hash sealing for immutable audit trail
 * Pipeline: Event → Hash → Merkle Tree → Seal
 */
/**
 * ⚠️ ORG ISOLATION: This engine relies on PostgreSQL RLS for data isolation.
 * The calling route must set db.setOrgContext(orgId) before invoking engine methods.
 * All SQL queries in this file are filtered at the database level by RLS policies.
 */

const crypto = require('crypto');
const db = require('../../db');
const { v4: uuidv4 } = require('uuid');
const { eventBus, EVENT_TYPES } = require('../../events');

class BlockchainEngine {
    constructor() {
        this.BATCH_SIZE = 10; // Merkle tree batch size
        this.pendingEvents = [];
    }

    /** BUG 2: Deterministic JSON Stringify to prevent Hash mutation on key reordering */
    deterministicStringify(obj) {
        if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
        if (Array.isArray(obj)) return '[' + obj.map(item => this.deterministicStringify(item)).join(',') + ']';
        const keys = Object.keys(obj).sort();
        const parts = keys.map(k => JSON.stringify(k) + ':' + this.deterministicStringify(obj[k]));
        return '{' + parts.join(',') + '}';
    }

    /** Hash data using SHA-256 */
    hash(data) {
        const strData = typeof data === 'object' ? this.deterministicStringify(data) : String(data);
        return crypto.createHash('sha256').update(strData).digest('hex');
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
            timestamp: new Date().toISOString(),
        });

        // BUG 2b: Use Prisma $transaction with Table Lock to prevent Blockchain Forking Race Conditions
        return await db.client.$transaction(async tx => {
            // Lock table for serializable block writing
            await tx.$executeRawUnsafe('LOCK TABLE blockchain_seals IN EXCLUSIVE MODE;');

            // Get previous seal for chain linking
            const prevSeals = await tx.$queryRawUnsafe(`
                SELECT data_hash, block_index FROM blockchain_seals
                ORDER BY block_index DESC LIMIT 1
            `);
            const prevSeal = prevSeals && prevSeals.length > 0 ? prevSeals[0] : null;

            const prevHash = prevSeal ? prevSeal.data_hash : '0'.repeat(64);
            const blockIndex = prevSeal ? parseInt(prevSeal.block_index) + 1 : 0;

            // Add to pending events for Merkle batching
            this.pendingEvents.push(dataHash);

            // Calculate Merkle root for current batch
            const merkleRoot = this.buildMerkleRoot(this.pendingEvents);

            // Simple PoW nonce
            const nonce = this.findNonce(dataHash + prevHash, 2); // 2 leading zeros

            const sealId = uuidv4();
            await tx.$executeRawUnsafe(
                `INSERT INTO blockchain_seals (id, event_type, event_id, data_hash, prev_hash, merkle_root, block_index, nonce)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                sealId,
                eventType,
                eventId,
                dataHash,
                prevHash,
                merkleRoot,
                blockIndex,
                nonce
            );

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
                merkle_root: merkleRoot.substring(0, 16) + '...',
            });

            return {
                seal_id: sealId,
                data_hash: dataHash,
                prev_hash: prevHash,
                merkle_root: merkleRoot,
                block_index: blockIndex,
                nonce,
            };
        });
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

    /** Verify integrity of the blockchain chain (latest N blocks) */
    async verifyChain(limit = 100, orgId) {
        const orgF = orgId ? ' WHERE org_id = ?' : '';
        const orgP = orgId ? [orgId] : [];
        const seals = await db.all(
            `
      SELECT * FROM blockchain_seals${orgF} ORDER BY block_index DESC LIMIT ?
    `,
            [...orgP, limit]
        );

        const results = { valid: true, blocks_checked: seals.length, errors: [] };

        // seals[0] is the newest block, seals[1] is the previous block
        for (let i = 1; i < seals.length; i++) {
            if (seals[i - 1].prev_hash !== seals[i].data_hash) {
                results.valid = false;
                results.errors.push({
                    block_index: seals[i - 1].block_index,
                    error: 'Chain break: prev_hash does not match previous block data_hash',
                });
            }
        }

        return results;
    }

    /** Get chain stats */
    async getStats(orgId) {
        const orgF = orgId ? ' WHERE org_id = ?' : '';
        const orgP = orgId ? [orgId] : [];
        const total = await db.get('SELECT COUNT(*) as count FROM blockchain_seals' + orgF, orgP);
        const latest = await db.get(
            'SELECT * FROM blockchain_seals' + orgF + ' ORDER BY block_index DESC LIMIT 1',
            orgP
        );

        return {
            total_seals: total?.count || 0,
            latest_block: latest ? latest.block_index : -1,
            latest_hash: latest ? latest.data_hash : null,
            latest_merkle_root: latest ? latest.merkle_root : null,
            pending_batch: this.pendingEvents.length,
            chain_integrity: await this.verifyChain(100, orgId),
        };
    }

    /** Get recent seals */
    async getRecent(limit = 20, orgId) {
        const orgF = orgId ? ' WHERE org_id = ?' : '';
        const orgP = orgId ? [orgId] : [];
        return await db.all(
            `
      SELECT * FROM blockchain_seals${orgF} ORDER BY block_index DESC LIMIT ?
    `,
            [...orgP, limit]
        );
    }
}

module.exports = new BlockchainEngine();
