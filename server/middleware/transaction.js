/**
 * v9.4.4: Transaction Helper
 * Wraps multi-step DB operations in a single transaction.
 *
 * Usage:
 *   const { withTransaction } = require('../middleware/transaction');
 *   await withTransaction(db, async (tx) => {
 *       await tx.run('INSERT ...', [params]);
 *       await tx.run('UPDATE ...', [params]);
 *   });
 *
 * If any step fails, ALL changes are rolled back.
 */

async function withTransaction(db, callback) {
    const client = db._pool ? await db._pool.connect() : null;

    if (client) {
        // PostgreSQL with connection pool
        try {
            await client.query('BEGIN');
            const tx = {
                run: (sql, params) => client.query(sql, params),
                get: async (sql, params) => { const r = await client.query(sql, params); return r.rows[0]; },
                all: async (sql, params) => { const r = await client.query(sql, params); return r.rows; },
            };
            const result = await callback(tx);
            await client.query('COMMIT');
            return result;
        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }
    } else {
        // Fallback: use db directly with BEGIN/COMMIT
        try {
            await db.run('BEGIN');
            const result = await callback(db);
            await db.run('COMMIT');
            return result;
        } catch (err) {
            await db.run('ROLLBACK');
            throw err;
        }
    }
}

module.exports = { withTransaction };
