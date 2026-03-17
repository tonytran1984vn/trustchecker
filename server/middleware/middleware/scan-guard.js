/**
 * Scan Guard Middleware v1.0
 * ATK-05: Anti-scan-flooding (velocity + device dedup)
 * ATK-07: QR replay detection (geo + velocity checks)
 */
const db = require('../db');

// In-memory sliding windows (per product)
const scanWindows = new Map();  // productId → [{ts, ip, device, lat, lon}]
const WINDOW_MS = 3600000;      // 1 hour
const MAX_SCANS_PER_HOUR = 100; // Per product
const MAX_SAME_DEVICE = 10;     // Same device+product per hour
const GEO_ALERT_KM = 5000;     // Flag if same QR scanned >5000km apart in <24h

// Cleanup stale entries every 10 min
setInterval(() => {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [key, scans] of scanWindows) {
        const filtered = scans.filter(s => s.ts > cutoff);
        if (filtered.length === 0) scanWindows.delete(key);
        else scanWindows.set(key, filtered);
    }
}, 600000).unref();

function haversineKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

function scanGuard() {
    return async (req, res, next) => {
        // Only apply to scan/validate endpoints
        if (!req.body?.qr_data && !req.body?.product_id) return next();

        const productId = req.body.product_id || 'unknown';
        const device = req.body.device_fingerprint || '';
        const ip = req.ip || req.body.ip_address || '';
        const lat = parseFloat(req.body.latitude) || 0;
        const lon = parseFloat(req.body.longitude) || 0;
        const now = Date.now();

        // Get/init window
        if (!scanWindows.has(productId)) scanWindows.set(productId, []);
        const window = scanWindows.get(productId);

        // Clean old entries
        const cutoff = now - WINDOW_MS;
        while (window.length > 0 && window[0].ts < cutoff) window.shift();

        // ATK-05: Velocity check
        if (window.length >= MAX_SCANS_PER_HOUR) {
            console.warn(`[SCAN-GUARD] Velocity limit: product=${productId} scans=${window.length}/hr`);
            return res.status(429).json({
                error: 'Scan rate limit exceeded',
                message: 'This product has been scanned too frequently. Try again later.',
                code: 'SCAN_VELOCITY_LIMIT',
            });
        }

        // ATK-05: Device dedup
        const sameDeviceCount = window.filter(s => s.device === device && device).length;
        if (sameDeviceCount >= MAX_SAME_DEVICE) {
            console.warn(`[SCAN-GUARD] Device dedup: product=${productId} device=${device.slice(0,8)}...`);
            // Don't block — but mark scan as low-weight for trust calculation
            req.scanWeight = 0.1;
            req.scanFlags = (req.scanFlags || []).concat('duplicate_device');
        }

        // ATK-07: Geo-velocity check (same QR, far apart, short time)
        if (lat && lon && window.length > 0) {
            const recentWithGeo = window.filter(s => s.lat && s.lon).slice(-5);
            for (const prev of recentWithGeo) {
                const dist = haversineKm(prev.lat, prev.lon, lat, lon);
                const timeDiffHours = (now - prev.ts) / 3600000;
                if (dist > GEO_ALERT_KM && timeDiffHours < 24) {
                    console.warn(`[SCAN-GUARD] Geo anomaly: product=${productId} dist=${Math.round(dist)}km in ${timeDiffHours.toFixed(1)}h`);
                    req.scanFlags = (req.scanFlags || []).concat('geo_anomaly');
                    // Log to fraud_alerts
                    try {
                        await db.run(
                            "INSERT INTO fraud_alerts (id, product_id, alert_type, severity, details, created_at) VALUES ($1, $2, $3, $4, $5, NOW())",
                            [require('crypto').randomUUID(), productId, 'qr_replay_geo', 'high',
                             JSON.stringify({ distance_km: Math.round(dist), time_hours: timeDiffHours.toFixed(1), locations: [{lat: prev.lat, lon: prev.lon}, {lat, lon}] })]
                        );
                    } catch(e) {}
                    break;
                }
            }
        }

        // Record this scan
        window.push({ ts: now, ip, device, lat, lon });

        next();
    };
}

module.exports = { scanGuard };
