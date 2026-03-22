const { updateWithLock } = require('../../../server/middleware/optimistic-lock');

describe('updateWithLock', () => {
    test('builds correct SET clause', async () => {
        const mockDb = {
            run: jest.fn().mockResolvedValue({ changes: 1, rowCount: 1 }),
        };
        await updateWithLock(mockDb, 'products', 'p-1', 'org-1', 1, { name: 'New', status: 'active' });
        const sql = mockDb.run.mock.calls[0][0];
        expect(sql).toContain('name = $1');
        expect(sql).toContain('status = $2');
        expect(sql).toContain('version = version + 1');
        expect(sql).toContain('updated_at = NOW()');
    });

    test('passes correct params', async () => {
        const mockDb = {
            run: jest.fn().mockResolvedValue({ changes: 1 }),
        };
        await updateWithLock(mockDb, 'table', 'id-1', 'org-1', 5, { title: 'T' });
        const params = mockDb.run.mock.calls[0][1];
        expect(params).toContain('T');      // update value
        expect(params).toContain('id-1');   // id
        expect(params).toContain('org-1');  // org_id
        expect(params).toContain(5);        // expected version
    });

    test('throws 409 on conflict (changes=0)', async () => {
        const mockDb = {
            run: jest.fn().mockResolvedValue({ changes: 0 }),
        };
        await expect(updateWithLock(mockDb, 'table', 'id', 'org', 1, { x: 1 }))
            .rejects.toThrow('Conflict');
    });

    test('throws 409 on conflict (rowCount=0)', async () => {
        const mockDb = {
            run: jest.fn().mockResolvedValue({ rowCount: 0 }),
        };
        try {
            await updateWithLock(mockDb, 'table', 'id', 'org', 1, { x: 1 });
            expect(true).toBe(false); // should not reach
        } catch (e) {
            expect(e.status).toBe(409);
            expect(e.code).toBe('OPTIMISTIC_LOCK_CONFLICT');
        }
    });

    test('returns result on success', async () => {
        const mockDb = {
            run: jest.fn().mockResolvedValue({ changes: 1 }),
        };
        const result = await updateWithLock(mockDb, 'table', 'id', 'org', 1, { x: 1 });
        expect(result.changes).toBe(1);
    });
});
