const errorCodes = require('../../../server/lib/error-codes');

describe('error-codes', () => {
    describe('Auth codes', () => {
        test('AUTH_REQUIRED', () => expect(errorCodes.AUTH_REQUIRED).toBe('AUTH_REQUIRED'));
        test('AUTH_INVALID_TOKEN', () => expect(errorCodes.AUTH_INVALID_TOKEN).toBe('AUTH_INVALID_TOKEN'));
        test('AUTH_EXPIRED_TOKEN', () => expect(errorCodes.AUTH_EXPIRED_TOKEN).toBe('AUTH_EXPIRED_TOKEN'));
        test('AUTH_INVALID_CREDENTIALS', () => expect(errorCodes.AUTH_INVALID_CREDENTIALS).toBe('AUTH_INVALID_CREDENTIALS'));
        test('AUTH_ACCOUNT_LOCKED', () => expect(errorCodes.AUTH_ACCOUNT_LOCKED).toBe('AUTH_ACCOUNT_LOCKED'));
        test('AUTH_MFA_REQUIRED', () => expect(errorCodes.AUTH_MFA_REQUIRED).toBe('AUTH_MFA_REQUIRED'));
    });

    describe('Authorization codes', () => {
        test('FORBIDDEN', () => expect(errorCodes.FORBIDDEN).toBe('FORBIDDEN'));
        test('INSUFFICIENT_PERMISSIONS', () => expect(errorCodes.INSUFFICIENT_PERMISSIONS).toBe('INSUFFICIENT_PERMISSIONS'));
    });

    describe('Validation codes', () => {
        test('VALIDATION_ERROR', () => expect(errorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR'));
        test('INVALID_INPUT', () => expect(errorCodes.INVALID_INPUT).toBe('INVALID_INPUT'));
        test('MISSING_FIELD', () => expect(errorCodes.MISSING_FIELD).toBe('MISSING_FIELD'));
    });

    describe('Resource codes', () => {
        test('NOT_FOUND', () => expect(errorCodes.NOT_FOUND).toBe('NOT_FOUND'));
        test('ALREADY_EXISTS', () => expect(errorCodes.ALREADY_EXISTS).toBe('ALREADY_EXISTS'));
        test('CONFLICT', () => expect(errorCodes.CONFLICT).toBe('CONFLICT'));
    });

    describe('System codes', () => {
        test('INTERNAL_ERROR', () => expect(errorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR'));
        test('DATABASE_ERROR', () => expect(errorCodes.DATABASE_ERROR).toBe('DATABASE_ERROR'));
    });

    describe('Domain codes', () => {
        test('QR_NOT_FOUND', () => expect(errorCodes.QR_NOT_FOUND).toBe('QR_NOT_FOUND'));
        test('SCAN_FRAUD_DETECTED', () => expect(errorCodes.SCAN_FRAUD_DETECTED).toBe('SCAN_FRAUD_DETECTED'));
    });
});
