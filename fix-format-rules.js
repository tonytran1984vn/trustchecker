// Create format_rules tables in PostgreSQL + seed data for tony is king
const db = require('./server/db');

(async () => {
    try {
        // 1. Create tables (PostgreSQL syntax)
        console.log('Creating format_rules table...');
        await db.run(`CREATE TABLE IF NOT EXISTS format_rules (
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
    )`);
        console.log('  ✓ format_rules');

        await db.run(`CREATE TABLE IF NOT EXISTS format_rules_audit (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL,
      action TEXT NOT NULL,
      changes TEXT DEFAULT '{}',
      actor_id TEXT,
      actor_name TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    )`);
        console.log('  ✓ format_rules_audit');

        // 2. Find tony is king org
        const orgs = await db.all("SELECT id, name, slug FROM organizations");
        console.log('\nOrganizations:');
        (orgs || []).forEach(o => console.log(`  ${o.slug} | ${o.name} | ${o.id}`));

        const tonyOrg = (orgs || []).find(o =>
            o.slug === 'tonyisking' ||
            (o.name || '').toLowerCase().includes('tony')
        );

        const tenantId = tonyOrg ? tonyOrg.id : null;
        console.log('\nUsing tenant:', tonyOrg ? tonyOrg.name : 'none', '→', tenantId);

        // 3. Clear old data
        await db.run("DELETE FROM format_rules_audit");
        await db.run("DELETE FROM format_rules");
        console.log('Cleared old data');

        // 4. Seed rules
        const { v4: uuidv4 } = require('uuid');
        const rules = [
            { name: 'TrustChecker Standard', prefix: 'TK-', pattern: '^TK-[A-Z]+-[0-9]{4}-[A-Z0-9]+-[A-Z0-9]$', separator: '-', code_length: 28, charset: 'ALPHANUMERIC_UPPER', check_digit_algo: 'HMAC-SHA256', description: 'Default TrustChecker format: TK-{SKU}-{YEAR}-{TIMESTAMP}{RANDOM}-{CHECK}', example: 'TK-AQM-2026-1708450015-Q', status: 'active', usage_count: 1240 },
            { name: 'GS1 / EAN-13', prefix: '', pattern: '^[0-9]{13}$', separator: '', code_length: 13, charset: 'NUMERIC', check_digit_algo: 'Modulo-10', description: 'Standard 13-digit EAN barcode for retail products', example: '4006381333931', status: 'active', usage_count: 860 },
            { name: 'GS1-128 / SSCC-18', prefix: '00', pattern: '^[0-9]{18}$', separator: '', code_length: 18, charset: 'NUMERIC', check_digit_algo: 'Modulo-10', description: 'Serial Shipping Container Code for logistics pallets', example: '003456789012345675', status: 'active', usage_count: 320 },
            { name: 'Pharmaceutical Serialization', prefix: 'RX-', pattern: '^RX-[A-Z0-9]{6}-[A-Z0-9]{8}-[A-Z0-9]{2}$', separator: '-', code_length: 22, charset: 'ALPHANUMERIC_UPPER', check_digit_algo: 'HMAC-SHA256', description: 'FDA DSCSA compliant drug serialization format', example: 'RX-B4K7M2-A9C3E1F8-XZ', status: 'active', usage_count: 540 },
            { name: 'Luxury Brand Anti-Counterfeit', prefix: 'LX-', pattern: '^LX-[A-Z]{2}[0-9]{4}-[A-Z0-9]{12}$', separator: '-', code_length: 24, charset: 'ALPHANUMERIC_UPPER', check_digit_algo: 'CRC-32', description: 'High-security format for luxury goods authentication', example: 'LX-VN2026-8KM3P7Q2R5T1', status: 'active', usage_count: 175 },
            { name: 'Short Retail Label', prefix: '', pattern: '^[0-9]{8}$', separator: '', code_length: 8, charset: 'NUMERIC', check_digit_algo: 'Luhn', description: 'Compact 8-digit code for small retail labels', example: '73920184', status: 'paused', usage_count: 90 },
        ];

        let count = 0;
        for (let i = 0; i < rules.length; i++) {
            const r = rules[i];
            const id = uuidv4();
            const daysAgo = 28 - (i * 5);
            await db.run(
                `INSERT INTO format_rules (id, name, prefix, pattern, separator, code_length, charset, check_digit_algo, description, example, tenant_id, status, usage_count, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, NOW() - INTERVAL '${daysAgo} days', NOW())`,
                [id, r.name, r.prefix, r.pattern, r.separator, r.code_length, r.charset, r.check_digit_algo, r.description, r.example, tenantId, r.status, r.usage_count]
            );
            // Audit: created
            await db.run(
                `INSERT INTO format_rules_audit (id, rule_id, action, changes, actor_id, actor_name, created_at)
         VALUES ($1,$2,'created',$3,'system','System Seed', NOW() - INTERVAL '${daysAgo} days')`,
                [uuidv4(), id, JSON.stringify({ name: r.name, prefix: r.prefix })]
            );
            count++;
            console.log(`  ✓ ${r.name}`);
        }

        // 5. Add some "updated" audit events for realism
        const firstRules = await db.all("SELECT id, name FROM format_rules WHERE status='active' LIMIT 3");
        for (const rule of (firstRules || [])) {
            await db.run(
                `INSERT INTO format_rules_audit (id, rule_id, action, changes, actor_id, actor_name, created_at)
         VALUES ($1,$2,'updated',$3,'admin','admin', NOW() - INTERVAL '2 days')`,
                [uuidv4(), rule.id, JSON.stringify({ code_length: { from: 20, to: 24 } })]
            );
        }

        console.log(`\n✅ Seeded ${count} format rules + audit logs for ${tonyOrg ? tonyOrg.name : 'all'}`);
    } catch (e) {
        console.error('Error:', e.message, e.stack);
    }
    process.exit(0);
})();
