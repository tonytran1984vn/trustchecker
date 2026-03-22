const { checkAbuse, trackActivity, THRESHOLDS } = require('../../../server/middleware/abuse-detection');

describe('abuse-detection', () => {
    describe('THRESHOLDS', () => {
        test('products_per_hour is 50', () => {
            expect(THRESHOLDS.products_per_hour).toBe(50);
        });

        test('suppliers_per_hour is 10', () => {
            expect(THRESHOLDS.suppliers_per_hour).toBe(10);
        });

        test('incidents_per_hour is 50', () => {
            expect(THRESHOLDS.incidents_per_hour).toBe(50);
        });

        test('ratings_per_hour is 30', () => {
            expect(THRESHOLDS.ratings_per_hour).toBe(30);
        });
    });

    describe('trackActivity', () => {
        test('tracks count per org+type', () => {
            const c1 = trackActivity('org-track-1', 'test_count');
            const c2 = trackActivity('org-track-1', 'test_count');
            expect(c2).toBe(c1 + 1);
        });

        test('different orgs have separate counts', () => {
            const c1 = trackActivity('org-a-sep', 'test_sep');
            const c2 = trackActivity('org-b-sep', 'test_sep');
            expect(c1).toBe(1);
            expect(c2).toBe(1);
        });
    });

    describe('checkAbuse middleware', () => {
        function mockRes() {
            return { status: jest.fn().mockReturnThis(), json: jest.fn() };
        }

        test('allows requests under threshold', () => {
            const next = jest.fn();
            checkAbuse('products_per_hour')({ orgId: 'org-check-1', user: {} }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('skips when no orgId', () => {
            const next = jest.fn();
            checkAbuse('products_per_hour')({ user: {} }, mockRes(), next);
            expect(next).toHaveBeenCalled();
        });

        test('blocks when threshold exceeded', () => {
            const mw = checkAbuse('certs_per_hour');
            // Threshold is 20
            for (let i = 0; i < 21; i++) {
                mw({ orgId: 'org-exceed', user: {} }, { status: jest.fn().mockReturnThis(), json: jest.fn() }, jest.fn());
            }
            const res = mockRes();
            mw({ orgId: 'org-exceed', user: {} }, res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(429);
        });
    });
});
