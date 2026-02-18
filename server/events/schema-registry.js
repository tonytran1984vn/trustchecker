/**
 * TrustChecker v9.2 — Event Schema Registry
 * ═══════════════════════════════════════════════════════════
 * JSON Schema validation for domain events with versioning.
 * Every event carries a schema version in its envelope.
 *
 * Evolution rules:
 *   - New fields: OK (backward-compatible)
 *   - Rename/remove fields: BREAKING → bump major version
 *   - Type changes: BREAKING → bump major version
 *
 * Usage:
 *   const { validateEvent, SCHEMAS } = require('./schema-registry');
 *   validateEvent('scan.created', { productId: '...' }); // throws if invalid
 */

// ─── Schema Definitions ─────────────────────────────────────
const SCHEMAS = {
    // ─── Scan Domain ─────────────────────────────────────
    'scan.created': {
        version: 1,
        required: ['productId', 'location', 'deviceInfo'],
        properties: {
            productId: 'string',
            location: 'string',
            deviceInfo: 'string',
            trustScore: 'number',
            userId: 'string',
            orgId: 'string',
        }
    },
    'scan.verified': {
        version: 1,
        required: ['scanId', 'productId', 'result'],
        properties: {
            scanId: 'string',
            productId: 'string',
            result: 'string', // 'authentic' | 'suspicious' | 'counterfeit'
            trustScore: 'number',
            verifiedBy: 'string',
        }
    },
    'scan.fraud_detected': {
        version: 1,
        required: ['scanId', 'productId', 'severity', 'reason'],
        properties: {
            scanId: 'string',
            productId: 'string',
            severity: 'string', // 'low' | 'medium' | 'high' | 'critical'
            reason: 'string',
            confidence: 'number',
            orgId: 'string',
        }
    },

    // ─── SCM Domain ──────────────────────────────────────
    'shipment.created': {
        version: 1,
        required: ['shipmentId', 'origin', 'destination'],
        properties: {
            shipmentId: 'string',
            origin: 'string',
            destination: 'string',
            products: 'array',
            carrier: 'string',
            orgId: 'string',
        }
    },
    'shipment.checkpoint': {
        version: 1,
        required: ['shipmentId', 'location', 'status'],
        properties: {
            shipmentId: 'string',
            location: 'string',
            status: 'string',
            temperature: 'number',
            humidity: 'number',
            timestamp: 'string',
        }
    },
    'shipment.delivered': {
        version: 1,
        required: ['shipmentId', 'deliveredAt'],
        properties: {
            shipmentId: 'string',
            deliveredAt: 'string',
            receivedBy: 'string',
            condition: 'string',
        }
    },
    'inventory.alert': {
        version: 1,
        required: ['productId', 'alertType', 'currentLevel'],
        properties: {
            productId: 'string',
            alertType: 'string', // 'low_stock' | 'overstock' | 'expiring'
            currentLevel: 'number',
            threshold: 'number',
            orgId: 'string',
        }
    },

    // ─── AI Domain ───────────────────────────────────────
    'ai.job.queued': {
        version: 1,
        required: ['jobId', 'jobType', 'service'],
        properties: {
            jobId: 'string',
            jobType: 'string',
            service: 'string', // 'simulation' | 'detection' | 'analytics'
            priority: 'number',
            orgId: 'string',
            tenantPlan: 'string',
        }
    },
    'ai.job.completed': {
        version: 1,
        required: ['jobId', 'jobType', 'durationMs'],
        properties: {
            jobId: 'string',
            jobType: 'string',
            durationMs: 'number',
            resultSize: 'number',
            service: 'string',
        }
    },
    'ai.job.failed': {
        version: 1,
        required: ['jobId', 'jobType', 'error'],
        properties: {
            jobId: 'string',
            jobType: 'string',
            error: 'string',
            attempts: 'number',
            service: 'string',
            movedToDLQ: 'boolean',
        }
    },

    // ─── Fraud Domain ────────────────────────────────────
    'fraud.alert.created': {
        version: 1,
        required: ['alertId', 'productId', 'severity'],
        properties: {
            alertId: 'string',
            productId: 'string',
            severity: 'string',
            score: 'number',
            source: 'string',
            orgId: 'string',
        }
    },
    'fraud.alert.resolved': {
        version: 1,
        required: ['alertId', 'resolvedBy', 'resolution'],
        properties: {
            alertId: 'string',
            resolvedBy: 'string',
            resolution: 'string', // 'confirmed_fraud' | 'false_positive' | 'under_review'
        }
    },

    // ─── System Domain ───────────────────────────────────
    'system.health.degraded': {
        version: 1,
        required: ['service', 'reason'],
        properties: {
            service: 'string',
            reason: 'string',
            circuitState: 'string',
        }
    },
    'system.health.recovered': {
        version: 1,
        required: ['service'],
        properties: {
            service: 'string',
            downtimeMs: 'number',
        }
    },
};

// ─── Validation ──────────────────────────────────────────────
/**
 * Validate event data against its registered schema.
 * @param {string} eventType - e.g. 'scan.created'
 * @param {object} data - event payload
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateEvent(eventType, data) {
    const schema = SCHEMAS[eventType];
    if (!schema) {
        return { valid: false, errors: [`Unknown event type: ${eventType}`] };
    }

    const errors = [];

    // Check required fields
    for (const field of schema.required) {
        if (data[field] === undefined || data[field] === null) {
            errors.push(`Missing required field: ${field}`);
        }
    }

    // Type check known properties
    for (const [field, expectedType] of Object.entries(schema.properties)) {
        if (data[field] !== undefined && data[field] !== null) {
            const actualType = Array.isArray(data[field]) ? 'array' : typeof data[field];
            if (actualType !== expectedType) {
                errors.push(`Field '${field}' expected ${expectedType}, got ${actualType}`);
            }
        }
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Get the current version for an event type.
 */
function getSchemaVersion(eventType) {
    return SCHEMAS[eventType]?.version ?? 0;
}

/**
 * List all registered event types.
 */
function listEventTypes() {
    return Object.entries(SCHEMAS).map(([type, schema]) => ({
        type,
        version: schema.version,
        required: schema.required,
    }));
}

module.exports = { SCHEMAS, validateEvent, getSchemaVersion, listEventTypes };
