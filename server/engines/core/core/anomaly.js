/**
 * Anomaly Detection Engine
 * Time-series pattern analysis for detecting unusual behavior across scan, fraud, and supply chain data
 */

class AnomalyDetector {
    constructor() {
        this.thresholds = {
            scan_velocity: { warning: 50, critical: 100 },  // scans per hour per product
            fraud_spike: { warning: 3, critical: 5 },        // fraud alerts per product per day
            trust_drop: { warning: 10, critical: 20 },       // trust score drop in points
            geo_dispersion: { warning: 3, critical: 5 },     // unique geolocations per hour
            batch_anomaly: { warning: 5, critical: 10 }      // unusual events per batch
        };
    }

    /**
     * Detect scan velocity anomalies — too many scans in a short window
     */
    detectScanVelocity(scanEvents, windowMinutes = 60) {
        const anomalies = [];
        const productGroups = {};

        scanEvents.forEach(scan => {
            const key = scan.product_id || 'unknown';
            if (!productGroups[key]) productGroups[key] = [];
            productGroups[key].push(new Date(scan.scanned_at || scan.created_at).getTime());
        });

        Object.entries(productGroups).forEach(([productId, times]) => {
            times.sort((a, b) => a - b);
            const windowMs = windowMinutes * 60 * 1000;

            for (let i = 0; i < times.length; i++) {
                const windowEnd = times[i] + windowMs;
                const count = times.filter(t => t >= times[i] && t <= windowEnd).length;

                if (count >= this.thresholds.scan_velocity.critical) {
                    anomalies.push({
                        type: 'scan_velocity',
                        severity: 'critical',
                        score: Math.min(1, count / (this.thresholds.scan_velocity.critical * 2)),
                        source_type: 'product',
                        source_id: productId,
                        description: `${count} scans in ${windowMinutes}min window (critical threshold: ${this.thresholds.scan_velocity.critical})`,
                        details: { count, window_minutes: windowMinutes, product_id: productId }
                    });
                    break; // One anomaly per product
                } else if (count >= this.thresholds.scan_velocity.warning) {
                    anomalies.push({
                        type: 'scan_velocity',
                        severity: 'warning',
                        score: count / (this.thresholds.scan_velocity.critical * 2),
                        source_type: 'product',
                        source_id: productId,
                        description: `${count} scans in ${windowMinutes}min — elevated velocity`,
                        details: { count, window_minutes: windowMinutes, product_id: productId }
                    });
                    break;
                }
            }
        });

        return anomalies;
    }

    /**
     * Detect fraud spikes — sudden increase in fraud alerts for a product
     */
    detectFraudSpikes(fraudAlerts) {
        const anomalies = [];
        const dailyGroups = {};

        fraudAlerts.forEach(alert => {
            const day = (alert.created_at || '').substring(0, 10);
            const key = `${alert.product_id}_${day}`;
            if (!dailyGroups[key]) dailyGroups[key] = { product_id: alert.product_id, day, count: 0 };
            dailyGroups[key].count++;
        });

        Object.values(dailyGroups).forEach(group => {
            if (group.count >= this.thresholds.fraud_spike.critical) {
                anomalies.push({
                    type: 'fraud_spike',
                    severity: 'critical',
                    score: Math.min(1, group.count / 10),
                    source_type: 'product',
                    source_id: group.product_id,
                    description: `${group.count} fraud alerts on ${group.day} (critical threshold: ${this.thresholds.fraud_spike.critical})`,
                    details: { count: group.count, day: group.day }
                });
            } else if (group.count >= this.thresholds.fraud_spike.warning) {
                anomalies.push({
                    type: 'fraud_spike',
                    severity: 'warning',
                    score: group.count / 10,
                    source_type: 'product',
                    source_id: group.product_id,
                    description: `${group.count} fraud alerts on ${group.day} — elevated`,
                    details: { count: group.count, day: group.day }
                });
            }
        });

        return anomalies;
    }

