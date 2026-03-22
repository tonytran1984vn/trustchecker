const { getMetrics } = require('../../../server/middleware/metrics');

describe('getMetrics', () => {
    test('returns uptime_seconds', () => {
        const m = getMetrics();
        expect(m).toHaveProperty('uptime_seconds');
        expect(typeof m.uptime_seconds).toBe('number');
    });

    test('returns total_requests', () => {
        expect(getMetrics()).toHaveProperty('total_requests');
    });

    test('returns total_errors', () => {
        expect(getMetrics()).toHaveProperty('total_errors');
    });

    test('returns error_rate as percentage', () => {
        expect(getMetrics().error_rate).toMatch(/%$/);
    });

    test('returns latency percentiles', () => {
        const m = getMetrics();
        expect(m.latency).toHaveProperty('p50');
        expect(m.latency).toHaveProperty('p95');
        expect(m.latency).toHaveProperty('p99');
    });

    test('returns top_slow_endpoints array', () => {
        expect(Array.isArray(getMetrics().top_slow_endpoints)).toBe(true);
    });
});
