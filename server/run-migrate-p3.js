require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function migrateP3() {
    console.log('Executing P3 Migration... building L3 Telemetry Store');
    const pool = new Pool({ connectionString: process.env.PGBOUNCER_URL || process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrate-p3.sql'), 'utf-8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('✅ P3 Migration successfully executed!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('⛔ Migration Failed:', e.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
    process.exit(0);
}
migrateP3();
