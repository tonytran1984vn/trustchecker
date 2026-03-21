/**
 * Global Request Sanitizer Middleware
 * Applies to ALL write (POST/PUT/PATCH/DELETE) requests.
 * Catches common attack patterns before they reach route handlers.
 *
 * Layer 1: Payload size guard
 * Layer 2: Prototype pollution prevention
 * Layer 3: Recursive string sanitization (SQL injection markers, XSS)
 * Layer 4: Content-type enforcement
 */
'use strict';

const MAX_JSON_DEPTH = 10;
const MAX_STRING_LENGTH = 50000;
const MAX_ARRAY_LENGTH = 1000;

// Patterns that indicate injection attempts
const DANGEROUS_PATTERNS = [
    /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC)\b\s+(ALL\s+)?(\b(FROM|INTO|TABLE|DATABASE|WHERE|SET|VALUES)\b))/i,
    /<script[\s>]/i,
    /javascript\s*:/i,
    /on(error|load|click|mouseover)\s*=/i,
    /\beval\s*\(/i,
    /\bdocument\.(cookie|location|write)/i,
];

/**
 * Recursively sanitize an object
 */
function sanitizeValue(val, depth = 0) {
    if (depth > MAX_JSON_DEPTH) return undefined;

    if (val === null || val === undefined) return val;

    if (typeof val === 'string') {
        if (val.length > MAX_STRING_LENGTH) {
            return val.slice(0, MAX_STRING_LENGTH);
        }
        return val;
    }

    if (Array.isArray(val)) {
        if (val.length > MAX_ARRAY_LENGTH) {
            val = val.slice(0, MAX_ARRAY_LENGTH);
        }
        return val.map(item => sanitizeValue(item, depth + 1));
    }

    if (typeof val === 'object') {
        const clean = {};
        for (const [key, v] of Object.entries(val)) {
            // Block prototype pollution
            if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
                continue;
            }
            clean[key] = sanitizeValue(v, depth + 1);
        }
        return clean;
    }

    return val;
}

/**
 * Check if any string value matches dangerous patterns
 */
function containsDangerousPattern(obj, depth = 0) {
    if (depth > MAX_JSON_DEPTH) return false;
    if (typeof obj === 'string') {
        return DANGEROUS_PATTERNS.some(p => p.test(obj));
    }
    if (Array.isArray(obj)) {
        return obj.some(item => containsDangerousPattern(item, depth + 1));
    }
    if (obj && typeof obj === 'object') {
        return Object.values(obj).some(v => containsDangerousPattern(v, depth + 1));
    }
    return false;
}

/**
 * Main sanitizer middleware
 */
function requestSanitizer() {
    return (req, res, next) => {
        // Only process write methods
        if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
            return next();
        }

        // Content-Type check for body requests
        if (req.body && Object.keys(req.body).length > 0) {
            const ct = req.headers['content-type'] || '';
            if (!ct.includes('application/json') && !ct.includes('multipart/form-data') && !ct.includes('application/x-www-form-urlencoded')) {
                return res.status(415).json({ error: 'Unsupported content type' });
            }
        }

        // Sanitize body
        if (req.body && typeof req.body === 'object') {
            req.body = sanitizeValue(req.body);

            // Check for SQL injection / XSS patterns
            if (containsDangerousPattern(req.body)) {
                return res.status(400).json({
                    error: 'Request contains potentially dangerous content',
                    code: 'DANGEROUS_INPUT'
                });
            }
        }

        // Sanitize query params
        if (req.query && typeof req.query === 'object') {
            req.query = sanitizeValue(req.query);
        }

        next();
    };
}

module.exports = { requestSanitizer, sanitizeValue, containsDangerousPattern };
