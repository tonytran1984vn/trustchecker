require('dotenv').config();
const db = require('./db');

async function migrate() {
    await db._readyPromise;
    console.log('DB Ready');

    // Add unique partial index for global/org kill switches to prevent duplicate active switches
    try {
        await db.run(
            `CREATE UNIQUE INDEX IF NOT EXISTS kill_switch_active_idx ON kill_switch_logs (kill_switch_type, target) WHERE status = 'active'`
        );
        console.log('✅ Partial active index created successfully on kill_switch_logs.');
    } catch (e) {
        console.log('⚠️ Warning on index creation (might already exist): ' + e.message);
    }

    // Ops Incident Idempotency index
    try {
        await db.run(
            `CREATE UNIQUE INDEX IF NOT EXISTS ops_incidents_idempotency_idx ON ops_incidents_v2 (hash) WHERE hash != ''`
        );
        console.log('✅ Partial idempotency index created successfully on ops_incidents_v2.');
    } catch (e) {
        console.log('⚠️ Warning on index creation (might already exist): ' + e.message);
    }

    // Add JSONB details column to Ops Incidents for schema flexibility
    try {
        await db.run(`ALTER TABLE ops_incidents_v2 ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'`);
        console.log('✅ Details column added successfully to ops_incidents_v2.');
    } catch (e) {
        console.log('⚠️ Warning on details column creation: ' + e.message);
    }

    // Add JSONB details column to Kill Switch Logs for determinism payload caching
    try {
        await db.run(`ALTER TABLE kill_switch_logs ADD COLUMN IF NOT EXISTS details JSONB DEFAULT '{}'`);
        console.log('✅ Details column added successfully to kill_switch_logs.');
    } catch (e) {
        console.log('⚠️ Warning on kill_switch_logs details column creation: ' + e.message);
    }

    // Outbox Pattern Scheme
    try {
        await db.run(`
            CREATE TABLE IF NOT EXISTS outbox_events (
                id VARCHAR(255) PRIMARY KEY,
                aggregate_type VARCHAR(100) NOT NULL,
                aggregate_id VARCHAR(255) NOT NULL,
                event_type VARCHAR(100) NOT NULL,
                payload JSONB NOT NULL,
                processed BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Outbox events table created successfully.');
    } catch (e) {
        console.log('⚠️ Warning on outbox_events creation: ' + e.message);
    }

    process.exit(0);
}

migrate();
