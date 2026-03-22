/**
 * Database Mock — jest.mock() compatible
 *
 * Usage in test files:
 *   jest.mock('../../server/db', () => require('../helpers/db-mock'));
 *
 * Then in tests:
 *   const db = require('../../server/db');
 *   db.get.mockResolvedValueOnce({ id: '1', name: 'Test' });
 */

const db = {
    get: jest.fn().mockResolvedValue(null),
    all: jest.fn().mockResolvedValue([]),
    run: jest.fn().mockResolvedValue(undefined),
    prepare: jest.fn().mockReturnValue({
        run: jest.fn().mockResolvedValue(undefined),
        get: jest.fn().mockResolvedValue(null),
        all: jest.fn().mockResolvedValue([]),
    }),
    save: jest.fn().mockResolvedValue(undefined),
    _readyPromise: Promise.resolve(),

    // Helper: reset all mocks
    __resetMocks() {
        this.get.mockReset().mockResolvedValue(null);
        this.all.mockReset().mockResolvedValue([]);
        this.run.mockReset().mockResolvedValue(undefined);
        const prepared = {
            run: jest.fn().mockResolvedValue(undefined),
            get: jest.fn().mockResolvedValue(null),
            all: jest.fn().mockResolvedValue([]),
        };
        this.prepare.mockReset().mockReturnValue(prepared);
        this.save.mockReset().mockResolvedValue(undefined);
    },

    // Helper: get the last prepared statement mock
    __lastPrepared() {
        return this.prepare.mock.results[this.prepare.mock.results.length - 1]?.value;
    },
};

module.exports = db;
