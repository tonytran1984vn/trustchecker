// Check actual PostgreSQL qr_codes table columns
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://trustchecker:TrustChk%402026%21@localhost:5432/trustchecker?schema=public'
});

(async () => {
    try {
        // 1. Check qr_codes columns
        const cols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'qr_codes' 
      ORDER BY ordinal_position
    `);
        console.log('\n=== qr_codes columns ===');
        cols.rows.forEach(c => console.log(`  ${c.column_name} : ${c.data_type}`));

        // 2. Check if any qr_codes exist
        const count = await pool.query('SELECT COUNT(*) as cnt FROM qr_codes');
        console.log('\n=== qr_codes count ===');
        console.log('  Total:', count.rows[0].cnt);

        // 3. Sample row
        const sample = await pool.query('SELECT * FROM qr_codes LIMIT 1');
        console.log('\n=== sample qr_code ===');
        if (sample.rows.length > 0) {
            console.log('  Columns:', Object.keys(sample.rows[0]).join(', '));
            console.log('  Data:', JSON.stringify(sample.rows[0]).substring(0, 500));
        } else {
            console.log('  (no rows)');
        }

        // 4. Check products columns  
        const pcols = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      ORDER BY ordinal_position
    `);
        console.log('\n=== products columns ===');
        pcols.rows.forEach(c => console.log(`  ${c.column_name} : ${c.data_type}`));

    } catch (e) {
        console.error('ERROR:', e.message);
    } finally {
        await pool.end();
    }
})();
