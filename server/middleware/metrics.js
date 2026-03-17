/**
 * API Metrics Middleware v1.0
 * Tracks request counts, latencies, error rates per endpoint.
 */
const metrics = {
    requests: 0,
    errors: 0,
    latencies: [],  // last 1000 latencies
    byPath: {},     // path → { count, errors, totalMs }
    startTime: Date.now(),
};

function metricsMiddleware() {
    return (req, res, next) => {
        const start = Date.now();
        metrics.requests++;

        res.on('finish', () => {
            const duration = Date.now() - start;
            const path = req.route?.path || req.path;

            // Track errors
            if (res.statusCode >= 500) metrics.errors++;

            // Track per-path
            if (!metrics.byPath[path]) metrics.byPath[path] = { count: 0, errors: 0, totalMs: 0 };
            metrics.byPath[path].count++;
            metrics.byPath[path].totalMs += duration;
            if (res.statusCode >= 500) metrics.byPath[path].errors++;

            // Keep last 1000 latencies
            metrics.latencies.push(duration);
            if (metrics.latencies.length > 1000) metrics.latencies.shift();
        });

        next();
    };
}

function getMetrics() {
    const sorted = metrics.latencies.slice().sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
    const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
    const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;

    // Top 10 slowest endpoints
    const topSlow = Object.entries(metrics.byPath)
        .map(([path, data]) => ({ path, ...data, avgMs: Math.round(data.totalMs / data.count) }))
        .sort((a, b) => b.avgMs - a.avgMs)
        .slice(0, 10);

    return {
        uptime_seconds: Math.floor((Date.now() - metrics.startTime) / 1000),
        total_requests: metrics.requests,
        total_errors: metrics.errors,
        error_rate: metrics.requests ? Math.round((metrics.errors / metrics.requests) * 10000) / 100 + '%' : '0%',
        latency: { p50, p95, p99 },
        top_slow_endpoints: topSlow,
    };
}

module.exports = { metricsMiddleware, getMetrics };
