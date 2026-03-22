jest.mock('../../../server/db', () => require('../../helpers/db-mock'));

const crypto = require('crypto');
const db = require('../../../server/db');
const { appendAuditEntry, verifyChain, recordMutation, snapshotVersion, guardImmutable, immutableGuard, safeUpdate, IMMUTABLE_STATUSES } = require('../../../server/utils/audit-chain');

beforeEach(() => db.__resetMocks());

describe('appendAuditEntry', () => {
    test('creates entry with hash chain', async () => {
        db.get.mockResolvedValueOnce(null); // no previous entry
        db.run.mockResolvedValueOnce(undefined);

        const result = await appendAuditEntry({
            actor_id: 'user-1',
            action: 'LOGIN',
            entity_type: 'session',
            entity_id: 'sess-1',
            details: { ip: '127.0.0.1' },
            ip: '127.0.0.1',
        });

        expect(result.id).toBeDefined();
        expect(result.entry_hash).toBeDefined();
        expect(result.entry_hash).toHaveLength(64); // SHA-256 hex
        expect(result.prev_hash).toBe('0'); // genesis
        expect(db.run).toHaveBeenCalled();
    });

    test('chains to previous hash', async () => {
        db.get.mockResolvedValueOnce({ entry_hash: 'abc123' });
        db.run.mockResolvedValueOnce(undefined);

        const result = await appendAuditEntry({
            actor_id: 'user-1',
            action: 'TEST',
            entity_type: 'test',
            entity_id: 'e-1',
        });

        expect(result.prev_hash).toBe('abc123');
    });

    test('stringifies object details', async () => {
        db.get.mockResolvedValueOnce(null);
        db.run.mockResolvedValueOnce(undefined);

        await appendAuditEntry({
            actor_id: 'u1',
            action: 'ACT',
            entity_type: 't',
            entity_id: 'e',
            details: { key: 'value' },
        });

        const args = db.run.mock.calls[0][1];
        expect(args[5]).toContain('"key":"value"');
    });

    test('falls back to insert without hash columns on error', async () => {
        db.get.mockResolvedValueOnce(null);
        db.run
            .mockRejectedValueOnce(new Error('column entry_hash does not exist'))
            .mockResolvedValueOnce(undefined);

        const result = await appendAuditEntry({
            actor_id: 'u1',
            action: 'ACT',
            entity_type: 't',
            entity_id: 'e',
        });

        expect(db.run).toHaveBeenCalledTimes(2);
        expect(result.entry_hash).toBeDefined();
    });

    test('defaults actor_id to system', async () => {
        db.get.mockResolvedValueOnce(null);
        db.run.mockResolvedValueOnce(undefined);

        await appendAuditEntry({ action: 'SYS', entity_type: 't', entity_id: 'e' });
        const args = db.run.mock.calls[0][1];
        expect(args[1]).toBe('system');
    });
});

describe('verifyChain', () => {
    test('returns valid for empty chain', async () => {
        db.all.mockResolvedValueOnce([]);
        const result = await verifyChain();
        expect(result.valid).toBe(true);
        expect(result.entries_checked).toBe(0);
    });

    test('verifies valid single entry chain', async () => {
        const payload = 'user1|LOGIN|session|s1|{}|2026-01-01T00:00:00.000Z';
        const hash = crypto.createHash('sha256').update('0|' + payload).digest('hex');

        db.all.mockResolvedValueOnce([{
            id: '1',
            actor_id: 'user1',
            action: 'LOGIN',
            entity_type: 'session',
            entity_id: 's1',
            details: '{}',
            timestamp: '2026-01-01T00:00:00.000Z',
            prev_hash: '0',
            entry_hash: hash,
        }]);

        const result = await verifyChain();
        expect(result.valid).toBe(true);
        expect(result.entries_checked).toBe(1);
    });

    test('detects tampered entry', async () => {
        db.all.mockResolvedValueOnce([{
            id: '1',
            actor_id: 'user1',
            action: 'LOGIN',
            entity_type: 'session',
            entity_id: 's1',
            details: '{}',
            timestamp: '2026-01-01T00:00:00.000Z',
            prev_hash: '0',
            entry_hash: 'tampered-hash',
        }]);

        const result = await verifyChain();
        expect(result.valid).toBe(false);
        expect(result.reason).toBe('Hash mismatch');
    });

    test('handles DB error gracefully', async () => {
        db.all.mockRejectedValueOnce(new Error('DB down'));
        const result = await verifyChain();
        expect(result.valid).toBe(false);
        expect(result.error).toBe('DB down');
    });
});

