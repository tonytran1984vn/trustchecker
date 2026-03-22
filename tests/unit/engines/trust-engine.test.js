jest.mock('../../../server/db', () => require('../../helpers/db-mock'));
jest.mock('../../../server/events', () => ({
    eventBus: { emitEvent: jest.fn() },
    EVENT_TYPES: { TRUST_SCORE_UPDATED: 'TRUST_SCORE_UPDATED' },
}));

const db = require('../../../server/db');
const trust = require('../../../server/engines/core/trust');

beforeEach(() => db.__resetMocks());

describe('TrustEngine', () => {
    describe('getGrade', () => {
        test('A+ for 90+', () => expect(trust.getGrade(95)).toBe('A+'));
        test('A for 80-89', () => expect(trust.getGrade(85)).toBe('A'));
        test('B for 70-79', () => expect(trust.getGrade(75)).toBe('B'));
        test('C for 60-69', () => expect(trust.getGrade(65)).toBe('C'));
        test('D for 50-59', () => expect(trust.getGrade(55)).toBe('D'));
        test('F for <50', () => expect(trust.getGrade(30)).toBe('F'));
    });

    describe('WEIGHTS', () => {
        test('sum to 1.0', () => {
            const sum = Object.values(trust.WEIGHTS).reduce((a, b) => a + b, 0);
            expect(sum).toBeCloseTo(1.0);
        });

        test('fraud has highest weight', () => {
            expect(trust.WEIGHTS.fraud).toBe(0.35);
        });
    });

    describe('calculateConsistency', () => {
        test('returns 0.9 for no scans', async () => {
            db.all.mockResolvedValueOnce([]);
            expect(await trust.calculateConsistency('p1')).toBe(0.9);
        });

        test('returns 1.0 for all valid scans', async () => {
            db.all.mockResolvedValueOnce([{ result: 'valid', count: 10 }]);
            expect(await trust.calculateConsistency('p1')).toBe(1.0);
        });

        test('returns ratio for mixed results', async () => {
            db.all.mockResolvedValueOnce([
                { result: 'valid', count: 7 },
                { result: 'invalid', count: 3 },
            ]);
            expect(await trust.calculateConsistency('p1')).toBe(0.7);
        });
    });

    describe('calculateCompliance', () => {
        test('returns 0 for no product', async () => {
            db.get.mockResolvedValueOnce(null);
            expect(await trust.calculateCompliance('p1')).toBe(0);
        });

        test('higher for more complete product data', async () => {
            db.get.mockResolvedValueOnce({
                name: 'Product', sku: 'SKU1', manufacturer: 'Mfg',
                batch_number: 'B1', origin_country: 'VN', category: 'Food',
                status: 'active',
            });
            const result = await trust.calculateCompliance('p1');
            expect(result).toBeGreaterThan(0.8);
        });
    });

    describe('calculateHistory', () => {
        test('returns 1.0 for no fraud alerts', async () => {
            db.get
                .mockResolvedValueOnce({ count: 0, weighted: 0 })
                .mockResolvedValueOnce({ count: 0, weighted: 0 })
                .mockResolvedValueOnce({ count: 0, weighted: 0 });
            expect(await trust.calculateHistory('p1')).toBe(1.0);
        });

        test('reduces for recent critical alerts', async () => {
            db.get
                .mockResolvedValueOnce({ count: 3, weighted: 9 }) // recent
                .mockResolvedValueOnce({ count: 0, weighted: 0 })
                .mockResolvedValueOnce({ count: 0, weighted: 0 });
            const result = await trust.calculateHistory('p1');
            expect(result).toBeLessThan(1.0);
            expect(result).toBeGreaterThan(0);
        });
    });

    describe('calculate', () => {
        test('computes full trust score', async () => {
            // calculateConsistency
            db.all.mockResolvedValueOnce([{ result: 'valid', count: 10 }]);
            // calculateCompliance
            db.get.mockResolvedValueOnce({ name: 'P', sku: 'S', status: 'active' });
            // calculateHistory (3 calls)
            db.get
                .mockResolvedValueOnce({ count: 0, weighted: 0 })
                .mockResolvedValueOnce({ count: 0, weighted: 0 })
                .mockResolvedValueOnce({ count: 0, weighted: 0 });
            // DB writes
            db.run.mockResolvedValue({});

            const result = await trust.calculate('p1', 0);
            expect(result.score).toBeGreaterThan(0);
            expect(result.score).toBeLessThanOrEqual(100);
            expect(result.grade).toBeDefined();
            expect(result.explanation).toBeDefined();
        });

        test('low fraud score reduces trust', async () => {
            db.all.mockResolvedValueOnce([]);
            db.get
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ count: 0, weighted: 0 })
                .mockResolvedValueOnce({ count: 0, weighted: 0 })
                .mockResolvedValueOnce({ count: 0, weighted: 0 });
            db.run.mockResolvedValue({});

            const cleanResult = await trust.calculate('p1', 0);
            
            db.all.mockResolvedValueOnce([]);
            db.get
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce({ count: 0, weighted: 0 })
                .mockResolvedValueOnce({ count: 0, weighted: 0 })
                .mockResolvedValueOnce({ count: 0, weighted: 0 });
            db.run.mockResolvedValue({});

            const fraudResult = await trust.calculate('p1', 0.9);
            expect(fraudResult.score).toBeLessThan(cleanResult.score);
        });
    });

    describe('calculateOrgTrust', () => {
        test('returns N/A for no products', async () => {
            db.all.mockResolvedValueOnce([]);
            const result = await trust.calculateOrgTrust('org1');
            expect(result.grade).toBe('N/A');
        });

        test('calculates weighted average', async () => {
            db.all.mockResolvedValueOnce([
                { id: 'p1', trust_score: 90, scan_count: 100 },
                { id: 'p2', trust_score: 70, scan_count: 10 },
            ]);
            const result = await trust.calculateOrgTrust('org1');
            expect(result.score).toBeGreaterThan(80); // heavily weighted toward p1
            expect(result.distribution).toBeDefined();
        });

        test('provides confidence level', async () => {
            db.all.mockResolvedValueOnce(
                Array.from({ length: 15 }, (_, i) => ({ id: `p${i}`, trust_score: 80, scan_count: 5 }))
            );
            const result = await trust.calculateOrgTrust('org1');
            expect(result.confidence).toBe('high');
        });
    });

    describe('getTrend', () => {
        test('returns insufficient_data for < 2 points', async () => {
            db.all.mockResolvedValueOnce([{ score: 80, date: '2024-01-01' }]);
            const result = await trust.getTrend('p1');
            expect(result.trend).toBe('insufficient_data');
        });

        test('detects improving trend', async () => {
            db.all.mockResolvedValueOnce([
                { score: 50, date: '2024-01-01' },
                { score: 60, date: '2024-01-05' },
                { score: 70, date: '2024-01-10' },
                { score: 80, date: '2024-01-15' },
            ]);
            const result = await trust.getTrend('p1');
            expect(result.trend).toBe('improving');
            expect(result.slope).toBeGreaterThan(0);
        });

        test('detects declining trend', async () => {
            db.all.mockResolvedValueOnce([
                { score: 90, date: '2024-01-01' },
                { score: 75, date: '2024-01-05' },
                { score: 60, date: '2024-01-10' },
                { score: 45, date: '2024-01-15' },
            ]);
            const result = await trust.getTrend('p1');
            expect(result.trend).toBe('declining');
        });

        test('alerts on significant drop', async () => {
            db.all.mockResolvedValueOnce([
                { score: 80, date: '2024-01-01' },
                { score: 80, date: '2024-01-05' },
                { score: 80, date: '2024-01-10' },
                { score: 50, date: '2024-01-15' },
            ]);
            const result = await trust.getTrend('p1');
            expect(result.alert).not.toBeNull();
            expect(result.alert.type).toBe('significant_drop');
        });
    });

    describe('ingestSignal', () => {
        test('throws if missing product_id', async () => {
            await expect(trust.ingestSignal({ type: 'fraud_alert' })).rejects.toThrow();
        });

        test('applies fraud_alert signal (negative)', async () => {
            db.get.mockResolvedValueOnce({ trust_score: 80 });
            db.run.mockResolvedValue({});
            const result = await trust.ingestSignal({ product_id: 'p1', type: 'fraud_alert' });
            expect(result.applied).toBe(true);
            expect(result.new_score).toBeLessThan(80);
        });

        test('applies positive_verification signal', async () => {
            db.get.mockResolvedValueOnce({ trust_score: 70 });
            db.run.mockResolvedValue({});
            const result = await trust.ingestSignal({ product_id: 'p1', type: 'positive_verification' });
            expect(result.applied).toBe(true);
            expect(result.new_score).toBeGreaterThan(70);
        });

        test('returns not applied for unknown type', async () => {
            db.get.mockResolvedValueOnce({ trust_score: 70 });
            const result = await trust.ingestSignal({ product_id: 'p1', type: 'unknown_xyz' });
            expect(result.applied).toBe(false);
        });

        test('returns not applied for missing product', async () => {
            db.get.mockResolvedValueOnce(null);
            const result = await trust.ingestSignal({ product_id: 'p1', type: 'fraud_alert' });
            expect(result.applied).toBe(false);
        });

        test('clamps score to 0-100', async () => {
            db.get.mockResolvedValueOnce({ trust_score: 5 });
            db.run.mockResolvedValue({});
            const result = await trust.ingestSignal({ product_id: 'p1', type: 'fraud_alert' });
            expect(result.new_score).toBeGreaterThanOrEqual(0);
        });
    });
});
