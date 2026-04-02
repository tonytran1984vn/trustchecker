require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function migrateL4() {
    console.log('Executing L4 Migration... building Diff A/B Labs Store');
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const client = await pool.connect();
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrate-l4.sql'), 'utf-8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');
        console.log('✅ L4 Migration successfully executed!');
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
migrateL4();
