/**
 * Migrate email_settings: add smtp_accounts (JSONB array), round_robin_index, daily_limit
 */
const db = require('./db');

async function migrate() {
    await new Promise(r => setTimeout(r, 2000));
    const prisma = db.client;

    await prisma.$executeRawUnsafe("ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS smtp_accounts JSONB NOT NULL DEFAULT '[]'::jsonb");
    await prisma.$executeRawUnsafe("ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS round_robin_index INTEGER NOT NULL DEFAULT 0");
    await prisma.$executeRawUnsafe("ALTER TABLE email_settings ADD COLUMN IF NOT EXISTS daily_limit INTEGER NOT NULL DEFAULT 450");
    console.log('✅ Columns added: smtp_accounts, round_robin_index, daily_limit');

    // Migrate existing smtp_user/smtp_pass to smtp_accounts if present
    const cfg = await prisma.$queryRawUnsafe("SELECT smtp_user, smtp_pass, smtp_accounts FROM email_settings WHERE id = 'default'");
    if (cfg.length && cfg[0].smtp_user && (!cfg[0].smtp_accounts || !cfg[0].smtp_accounts.length)) {
        const accounts = [{ email: cfg[0].smtp_user, password: cfg[0].smtp_pass, sent_today: 0, last_reset: new Date().toISOString().slice(0, 10) }];
        await prisma.$executeRawUnsafe("UPDATE email_settings SET smtp_accounts = $1::jsonb WHERE id = 'default'", JSON.stringify(accounts));
        console.log('Migrated existing account to smtp_accounts array');
    }

    const row = await prisma.$queryRawUnsafe("SELECT smtp_accounts, round_robin_index, daily_limit FROM email_settings WHERE id = 'default'");
    console.log('Current:', JSON.stringify(row[0]));

    await prisma.$disconnect();
    process.exit(0);
}

migrate().catch(e => { console.error('FATAL:', e); process.exit(1); });
