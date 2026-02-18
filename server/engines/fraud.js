/**
 * TrustChecker Fraud Detection Engine
 * Multi-layer fraud detection: rule-based + statistical anomaly detection
 */

const db = require('../db');
const { v4: uuidv4 } = require('uuid');
const { eventBus, EVENT_TYPES } = require('../events');

class FraudEngine {
    constructor() {
        // Thresholds
        this.SCAN_FREQUENCY_THRESHOLD = 10;      // max scans per hour per QR
        this.SCAN_BURST_THRESHOLD = 5;           // max scans in 5 minutes
        this.GEO_DISTANCE_THRESHOLD = 500;       // km in 1 hour = suspicious
        this.DUPLICATE_DEVICE_THRESHOLD = 3;     // same device, different locations
        this.ZSCORE_THRESHOLD = 2.5;             // statistical anomaly threshold
    }

    /**
     * Run full fraud analysis on a scan event
     * Returns { fraudScore: 0-1, alerts: [], factors: {} }
     */
    analyze(scanEvent) {
        const startTime = Date.now();
        const alerts = [];
        const factors = {};

        // Layer 1: Rule-based detection
        const ruleResults = this.runRules(scanEvent);
        alerts.push(...ruleResults.alerts);
        factors.rules = ruleResults.score;

        // Layer 2: Statistical anomaly detection
        const statResults = this.runStatistical(scanEvent);
        alerts.push(...statResults.alerts);
        factors.statistical = statResults.score;

        // Layer 3: Pattern-based detection
        const patternResults = this.runPatterns(scanEvent);
        alerts.push(...patternResults.alerts);
        factors.patterns = patternResults.score;

        // Composite fraud score (weighted average)
        const fraudScore = Math.min(1, (
            factors.rules * 0.4 +
            factors.statistical * 0.35 +
            factors.patterns * 0.25
        ));

        // Save alerts to database
        alerts.forEach(alert => {
            const alertId = uuidv4();
            db.prepare(`
        INSERT INTO fraud_alerts (id, scan_event_id, product_id, alert_type, severity, description, details)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
                alertId,
                scanEvent.id,
                scanEvent.product_id,
                alert.type,
                alert.severity,
                alert.description,
                JSON.stringify(alert.details || {})
            );

            // Broadcast fraud alert
            eventBus.emitEvent(EVENT_TYPES.FRAUD_FLAGGED, {
                alert_id: alertId,
                scan_event_id: scanEvent.id,
                product_id: scanEvent.product_id,
                type: alert.type,
                severity: alert.severity,
                description: alert.description,
                fraud_score: fraudScore
            });
        });

        const processingTime = Date.now() - startTime;

        return {
            fraudScore,
            alerts,
            factors,
            processingTimeMs: processingTime,
            explainability: this.explain(factors, alerts)
        };
    }

    /** Layer 1: Rule-based detection */
    runRules(scanEvent) {
        const alerts = [];
        let score = 0;

        // Rule 1: Scan frequency check (hourly)
        const hourlyScans = db.prepare(`
      SELECT COUNT(*) as count FROM scan_events
      WHERE qr_code_id = ? AND scanned_at > datetime('now', '-1 hour')
    `).get(scanEvent.qr_code_id);

        if (hourlyScans && hourlyScans.count > this.SCAN_FREQUENCY_THRESHOLD) {
            score += 0.4;
            alerts.push({
                type: 'HIGH_FREQUENCY_SCAN',
                severity: 'high',
                description: `QR code scanned ${hourlyScans.count} times in the last hour (threshold: ${this.SCAN_FREQUENCY_THRESHOLD})`,
                details: { count: hourlyScans.count, threshold: this.SCAN_FREQUENCY_THRESHOLD }
            });
        }

        // Rule 2: Burst detection (5 scans in 5 minutes)
        const burstScans = db.prepare(`
      SELECT COUNT(*) as count FROM scan_events
      WHERE qr_code_id = ? AND scanned_at > datetime('now', '-5 minutes')
    `).get(scanEvent.qr_code_id);

        if (burstScans && burstScans.count > this.SCAN_BURST_THRESHOLD) {
            score += 0.3;
            alerts.push({
                type: 'SCAN_BURST',
                severity: 'critical',
                description: `Burst detected: ${burstScans.count} scans in 5 minutes`,
                details: { count: burstScans.count }
            });
        }

        // Rule 3: Expired QR code
        const qr = db.prepare('SELECT * FROM qr_codes WHERE id = ?').get(scanEvent.qr_code_id);
        if (qr && qr.status === 'revoked') {
            score += 0.8;
            alerts.push({
                type: 'REVOKED_QR',
                severity: 'critical',
                description: 'Attempted scan of a revoked QR code',
                details: { qr_status: qr.status }
            });
        }

        // Rule 4: Product status check
        const product = db.prepare('SELECT * FROM products WHERE id = ?').get(scanEvent.product_id);
        if (product && product.status === 'recalled') {
            score += 0.6;
            alerts.push({
                type: 'RECALLED_PRODUCT',
                severity: 'high',
                description: 'Scan of a recalled product',
                details: { product_status: product.status }
            });
        }

        return { score: Math.min(1, score), alerts };
    }

    /** Layer 2: Statistical anomaly detection */
    runStatistical(scanEvent) {
        const alerts = [];
        let score = 0;

        // Get historical scan frequency for this product
        const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_scans,
        AVG(CAST(julianday('now') - julianday(scanned_at) AS REAL)) as avg_interval
      FROM scan_events 
      WHERE product_id = ? AND scanned_at > datetime('now', '-30 days')
    `).get(scanEvent.product_id);

        if (stats && stats.total_scans > 5) {
            // Daily scan rate
            const dailyStats = db.prepare(`
        SELECT DATE(scanned_at) as day, COUNT(*) as count
        FROM scan_events
        WHERE product_id = ? AND scanned_at > datetime('now', '-30 days')
        GROUP BY DATE(scanned_at)
      `).all(scanEvent.product_id);

            if (dailyStats.length > 3) {
                const counts = dailyStats.map(d => d.count);
                const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
                const stdDev = Math.sqrt(counts.reduce((sum, c) => sum + Math.pow(c - mean, 2), 0) / counts.length);

                // Today's count
                const todayCount = db.prepare(`
          SELECT COUNT(*) as count FROM scan_events
          WHERE product_id = ? AND DATE(scanned_at) = DATE('now')
        `).get(scanEvent.product_id);

                if (stdDev > 0 && todayCount) {
                    const zScore = (todayCount.count - mean) / stdDev;
                    if (zScore > this.ZSCORE_THRESHOLD) {
                        score += 0.5;
                        alerts.push({
                            type: 'STATISTICAL_ANOMALY',
                            severity: 'medium',
                            description: `Scan frequency z-score ${zScore.toFixed(2)} exceeds threshold ${this.ZSCORE_THRESHOLD}`,
                            details: { z_score: zScore, mean, std_dev: stdDev, today_count: todayCount.count }
                        });
                    }
                }
            }
        }

        // Device fingerprint anomaly: same device scanning many different products
        if (scanEvent.device_fingerprint) {
            const deviceProducts = db.prepare(`
        SELECT COUNT(DISTINCT product_id) as unique_products
        FROM scan_events
        WHERE device_fingerprint = ? AND scanned_at > datetime('now', '-1 hour')
      `).get(scanEvent.device_fingerprint);

            if (deviceProducts && deviceProducts.unique_products > this.DUPLICATE_DEVICE_THRESHOLD) {
                score += 0.3;
                alerts.push({
                    type: 'DEVICE_ANOMALY',
                    severity: 'medium',
                    description: `Single device scanned ${deviceProducts.unique_products} different products in 1 hour`,
                    details: { unique_products: deviceProducts.unique_products }
                });
            }
        }

        return { score: Math.min(1, score), alerts };
    }

    /** Layer 3: Pattern-based detection */
    runPatterns(scanEvent) {
        const alerts = [];
        let score = 0;

        // Geo-velocity check: if same QR scanned from far apart locations quickly
        if (scanEvent.latitude && scanEvent.longitude) {
            const recentScan = db.prepare(`
        SELECT latitude, longitude, scanned_at 
        FROM scan_events
        WHERE qr_code_id = ? AND latitude IS NOT NULL AND id != ?
        ORDER BY scanned_at DESC LIMIT 1
      `).get(scanEvent.qr_code_id, scanEvent.id);

            if (recentScan && recentScan.latitude) {
                const distance = this.haversineDistance(
                    scanEvent.latitude, scanEvent.longitude,
                    recentScan.latitude, recentScan.longitude
                );
                const timeDiffHours = (Date.now() - new Date(recentScan.scanned_at).getTime()) / (1000 * 60 * 60);

                if (timeDiffHours < 1 && distance > this.GEO_DISTANCE_THRESHOLD) {
                    score += 0.7;
                    alerts.push({
                        type: 'GEO_VELOCITY_ANOMALY',
                        severity: 'critical',
                        description: `QR scanned ${distance.toFixed(0)}km apart within ${(timeDiffHours * 60).toFixed(0)} minutes`,
                        details: { distance_km: distance, time_hours: timeDiffHours }
                    });
                }
            }
        }

        // Time-of-day anomaly: scans at unusual hours (e.g., 2-5 AM)
        const hour = new Date().getHours();
        if (hour >= 2 && hour <= 5) {
            score += 0.1;
            alerts.push({
                type: 'OFF_HOURS_SCAN',
                severity: 'low',
                description: `Scan at unusual hour: ${hour}:00`,
                details: { hour }
            });
        }

        return { score: Math.min(1, score), alerts };
    }

    /** Haversine distance between two coordinates in km */
    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /** Generate explainability report */
    explain(factors, alerts) {
        const topFactors = Object.entries(factors)
            .sort((a, b) => b[1] - a[1])
            .map(([name, score]) => ({ factor: name, contribution: (score * 100).toFixed(1) + '%' }));

        return {
            top_factors: topFactors,
            alert_count: alerts.length,
            severity_breakdown: {
                critical: alerts.filter(a => a.severity === 'critical').length,
                high: alerts.filter(a => a.severity === 'high').length,
                medium: alerts.filter(a => a.severity === 'medium').length,
                low: alerts.filter(a => a.severity === 'low').length
            }
        };
    }
}

module.exports = new FraudEngine();
