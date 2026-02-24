// Create tables + seed format rules via direct pg connection (bypass Prisma DDL skip)
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://trustchecker:TrustChk%402026%21@localhost:5432/trustchecker' });

(async () => {
    const client = await pool.connect();
    try {
        console.log('Connected to PostgreSQL directly');

        // 1. Create tables
        await client.query(`CREATE TABLE IF NOT EXISTS format_rules (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, prefix TEXT DEFAULT '',
      pattern TEXT DEFAULT '', separator TEXT DEFAULT '-', code_length INTEGER DEFAULT 24,
      charset TEXT DEFAULT 'ALPHANUMERIC_UPPER', check_digit_algo TEXT DEFAULT 'HMAC-SHA256',
      description TEXT DEFAULT '', example TEXT DEFAULT '', tenant_id TEXT,
      status TEXT DEFAULT 'active', usage_count INTEGER DEFAULT 0, created_by TEXT,
      created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW()
    )`);
        console.log('✓ format_rules table');

        await client.query(`CREATE TABLE IF NOT EXISTS format_rules_audit (
      id TEXT PRIMARY KEY, rule_id TEXT NOT NULL, action TEXT NOT NULL,
      changes TEXT DEFAULT '{}', actor_id TEXT, actor_name TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    )`);
        console.log('✓ format_rules_audit table');

        // 2. Clear old data
        await client.query('DELETE FROM format_rules_audit');
        await client.query('DELETE FROM format_rules');
        console.log('✓ Cleared old data');

        // 3. Get tony org
        const orgRes = await client.query("SELECT id, name FROM organizations WHERE slug = 'tony-is-king' OR name ILIKE '%tony%' LIMIT 1");
        const tenantId = orgRes.rows[0]?.id || null;
        console.log('✓ Tenant:', orgRes.rows[0]?.name, '→', tenantId);

        // 4. Seed rules
        const { v4: uuidv4 } = require('uuid');
        const rules = [
            { name: 'TrustChecker Standard', prefix: 'TK-', pattern: '^TK-[A-Z]+-[0-9]{4}-[A-Z0-9]+-[A-Z0-9]$', sep: '-', len: 28, cs: 'ALPHANUMERIC_UPPER', algo: 'HMAC-SHA256', desc: 'Default TrustChecker format: TK-{SKU}-{YEAR}-{TIMESTAMP}{RANDOM}-{CHECK}', ex: 'TK-AQM-2026-1708450015-Q', st: 'active', uc: 1240, d: 28 },
            { name: 'GS1 / EAN-13', prefix: '', pattern: '^[0-9]{13}$', sep: '', len: 13, cs: 'NUMERIC', algo: 'Modulo-10', desc: 'Standard 13-digit EAN barcode for retail products', ex: '4006381333931', st: 'active', uc: 860, d: 21 },
            { name: 'GS1-128 / SSCC-18', prefix: '00', pattern: '^[0-9]{18}$', sep: '', len: 18, cs: 'NUMERIC', algo: 'Modulo-10', desc: 'Serial Shipping Container Code for logistics pallets', ex: '003456789012345675', st: 'active', uc: 320, d: 14 },
            { name: 'Pharmaceutical Serialization', prefix: 'RX-', pattern: '^RX-[A-Z0-9]{6}-[A-Z0-9]{8}-[A-Z0-9]{2}$', sep: '-', len: 22, cs: 'ALPHANUMERIC_UPPER', algo: 'HMAC-SHA256', desc: 'FDA DSCSA compliant drug serialization format', ex: 'RX-B4K7M2-A9C3E1F8-XZ', st: 'active', uc: 540, d: 10 },
            { name: 'Luxury Brand Anti-Counterfeit', prefix: 'LX-', pattern: '^LX-[A-Z]{2}[0-9]{4}-[A-Z0-9]{12}$', sep: '-', len: 24, cs: 'ALPHANUMERIC_UPPER', algo: 'CRC-32', desc: 'High-security format for luxury goods authentication', ex: 'LX-VN2026-8KM3P7Q2R5T1', st: 'active', uc: 175, d: 7 },
            { name: 'Short Retail Label', prefix: '', pattern: '^[0-9]{8}$', sep: '', len: 8, cs: 'NUMERIC', algo: 'Luhn', desc: 'Compact 8-digit code for small retail labels', ex: '73920184', st: 'paused', uc: 90, d: 3 },
        ];

        for (const r of rules) {
            const id = uuidv4();
            await client.query(
                `INSERT INTO format_rules (id, name, prefix, pattern, separator, code_length, charset, check_digit_algo, description, example, tenant_id, status, usage_count, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, NOW() - INTERVAL '${r.d} days', NOW())`,
                [id, r.name, r.prefix, r.pattern, r.sep, r.len, r.cs, r.algo, r.desc, r.ex, tenantId, r.st, r.uc]
            );
            await client.query(
                `INSERT INTO format_rules_audit (id, rule_id, action, changes, actor_id, actor_name, created_at)
         VALUES ($1,$2,'created',$3,'system','System Seed', NOW() - INTERVAL '${r.d} days')`,
                [uuidv4(), id, JSON.stringify({ name: r.name, prefix: r.prefix })]
            );
            console.log(`  ✓ ${r.name}`);
        }

        // 5. Add update audit events
        const topRules = await client.query("SELECT id, name FROM format_rules WHERE status='active' LIMIT 3");
        for (const rule of topRules.rows) {
            await client.query(
                `INSERT INTO format_rules_audit (id, rule_id, action, changes, actor_id, actor_name, created_at)
         VALUES ($1,$2,'updated',$3,'admin','admin', NOW() - INTERVAL '2 days')`,
                [uuidv4(), rule.id, JSON.stringify({ code_length: { from: 20, to: rule.name.includes('EAN') ? 13 : 24 } })]
            );
        }

        // Verify
        const count = await client.query('SELECT COUNT(*) as c FROM format_rules');
        const auditCount = await client.query('SELECT COUNT(*) as c FROM format_rules_audit');
        console.log(`\n✅ Done! ${count.rows[0].c} rules, ${auditCount.rows[0].c} audit events`);

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        client.release();
        await pool.end();
        process.exit(0);
    }
})();
