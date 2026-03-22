const { withTransaction } = require('../../../server/middleware/transaction');

describe('withTransaction', () => {
    test('calls callback with db when no pool', async () => {
        const mockDb = {
            _pool: null,
            run: jest.fn().mockResolvedValue(undefined),
        };
        const callback = jest.fn().mockResolvedValue('result');
        const result = await withTransaction(mockDb, callback);
        expect(callback).toHaveBeenCalledWith(mockDb);
        expect(result).toBe('result');
    });

    test('calls BEGIN and COMMIT', async () => {
        const mockDb = {
            _pool: null,
            run: jest.fn().mockResolvedValue(undefined),
        };
        await withTransaction(mockDb, jest.fn().mockResolvedValue(undefined));
        expect(mockDb.run.mock.calls[0][0]).toBe('BEGIN');
        expect(mockDb.run.mock.calls[1][0]).toBe('COMMIT');
    });

    test('calls ROLLBACK on error', async () => {
        const mockDb = {
            _pool: null,
            run: jest.fn().mockResolvedValue(undefined),
        };
        const err = new Error('fail');
        await expect(withTransaction(mockDb, () => { throw err; })).rejects.toThrow('fail');
        expect(mockDb.run.mock.calls[1][0]).toBe('ROLLBACK');
    });

    test('uses pool.connect when pool available', async () => {
        const mockClient = {
            query: jest.fn().mockResolvedValue({ rows: [] }),
            release: jest.fn(),
        };
        const mockDb = {
            _pool: { connect: jest.fn().mockResolvedValue(mockClient) },
        };
        await withTransaction(mockDb, jest.fn().mockResolvedValue('ok'));
        expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
        expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
        expect(mockClient.release).toHaveBeenCalled();
    });

    test('releases client on pool error', async () => {
        const mockClient = {
            query: jest.fn().mockResolvedValue(undefined),
            release: jest.fn(),
        };
        const mockDb = {
            _pool: { connect: jest.fn().mockResolvedValue(mockClient) },
        };
        await expect(
            withTransaction(mockDb, () => { throw new Error('tx fail'); })
        ).rejects.toThrow('tx fail');
        expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
        expect(mockClient.release).toHaveBeenCalled();
    });
});
