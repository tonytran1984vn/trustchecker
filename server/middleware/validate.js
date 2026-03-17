/**
 * Input Validation Middleware v1.0 (A-04)
 * Lightweight schema-based validation without external deps.
 * Usage: router.post('/api/foo', validate(schema), handler)
 */

const VALIDATORS = {
    string: (v, opts) => {
        if (typeof v !== 'string') return 'must be a string';
        if (opts.min && v.length < opts.min) return `min ${opts.min} characters`;
        if (opts.max && v.length > opts.max) return `max ${opts.max} characters`;
        if (opts.pattern && !opts.pattern.test(v)) return `invalid format`;
        if (opts.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'invalid email';
        return null;
    },
    number: (v, opts) => {
        const n = Number(v);
        if (isNaN(n)) return 'must be a number';
        if (opts.min !== undefined && n < opts.min) return `min ${opts.min}`;
        if (opts.max !== undefined && n > opts.max) return `max ${opts.max}`;
        if (opts.integer && !Number.isInteger(n)) return 'must be integer';
        return null;
    },
    boolean: (v) => {
        if (typeof v !== 'boolean' && v !== 'true' && v !== 'false') return 'must be boolean';
        return null;
    },
    uuid: (v) => {
        if (typeof v !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))
            return 'must be a valid UUID';
        return null;
    },
    enum: (v, opts) => {
        if (!opts.values?.includes(v)) return `must be one of: ${opts.values?.join(', ')}`;
        return null;
    },
    date: (v) => {
        if (isNaN(Date.parse(v))) return 'must be a valid date';
        return null;
    },
    array: (v, opts) => {
        if (!Array.isArray(v)) return 'must be an array';
        if (opts.min && v.length < opts.min) return `min ${opts.min} items`;
        if (opts.max && v.length > opts.max) return `max ${opts.max} items`;
        return null;
    },
};

function validate(schema) {
    return (req, res, next) => {
        const errors = [];
        const source = { ...req.body, ...req.query, ...req.params };

        for (const [field, rules] of Object.entries(schema)) {
            const value = source[field];

            // Required check
            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push({ field, error: 'required' });
                continue;
            }

            // Skip validation if optional and not provided
            if (value === undefined || value === null) continue;

            // Type validation
            const validator = VALIDATORS[rules.type];
            if (validator) {
                const err = validator(value, rules);
                if (err) errors.push({ field, error: err });
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors,
            });
        }

        next();
    };
}

// Pre-built schemas for common endpoints
const SCHEMAS = {
    register: {
        email: { type: 'string', required: true, email: true },
        password: { type: 'string', required: true, min: 12 },
        username: { type: 'string', min: 2, max: 50 },
        company: { type: 'string', max: 100 },
    },
    login: {
        email: { type: 'string', required: true, email: true },
        password: { type: 'string', required: true, min: 6 },
    },
    createProduct: {
        name: { type: 'string', required: true, min: 2, max: 200 },
        sku: { type: 'string', pattern: /^[A-Za-z0-9\-_]{3,50}$/ },
        origin_country: { type: 'string', pattern: /^[A-Z]{2}$/ },
    },
    scanEvent: {
        qr_data: { type: 'string', required: true, min: 1 },
    },
    rating: {
        entity_type: { type: 'enum', required: true, values: ['product', 'supplier', 'partner'] },
        entity_id: { type: 'uuid', required: true },
        score: { type: 'number', required: true, min: 0, max: 100, integer: true },
    },
};

module.exports = { validate, SCHEMAS, schemas: SCHEMAS };
