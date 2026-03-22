jest.mock('../../../server/db', () => require('../../helpers/db-mock'));
jest.mock('../../../server/events', () => ({
    eventBus: { emitEvent: jest.fn() },
    EVENT_TYPES: { BLOCKCHAIN_SEALED: 'BLOCKCHAIN_SEALED' },
}));

const db = require('../../../server/db');
const blockchain = require('../../../server/engines/infrastructure/blockchain');

beforeEach(() => {
    db.__resetMocks();
    blockchain.pendingEvents = [];
});

describe('BlockchainEngine', () => {
    describe('hash', () => {
        test('returns SHA-256 hex', () => {
            const h = blockchain.hash({ test: true });
            expect(h).toMatch(/^[a-f0-9]{64}$/);
        });

        test('deterministic', () => {
            const h1 = blockchain.hash({ a: 1 });
            const h2 = blockchain.hash({ a: 1 });
            expect(h1).toBe(h2);
        });

        test('different for different data', () => {
            expect(blockchain.hash({ a: 1 })).not.toBe(blockchain.hash({ a: 2 }));
        });
    });

    describe('buildMerkleRoot', () => {
        test('returns hash for empty array', () => {
            const root = blockchain.buildMerkleRoot([]);
            expect(root).toMatch(/^[a-f0-9]{64}$/);
        });

        test('returns single hash for 1 element', () => {
            const h = blockchain.hash('test');
            expect(blockchain.buildMerkleRoot([h])).toBe(h);
        });

        test('combines 2 hashes', () => {
            const h1 = blockchain.hash('a');
            const h2 = blockchain.hash('b');
            const root = blockchain.buildMerkleRoot([h1, h2]);
            expect(root).toMatch(/^[a-f0-9]{64}$/);
            expect(root).not.toBe(h1);
        });

        test('handles odd number of hashes', () => {
            const hashes = [1, 2, 3].map(n => blockchain.hash(n));
            const root = blockchain.buildMerkleRoot(hashes);
            expect(root).toMatch(/^[a-f0-9]{64}$/);
        });
    });

    describe('findNonce', () => {
        test('finds nonce with 1 leading zero', () => {
            const nonce = blockchain.findNonce('test', 1);
            expect(typeof nonce).toBe('number');
        });

        test('found hash starts with required zeros', () => {
            const data = 'test-data';
            const nonce = blockchain.findNonce(data, 2);
            const hash = blockchain.hash(data + nonce);
            expect(hash.startsWith('00')).toBe(true);
        });
    });

    describe('seal', () => {
        test('seals event and returns seal data', async () => {
            db.get.mockResolvedValueOnce(null); // no prev seal
            db.run.mockResolvedValueOnce({});
            const result = await blockchain.seal('QRScanned', 'ev-1', { product: 'p1' });
            expect(result.seal_id).toBeDefined();
            expect(result.data_hash).toMatch(/^[a-f0-9]{64}$/);
            expect(result.block_index).toBe(0);
            expect(result.prev_hash).toBe('0'.repeat(64));
        });

        test('chains to previous seal', async () => {
            db.get.mockResolvedValueOnce({ data_hash: 'abc123', block_index: 5 });
            db.run.mockResolvedValueOnce({});
            const result = await blockchain.seal('FraudFlagged', 'ev-2', {});
            expect(result.prev_hash).toBe('abc123');
            expect(result.block_index).toBe(6);
        });
    });

    describe('verifyChain', () => {
        test('returns valid for empty chain', async () => {
            db.all.mockResolvedValueOnce([]);
            const result = await blockchain.verifyChain();
            expect(result.valid).toBe(true);
            expect(result.blocks_checked).toBe(0);
        });

        test('detects chain break', async () => {
            db.all.mockResolvedValueOnce([
                { block_index: 0, data_hash: 'aaa', prev_hash: '000' },
                { block_index: 1, data_hash: 'bbb', prev_hash: 'wrong' },
            ]);
            const result = await blockchain.verifyChain();
            expect(result.valid).toBe(false);
            expect(result.errors.length).toBe(1);
        });

        test('valid chain passes', async () => {
            db.all.mockResolvedValueOnce([
                { block_index: 0, data_hash: 'aaa', prev_hash: '000' },
                { block_index: 1, data_hash: 'bbb', prev_hash: 'aaa' },
            ]);
            const result = await blockchain.verifyChain();
            expect(result.valid).toBe(true);
        });
    });

    describe('getStats', () => {
        test('returns chain statistics', async () => {
            db.get
                .mockResolvedValueOnce({ count: 10 })
                .mockResolvedValueOnce({ block_index: 9, data_hash: 'hash', merkle_root: 'root' });
            db.all.mockResolvedValueOnce([]); // verifyChain
            const stats = await blockchain.getStats();
            expect(stats.total_seals).toBe(10);
            expect(stats.latest_block).toBe(9);
        });
    });
});
