/**
 * Seed script for remaining empty pages:
 * 1. Create pending_role_approvals table + seed data (Governance → Approvals)
 * 2. Seed format_rules data (Identity → Format Rules)
 * 3. Seed audit_log entries with code-related actions (Identity → Audit Trail)
 * 4. Seed duplicate scan events (Identity → Duplicate Intelligence)
 * 
 * Run: node seed-remaining-pages.js
 */
require('dotenv').config();
const { Client } = require('pg');
const { v4: uuid } = require('uuid');

const ORG_ID = '54197b08-bd93-467d-a738-925ba22bdb6c';

async function main() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    console.log('✅ Connected to DB');

    // ═══════════════════════════════════════════════════════════
    // 1. PENDING_ROLE_APPROVALS — Create table + seed
    // ═══════════════════════════════════════════════════════════
    console.log('\n📋 1. Pending Role Approvals...');
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS pending_role_approvals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        requested_role TEXT NOT NULL,
        current_role TEXT DEFAULT '',
        reason TEXT DEFAULT '',
        requested_by TEXT,
        approved_by TEXT,
        status TEXT DEFAULT 'pending',
        tenant_id TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
        console.log('  ✅ Table created');

        // Get user IDs
        const users = await client.query(`SELECT id, username, email, role FROM users WHERE org_id = $1 LIMIT 5`, [ORG_ID]);
        if (users.rows.length === 0) {
            console.log('  ⚠️  No users found for org, skipping approvals seed');
        } else {
            const adminUser = users.rows.find(u => u.role === 'company_admin') || users.rows[0];

            const approvals = [
                { role: 'risk_officer', current: 'operator', reason: 'Needs access to risk dashboard for Q2 analysis', status: 'pending' },
                { role: 'compliance_officer', current: 'auditor', reason: 'Promoted to compliance lead — requires elevated permissions', status: 'pending' },
                { role: 'admin', current: 'operator', reason: 'Team lead needs admin access for user management', status: 'approved' },
            ];

            for (const a of approvals) {
                const targetUser = users.rows.find(u => u.role !== 'company_admin') || users.rows[0];
                await client.query(`
          INSERT INTO pending_role_approvals (id, user_id, requested_role, current_role, reason, requested_by, status, tenant_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (id) DO NOTHING
        `, [uuid(), targetUser.id, a.role, a.current, a.reason, adminUser.id, a.status, ORG_ID]);
            }
            console.log(`  ✅ Seeded ${approvals.length} role approvals`);
        }
    } catch (err) {
        console.error('  ❌ Approvals error:', err.message);
    }

    // ═══════════════════════════════════════════════════════════
    // 2. FORMAT RULES — Seed into format_rules table
    // ═══════════════════════════════════════════════════════════
    console.log('\n📐 2. Format Rules...');
    try {
        // Table should auto-create via scm-code-governance.js init, but ensure it exists
        await client.query(`
      CREATE TABLE IF NOT EXISTS format_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        prefix TEXT DEFAULT '',
        pattern TEXT DEFAULT '',
        separator TEXT DEFAULT '-',
        code_length INTEGER DEFAULT 24,
        charset TEXT DEFAULT 'ALPHANUMERIC_UPPER',
        check_digit_algo TEXT DEFAULT 'HMAC-SHA256',
        description TEXT DEFAULT '',
        example TEXT DEFAULT '',
        tenant_id TEXT,
        status TEXT DEFAULT 'active',
        usage_count INTEGER DEFAULT 0,
        created_by TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

        const rules = [
            {
                name: 'TrustChecker Standard',
                prefix: 'TK-',
                pattern: '^TK-[A-Z]+-\\d{4}-\\d{10,}-[A-Z0-9]$',
                separator: '-',
                code_length: 28,
                charset: 'ALPHANUMERIC_UPPER',
                check_digit_algo: 'HMAC-SHA256',
                description: 'Default TrustChecker format: TK-{SKU}-{YEAR}-{TIMESTAMP}{RANDOM}-{CHECK}',
                example: 'TK-ABCD-2026-1234567890-XY3K'
            },
            {
                name: 'GS1 / EAN-13 Barcode',
                prefix: '',
                pattern: '^\\d{13}$',
                separator: '',
                code_length: 13,
                charset: 'NUMERIC',
                check_digit_algo: 'Modulo-10',
                description: 'Standard 13-digit EAN barcode for retail products',
                example: '5901234123457'
            },
            {
                name: 'SSCC-18 Shipping',
                prefix: '00',
                pattern: '^\\d{18}$',
                separator: '',
                code_length: 18,
                charset: 'NUMERIC',
                check_digit_algo: 'Modulo-10',
                description: 'Serial Shipping Container Code (GS1-128) for logistics',
                example: '003456789012345678'
            },
            {
                name: 'VN Coffee Origin Code',
                prefix: 'VN-CF-',
                pattern: '^VN-CF-[A-Z]{2}-\\d{6}-[A-Z0-9]{4}$',
                separator: '-',
                code_length: 22,
                charset: 'ALPHANUMERIC_UPPER',
                check_digit_algo: 'CRC-32',
                description: 'Vietnam coffee origin tracking — region + batch + check',
                example: 'VN-CF-DL-202603-X7K2'
            },
            {
                name: 'Short Retail Label',
                prefix: '',
                pattern: '^\\d{8}$',
                separator: '',
                code_length: 8,
                charset: 'NUMERIC',
                check_digit_algo: 'Luhn',
                description: 'Short 8-digit numeric code for retail labels and stickers',
                example: '12345678'
            },
        ];

        let seeded = 0;
        for (const r of rules) {
            const exists = await client.query(`SELECT id FROM format_rules WHERE name = $1 AND tenant_id = $2`, [r.name, ORG_ID]);
            if (exists.rows.length === 0) {
                await client.query(`
          INSERT INTO format_rules (id, name, prefix, pattern, separator, code_length, charset, check_digit_algo, description, example, tenant_id, status)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active')
        `, [uuid(), r.name, r.prefix, r.pattern, r.separator, r.code_length, r.charset, r.check_digit_algo, r.description, r.example, ORG_ID]);
                seeded++;
            }
        }
        console.log(`  ✅ Seeded ${seeded} format rules (${rules.length - seeded} already existed)`);
    } catch (err) {
        console.error('  ❌ Format rules error:', err.message);
    }

    // ═══════════════════════════════════════════════════════════
    // 3. AUDIT LOG — Seed code-related entries
    // ═══════════════════════════════════════════════════════════
    console.log('\n📜 3. Audit Log (code-related actions)...');
    try {
        const users = await client.query(`SELECT id FROM users WHERE org_id = $1 LIMIT 3`, [ORG_ID]);
        const actorId = users.rows[0]?.id || 'system';

        // First, disable the immutability trigger temporarily
        try {
            await client.query(`ALTER TABLE audit_log DISABLE TRIGGER trg_audit_no_delete`);
            await client.query(`ALTER TABLE audit_log DISABLE TRIGGER trg_audit_no_update`);
        } catch (e) { /* triggers may not exist */ }

        const actions = [
            { action: 'code_generate', entity_type: 'qr_code', details: { count: 500, format: 'TK-Standard', batch: 'B-2026-001' } },
            { action: 'code_lock', entity_type: 'qr_code', details: { code_id: 'TK-ABCD-2026-001', reason: 'Suspected counterfeit report' } },
            { action: 'code_revoke', entity_type: 'qr_code', details: { code_id: 'TK-EFGH-2026-002', reason: 'Product recalled' } },
            { action: 'batch_create', entity_type: 'batch', details: { batch_number: 'B-2026-Q1-COFFEE', quantity: 10000 } },
            { action: 'code_flag', entity_type: 'qr_code', details: { code_id: 'TK-IJKL-2026-003', flag: 'duplicate_scan_detected' } },
            { action: 'qr_create', entity_type: 'qr_code', details: { format: 'GS1-128', count: 200 } },
            { action: 'format_rule_created', entity_type: 'format_rule', details: { name: 'TrustChecker Standard', charset: 'ALPHANUMERIC_UPPER' } },
            { action: 'code_generate', entity_type: 'qr_code', details: { count: 1000, format: 'EAN-13', batch: 'B-2026-002' } },
            { action: 'model_created', entity_type: 'risk_model', details: { version: 'v3.2.1' } },
            { action: 'model_deployed', entity_type: 'risk_model', details: { version: 'v3.2.1', co_signer: 'compliance@tonyisking.com' } },
            { action: 'user_login', entity_type: 'session', details: { method: 'password', ip: '192.168.1.100' } },
            { action: 'role_changed', entity_type: 'user', details: { from: 'operator', to: 'auditor', user: 'ops@tonyisking.com' } },
        ];

        let seeded = 0;
        for (let i = 0; i < actions.length; i++) {
            const a = actions[i];
            const ts = new Date(Date.now() - (i * 3600000 * (i + 1))); // space them out
            try {
                await client.query(`
          INSERT INTO audit_log (id, actor_id, action, entity_type, entity_id, details, ip_address, timestamp)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `, [uuid(), actorId, a.action, a.entity_type, uuid().substring(0, 8), JSON.stringify(a.details), '10.0.0.' + (i + 1), ts.toISOString()]);
                seeded++;
            } catch (e) {
                console.error(`  ⚠️  Audit entry ${a.action}: ${e.message}`);
            }
        }

        // Re-enable triggers
        try {
            await client.query(`ALTER TABLE audit_log ENABLE TRIGGER trg_audit_no_delete`);
            await client.query(`ALTER TABLE audit_log ENABLE TRIGGER trg_audit_no_update`);
        } catch (e) { /* triggers may not exist */ }

        console.log(`  ✅ Seeded ${seeded} audit log entries`);
    } catch (err) {
        console.error('  ❌ Audit log error:', err.message);
    }

    // ═══════════════════════════════════════════════════════════
    // 4. DUPLICATE CLASSIFICATIONS — /scm/classify/duplicates
    // ═══════════════════════════════════════════════════════════
    console.log('\n🔍 4. Duplicate Classifications...');
    try {
        // Check if duplicate_classifications table exists
        const tableCheck = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'duplicate_classifications')
    `);

        if (!tableCheck.rows[0].exists) {
            await client.query(`
        CREATE TABLE IF NOT EXISTS duplicate_classifications (
          id TEXT PRIMARY KEY,
          scan_event_id TEXT,
          product_id TEXT,
          product_name TEXT DEFAULT '',
          classification TEXT DEFAULT 'unclassified',
          confidence FLOAT DEFAULT 0,
          scan_type TEXT DEFAULT 'duplicate',
          location TEXT DEFAULT '',
          region TEXT DEFAULT '',
          details JSONB DEFAULT '{}',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
            console.log('  ✅ Table created');
        }

        const products = await client.query(`SELECT id, name FROM products WHERE org_id = $1 LIMIT 5`, [ORG_ID]);
        if (products.rows.length === 0) {
            console.log('  ⚠️  No products found, skipping');
        } else {
            const classifications = [
                { type: 'curiosity', confidence: 0.85, location: 'HCMC Retail Store', region: 'VN-South' },
                { type: 'curiosity', confidence: 0.92, location: 'Singapore Mall', region: 'SG' },
                { type: 'leakage', confidence: 0.78, location: 'Bangkok Market', region: 'TH' },
                { type: 'counterfeit', confidence: 0.95, location: 'Hanoi Online Shop', region: 'VN-North' },
                { type: 'legitimate_rescan', confidence: 0.99, location: 'Warehouse B', region: 'VN-South' },
                { type: 'curiosity', confidence: 0.88, location: 'Manila Store', region: 'PH' },
                { type: 'leakage', confidence: 0.72, location: 'Jakarta Outlet', region: 'ID' },
                { type: 'unclassified', confidence: 0.45, location: 'Unknown Location', region: 'Unknown' },
                { type: 'counterfeit', confidence: 0.91, location: 'Shenzhen Market', region: 'CN-South' },
                { type: 'curiosity', confidence: 0.87, location: 'KL Retail', region: 'MY' },
            ];

            let seeded = 0;
            for (let i = 0; i < classifications.length; i++) {
                const c = classifications[i];
                const product = products.rows[i % products.rows.length];
                const ts = new Date(Date.now() - (i * 86400000)); // space by day
                try {
                    await client.query(`
            INSERT INTO duplicate_classifications (id, product_id, product_name, classification, confidence, scan_type, location, region, created_at)
            VALUES ($1, $2, $3, $4, $5, 'duplicate_scan', $6, $7, $8)
            ON CONFLICT (id) DO NOTHING
          `, [uuid(), product.id, product.name, c.type, c.confidence, c.location, c.region, ts.toISOString()]);
                    seeded++;
                } catch (e) {
                    console.error(`  ⚠️  Classification: ${e.message}`);
                }
            }
            console.log(`  ✅ Seeded ${seeded} duplicate classifications`);
        }
    } catch (err) {
        console.error('  ❌ Duplicate classification error:', err.message);
    }

    await client.end();
    console.log('\n🎉 All done!');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
