/**
 * Real-time Anomaly Detection Engine
 * 5 Rules — runs on every event insert.
 */
const db = require('../db');

const RULES = {
    MULTI_LOCATION: { severity: 'CRITICAL', threshold: 1 },
    MULTI_SCAN:     { severity: 'HIGH',     threshold: 5 },
    GEO_VELOCITY:   { severity: 'HIGH',     threshold: 300000 }, // 5 min in ms
    ROLE_VIOLATION:  { severity: 'CRITICAL' },
    TIME_TRAVEL:     { severity: 'HIGH' },
};

class AnomalyEngine {
    constructor() {
        this.alerts = [];
    }

    async checkEvent(productId, eventType, actorId, locationId, orgId) {
        const detectedAlerts = [];

        // Rule 1: Multi-location violation
        try {
            const locations = await db.all(
                "SELECT DISTINCT location_id FROM product_events WHERE product_id = $1 AND event_type IN ('receive','RECEIVED_WAREHOUSE','RECEIVED_RETAIL') AND created_at > NOW() - INTERVAL '1 hour'",
                [productId]
            );
            if (locations && locations.length > 1) {
                detectedAlerts.push({ rule: 'MULTI_LOCATION', severity: 'CRITICAL', detail: 'Product at ' + locations.length + ' locations within 1 hour', locations: locations.map(l => l.location_id) });
            }
        } catch(_) {}

        // Rule 2: Multi-scan anomaly (handled by TC-21 fix, just log here)
        // (Delegated to qr_scan_fingerprints / checkQrReuse)

        // Rule 3: Rapid events (potential automation)
        try {
            const recent = await db.get(
                "SELECT COUNT(*) as c FROM product_events WHERE product_id = $1 AND created_at > NOW() - INTERVAL '1 minute'",
                [productId]
            );
            if (recent && recent.c > 5) {
                detectedAlerts.push({ rule: 'RAPID_EVENTS', severity: 'HIGH', detail: recent.c + ' events in 1 minute for product ' + productId.substring(0, 8) });
            }
        } catch(_) {}

        // Rule 4: Time travel (event before previous)
        try {
            const last2 = await db.all(
                'SELECT created_at FROM product_events WHERE product_id = $1 ORDER BY created_at DESC LIMIT 2',
                [productId]
            );
            if (last2 && last2.length === 2) {
                if (new Date(last2[0].created_at) < new Date(last2[1].created_at)) {
                    detectedAlerts.push({ rule: 'TIME_TRAVEL', severity: 'HIGH', detail: 'Latest event timestamp is before previous event' });
                }
            }
        } catch(_) {}

        // Rule 5: Actor pattern anomaly (same actor too many different products)
        try {
            if (actorId && actorId !== 'system') {
                const actorProducts = await db.get(
                    "SELECT COUNT(DISTINCT product_id) as c FROM product_events WHERE actor_id = $1 AND created_at > NOW() - INTERVAL '5 minutes'",
                    [actorId]
                );
                if (actorProducts && actorProducts.c > 50) {
                    detectedAlerts.push({ rule: 'BULK_ACTOR', severity: 'MEDIUM', detail: 'Actor ' + actorId.substring(0, 8) + ' touched ' + actorProducts.c + ' products in 5 min' });
                }
            }
        } catch(_) {}

        // Store alerts
        for (const alert of detectedAlerts) {
            this.alerts.push({ ...alert, productId, eventType, timestamp: new Date().toISOString() });
            // Persist to audit_log
            try {
                await db.run(
                    "INSERT INTO audit_log (id, user_id, action, resource_type, resource_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6, $7)",
                    [require('uuid').v4(), actorId || 'system', 'ANOMALY_' + alert.rule, 'product', productId, JSON.stringify(alert), '']
                );
            } catch(_) {}
        }

        // Trim in-memory alerts (keep last 1000)
        if (this.alerts.length > 1000) this.alerts = this.alerts.slice(-500);

        return detectedAlerts;
    }

    getAlerts(limit = 50) {
        return this.alerts.slice(-limit);
    }

    getStats() {
        const byRule = {};
        for (const a of this.alerts) {
            byRule[a.rule] = (byRule[a.rule] || 0) + 1;
        }
        return { total: this.alerts.length, byRule };
    }
}

module.exports = new AnomalyEngine();
