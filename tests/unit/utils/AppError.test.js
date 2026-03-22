const {
    AppError, ValidationError, NotFoundError, ForbiddenError,
    UnauthorizedError, ConflictError, RateLimitError, BadRequestError,
} = require('../../../server/utils/AppError');

describe('AppError classes', () => {
    describe('AppError base', () => {
        test('is an instance of Error', () => { expect(new AppError('x')).toBeInstanceOf(Error); });
        test('has message', () => { expect(new AppError('test').message).toBe('test'); });
        test('default statusCode is 500', () => { expect(new AppError('x').statusCode).toBe(500); });
        test('default errorCode is INTERNAL_ERROR', () => { expect(new AppError('x').errorCode).toBe('INTERNAL_ERROR'); });
        test('isOperational is true', () => { expect(new AppError('x').isOperational).toBe(true); });
        test('has stack trace', () => { expect(new AppError('x').stack).toBeDefined(); });
        test('name is AppError', () => { expect(new AppError('x').name).toBe('AppError'); });
        test('custom statusCode', () => { expect(new AppError('x', 418).statusCode).toBe(418); });
        test('custom errorCode', () => { expect(new AppError('x', 500, 'CUSTOM').errorCode).toBe('CUSTOM'); });
    });

    describe('ValidationError', () => {
        test('statusCode is 422', () => { expect(new ValidationError().statusCode).toBe(422); });
        test('default message', () => { expect(new ValidationError().message).toBe('Validation failed'); });
        test('errorCode is VALIDATION_ERROR', () => { expect(new ValidationError().errorCode).toBe('VALIDATION_ERROR'); });
        test('extends AppError', () => { expect(new ValidationError()).toBeInstanceOf(AppError); });
        test('custom message', () => { expect(new ValidationError('bad input').message).toBe('bad input'); });
        test('custom errorCode', () => { expect(new ValidationError('x', 'MISSING_FIELD').errorCode).toBe('MISSING_FIELD'); });
    });

    describe('NotFoundError', () => {
        test('statusCode is 404', () => { expect(new NotFoundError().statusCode).toBe(404); });
        test('default message', () => { expect(new NotFoundError().message).toBe('Resource not found'); });
        test('errorCode is NOT_FOUND', () => { expect(new NotFoundError().errorCode).toBe('NOT_FOUND'); });
        test('extends AppError', () => { expect(new NotFoundError()).toBeInstanceOf(AppError); });
    });

    describe('ForbiddenError', () => {
        test('statusCode is 403', () => { expect(new ForbiddenError().statusCode).toBe(403); });
        test('default message', () => { expect(new ForbiddenError().message).toBe('Access denied'); });
        test('errorCode is FORBIDDEN', () => { expect(new ForbiddenError().errorCode).toBe('FORBIDDEN'); });
    });

    describe('UnauthorizedError', () => {
        test('statusCode is 401', () => { expect(new UnauthorizedError().statusCode).toBe(401); });
        test('default message', () => { expect(new UnauthorizedError().message).toBe('Authentication required'); });
        test('errorCode is UNAUTHORIZED', () => { expect(new UnauthorizedError().errorCode).toBe('UNAUTHORIZED'); });
    });

    describe('ConflictError', () => {
        test('statusCode is 409', () => { expect(new ConflictError().statusCode).toBe(409); });
        test('default message', () => { expect(new ConflictError().message).toBe('Resource conflict'); });
        test('errorCode is CONFLICT', () => { expect(new ConflictError().errorCode).toBe('CONFLICT'); });
    });

    describe('RateLimitError', () => {
        test('statusCode is 429', () => { expect(new RateLimitError().statusCode).toBe(429); });
        test('default message', () => { expect(new RateLimitError().message).toBe('Too many requests'); });
        test('errorCode is RATE_LIMITED', () => { expect(new RateLimitError().errorCode).toBe('RATE_LIMITED'); });
    });

    describe('BadRequestError', () => {
        test('statusCode is 400', () => { expect(new BadRequestError().statusCode).toBe(400); });
        test('default message', () => { expect(new BadRequestError().message).toBe('Bad request'); });
        test('errorCode is BAD_REQUEST', () => { expect(new BadRequestError().errorCode).toBe('BAD_REQUEST'); });
    });
});
