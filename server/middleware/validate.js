/**
 * Request Validation Middleware (Zod-based)
 *
 * Validates req.body, req.query, req.params against Zod schemas.
 * Returns unified error format on validation failure.
 *
 * Usage:
 *   const { validate, schemas } = require('../middleware/validate');
 *   router.post('/products', validate(schemas.createProduct), handler);
 */
const { z } = require('zod');

/**
 * Create validation middleware from a Zod schema config
 * @param {{ body?: ZodSchema, query?: ZodSchema, params?: ZodSchema }} schemas
 */
function validate(schemas) {
    return (req, res, next) => {
        if (!schemas) return next(); // Skip validation if schema is undefined
        const errors = [];

        if (schemas.body) {
            const result = schemas.body.safeParse(req.body);
            if (!result.success) {
                for (const issue of result.error.issues) {
                    errors.push({
                        field: 'body.' + issue.path.join('.'),
                        message: issue.message,
                        code: issue.code,
                    });
                }
            } else {
                req.body = result.data; // Use parsed/cleaned data
            }
        }

        if (schemas.query) {
            const result = schemas.query.safeParse(req.query);
            if (!result.success) {
                for (const issue of result.error.issues) {
                    errors.push({
                        field: 'query.' + issue.path.join('.'),
                        message: issue.message,
                        code: issue.code,
                    });
                }
            } else {
                // In-place mutation: req.query is a getter in Express, cannot be reassigned
                Object.keys(req.query).forEach(k => delete req.query[k]);
                Object.assign(req.query, result.data);
            }
        }

        if (schemas.params) {
            const result = schemas.params.safeParse(req.params);
            if (!result.success) {
                for (const issue of result.error.issues) {
                    errors.push({
                        field: 'params.' + issue.path.join('.'),
                        message: issue.message,
                        code: issue.code,
                    });
                }
            } else {
                req.params = result.data;
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                data: null,
                meta: { timestamp: new Date().toISOString(), api_version: 1 },
                errors: errors.map(e => ({
                    code: 'VALIDATION_ERROR',
                    field: e.field,
                    message: e.message,
                })),
            });
        }

        next();
    };
}

module.exports = { validate, z };

// Re-export schemas for convenience (login.js imports { validate, schemas })
const schemas = require('../lib/schemas');
module.exports.schemas = schemas;
