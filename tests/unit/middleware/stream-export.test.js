const { BATCH_SIZE } = require('../../../server/middleware/stream-export');

describe('stream-export', () => {
    test('BATCH_SIZE is 500', () => {
        expect(BATCH_SIZE).toBe(500);
    });

    test('module exports streamCSV function', () => {
        expect(typeof require('../../../server/middleware/stream-export').streamCSV).toBe('function');
    });

    test('module exports streamJSON function', () => {
        expect(typeof require('../../../server/middleware/stream-export').streamJSON).toBe('function');
    });
});
