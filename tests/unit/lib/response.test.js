const { success, paginated, error, serviceError } = require('../../../server/lib/response');

function mockRes() {
    return { status: jest.fn().mockReturnThis(), json: jest.fn() };
}

describe('response helpers', () => {
    describe('success', () => {
        test('returns 200 with data', () => {
            const res = mockRes();
            success(res, { id: 1 });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json.mock.calls[0][0].data).toEqual({ id: 1 });
        });

        test('includes meta with timestamp', () => {
            const res = mockRes();
            success(res, {});
            expect(res.json.mock.calls[0][0].meta.timestamp).toBeDefined();
        });

        test('includes api_version', () => {
            const res = mockRes();
            success(res, {});
            expect(res.json.mock.calls[0][0].meta.api_version).toBe(1);
        });

        test('accepts custom status', () => {
            const res = mockRes();
            success(res, {}, {}, 201);
            expect(res.status).toHaveBeenCalledWith(201);
        });

        test('merges custom meta', () => {
            const res = mockRes();
            success(res, {}, { total: 42 });
            expect(res.json.mock.calls[0][0].meta.total).toBe(42);
        });
    });

    describe('paginated', () => {
        test('returns data and meta', () => {
            const res = mockRes();
            paginated(res, { data: [1, 2], meta: { total: 2 } });
            const body = res.json.mock.calls[0][0];
            expect(body.data).toEqual([1, 2]);
            expect(body.meta.total).toBe(2);
        });
    });

    describe('error', () => {
        test('returns 400 by default', () => {
            const res = mockRes();
            error(res, 'Bad input');
            expect(res.status).toHaveBeenCalledWith(400);
        });

        test('data is null', () => {
            const res = mockRes();
            error(res, 'Bad');
            expect(res.json.mock.calls[0][0].data).toBeNull();
        });

        test('errors array has code and message', () => {
            const res = mockRes();
            error(res, 'Not found', 'NOT_FOUND', 404);
            const body = res.json.mock.calls[0][0];
            expect(body.errors[0].code).toBe('NOT_FOUND');
            expect(body.errors[0].message).toBe('Not found');
        });

        test('includes details when provided', () => {
            const res = mockRes();
            error(res, 'Err', 'E', 400, { field: 'name' });
            expect(res.json.mock.calls[0][0].errors[0].details).toEqual({ field: 'name' });
        });
    });

    describe('serviceError', () => {
        test('uses error status', () => {
            const res = mockRes();
            const err = new Error('Not found');
            err.status = 404;
            err.code = 'NOT_FOUND';
            serviceError(res, err);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        test('defaults to 500', () => {
            const res = mockRes();
            serviceError(res, new Error('fail'));
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
