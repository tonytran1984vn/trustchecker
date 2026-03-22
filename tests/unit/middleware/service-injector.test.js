const serviceInjector = require('../../../server/middleware/service-injector');

describe('serviceInjector', () => {
    test('is a function', () => {
        expect(typeof serviceInjector).toBe('function');
    });

    test('attaches services to req', () => {
        const req = {};
        const next = jest.fn();
        serviceInjector(req, {}, next);
        expect(req.services).toBeDefined();
    });

    test('calls next', () => {
        const next = jest.fn();
        serviceInjector({}, {}, next);
        expect(next).toHaveBeenCalled();
    });

    test('services is a proxy object', () => {
        const req = {};
        serviceInjector(req, {}, jest.fn());
        expect(typeof req.services).toBe('object');
    });

    test('accessing unknown service returns empty object', () => {
        const req = {};
        serviceInjector(req, {}, jest.fn());
        // Access a non-existent service
        expect(req.services.nonExistent).toEqual({});
    });
});
