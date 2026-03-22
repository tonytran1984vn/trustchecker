const { parsePagination } = require('../../../server/middleware/pagination');

describe('parsePagination', () => {
    function mockReq(query = {}) { return { query }; }

    test('defaults: limit=50, page=1, offset=0', () => {
        const r = parsePagination(mockReq());
        expect(r.limit).toBe(50);
        expect(r.page).toBe(1);
        expect(r.offset).toBe(0);
    });

    test('custom limit', () => {
        expect(parsePagination(mockReq({ limit: '20' })).limit).toBe(20);
    });

    test('custom page', () => {
        const r = parsePagination(mockReq({ page: '3', limit: '10' }));
        expect(r.page).toBe(3);
        expect(r.offset).toBe(20);
    });

    test('limit capped at maxLimit (200)', () => {
        expect(parsePagination(mockReq({ limit: '500' })).limit).toBe(200);
    });

    test('limit 0 defaults to default limit (parseInt 0 is falsy)', () => {
        expect(parsePagination(mockReq({ limit: '0' })).limit).toBe(50);
    });

    test('negative limit clamps to 1', () => {
        // parseInt('-5') = -5 which is truthy, so it goes through the < 1 check
        expect(parsePagination(mockReq({ limit: '-5' })).limit).toBe(1);
    });

    test('page minimum is 1', () => {
        expect(parsePagination(mockReq({ page: '0' })).page).toBe(1);
        expect(parsePagination(mockReq({ page: '-1' })).page).toBe(1);
    });

    test('non-numeric defaults gracefully', () => {
        const r = parsePagination(mockReq({ limit: 'abc', page: 'xyz' }));
        expect(r.limit).toBe(50);
        expect(r.page).toBe(1);
    });

    test('custom defaults', () => {
        const r = parsePagination(mockReq(), { limit: 25, maxLimit: 100 });
        expect(r.limit).toBe(25);
    });

    test('custom maxLimit', () => {
        const r = parsePagination(mockReq({ limit: '150' }), { limit: 25, maxLimit: 100 });
        expect(r.limit).toBe(100);
    });

    test('offset calculation with page and limit', () => {
        const r = parsePagination(mockReq({ page: '5', limit: '25' }));
        expect(r.offset).toBe(100); // (5-1) * 25
    });
});
