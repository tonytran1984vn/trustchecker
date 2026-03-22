jest.mock('../../../server/db', () => require('../../helpers/db-mock'));
jest.mock('../../../server/events', () => ({
    eventBus: { emitEvent: jest.fn() },
    EVENT_TYPES: { FRAUD_FLAGGED: 'FRAUD_FLAGGED' },
}));

const db = require('../../../server/db');
const fraud = require('../../../server/engines/core/fraud');

beforeEach(() => db.__resetMocks());

describe('FraudEngine', () => {
    describe('thresholds', () => {
        test('defines scan frequency threshold', () => {
            expect(fraud.SCAN_FREQUENCY_THRESHOLD).toBe(10);
        });

        test('defines geo distance threshold', () => {
            expect(fraud.GEO_DISTANCE_THRESHOLD).toBe(500);
        });

        test('defines z-score threshold', () => {
            expect(fraud.ZSCORE_THRESHOLD).toBe(2.5);
        });
    });

    describe('haversineDistance', () => {
        test('returns 0 for same point', () => {
            expect(fraud.haversineDistance(10, 100, 10, 100)).toBe(0);
        });

        test('calculates distance between NYC and LA (~3940km)', () => {
            const d = fraud.haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
            expect(d).toBeGreaterThan(3900);
            expect(d).toBeLessThan(4000);
        });

        test('calculates distance between London and Paris (~344km)', () => {
            const d = fraud.haversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
            expect(d).toBeGreaterThan(330);
            expect(d).toBeLessThan(360);
        });
    });

    describe('runRules', () => {
        test('returns 0 score for clean scan', () => {
            db.get.mockReturnValue(null);
            const result = fraud.runRules({ qr_code_id: 'q1', product_id: 'p1' });
            expect(result.score).toBe(0);
            expect(result.alerts).toEqual([]);
        });

        test('detects high frequency scan', () => {
            db.get
                .mockReturnValueOnce({ count: 15 }) // hourly count
                .mockReturnValueOnce({ count: 0 })  // burst
                .mockReturnValueOnce(null)           // qr
                .mockReturnValueOnce(null);          // product
            const result = fraud.runRules({ qr_code_id: 'q1', product_id: 'p1' });
            expect(result.alerts[0].type).toBe('HIGH_FREQUENCY_SCAN');
        });

        test('detects scan burst', () => {
            db.get
                .mockReturnValueOnce({ count: 3 })   // hourly — normal
                .mockReturnValueOnce({ count: 8 })    // burst — exceeds 5
                .mockReturnValueOnce(null)
                .mockReturnValueOnce(null);
            const result = fraud.runRules({ qr_code_id: 'q1', product_id: 'p1' });
            expect(result.alerts[0].type).toBe('SCAN_BURST');
        });

        test('detects revoked QR', () => {
            db.get
                .mockReturnValueOnce({ count: 0 })
                .mockReturnValueOnce({ count: 0 })
                .mockReturnValueOnce({ status: 'revoked' })
                .mockReturnValueOnce(null);
            const result = fraud.runRules({ qr_code_id: 'q1', product_id: 'p1' });
            expect(result.alerts[0].type).toBe('REVOKED_QR');
            expect(result.score).toBeGreaterThanOrEqual(0.8);
        });
    });

    describe('runStatistical', () => {
        test('returns 0 for clean scan', () => {
            db.get.mockReturnValue(null);
            const result = fraud.runStatistical({ product_id: 'p1' });
            expect(result.score).toBe(0);
        });

        test('detects device anomaly', () => {
            db.get
                .mockReturnValueOnce({ total_scans: 2 }) // not enough for daily stats
                .mockReturnValueOnce({ unique_products: 5 }); // device scanned many products
            const result = fraud.runStatistical({ product_id: 'p1', device_fingerprint: 'dev1' });
            expect(result.alerts[0].type).toBe('DEVICE_ANOMALY');
        });
    });

    describe('runPatterns', () => {
        test('returns 0 for scan without coords', () => {
            const result = fraud.runPatterns({ qr_code_id: 'q1' });
            expect(result.score).toBeLessThanOrEqual(0.1); // may have off-hours
        });

        test('detects geo velocity anomaly', () => {
            db.get.mockReturnValueOnce({
                latitude: 34.0522,
                longitude: -118.2437,
                scanned_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
            });
            const result = fraud.runPatterns({
                qr_code_id: 'q1',
                id: 's2',
                latitude: 40.7128,
                longitude: -74.006, // NYC — ~3944km from LA
            });
            expect(result.alerts.find(a => a.type === 'GEO_VELOCITY_ANOMALY')).toBeDefined();
        });
    });

    describe('explain', () => {
        test('generates explainability report', () => {
            const result = fraud.explain(
                { rules: 0.4, statistical: 0.2, patterns: 0.1 },
                [{ severity: 'critical' }, { severity: 'medium' }, { severity: 'low' }]
            );
            expect(result.top_factors.length).toBe(3);
            expect(result.alert_count).toBe(3);
            expect(result.severity_breakdown.critical).toBe(1);
        });
    });

    describe('analyze', () => {
        test('computes fraud score with all layers', async () => {
            // Mock all db calls to return clean results
            db.get.mockReturnValue(null);
            db.run.mockResolvedValue({});
            const result = await fraud.analyze({ id: 's1', qr_code_id: 'q1', product_id: 'p1' });
            expect(result.fraudScore).toBeDefined();
            expect(result.factors).toBeDefined();
            expect(result.processingTimeMs).toBeDefined();
        });
    });
});
