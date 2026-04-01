/**
 * TrustChecker v9.0 — Configuration Validator
 * Validates required environment variables at startup
 */

const REQUIRED_VARS = {
    production: [
        { name: 'JWT_SECRET', minLength: 32, description: 'JWT signing secret (openssl rand -hex 64)' },
        { name: 'ENCRYPTION_KEY', minLength: 16, description: 'Encryption key (openssl rand -hex 32)' },
    ],
    all: [
        { name: 'PORT', default: '4000', description: 'Server port' },
        { name: 'NODE_ENV', default: 'development', description: 'Environment' },
        {
            name: 'AGENTIC_MODE',
            default: 'shadow',
            description: 'Mode for AI Governance Execution (shadow, partial, full)',
        },
        {
            name: 'AGENTIC_KILL_SWITCH',
            default: 'false',
            description: 'Emergency kill switch for all autonomous actions',
        },
        {
            name: 'AGENTIC_CANARY_RATE_PCT',
            default: '5',
            description: 'Percentage of entities allowed for partial rollout (0-100)',
        },
    ],
};

const DB_MODES = {
    POSTGRESQL: 'postgresql',
};

function validateConfig() {
    const errors = [];
    const warnings = [];
    const env = process.env.NODE_ENV || 'development';
    const isProduction = env === 'production';

    // Set defaults
    for (const v of REQUIRED_VARS.all) {
        if (!process.env[v.name] && v.default) {
            process.env[v.name] = v.default;
        }
    }

    // Validate production requirements
    if (isProduction) {
        for (const v of REQUIRED_VARS.production) {
            if (!process.env[v.name]) {
                errors.push(`Missing required env var: ${v.name} — ${v.description}`);
            } else if (v.minLength && process.env[v.name].length < v.minLength) {
                errors.push(`${v.name} must be at least ${v.minLength} characters`);
            }
        }

        if (!process.env.CORS_ORIGINS || process.env.CORS_ORIGINS === '*') {
            errors.push('CORS_ORIGINS must be set to specific origins in production (no wildcards)');
        }
    }

    // Database mode — PostgreSQL only
    const dbMode = DB_MODES.POSTGRESQL;
    console.log('📊 Database: PostgreSQL (via Prisma)');
    if (process.env.REDIS_URL) {
        console.log('📮 Cache: Redis');
    }

    // Report
    if (warnings.length > 0) {
        warnings.forEach(w => console.warn(`⚠️  ${w}`));
    }

    if (errors.length > 0) {
        console.error('\n❌ Configuration errors:');
        errors.forEach(e => console.error(`   • ${e}`));
        console.error('\nSee .env.example for required variables.\n');
        process.exit(1);
    }

    const agenticMode = process.env.AGENTIC_MODE || 'shadow';
    if (!['shadow', 'partial', 'full'].includes(agenticMode)) {
        errors.push(`AGENTIC_MODE must be one of: shadow, partial, full. (Got: ${agenticMode})`);
    }

    const agenticKillSwitch = process.env.AGENTIC_KILL_SWITCH === 'true';
    const agenticCanaryRatePct = parseInt(process.env.AGENTIC_CANARY_RATE_PCT || '5', 10);

    return { dbMode, isProduction, env, agenticMode, agenticKillSwitch, agenticCanaryRatePct };
}

// Warn if JWT secret is the insecure default (any environment)
function warnDefaultSecrets() {
    const jwtSecret = process.env.JWT_SECRET;
    const INSECURE_DEFAULTS = ['trustchecker-secret-key-DEV-ONLY', 'trustchecker-secret-change-me'];
    if (!jwtSecret || INSECURE_DEFAULTS.includes(jwtSecret) || jwtSecret.length < 32) {
        console.warn(
            '⚠️  WARNING: Using default/weak JWT_SECRET — this is INSECURE. Set JWT_SECRET env var (openssl rand -hex 64)'
        );
    }
    const encKey = process.env.ENCRYPTION_KEY;
    const INSECURE_ENC_DEFAULTS = ['trustchecker-encryption-key-DEV-ONLY'];
    if (!encKey || INSECURE_ENC_DEFAULTS.includes(encKey) || encKey.length < 32) {
        console.warn('⚠️  WARNING: ENCRYPTION_KEY not set or insecure — PII encryption disabled/weak');
    }
}

module.exports = { validateConfig, DB_MODES, warnDefaultSecrets };
