/**
 * Input Validation Middleware — Lightweight Schema Validation
 * 
 * Validates request body and query parameters against a schema.
 * No external dependencies — pure JavaScript implementation.
 * 
 * Usage:
 *   const { validate, schemas } = require('../middleware/validate');
 *   router.post('/product', validate(schemas.createProduct), handler);
 * 
 *   // Or inline:
 *   router.post('/scan', validate({
 *     body: { qr_data: { type: 'string', required: true } }
 *   }), handler);
 */

/**
 * Validate a value against a field schema.
 * @param {*} value - The value to validate
 * @param {object} rules - Validation rules
 * @param {string} fieldName - Name for error messages
 * @returns {string|null} Error message or null if valid
 */
function validateField(value, rules, fieldName) {
    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
        return `${fieldName} is required`;
    }

    // Skip validation if not present and not required
    if (value === undefined || value === null) return null;

    // Type check
    if (rules.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (rules.type === 'number' && typeof value === 'string' && !isNaN(value)) {
            // Allow numeric strings for query params
        } else if (rules.type === 'integer') {
            if (!Number.isInteger(Number(value))) return `${fieldName} must be an integer`;
        } else if (rules.type === 'uuid') {
            if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
                return `${fieldName} must be a valid UUID`;
            }
        } else if (rules.type === 'email') {
            if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return `${fieldName} must be a valid email address`;
            }
        } else if (actualType !== rules.type) {
            return `${fieldName} must be of type ${rules.type}`;
        }
    }

    // String validations
    if (typeof value === 'string') {
        if (rules.minLength && value.length < rules.minLength) {
            return `${fieldName} must be at least ${rules.minLength} characters`;
        }
        if (rules.maxLength && value.length > rules.maxLength) {
            return `${fieldName} must be at most ${rules.maxLength} characters`;
        }
        if (rules.pattern && !rules.pattern.test(value)) {
            return `${fieldName} format is invalid`;
        }
        if (rules.enum && !rules.enum.includes(value)) {
            return `${fieldName} must be one of: ${rules.enum.join(', ')}`;
        }
    }

    // Number validations
    if (typeof value === 'number' || (rules.type === 'number' && !isNaN(value))) {
        const num = Number(value);
        if (rules.min !== undefined && num < rules.min) {
            return `${fieldName} must be >= ${rules.min}`;
        }
        if (rules.max !== undefined && num > rules.max) {
            return `${fieldName} must be <= ${rules.max}`;
        }
    }

    // Array validations
    if (Array.isArray(value)) {
        if (rules.minItems && value.length < rules.minItems) {
            return `${fieldName} must have at least ${rules.minItems} items`;
        }
        if (rules.maxItems && value.length > rules.maxItems) {
            return `${fieldName} must have at most ${rules.maxItems} items`;
        }
    }

    return null;
}

/**
 * Express middleware factory — validates request against a schema.
 * 
 * @param {object} schema - { body: { field: rules }, query: { field: rules }, params: { field: rules } }
 * @returns {function} Express middleware
 */
function validate(schema) {
    return (req, res, next) => {
        const errors = [];

        // Validate body fields
        if (schema.body) {
            for (const [field, rules] of Object.entries(schema.body)) {
                const error = validateField(req.body?.[field], rules, field);
                if (error) errors.push(error);
            }
        }

        // Validate query params
        if (schema.query) {
            for (const [field, rules] of Object.entries(schema.query)) {
                const error = validateField(req.query?.[field], rules, field);
                if (error) errors.push(error);
            }
        }

        // Validate URL params
        if (schema.params) {
            for (const [field, rules] of Object.entries(schema.params)) {
                const error = validateField(req.params?.[field], rules, field);
                if (error) errors.push(error);
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors
            });
        }

        next();
    };
}

// ─── Pre-built Schemas ──────────────────────────────────────────────────────

