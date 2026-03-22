/**
 * Jest Global Setup
 * Sets required env vars before any test suite runs.
 */
module.exports = async function () {
    process.env.JWT_SECRET = 'test-jwt-secret-must-be-at-least-32-characters-long-for-tests';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-ok!';
    process.env.NODE_ENV = 'test';
    process.env.PORT = '0'; // random port
    process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://dangtranhai@localhost:5432/trustchecker';
};
