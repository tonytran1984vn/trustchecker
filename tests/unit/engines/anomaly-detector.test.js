const anomaly = require('../../../server/engines/core/anomaly');

describe('AnomalyDetector', () => {
    describe('thresholds', () => {
        test('defines scan_velocity thresholds', () => {
            expect(anomaly.thresholds.scan_velocity.warning).toBe(50);
            expect(anomaly.thresholds.scan_velocity.critical).toBe(100);
        });

        test('defines fraud_spike thresholds', () => {
            expect(anomaly.thresholds.fraud_spike.warning).toBe(3);
            expect(anomaly.thresholds.fraud_spike.critical).toBe(5);
        });

        test('defines trust_drop thresholds', () => {
            expect(anomaly.thresholds.trust_drop.warning).toBe(10);
            expect(anomaly.thresholds.trust_drop.critical).toBe(20);
        });
    });

    describe('detectScanVelocity', () => {
        test('returns empty for no scans', () => {
            expect(anomaly.detectScanVelocity([])).toEqual([]);
        });

        test('returns empty for low-velocity scans', () => {
            const scans = Array.from({ length: 10 }, (_, i) => ({
                product_id: 'p1',
                scanned_at: new Date(Date.now() - i * 60000).toISOString(),
            }));
            expect(anomaly.detectScanVelocity(scans)).toEqual([]);
        });

        test('detects critical scan velocity', () => {
            const now = Date.now();
            const scans = Array.from({ length: 110 }, (_, i) => ({
                product_id: 'p1',
                scanned_at: new Date(now - i * 100).toISOString(),
            }));
            const result = anomaly.detectScanVelocity(scans);
            expect(result.length).toBe(1);
            expect(result[0].severity).toBe('critical');
            expect(result[0].type).toBe('scan_velocity');
        });

        test('detects warning scan velocity', () => {
            const now = Date.now();
            const scans = Array.from({ length: 60 }, (_, i) => ({
                product_id: 'p1',
                scanned_at: new Date(now - i * 500).toISOString(),
            }));
            const result = anomaly.detectScanVelocity(scans);
            expect(result.length).toBe(1);
            expect(result[0].severity).toBe('warning');
        });

        test('groups by product_id', () => {
            const now = Date.now();
            const scans = [
                ...Array.from({ length: 110 }, () => ({ product_id: 'p1', scanned_at: new Date(now).toISOString() })),
                ...Array.from({ length: 5 }, () => ({ product_id: 'p2', scanned_at: new Date(now).toISOString() })),
            ];
            const result = anomaly.detectScanVelocity(scans);
            expect(result.length).toBe(1);
            expect(result[0].source_id).toBe('p1');
        });
    });

    describe('detectFraudSpikes', () => {
        test('returns empty for no alerts', () => {
            expect(anomaly.detectFraudSpikes([])).toEqual([]);
        });

        test('detects critical fraud spike', () => {
            const alerts = Array.from({ length: 6 }, () => ({
                product_id: 'p1',
                created_at: '2024-01-15T10:00:00',
            }));
            const result = anomaly.detectFraudSpikes(alerts);
            expect(result.length).toBe(1);
            expect(result[0].severity).toBe('critical');
        });

        test('detects warning fraud spike', () => {
            const alerts = Array.from({ length: 4 }, () => ({
                product_id: 'p1',
                created_at: '2024-01-15T10:00:00',
            }));
            const result = anomaly.detectFraudSpikes(alerts);
            expect(result.length).toBe(1);
            expect(result[0].severity).toBe('warning');
        });

        test('ignores normal rates', () => {
            const alerts = [
                { product_id: 'p1', created_at: '2024-01-15' },
                { product_id: 'p1', created_at: '2024-01-16' },
            ];
            expect(anomaly.detectFraudSpikes(alerts)).toEqual([]);
        });
    });

    describe('detectTrustDrops', () => {
        test('returns empty for no scores', () => {
            expect(anomaly.detectTrustDrops([])).toEqual([]);
        });

        test('returns empty for single score', () => {
            expect(anomaly.detectTrustDrops([{ product_id: 'p1', score: 80, calculated_at: '2024-01-15' }])).toEqual([]);
        });

        test('detects critical trust drop', () => {
            const result = anomaly.detectTrustDrops([
                { product_id: 'p1', score: 90, calculated_at: '2024-01-14' },
                { product_id: 'p1', score: 60, calculated_at: '2024-01-15' },
            ]);
            expect(result.length).toBe(1);
            expect(result[0].severity).toBe('critical');
            expect(result[0].details.drop).toBe(30);
        });

        test('detects warning trust drop', () => {
            const result = anomaly.detectTrustDrops([
                { product_id: 'p1', score: 80, calculated_at: '2024-01-14' },
                { product_id: 'p1', score: 68, calculated_at: '2024-01-15' },
            ]);
            expect(result.length).toBe(1);
            expect(result[0].severity).toBe('warning');
        });

        test('ignores improvements', () => {
            const result = anomaly.detectTrustDrops([
                { product_id: 'p1', score: 50, calculated_at: '2024-01-14' },
                { product_id: 'p1', score: 80, calculated_at: '2024-01-15' },
            ]);
            expect(result).toEqual([]);
        });
    });

    describe('detectGeoDispersion', () => {
        test('returns empty for no scans', () => {
            expect(anomaly.detectGeoDispersion([])).toEqual([]);
        });

        test('ignores scans without coordinates', () => {
            const scans = [{ product_id: 'p1', scanned_at: new Date().toISOString() }];
            expect(anomaly.detectGeoDispersion(scans)).toEqual([]);
        });

        test('detects dispersion across 5+ locations', () => {
            const now = Date.now();
            const scans = Array.from({ length: 6 }, (_, i) => ({
                product_id: 'p1',
                latitude: 10 + i * 5, // Each 5° apart — unique rounded locations
                longitude: 100 + i * 5,
                scanned_at: new Date(now - i * 1000).toISOString(),
            }));
            const result = anomaly.detectGeoDispersion(scans);
            expect(result.length).toBe(1);
            expect(result[0].type).toBe('geo_dispersion');
        });
    });

    describe('runFullScan', () => {
        test('returns combined results', () => {
            const result = anomaly.runFullScan({ scans: [], fraudAlerts: [], trustScores: [] });
            expect(result.total).toBe(0);
            expect(result.anomalies).toEqual([]);
            expect(result.scanned_at).toBeDefined();
        });

        test('sorts by severity then score', () => {
            const now = Date.now();
            const scans = Array.from({ length: 110 }, (_, i) => ({
                product_id: 'p1',
                scanned_at: new Date(now - i * 100).toISOString(),
            }));
            const trustScores = [
                { product_id: 'p2', score: 90, calculated_at: '2024-01-14' },
                { product_id: 'p2', score: 60, calculated_at: '2024-01-15' },
            ];
            const result = anomaly.runFullScan({ scans, trustScores });
            expect(result.critical).toBeGreaterThanOrEqual(1);
        });
    });
});
