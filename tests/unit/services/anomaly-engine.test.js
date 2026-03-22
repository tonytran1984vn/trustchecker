const anomalyEngine = require('../../../server/services/anomaly-engine');

describe('anomaly-engine', () => {
    describe('structure', () => {
        test('exports an object', () => {
            expect(typeof anomalyEngine).toBe('object');
        });

        test('has checkEvent method', () => {
            expect(typeof anomalyEngine.checkEvent).toBe('function');
        });

        test('has getAlerts method', () => {
            expect(typeof anomalyEngine.getAlerts).toBe('function');
        });

        test('has getStats method', () => {
            expect(typeof anomalyEngine.getStats).toBe('function');
        });

        test('has enforceRisk method', () => {
            expect(typeof anomalyEngine.enforceRisk).toBe('function');
        });

        test('has alerts array', () => {
            expect(Array.isArray(anomalyEngine.alerts)).toBe(true);
        });
    });

    describe('getAlerts', () => {
        test('returns array', () => {
            expect(Array.isArray(anomalyEngine.getAlerts())).toBe(true);
        });

        test('respects limit parameter', () => {
            const result = anomalyEngine.getAlerts(5);
            expect(result.length).toBeLessThanOrEqual(5);
        });

        test('default limit is 50', () => {
            const result = anomalyEngine.getAlerts();
            expect(result.length).toBeLessThanOrEqual(50);
        });
    });

    describe('getStats', () => {
        test('returns object with total', () => {
            const stats = anomalyEngine.getStats();
            expect(typeof stats.total).toBe('number');
        });

        test('returns object with byRule', () => {
            const stats = anomalyEngine.getStats();
            expect(typeof stats.byRule).toBe('object');
        });
    });

    describe('enforceRisk', () => {
        test('returns null for NORMAL decision', async () => {
            const result = await anomalyEngine.enforceRisk('p1', 'a1', { decision: 'NORMAL' });
            expect(result).toBeNull();
        });

        test('returns null for null riskResult', async () => {
            const result = await anomalyEngine.enforceRisk('p1', 'a1', null);
            expect(result).toBeNull();
        });

        test('returns action for SUSPICIOUS decision', async () => {
            const result = await anomalyEngine.enforceRisk('p1', 'a1', { decision: 'SUSPICIOUS', risk_score: 65 });
            expect(result.action_taken).toBe('warning_added');
        });

        test('returns action for SOFT_BLOCK', async () => {
            const result = await anomalyEngine.enforceRisk('p2', 'a2', { decision: 'SOFT_BLOCK', risk_score: 80 });
            expect(result.action_taken).toBe('product_flagged');
        });

        test('action includes product_id', async () => {
            const result = await anomalyEngine.enforceRisk('p3', 'a3', { decision: 'SUSPICIOUS', risk_score: 70 });
            expect(result.product_id).toBe('p3');
        });

        test('action includes actor_id', async () => {
            const result = await anomalyEngine.enforceRisk('p4', 'a4', { decision: 'SUSPICIOUS', risk_score: 70 });
            expect(result.actor_id).toBe('a4');
        });

        test('action includes risk_score', async () => {
            const result = await anomalyEngine.enforceRisk('p5', 'a5', { decision: 'SUSPICIOUS', risk_score: 72 });
            expect(result.risk_score).toBe(72);
        });
    });
});
