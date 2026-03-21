/**
 * Seed sample format rules for Code Format Rules page
 */
const db = require('./server/db');
const { v4: uuidv4 } = require('uuid');

const rules = [
    {
        name: 'TrustChecker Standard',
        prefix: 'TK-',
        pattern: '^TK-[A-Z]+-[0-9]{4}-[A-Z0-9]+-[A-Z0-9]$',
        separator: '-',
        code_length: 28,
        charset: 'ALPHANUMERIC_UPPER',
        check_digit_algo: 'HMAC-SHA256',
        description: 'Default TrustChecker format: TK-{SKU}-{YEAR}-{TIMESTAMP}{RANDOM}-{CHECK}',
        example: 'TK-AQM-2026-1708450015-Q',
        status: 'active',
        usage_count: 1240,
        days_ago: 28
    },
    {
        name: 'GS1 / EAN-13',
        prefix: '',
        pattern: '^[0-9]{13}$',
        separator: '',
        code_length: 13,
        charset: 'NUMERIC',
        check_digit_algo: 'Modulo-10',
        description: 'Standard 13-digit EAN barcode — retail products',
        example: '4006381333931',
        status: 'active',
        usage_count: 860,
        days_ago: 21
    },
    {
        name: 'GS1-128 / SSCC-18',
        prefix: '00',
        pattern: '^[0-9]{18}$',
        separator: '',
        code_length: 18,
        charset: 'NUMERIC',
        check_digit_algo: 'Modulo-10',
        description: 'Serial Shipping Container Code — logistics pallets',
        example: '003456789012345675',
        status: 'active',
        usage_count: 320,
        days_ago: 14
    },
    {
        name: 'Pharmaceutical Serialization',
        prefix: 'RX-',
        pattern: '^RX-[A-Z0-9]{6}-[A-Z0-9]{8}-[A-Z0-9]{2}$',
        separator: '-',
        code_length: 22,
        charset: 'ALPHANUMERIC_UPPER',
        check_digit_algo: 'HMAC-SHA256',
        description: 'FDA DSCSA compliant drug serialization format',
        example: 'RX-B4K7M2-A9C3E1F8-XZ',
        status: 'active',
        usage_count: 540,
        days_ago: 10
    },
    {
        name: 'Luxury Brand Anti-Counterfeit',
        prefix: 'LX-',
        pattern: '^LX-[A-Z]{2}[0-9]{4}-[A-Z0-9]{12}$',
        separator: '-',
        code_length: 24,
        charset: 'ALPHANUMERIC_UPPER',
        check_digit_algo: 'CRC-32',
        description: 'High-security format for luxury goods authentication',
        example: 'LX-VN2026-8KM3P7Q2R5T1',
        status: 'active',
        usage_count: 175,
        days_ago: 7
    },
    {
        name: 'Short Retail Label',
        prefix: '',
        pattern: '^[0-9]{8}$',
        separator: '',
        code_length: 8,
        charset: 'NUMERIC',
        check_digit_algo: 'Luhn',
        description: 'Compact 8-digit code for small retail labels',
        example: '73920184',
        status: 'paused',
        usage_count: 90,
        days_ago: 3
    },
];

let count = 0;
for (const r of rules) {
    const id = uuidv4();
    try {
        db.run(
            `INSERT INTO format_rules (id, name, prefix, pattern, separator, code_length, charset, check_digit_algo, description, example, status, usage_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-' || ? || ' days'), datetime('now'))`,
            [id, r.name, r.prefix, r.pattern, r.separator, r.code_length, r.charset, r.check_digit_algo, r.description, r.example, r.status, r.usage_count, r.days_ago]
        );
        db.run(
            `INSERT INTO format_rules_audit (id, rule_id, action, changes, actor_id, actor_name)
       VALUES (?, ?, 'created', ?, 'system', 'System Seed')`,
            [uuidv4(), id, JSON.stringify({ name: r.name, prefix: r.prefix, charset: r.charset })]
        );
        count++;
        console.log(`  ✓ ${r.name}`);
    } catch (e) {
        console.error(`  ✗ ${r.name}: ${e.message}`);
    }
}

// Add some audit events for realism
const allRules = db.all ? db.all("SELECT id, name FROM format_rules WHERE status='active' LIMIT 3") : [];
if (Array.isArray(allRules)) {
    for (const rule of allRules) {
        db.run(
            `INSERT INTO format_rules_audit (id, rule_id, action, changes, actor_id, actor_name, created_at)
       VALUES (?, ?, 'updated', ?, 'admin', 'admin', datetime('now', '-2 days'))`,
            [uuidv4(), rule.id, JSON.stringify({ code_length: { from: 20, to: 24 } })]
        );
    }
}

console.log(`\n✅ Seeded ${count} format rules + audit logs`);
process.exit(0);
