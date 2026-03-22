const { idempotencyGuard, bulkScanDetector, replayDetector, withTransactionWrapper } = require('../../../server/middleware/blind-spot-defense');

describe('blind-spot-defense', () => {
    describe('idempotencyGuard', () => {
        test('calls next for GET requests', () => {
            const next = jest.fn();
            idempotencyGuard({ method: 'GET', headers: {} }, {}, next);
            expect(next).toHaveBeenCalled();
        });

        test('calls next for POST without idempotency key', () => {
            const next = jest.fn();
            const res = { json: jest.fn(), statusCode: 200 };
            idempotencyGuard(
                { method: 'POST', headers: {}, body: { unique: Math.random() }, ip: '1.2.3.4' },
                res,
                next
            );
            expect(next).toHaveBeenCalled();
        });

        test('deduplicates POST with explicit idempotency key', () => {
            const originalJson = jest.fn();
            const res1 = { json: originalJson, statusCode: 200, status: jest.fn().mockReturnThis() };
            const next1 = jest.fn();

            // First request
            idempotencyGuard(
                { method: 'POST', headers: { 'x-idempotency-key': 'key-test-1' }, body: {} },
                res1,
                next1
            );
            expect(next1).toHaveBeenCalled();
            // Simulate response
            res1.json({ result: 'ok' });

            // Second request with same key
            const res2 = { json: jest.fn(), statusCode: 200, status: jest.fn().mockReturnThis() };
            const next2 = jest.fn();
            idempotencyGuard(
                { method: 'POST', headers: { 'x-idempotency-key': 'key-test-1' }, body: {} },
                res2,
                next2
            );
            // Should return cached response
            expect(next2).not.toHaveBeenCalled();
        });
    });

    describe('bulkScanDetector', () => {
        test('allows first scan', () => {
            const next = jest.fn();
            bulkScanDetector(
                { ip: '10.0.0.99', body: {}, headers: { 'user-agent': 'TestAgent-bulk' } },
                {},
                next
            );
            expect(next).toHaveBeenCalled();
        });

        test('flags bulk scanning after 10 scans', () => {
            const ip = '10.0.0.' + Math.floor(Math.random() * 255);
            const ua = 'BulkTestUA-' + Date.now();
            for (let i = 0; i < 11; i++) {
                const req = { ip, body: {}, headers: { 'user-agent': ua } };
                bulkScanDetector(req, {}, jest.fn());
            }
            const req = { ip, body: {}, headers: { 'user-agent': ua } };
            bulkScanDetector(req, {}, jest.fn());
            expect(req.bulkScanDetected).toBe(true);
            expect(req.bulkScanInfo.count).toBeGreaterThan(10);
        });
    });

    describe('replayDetector', () => {
        test('skips non-POST requests', () => {
            const next = jest.fn();
            replayDetector({ method: 'GET' }, {}, next);
            expect(next).toHaveBeenCalled();
        });

        test('allows first POST', () => {
            const req = { method: 'POST', body: { unique: Math.random() }, ip: '1.1.1.1', headers: {} };
            const next = jest.fn();
            replayDetector(req, {}, next);
            expect(next).toHaveBeenCalled();
            expect(req.isReplay).toBeUndefined();
        });

        test('detects replayed POST (same body within 10s)', () => {
            const body = { replayed: 'data-' + Date.now() };
            const ip = '2.2.2.2';
            const ua = 'ReplayTestUA';

            // First
            const req1 = { method: 'POST', body, ip, headers: { 'user-agent': ua } };
            replayDetector(req1, {}, jest.fn());

            // Same payload immediately
            const req2 = { method: 'POST', body, ip, headers: { 'user-agent': ua } };
            replayDetector(req2, {}, jest.fn());
            expect(req2.isReplay).toBe(true);
        });
    });

    describe('withTransactionWrapper', () => {
        test('calls handler', async () => {
            const handler = jest.fn();
            const wrapped = withTransactionWrapper(handler);
            await wrapped({}, { headersSent: false }, jest.fn());
            expect(handler).toHaveBeenCalled();
        });

        test('catches errors and returns 500', async () => {
            const handler = jest.fn().mockRejectedValue(new Error('DB fail'));
            const res = { headersSent: false, status: jest.fn().mockReturnThis(), json: jest.fn() };
            const wrapped = withTransactionWrapper(handler);
            await wrapped({}, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json.mock.calls[0][0].code).toBe('TRANSACTION_FAILED');
        });
    });
});
