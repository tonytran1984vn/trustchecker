/**
 * TrustChecker v9.0 — SQLite to PostgreSQL Migration Script
 * 
 * Migrates all data from existing SQLite (sql.js) database to PostgreSQL via Prisma.
 * 
 * Usage:
 *   1. Ensure PostgreSQL is running (docker compose up -d postgres)
 *   2. Run: npx prisma migrate deploy
 *   3. Run: node scripts/migrate-to-postgres.js
 * 
 * Environment:
 *   DATABASE_URL=postgresql://user:pass@localhost:5432/trustchecker
 */

const { PrismaClient } = require('@prisma/client');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const DB_PATH = path.join(__dirname, '..', 'data', 'trustchecker.db');

// Table name → Prisma model name mapping
const TABLE_MODEL_MAP = {
    users: 'user',
    sessions: 'session',
    refresh_tokens: 'refreshToken',
    passkey_credentials: 'passkeyCredential',
    products: 'product',
    qr_codes: 'qrCode',
    scan_events: 'scanEvent',
    fraud_alerts: 'fraudAlert',
    trust_scores: 'trustScore',
    blockchain_seals: 'blockchainSeal',
    audit_log: 'auditLog',
    batches: 'batch',
    supply_chain_events: 'supplyChainEvent',
    inventory: 'inventory',
    partners: 'partner',
    shipments: 'shipment',
    iot_readings: 'iotReading',
    sla_definitions: 'slaDefinition',
    sla_violations: 'slaViolation',
    leak_alerts: 'leakAlert',
    supply_chain_graph: 'supplyChainGraph',
    kyc_businesses: 'kycBusiness',
    kyc_checks: 'kycCheck',
    sanction_hits: 'sanctionHit',
    evidence_items: 'evidenceItem',
    ratings: 'rating',
    certifications: 'certification',
    compliance_records: 'complianceRecord',
    billing_plans: 'billingPlan',
    usage_metrics: 'usageMetric',
    invoices: 'invoice',
    system_settings: 'systemSetting',
    webhook_events: 'webhookEvent',
    support_tickets: 'supportTicket',
    ticket_messages: 'ticketMessage',
    nft_certificates: 'nftCertificate',
    sustainability_scores: 'sustainabilityScore',
    data_retention_policies: 'dataRetentionPolicy',
    anomaly_detections: 'anomalyDetection'
};

// Columns that store JSON strings in SQLite → need parsing for PostgreSQL Json type
const JSON_COLUMNS = [
    'details', 'explanation', 'result', 'gps_trail', 'authorized_regions',
    'metadata', 'transfer_history', 'certifications', 'tags', 'payload'
];

// Columns that store boolean as INTEGER in SQLite
const BOOLEAN_COLUMNS = [
    'mfa_enabled', 'revoked', 'alert_triggered', 'is_secret', 'is_active'
];

// Migration order: respect foreign key dependencies
const MIGRATION_ORDER = [
    'users',
    'sessions', 'refresh_tokens', 'passkey_credentials',
    'products',
    'qr_codes', 'scan_events', 'fraud_alerts', 'trust_scores',
    'blockchain_seals', 'audit_log',
    'partners',
    'batches', 'supply_chain_events', 'inventory',
    'shipments', 'iot_readings',
    'sla_definitions', 'sla_violations',
    'leak_alerts', 'supply_chain_graph',
    'kyc_businesses', 'kyc_checks', 'sanction_hits',
    'evidence_items',
    'ratings', 'certifications', 'compliance_records',
    'billing_plans', 'usage_metrics', 'invoices',
    'system_settings', 'webhook_events',
    'support_tickets', 'ticket_messages',
    'nft_certificates', 'sustainability_scores',
    'data_retention_policies', 'anomaly_detections'
];

function transformRow(tableName, row, columns) {
    const transformed = {};

    for (let i = 0; i < columns.length; i++) {
        const col = columns[i];
        let val = row[i];

        // Convert column names to camelCase for Prisma
        const camelCol = col.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

        // Handle JSON columns
        if (JSON_COLUMNS.includes(col) && typeof val === 'string') {
            try {
                val = JSON.parse(val);
            } catch {
                // Keep as string if parse fails
            }
        }

        // Handle boolean columns
        if (BOOLEAN_COLUMNS.includes(col)) {
            val = val === 1 || val === '1' || val === true;
        }

        // Handle datetime columns (SQLite TEXT → PostgreSQL DateTime)
        if (col.endsWith('_at') || col === 'timestamp' || col === 'last_login' || col === 'locked_until') {
            if (val && typeof val === 'string') {
                val = new Date(val);
            }
        }

        transformed[camelCol] = val;
    }

    return transformed;
}

async function migrateTable(sqliteDb, tableName) {
    const modelName = TABLE_MODEL_MAP[tableName];
    if (!modelName) {
        console.log(`  ⚠️  Skipping unknown table: ${tableName}`);
        return 0;
    }

    // Get all rows from SQLite
    const stmt = sqliteDb.prepare(`SELECT * FROM ${tableName}`);
    const rows = [];
    const columns = stmt.getColumnNames();

    while (stmt.step()) {
        rows.push(transformRow(tableName, stmt.get(), columns));
    }
    stmt.free();

    if (rows.length === 0) {
        console.log(`  ⏭️  ${tableName}: 0 rows (empty)`);
        return 0;
    }

    // Batch insert via Prisma
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        try {
            await prisma[modelName].createMany({
                data: batch,
                skipDuplicates: true
            });
            inserted += batch.length;
        } catch (err) {
            console.error(`  ❌ Error in ${tableName} batch ${i / batchSize + 1}:`, err.message);
            // Try one-by-one for failed batch
            for (const row of batch) {
                try {
                    await prisma[modelName].create({ data: row });
                    inserted++;
                } catch (rowErr) {
                    console.error(`    ⚠️  Skipping row in ${tableName}:`, rowErr.message);
                }
            }
        }
    }

    console.log(`  ✅ ${tableName}: ${inserted}/${rows.length} rows migrated`);
    return inserted;
}

async function main() {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   TrustChecker: SQLite → PostgreSQL Migration   ║');
    console.log('╚══════════════════════════════════════════════════╝');

    // Check SQLite file exists
    if (!fs.existsSync(DB_PATH)) {
        console.log(`\n❌ SQLite database not found at: ${DB_PATH}`);
        console.log('   Nothing to migrate.');
        process.exit(0);
    }

    // Load SQLite
    const SQL = await initSqlJs();
    const buffer = fs.readFileSync(DB_PATH);
    const sqliteDb = new SQL.Database(buffer);
    console.log(`\n📂 SQLite loaded: ${DB_PATH} (${(buffer.length / 1024).toFixed(1)} KB)\n`);

    // Get table list from SQLite
    const tables = sqliteDb.exec(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
    );
    const existingTables = tables[0]?.values.map(v => v[0]) || [];
    console.log(`📋 Found ${existingTables.length} tables in SQLite\n`);

    // Migrate in dependency order
    let totalMigrated = 0;

    for (const table of MIGRATION_ORDER) {
        if (existingTables.includes(table)) {
            totalMigrated += await migrateTable(sqliteDb, table);
        }
    }

    sqliteDb.close();

    console.log(`\n═══════════════════════════════════════════════════`);
    console.log(`✅ Migration complete: ${totalMigrated} total rows migrated`);
    console.log(`═══════════════════════════════════════════════════\n`);

    await prisma.$disconnect();
}

main().catch(e => {
    console.error('Migration failed:', e);
    prisma.$disconnect();
    process.exit(1);
});
