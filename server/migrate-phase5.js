/**
 * Phase 5 Migration: Audit Immutability + Dual-Approval Queue
 * 
 * 1. Create DB triggers to block UPDATE/DELETE on audit_log
 * 2. Create dual_approval_queue table for GDPR and constitutional actions
 */
const db = require('./db');

async function migrate() {
    console.log('=== Phase 5 DB Migration ===\n');

    // --- 1. Immutable audit_log triggers ---
    const triggerSqls = [
        `CREATE OR REPLACE FUNCTION prevent_audit_mutation()
         RETURNS TRIGGER AS $body$
         BEGIN
           RAISE EXCEPTION 'AUDIT_IMMUTABLE: audit_log records cannot be modified or deleted'
             USING ERRCODE = '23514';
           RETURN NULL;
         END;
         $body$ LANGUAGE plpgsql`,

        `DROP TRIGGER IF EXISTS trg_audit_no_update ON audit_log`,

        `CREATE TRIGGER trg_audit_no_update
         BEFORE UPDATE ON audit_log
         FOR EACH ROW
         EXECUTE FUNCTION prevent_audit_mutation()`,

        `DROP TRIGGER IF EXISTS trg_audit_no_delete ON audit_log`,

        `CREATE TRIGGER trg_audit_no_delete
         BEFORE DELETE ON audit_log
         FOR EACH ROW
         EXECUTE FUNCTION prevent_audit_mutation()`
    ];

    for (const sql of triggerSqls) {
        try {
            await db.run(sql);
            console.log('OK:', sql.substring(0, 60));
        } catch (e) {
            console.log('ERR:', e.message.substring(0, 80));
        }
    }

    // --- 2. Dual-approval queue table ---
    const queueSql = `
        CREATE TABLE IF NOT EXISTS dual_approval_queue (
            id TEXT PRIMARY KEY,
            action_type TEXT NOT NULL,
            target_entity TEXT NOT NULL,
            target_id TEXT NOT NULL,
            payload JSONB DEFAULT '{}',
            requested_by TEXT NOT NULL,
            requested_at TIMESTAMP DEFAULT NOW(),
            first_approver TEXT,
            first_approved_at TIMESTAMP,
            second_approver TEXT,
            second_approved_at TIMESTAMP,
            status TEXT DEFAULT 'pending_first',
            executed_at TIMESTAMP,
            expires_at TIMESTAMP,
            org_id TEXT
        )
    `;
    try {
        await db.run(queueSql);
        console.log('\nOK: dual_approval_queue table created');
    } catch (e) {
        console.log('Queue table:', e.message.substring(0, 80));
    }

    // --- 3. Verify triggers ---
    try {
        const triggers = await db.all(
            "SELECT trigger_name, event_manipulation FROM information_schema.triggers WHERE event_object_table = 'audit_log'"
        );
        console.log('\nActive audit_log triggers:', JSON.stringify(triggers, null, 2));
    } catch (e) {
        console.log('Verify:', e.message);
    }

    // --- 4. Test immutability ---
    try {
        await db.run("UPDATE audit_log SET action = 'TAMPERED' WHERE id = (SELECT id FROM audit_log LIMIT 1)");
        console.log('\n⚠️ UPDATE succeeded — trigger NOT working');
    } catch (e) {
        if (e.message.includes('AUDIT_IMMUTABLE')) {
            console.log('\n✅ Immutability verified: UPDATE correctly blocked');
        } else {
            console.log('\n⚠️ UPDATE failed but not by trigger:', e.message.substring(0, 80));
        }
    }

    process.exit(0);
}

migrate();