const schemas = {
    createProduct: {
        body: {
            name: { type: 'string', required: true, minLength: 1, maxLength: 200 },
            sku: { type: 'string', required: true, minLength: 1, maxLength: 50 },
            category: { type: 'string', maxLength: 100 },
            manufacturer: { type: 'string', maxLength: 200 },
            origin_country: { type: 'string', maxLength: 2 },
        }
    },

    createPartner: {
        body: {
            name: { type: 'string', required: true, minLength: 1, maxLength: 200 },
            type: { type: 'string', enum: ['manufacturer', 'distributor', 'retailer', 'logistics', 'supplier'] },
            country: { type: 'string', maxLength: 2 },
            contact_email: { type: 'email' },
        }
    },

    createShipment: {
        body: {
            batch_id: { type: 'string', required: true },
            from_partner_id: { type: 'string', required: true },
            to_partner_id: { type: 'string', required: true },
            carrier: { type: 'string', maxLength: 100 },
        }
    },

    monteCarloParams: {
        body: {
            simulations: { type: 'number', min: 100, max: 10000 },
            avg_delay: { type: 'number', min: 0, max: 1000 },
            disruption_prob: { type: 'number', min: 0, max: 1 },
            shipments_per_month: { type: 'number', min: 1, max: 100000 },
        }
    },

    whatIfScenario: {
        body: {
            type: { type: 'string', required: true, enum: ['partner_failure', 'route_blocked', 'demand_spike', 'quality_recall'] },
            duration_days: { type: 'number', min: 1, max: 365 },
        }
    },

    pagination: {
        query: {
            limit: { type: 'number', min: 1, max: 200 },
            offset: { type: 'number', min: 0 },
        }
    },

    carbonOffset: {
        body: {
            offset_amount: { type: 'number', required: true, min: 0.01 },
            offset_type: { type: 'string', enum: ['VER', 'CER', 'GS', 'ACR'] },
            provider: { type: 'string', maxLength: 200 },
        }
    },

    // ─── Auth Schemas ────────────────────────────────────────────────

    login: {
        body: {
            email: { type: 'email', required: true },
            password: { type: 'string', required: true, minLength: 1, maxLength: 128 },
            mfa_code: { type: 'string', maxLength: 6 },
        }
    },

    register: {
        body: {
            username: { type: 'string', required: true, minLength: 2, maxLength: 50, pattern: /^[a-zA-Z0-9_.-]+$/ },
            email: { type: 'email', required: true },
            password: { type: 'string', required: true, minLength: 8, maxLength: 128 },
            role: { type: 'string', enum: ['user', 'operator', 'manager', 'admin'] },
        }
    },

    // ─── QR Schemas ──────────────────────────────────────────────────

    qrScan: {
        body: {
            qr_data: { type: 'string', required: true, minLength: 1, maxLength: 2048 },
            device_fingerprint: { type: 'string', maxLength: 256 },
            ip_address: { type: 'string', maxLength: 45 },
            latitude: { type: 'number', min: -90, max: 90 },
            longitude: { type: 'number', min: -180, max: 180 },
        }
    },

    // ─── KYC Schemas ─────────────────────────────────────────────────

    kycSubmit: {
        body: {
            name: { type: 'string', required: true, minLength: 1, maxLength: 200 },
            registration_number: { type: 'string', required: true, maxLength: 50 },
            country: { type: 'string', maxLength: 2 },
            contact_email: { type: 'email' },
        }
    },

    // ─── Evidence Schemas ────────────────────────────────────────────

    createEvidence: {
        body: {
            title: { type: 'string', required: true, minLength: 1, maxLength: 200 },
            description: { type: 'string', maxLength: 2000 },
            product_id: { type: 'string' },
            evidence_type: { type: 'string', enum: ['document', 'image', 'video', 'certificate', 'test_report'] },
        }
    },

    // ─── Billing Schemas ─────────────────────────────────────────────

    billingOp: {
        body: {
            plan: { type: 'string', required: true, enum: ['free', 'starter', 'pro', 'business', 'enterprise'] },
        }
    },

    // ─── Webhook Schemas ─────────────────────────────────────────────

    webhookCreate: {
        body: {
            url: { type: 'string', required: true, minLength: 10, maxLength: 2048 },
            events: { type: 'array', required: true, minItems: 1, maxItems: 30 },
            secret: { type: 'string', maxLength: 256 },
        }
    },

    // ─── SCM Schemas ─────────────────────────────────────────────────

    scmEvent: {
        body: {
            event_type: { type: 'string', required: true, enum: ['commission', 'pack', 'ship', 'receive', 'sell', 'return', 'destroy'] },
            product_id: { type: 'string' },
            batch_id: { type: 'string' },
            location: { type: 'string', maxLength: 200 },
        }
    },
};

module.exports = { validate, validateField, schemas };
