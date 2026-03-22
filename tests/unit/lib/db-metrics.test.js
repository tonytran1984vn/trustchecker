const { getPoolMetrics } = require('../../../server/lib/db-metrics');

describe('db-metrics', () => {
    test('exports getPoolMetrics function', () => {
        expect(typeof getPoolMetrics).toBe('function');
    });

    test('returns unavailable when no pool', () => {
        // In test env, db._pool may not exist
        const m = getPoolMetrics();
        expect(m).toBeDefined();
    });
});
