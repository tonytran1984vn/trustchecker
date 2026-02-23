/**
 * AppError — Structured Error Classes (Node.js Best Practice)
 *
 * Provides consistent error classification with status codes and machine-readable error codes.
 * The centralized error handler (boot/health.js) reads these properties for consistent JSON responses.
 *
 * Usage:
 *   const { NotFoundError, ValidationError } = require('../utils/AppError');
 *   throw new NotFoundError('Product not found');
 *   throw new ValidationError('Email is required', 'MISSING_EMAIL');
 */

class AppError extends Error {
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_ERROR') {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true; // Distinguishes from programming errors
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message = 'Validation failed', errorCode = 'VALIDATION_ERROR') {
        super(message, 422, errorCode);
    }
}

class NotFoundError extends AppError {
    constructor(message = 'Resource not found', errorCode = 'NOT_FOUND') {
        super(message, 404, errorCode);
    }
}

class ForbiddenError extends AppError {
    constructor(message = 'Access denied', errorCode = 'FORBIDDEN') {
        super(message, 403, errorCode);
    }
}

class UnauthorizedError extends AppError {
    constructor(message = 'Authentication required', errorCode = 'UNAUTHORIZED') {
        super(message, 401, errorCode);
    }
}

class ConflictError extends AppError {
    constructor(message = 'Resource conflict', errorCode = 'CONFLICT') {
        super(message, 409, errorCode);
    }
}

class RateLimitError extends AppError {
    constructor(message = 'Too many requests', errorCode = 'RATE_LIMITED') {
        super(message, 429, errorCode);
    }
}

class BadRequestError extends AppError {
    constructor(message = 'Bad request', errorCode = 'BAD_REQUEST') {
        super(message, 400, errorCode);
    }
}

module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    ForbiddenError,
    UnauthorizedError,
    ConflictError,
    RateLimitError,
    BadRequestError,
};
