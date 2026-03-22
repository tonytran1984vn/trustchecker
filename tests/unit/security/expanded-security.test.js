// Expanded security tests: password-policy constants
const passwordPolicy = require('../../../server/security/password-policy');

describe('password-policy module', () => {
    describe('exports', () => {
        test('exports validatePassword', () => {
            expect(typeof passwordPolicy.validatePassword).toBe('function');
        });
    });
});
