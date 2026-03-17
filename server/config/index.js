/**
 * TrustChecker Config v9.5.1
 * Centralized configuration with validation — fail fast on boot.
 * A-09: All env vars validated in one place.
 */
require('dotenv').config();

const config = {
    // ─── Required ───
    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '4000', 10),

    // ─── Optional with defaults ───
    PGBOUNCER_URL: process.env.PGBOUNCER_URL || null,
    REDIS_URL: process.env.REDIS_URL || null,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || null,
    CORS_ORIGINS: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
    BASE_URL: process.env.BASE_URL || `http://localhost:${process.env.PORT || 4000}`,

    // ─── Feature flags ───
    DISABLE_RATE_LIMIT: process.env.DISABLE_RATE_LIMIT === 'true',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',

    // ─── Computed ───
    isProduction: (process.env.NODE_ENV || 'development') === 'production',
    isDevelopment: (process.env.NODE_ENV || 'development') === 'development',
    isTest: (process.env.NODE_ENV || 'development') === 'test',
};

// ─── Validation (fail fast) ───
const required = ['DATABASE_URL', 'JWT_SECRET'];
const missing = required.filter(k => !config[k]);
if (missing.length > 0 && !config.isTest) {
    console.error('\n❌ FATAL: Missing required environment variables:');
    missing.forEach(k => console.error(`   - ${k}`));
    console.error('\n   Set them in .env or PM2 ecosystem.config.js\n');
    process.exit(1);
}

// ─── Warnings ───
if (config.isProduction) {
    if (!config.ENCRYPTION_KEY) console.warn('⚠️  ENCRYPTION_KEY not set — MFA secrets stored unencrypted');
    if (!config.REDIS_URL) console.warn('⚠️  REDIS_URL not set — using in-memory event bus');
    if (config.JWT_SECRET && config.JWT_SECRET.length < 32) console.warn('⚠️  JWT_SECRET is short — use 64+ characters');
}

module.exports = config;
