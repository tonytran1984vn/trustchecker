require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function migrateP3_5() {
    console.log('Executing P3.5 Migration... building Snapshot Store');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrate-p3.5.sql'), 'utf-8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('✅ P3.5 Migration successfully executed!');
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
migrateP3_5();
