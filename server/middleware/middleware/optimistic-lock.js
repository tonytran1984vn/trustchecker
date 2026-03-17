/**
 * v9.4.4: Optimistic Locking Helper
 * Prevents concurrent update race conditions by checking version before UPDATE.
 *
 * Usage:
 *   const { updateWithLock } = require('../middleware/optimistic-lock');
 *   await updateWithLock(db, 'ops_incidents_v2', id, orgId, req.body.version, updates);
 */

async function updateWithLock(db, table, id, orgId, expectedVersion, updates) {
    // Build SET clause
    const setClauses = [];
    const params = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
        setClauses.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
    }

    // Always increment version
    setClauses.push(`version = version + 1`);
    setClauses.push(`updated_at = NOW()`);

    const sql = `UPDATE ${table} SET ${setClauses.join(', ')}
                 WHERE id = $${paramIndex} AND org_id = $${paramIndex + 1}
                 AND version = $${paramIndex + 2}`;
    params.push(id, orgId, expectedVersion || 0);

    const result = await db.run(sql, params);

    if (result?.changes === 0 || result?.rowCount === 0) {
        const error = new Error('Conflict: record was modified by another user');
        error.status = 409;
        error.code = 'OPTIMISTIC_LOCK_CONFLICT';
        throw error;
    }

    return result;
}

module.exports = { updateWithLock };
