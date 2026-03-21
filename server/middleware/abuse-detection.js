/**
 * v9.5.0: Platform Abuse Detection Middleware
 * Detects unusual creation patterns and flags for investigation
 */

const THRESHOLDS = {
    products_per_hour: 50,
    suppliers_per_hour: 10,
    incidents_per_hour: 50,
    ratings_per_hour: 30,
    certs_per_hour: 20,
};

// In-memory sliding window (per org)
const orgActivity = new Map();

function trackActivity(orgId, type) {
    const key = `${orgId}:${type}`;
    const now = Date.now();

    if (!orgActivity.has(key)) {
        orgActivity.set(key, []);
    }

    const window = orgActivity.get(key);
    window.push(now);

    // Clean old entries (>1 hour)
    const cutoff = now - 3600000;
    while (window.length > 0 && window[0] < cutoff) {
        window.shift();
    }

    return window.length;
}

function checkAbuse(type) {
    return (req, res, next) => {
        const orgId = req.orgId || req.user?.org_id || req.user?.orgId;
        if (!orgId) return next();

        const count = trackActivity(orgId, type);
        const threshold = THRESHOLDS[type] || 50;

        if (count > threshold) {
            console.warn(`[ABUSE] Org ${orgId}: ${count} ${type} in 1h (threshold: ${threshold})`);
            return res.status(429).json({
                error: `Rate limit exceeded: ${type}`,
                limit: threshold,
                current: count,
                retry_after: '1 hour',
            });
        }

        // Warning at 80% — log but allow
        if (count > threshold * 0.8) {
            console.warn(`[ABUSE-WARN] Org ${orgId}: ${count}/${threshold} ${type} in 1h`);
        }

        next();
    };
}

// Periodic cleanup (every 10 min)
setInterval(() => {
    const cutoff = Date.now() - 3600000;
    for (const [key, window] of orgActivity) {
        while (window.length > 0 && window[0] < cutoff) window.shift();
        if (window.length === 0) orgActivity.delete(key);
    }
}, 600000);

module.exports = { checkAbuse, trackActivity, THRESHOLDS };