describe('IMMUTABLE_STATUSES', () => {
    test('contains expected statuses', () => {
        expect(IMMUTABLE_STATUSES.has('verified')).toBe(true);
        expect(IMMUTABLE_STATUSES.has('sealed')).toBe(true);
        expect(IMMUTABLE_STATUSES.has('approved')).toBe(true);
        expect(IMMUTABLE_STATUSES.has('recalled')).toBe(true);
        expect(IMMUTABLE_STATUSES.has('draft')).toBe(false);
    });
});

describe('guardImmutable', () => {
    test('returns immutable=true for sealed record', async () => {
        db.get.mockResolvedValueOnce({ current_status: 'sealed' });
        const result = await guardImmutable('batches', 'batch-1');
        expect(result.immutable).toBe(true);
        expect(result.status).toBe('sealed');
    });

    test('returns immutable=false for draft record', async () => {
        db.get.mockResolvedValueOnce({ current_status: 'draft' });
        const result = await guardImmutable('batches', 'batch-1');
        expect(result.immutable).toBe(false);
    });

    test('returns immutable=false for not found', async () => {
        db.get.mockResolvedValueOnce(null);
        const result = await guardImmutable('batches', 'missing');
        expect(result.immutable).toBe(false);
        expect(result.message).toBe('Record not found');
    });

    test('handles DB error gracefully', async () => {
        db.get.mockRejectedValueOnce(new Error('DB error'));
        const result = await guardImmutable('batches', 'batch-1');
        expect(result.immutable).toBe(false);
    });
});

describe('immutableGuard middleware', () => {
    test('calls next() for mutable record', async () => {
        db.get.mockResolvedValueOnce({ current_status: 'draft' });
        const middleware = immutableGuard('batches');
        const req = { params: { id: 'batch-1' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await middleware(req, res, next);
        expect(next).toHaveBeenCalled();
    });

    test('returns 409 for immutable record', async () => {
        db.get.mockResolvedValueOnce({ current_status: 'verified' });
        const middleware = immutableGuard('batches');
        const req = { params: { id: 'batch-1' } };
        const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        const next = jest.fn();

        await middleware(req, res, next);
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            code: 'IMMUTABLE_RECORD',
        }));
    });

    test('calls next() when no id param', async () => {
        const middleware = immutableGuard('batches');
        const req = { params: {} };
        const next = jest.fn();

        await middleware(req, {}, next);
        expect(next).toHaveBeenCalled();
    });
});

describe('recordMutation', () => {
    test('records diff between before and after', async () => {
        db.get.mockResolvedValueOnce(null); // prev hash
        db.run.mockResolvedValue(undefined);

        await recordMutation(
            { user: { id: 'u1' }, ip: '1.2.3.4' },
            'products',
            'p-1',
            { name: 'Old', price: 10 },
            { name: 'New', price: 10 },
            'name change'
        );

        expect(db.run).toHaveBeenCalled();
    });

    test('handles null before/after', async () => {
        db.get.mockResolvedValueOnce(null);
        db.run.mockResolvedValue(undefined);

        await expect(
            recordMutation({ user: { id: 'u1' } }, 'products', 'p-1', null, null)
        ).resolves.not.toThrow();
    });
});

describe('safeUpdate', () => {
    test('performs snapshot → update → diff', async () => {
        const before = { id: 'p1', name: 'Old', org_id: 'org-1' };
        const after = { id: 'p1', name: 'New', org_id: 'org-1' };

        // safeUpdate calls:
        // 1. db.get(SELECT * FROM products WHERE id=?) → before
        // 2. snapshotVersion → db.get(SELECT MAX(version)...) → { max_v: 0 }
        // 3. snapshotVersion → db.run(UPDATE record_versions SET status...)
        // 4. snapshotVersion → db.run(INSERT INTO record_versions)
        // 5. updateFn()
        // 6. db.get(SELECT * FROM products WHERE id=?) → after
        // 7. recordMutation → appendAuditEntry → db.get(prev hash) → null
        // 8. recordMutation → appendAuditEntry → db.run(INSERT INTO audit_log)
        db.get
            .mockResolvedValueOnce(before)           // 1
            .mockResolvedValueOnce({ max_v: 0 })     // 2
            .mockResolvedValueOnce(after)             // 6
            .mockResolvedValueOnce(null);             // 7 (prev hash)

        db.run.mockResolvedValue(undefined);

        const updateFn = jest.fn().mockResolvedValue(undefined);
        const result = await safeUpdate({ user: { id: 'u1' }, orgId: 'org-1' }, 'products', 'p1', updateFn, 'test');

        expect(updateFn).toHaveBeenCalled();
        expect(result.before).toEqual(before);
        expect(result.after).toEqual(after);
    });

    test('throws if record not found', async () => {
        db.get.mockResolvedValueOnce(null);
        await expect(
            safeUpdate({}, 'products', 'missing', jest.fn())
        ).rejects.toThrow('Record missing not found');
    });
});
