const { safeError } = require('../../../server/utils/safe-error');
const { safeError: safeError2 } = require('../../../server/utils/errors');
const { IMMUTABLE_STATUSES } = require('../../../server/utils/audit-chain');

describe('safe-error (utils/safe-error)', () => {
    function mockRes() {
        return { status: jest.fn().mockReturnThis(), json: jest.fn() };
    }

    test('sends public message in response', () => {
        const res = mockRes();
        const spy = jest.spyOn(console, 'error').mockImplementation();
        safeError(res, 'Something went wrong', new Error('db crash'));
        spy.mockRestore();
        expect(res.json).toHaveBeenCalledWith({ error: 'Something went wrong' });
    });

    test('default status code is 500', () => {
        const res = mockRes();
        const spy = jest.spyOn(console, 'error').mockImplementation();
        safeError(res, 'Error', new Error('fail'));
        spy.mockRestore();
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test('custom status code', () => {
        const res = mockRes();
        const spy = jest.spyOn(console, 'error').mockImplementation();
        safeError(res, 'Not found', new Error('missing'), 404);
        spy.mockRestore();
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('handles null error', () => {
        const res = mockRes();
        safeError(res, 'Error', null);
        expect(res.json).toHaveBeenCalledWith({ error: 'Error' });
    });
});

describe('safeError (utils/errors)', () => {
    function mockRes() {
        return { status: jest.fn().mockReturnThis(), json: jest.fn() };
    }

    test('sends fallback message', () => {
        const res = mockRes();
        const spy = jest.spyOn(console, 'error').mockImplementation();
        safeError2(res, new Error('internal'), 'Something failed');
        spy.mockRestore();
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test('default status is 500', () => {
        const res = mockRes();
        const spy = jest.spyOn(console, 'error').mockImplementation();
        safeError2(res, new Error('x'), 'fail');
        spy.mockRestore();
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe('audit-chain constants', () => {
    test('IMMUTABLE_STATUSES is a Set', () => {
        expect(IMMUTABLE_STATUSES).toBeInstanceOf(Set);
    });

    test('contains verified', () => {
        expect(IMMUTABLE_STATUSES.has('verified')).toBe(true);
    });

    test('contains sealed', () => {
        expect(IMMUTABLE_STATUSES.has('sealed')).toBe(true);
    });

    test('contains approved', () => {
        expect(IMMUTABLE_STATUSES.has('approved')).toBe(true);
    });

    test('contains recalled', () => {
        expect(IMMUTABLE_STATUSES.has('recalled')).toBe(true);
    });

    test('does not contain draft', () => {
        expect(IMMUTABLE_STATUSES.has('draft')).toBe(false);
    });

    test('does not contain pending', () => {
        expect(IMMUTABLE_STATUSES.has('pending')).toBe(false);
    });

    test('has 4 statuses', () => {
        expect(IMMUTABLE_STATUSES.size).toBe(4);
    });
});
