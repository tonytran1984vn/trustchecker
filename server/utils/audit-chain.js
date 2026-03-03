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
