require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('./db');

async function migrateP2() {
    console.log('Connecting to database...');
    await db._readyPromise;
    console.log('DB Ready.');

    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrate-p2.sql'), 'utf-8');

        console.log('Executing P2 Migration... building Institutional Database Invariants');
        const { Pool } = require('pg');
        const pool = new Pool({ connectionString: process.env.PGBOUNCER_URL || process.env.DATABASE_URL });
        const client = await pool.connect();

        try {
            await client.query('BEGIN');
            await client.query(sql);
            await client.query('COMMIT');
            console.log('✅ P2 Migration successfully executed!');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
            await pool.end();
        }
    } catch (e) {
        console.error('⛔ Migration Failed:', e.message);
        process.exit(1);
    }

    process.exit(0);
}

migrateP2();
