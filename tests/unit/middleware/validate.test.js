const { validate, z } = require('../../../server/middleware/validate');

function mockReq(body = {}, query = {}, params = {}) {
    return { body, query, params };
}

function mockRes() {
    return {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
    };
}

describe('validate middleware', () => {
    test('calls next when no schemas', () => {
        const next = jest.fn();
        validate(null)(mockReq(), mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('validates body - success', () => {
        const schema = { body: z.object({ name: z.string() }) };
        const req = mockReq({ name: 'test' });
        const next = jest.fn();
        validate(schema)(req, mockRes(), next);
        expect(next).toHaveBeenCalled();
        expect(req.body.name).toBe('test');
    });

    test('validates body - failure', () => {
        const schema = { body: z.object({ name: z.string() }) };
        const req = mockReq({ name: 123 });
        const res = mockRes();
        validate(schema)(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errors: expect.arrayContaining([
                expect.objectContaining({ code: 'VALIDATION_ERROR' }),
            ]),
        }));
    });

    test('validates query - success', () => {
        const schema = { query: z.object({ page: z.string().optional() }) };
        const req = mockReq({}, { page: '1' });
        const next = jest.fn();
        validate(schema)(req, res = mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('validates params - success', () => {
        const schema = { params: z.object({ id: z.string() }) };
        const req = mockReq({}, {}, { id: '123' });
        const next = jest.fn();
        validate(schema)(req, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('validates params - failure', () => {
        const schema = { params: z.object({ id: z.string().uuid() }) };
        const req = mockReq({}, {}, { id: 'not-uuid' });
        const res = mockRes();
        validate(schema)(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);
    });

    test('validates multiple schemas at once', () => {
        const schema = {
            body: z.object({ name: z.string() }),
            params: z.object({ id: z.string() }),
        };
        const req = mockReq({ name: 'test' }, {}, { id: '123' });
        const next = jest.fn();
        validate(schema)(req, mockRes(), next);
        expect(next).toHaveBeenCalled();
    });

    test('returns multiple errors', () => {
        const schema = {
            body: z.object({ name: z.string(), age: z.number() }),
        };
        const req = mockReq({ name: 123, age: 'old' });
        const res = mockRes();
        validate(schema)(req, res, jest.fn());
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json.mock.calls[0][0].errors.length).toBe(2);
    });

    test('cleans data via Zod transform', () => {
        const schema = {
            body: z.object({
                email: z.string().email().transform(s => s.toLowerCase()),
            }),
        };
        const req = mockReq({ email: 'TEST@EXAMPLE.COM' });
        const next = jest.fn();
        validate(schema)(req, mockRes(), next);
        expect(req.body.email).toBe('test@example.com');
    });
});