    /**
     * Detect trust score drops — sudden decrease in product trust
     */
    detectTrustDrops(trustScores) {
        const anomalies = [];
        const productGroups = {};

        trustScores.forEach(ts => {
            const key = ts.product_id;
            if (!productGroups[key]) productGroups[key] = [];
            productGroups[key].push({ score: ts.score, date: ts.calculated_at });
        });

        Object.entries(productGroups).forEach(([productId, scores]) => {
            scores.sort((a, b) => new Date(a.date) - new Date(b.date));
            if (scores.length < 2) return;

            const latest = scores[scores.length - 1].score;
            const previous = scores[scores.length - 2].score;
            const drop = previous - latest;

            if (drop >= this.thresholds.trust_drop.critical) {
                anomalies.push({
                    type: 'trust_drop',
                    severity: 'critical',
                    score: Math.min(1, drop / 50),
                    source_type: 'product',
                    source_id: productId,
                    description: `Trust score dropped ${drop} points (${previous} → ${latest})`,
                    details: { previous_score: previous, current_score: latest, drop }
                });
            } else if (drop >= this.thresholds.trust_drop.warning) {
                anomalies.push({
                    type: 'trust_drop',
                    severity: 'warning',
                    score: drop / 50,
                    source_type: 'product',
                    source_id: productId,
                    description: `Trust score declined ${drop} points`,
                    details: { previous_score: previous, current_score: latest, drop }
                });
            }
        });

        return anomalies;
    }

    /**
     * Detect geographic dispersion anomalies — product scanned from many locations in a short time
     */
    detectGeoDispersion(scanEvents, windowHours = 1) {
        const anomalies = [];
        const productWindows = {};

        scanEvents.forEach(scan => {
            if (!scan.latitude || !scan.longitude) return;
            const key = scan.product_id;
            if (!productWindows[key]) productWindows[key] = [];
            productWindows[key].push({
                lat: scan.latitude,
                lng: scan.longitude,
                time: new Date(scan.scanned_at || scan.created_at).getTime()
            });
        });

        Object.entries(productWindows).forEach(([productId, points]) => {
            points.sort((a, b) => a.time - b.time);
            const windowMs = windowHours * 3600000;

            for (let i = 0; i < points.length; i++) {
                const windowEnd = points[i].time + windowMs;
                const inWindow = points.filter(p => p.time >= points[i].time && p.time <= windowEnd);
                const uniqueLocations = new Set(inWindow.map(p => `${Math.round(p.lat)},${Math.round(p.lng)}`));

                if (uniqueLocations.size >= this.thresholds.geo_dispersion.critical) {
                    anomalies.push({
                        type: 'geo_dispersion',
                        severity: 'critical',
                        score: Math.min(1, uniqueLocations.size / 10),
                        source_type: 'product',
                        source_id: productId,
                        description: `Scanned from ${uniqueLocations.size} different locations within ${windowHours}h`,
                        details: { unique_locations: uniqueLocations.size, window_hours: windowHours }
                    });
                    break;
                }
            }
        });

        return anomalies;
    }

    /**
     * Run full anomaly scan across all data sources
     */
    runFullScan(data) {
        const { scans = [], fraudAlerts = [], trustScores = [] } = data;
        const allAnomalies = [
            ...this.detectScanVelocity(scans),
            ...this.detectFraudSpikes(fraudAlerts),
            ...this.detectTrustDrops(trustScores),
            ...this.detectGeoDispersion(scans)
        ];

        // Sort by severity then score
        const severityOrder = { critical: 0, warning: 1, info: 2 };
        allAnomalies.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3) || b.score - a.score);

        return {
            total: allAnomalies.length,
            critical: allAnomalies.filter(a => a.severity === 'critical').length,
            warning: allAnomalies.filter(a => a.severity === 'warning').length,
            anomalies: allAnomalies,
            scanned_at: new Date().toISOString()
        };
    }
}

module.exports = new AnomalyDetector();
