describe('errors.safeError', () => {
    let res;
    let safeError;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
        jest.resetModules();
    });

    test('in production, returns fallback message (hides internals)', () => {
        process.env.NODE_ENV = 'production';
        safeError = require('../../../server/utils/errors').safeError;

        safeError(res, new Error('secret DB error'), 'Something failed');
        expect(res.status).toHaveBeenCalledWith(500);
        const body = res.json.mock.calls[0][0];
        expect(body.error).toBe('Something failed');
        expect(body.error).not.toContain('secret DB error');
    });

    test('in development, returns actual error message', () => {
        process.env.NODE_ENV = 'development';
        safeError = require('../../../server/utils/errors').safeError;

        safeError(res, new Error('detailed error'), 'Fallback');
        const body = res.json.mock.calls[0][0];
        expect(body.error).toBe('detailed error');
    });

    test('uses custom status code', () => {
        process.env.NODE_ENV = 'production';
        safeError = require('../../../server/utils/errors').safeError;

        safeError(res, new Error('err'), 'Not found', 404);
        expect(res.status).toHaveBeenCalledWith(404);
    });

    test('uses default status 500', () => {
        process.env.NODE_ENV = 'production';
        safeError = require('../../../server/utils/errors').safeError;

        safeError(res, new Error('err'), 'Failed');
        expect(res.status).toHaveBeenCalledWith(500);
    });

    test('logs error with emoji prefix', () => {
        process.env.NODE_ENV = 'production';
        safeError = require('../../../server/utils/errors').safeError;

        safeError(res, new Error('test'), 'Operation failed');
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Operation failed'),
            expect.anything()
        );
    });

    test('handles error without message', () => {
        process.env.NODE_ENV = 'development';
        safeError = require('../../../server/utils/errors').safeError;

        safeError(res, {}, 'Fallback');
        const body = res.json.mock.calls[0][0];
        expect(body.error).toBe('Fallback');
    });
});
