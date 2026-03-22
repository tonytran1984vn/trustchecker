const { safeError } = require('../../../server/utils/safe-error');

describe('safeError', () => {
    let res;

    beforeEach(() => {
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    test('sends 500 status by default', () => {
        safeError(res, 'Something went wrong', new Error('db crash'));
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Something went wrong' });
    });

    test('sends custom status code', () => {
        safeError(res, 'Not found', new Error('missing'), 404);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Not found' });
    });

    test('logs the error with console.error', () => {
        const err = new Error('internal details');
        safeError(res, 'Safe message', err);
        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('Safe message'),
            expect.stringContaining('internal details')
        );
    });

    test('handles null error gracefully', () => {
        safeError(res, 'No error provided', null);
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'No error provided' });
    });

    test('never exposes internal error message to client', () => {
        safeError(res, 'Safe message', new Error('SELECT * FROM secret_table'));
        const sentBody = res.json.mock.calls[0][0];
        expect(sentBody.error).toBe('Safe message');
        expect(sentBody.error).not.toContain('secret_table');
    });

    test('handles error without message property', () => {
        safeError(res, 'Generic error', 'plain string error');
        expect(res.status).toHaveBeenCalledWith(500);
        expect(console.error).toHaveBeenCalled();
    });
});
