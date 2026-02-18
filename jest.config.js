/**
 * Jest Configuration for TrustChecker
 * Handles ESM modules (uuid v13, otplib v13, etc.) by transforming them for Node.js CJS mode.
 */
module.exports = {
    // Transform ESM packages that Jest can't handle natively
    transformIgnorePatterns: [
        '/node_modules/(?!(uuid|otplib|@otplib|@scure|@noble)/)',
    ],
    transform: {
        '^.+\\.[jt]s$': ['babel-jest', {
            plugins: ['@babel/plugin-transform-modules-commonjs'],
        }],
    },
    testEnvironment: 'node',
    testTimeout: 15000,
    forceExit: true,
    detectOpenHandles: true,
};
