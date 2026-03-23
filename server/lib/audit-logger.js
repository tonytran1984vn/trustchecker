/**
 * Centralized Audit Logger — Captures IP address automatically
 *
 * Usage:
 *   const { logAudit } = require('../lib/audit-logger');
 *   await logAudit(req, { action: 'USER_LOGIN', entityType: 'session', entityId: userId, details: {...} });
 */
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const logger = require('./logger');

/**
 * Log an audit entry with automatic IP capture
 * @param {import('express').Request|null} req - Express request (for IP). Pass null for system actions.
 * @param {Object} opts
 * @param {string} opts.actorId - User ID performing the action
 * @param {string} opts.action - Action name (e.g. 'USER_LOGIN', 'GDPR_DATA_EXPORT')
 * @param {string} [opts.entityType] - Type of entity (e.g. 'session', 'user', 'product')
 * @param {string} [opts.entityId] - ID of the entity
 * @param {Object|string} [opts.details] - Additional details (will be JSON.stringify'd if object)
 * @param {string} [opts.orgId] - Organization ID
 */
async function logAudit(req, opts) {
    try {
        const id = uuidv4();
        const ip =
            req?.ip ||
            req?.connection?.remoteAddress ||
            req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
            null;
        const actorId = opts.actorId || req?.user?.id || 'system';
        const orgId = opts.orgId || req?.user?.orgId || req?.user?.org_id || null;
        const details = typeof opts.details === 'object' ? JSON.stringify(opts.details) : opts.details || null;

        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address, org_id, timestamp)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
            [id, actorId, opts.action, opts.entityType || null, opts.entityId || null, details, ip, orgId]
        );
    } catch (e) {
        // Non-blocking — never let audit logging break the main flow
        logger.warn('[audit-logger] Failed to log:', e.message);
    }
}

module.exports = { logAudit };
