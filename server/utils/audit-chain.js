/**
 * Audit Chain — Tamper-Evident Audit Log
 * 
 * Each entry includes a SHA-256 hash of (previous_hash + payload).
 * Creates an append-only chain where any modification is detectable.
 * 
 * Usage:
 *   const { appendAuditEntry, verifyChain } = require('./audit-chain');
 *   await appendAuditEntry({ actor_id, action, entity_type, entity_id, details, ip });
 *   const result = await verifyChain(100);
 */

const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

/**
 * Append a tamper-evident audit entry with hash chain.
 */
async function appendAuditEntry({ actor_id, action, entity_type, entity_id, details, ip }) {
    const id = uuidv4();
    const timestamp = new Date().toISOString();
    const detailsStr = typeof details === 'string' ? details : JSON.stringify(details || {});

    // Get previous entry's hash (genesis = '0')
    let prevHash = '0';
    try {
        const last = await db.get(
            'SELECT entry_hash FROM audit_log WHERE entry_hash IS NOT NULL ORDER BY timestamp DESC LIMIT 1'
        );
        if (last && last.entry_hash) prevHash = last.entry_hash;
    } catch (e) {
        // Table might not have entry_hash column yet — graceful fallback
    }

    // Compute hash: SHA-256(prev_hash + payload)
    const payload = `${actor_id}|${action}|${entity_type}|${entity_id}|${detailsStr}|${timestamp}`;
    const entryHash = crypto.createHash('sha256').update(prevHash + '|' + payload).digest('hex');

    try {
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address, timestamp, prev_hash, entry_hash)
             VALUES (?,?,?,?,?,?,?,?,?,?)`,
            [id, actor_id || 'system', action, entity_type || '', entity_id || '', detailsStr, ip || '', timestamp, prevHash, entryHash]
        );
    } catch (e) {
        // Fallback: insert without hash columns if they don't exist yet
        await db.run(
            `INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address, timestamp)
             VALUES (?,?,?,?,?,?,?,?)`,
            [id, actor_id || 'system', action, entity_type || '', entity_id || '', detailsStr, ip || '', timestamp]
        );
    }

    return { id, entry_hash: entryHash, prev_hash: prevHash };
}

/**
 * Verify the integrity of the audit chain.
 * Checks that each entry's hash matches the computed hash from its payload.
 * 
 * @param {number} limit - Number of most recent entries to verify
 * @returns {{ valid: boolean, entries_checked: number, first_broken?: number }}
 */
async function verifyChain(limit = 100) {
    try {
        const entries = await db.all(
            `SELECT id, actor_id, action, entity_type, entity_id, details, timestamp, prev_hash, entry_hash
             FROM audit_log WHERE entry_hash IS NOT NULL
             ORDER BY timestamp ASC LIMIT ?`,
            [limit]
        );

        if (entries.length === 0) return { valid: true, entries_checked: 0, message: 'No hashed entries found' };

        let prevHash = entries[0].prev_hash || '0';

        for (let i = 0; i < entries.length; i++) {
            const e = entries[i];
            const payload = `${e.actor_id}|${e.action}|${e.entity_type}|${e.entity_id}|${e.details}|${e.timestamp}`;
            const expected = crypto.createHash('sha256').update((i === 0 ? e.prev_hash : prevHash) + '|' + payload).digest('hex');

            if (e.entry_hash !== expected) {
                return { valid: false, entries_checked: i + 1, first_broken: i, broken_id: e.id, reason: 'Hash mismatch' };
            }
            prevHash = e.entry_hash;
        }

        return { valid: true, entries_checked: entries.length };
    } catch (e) {
        return { valid: false, entries_checked: 0, error: e.message };
    }
}

module.exports = { appendAuditEntry, verifyChain };

// ═══════════════════════════════════════════════════════════════════
// P3: IMMUTABLE RECORD ARCHITECTURE
// ═══════════════════════════════════════════════════════════════════

// Statuses that make a record immutable
const IMMUTABLE_STATUSES = new Set(['verified', 'sealed', 'approved', 'recalled']);

// Status column name per table
const STATUS_COLUMN = {
    batches: 'status',
    partners: 'kyc_status',
    evidence_items: 'verification_status',
};

/**
 * Record a data mutation in audit_log with before/after diff.
 * Uses hash chain for tamper evidence.
 */
async function recordMutation(req, table, entityId, before, after, reason = '') {
    // Compute diff
    const diff = {};
    if (before && after) {
        for (const key of Object.keys(after)) {
            if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
                diff[key] = { from: before[key], to: after[key] };
            }
        }
    }

    await appendAuditEntry({
        actor_id: req?.user?.id || 'system',
        action: 'DATA_MUTATION',
        entity_type: table,
        entity_id: entityId,
        details: { reason, changes: diff },
        ip: req?.ip || null,
    });
}

/**
 * Save a full version snapshot of a record before modification.
 */
async function snapshotVersion(req, table, entityId, data, reason = 'pre-update snapshot') {
    try {
        const latest = await db.get(
            'SELECT COALESCE(MAX(version), 0) as max_v FROM record_versions WHERE entity_type = ? AND entity_id = ?',
            [table, entityId]
        );
        const newVersion = (latest?.max_v || 0) + 1;

        // Mark previous active version as superseded
        await db.run(
            `UPDATE record_versions SET status = 'superseded' WHERE entity_type = ? AND entity_id = ? AND status = 'active'`,
            [table, entityId]
        );

        // Insert new version
        await db.run(
            `INSERT INTO record_versions (id, entity_type, entity_id, version, data, status, created_by, reason, org_id)
             VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`,
            [
                uuidv4(), table, entityId, newVersion,
                JSON.stringify(data),
                req?.user?.id || 'system',
                reason,
                req?.orgId || data?.org_id || null,
            ]
        );
        return newVersion;
    } catch (err) {
        console.error('[audit-chain] snapshotVersion error:', err.message);
        return null;
    }
}

/**
 * Check if a record is immutable (verified/sealed/approved).
 */
async function guardImmutable(table, entityId) {
    const statusCol = STATUS_COLUMN[table] || 'status';
    try {
        const record = await db.get(
            `SELECT "${statusCol}" as current_status FROM ${table} WHERE id = ?`,
            [entityId]
        );
        if (!record) return { immutable: false, status: null, message: 'Record not found' };
        const isImmutable = IMMUTABLE_STATUSES.has(record.current_status);
        return {
            immutable: isImmutable,
            status: record.current_status,
            message: isImmutable
                ? `Record is ${record.current_status}. Use proposal workflow.`
                : 'Record is mutable',
        };
    } catch (err) {
        return { immutable: false, status: null, message: err.message };
    }
}

/**
 * Middleware: block UPDATE on immutable records.
 * Usage: router.put('/:id', immutableGuard('batches'), handler)
 */
function immutableGuard(table, paramName = 'id') {
    return async (req, res, next) => {
        const entityId = req.params[paramName];
        if (!entityId) return next();
        const check = await guardImmutable(table, entityId);
        if (check.immutable) {
            return res.status(409).json({
                error: check.message,
                code: 'IMMUTABLE_RECORD',
                status: check.status,
                hint: 'POST /api/governance/proposals to submit a correction',
            });
        }
        next();
    };
}

/**
 * Safe update: snapshot → audit → update.
 */
async function safeUpdate(req, table, entityId, updateFn, reason = '') {
    const before = await db.get(`SELECT * FROM ${table} WHERE id = ?`, [entityId]);
    if (!before) throw new Error(`Record ${entityId} not found in ${table}`);
    await snapshotVersion(req, table, entityId, before, reason || 'pre-update');
    await updateFn();
    const after = await db.get(`SELECT * FROM ${table} WHERE id = ?`, [entityId]);
    await recordMutation(req, table, entityId, before, after, reason);
    return { before, after };
}

// Re-export all
module.exports = {
    appendAuditEntry, verifyChain,
    recordMutation, snapshotVersion, guardImmutable, immutableGuard, safeUpdate,
    IMMUTABLE_STATUSES,
};

