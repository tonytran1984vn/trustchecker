const eventProcessor = require('../../../server/services/event-processor');

describe('event-processor', () => {
    describe('structure', () => {
        test('exports an object', () => {
            expect(typeof eventProcessor).toBe('object');
        });

        test('has processEvent method', () => {
            expect(typeof eventProcessor.processEvent).toBe('function');
        });

        test('has getStats method', () => {
            expect(typeof eventProcessor.getStats).toBe('function');
        });

        test('has _checkAnomalies method', () => {
            expect(typeof eventProcessor._checkAnomalies).toBe('function');
        });

        test('has _cleanup method', () => {
            expect(typeof eventProcessor._cleanup).toBe('function');
        });
    });

    describe('getStats', () => {
        test('returns object', () => {
            const stats = eventProcessor.getStats();
            expect(typeof stats).toBe('object');
        });

        test('has processed count', () => {
            const stats = eventProcessor.getStats();
            expect(typeof stats.processed).toBe('number');
        });

        test('has rejected count', () => {
            const stats = eventProcessor.getStats();
            expect(typeof stats.rejected).toBe('number');
        });

        test('has errors count', () => {
            const stats = eventProcessor.getStats();
            expect(typeof stats.errors).toBe('number');
        });

        test('has activeQueues count', () => {
            const stats = eventProcessor.getStats();
            expect(typeof stats.activeQueues).toBe('number');
        });

        test('activeQueues is non-negative', () => {
            expect(eventProcessor.getStats().activeQueues).toBeGreaterThanOrEqual(0);
        });
    });

    describe('_cleanup', () => {
        test('does not throw', () => {
            expect(() => eventProcessor._cleanup()).not.toThrow();
        });
    });
});
