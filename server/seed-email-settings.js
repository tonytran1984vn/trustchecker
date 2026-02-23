/**
 * Seed email_settings table
 */
const db = require('./db');

async function seed() {
    await new Promise(r => setTimeout(r, 2000));
    const prisma = db.client;

    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS email_settings (
      id TEXT PRIMARY KEY DEFAULT 'default',
      smtp_host TEXT NOT NULL DEFAULT 'smtp.gmail.com',
      smtp_port INTEGER NOT NULL DEFAULT 587,
      smtp_user TEXT NOT NULL DEFAULT '',
      smtp_pass TEXT NOT NULL DEFAULT '',
      smtp_secure BOOLEAN NOT NULL DEFAULT false,
      from_name TEXT NOT NULL DEFAULT 'TrustChecker Alerts',
      from_email TEXT NOT NULL DEFAULT 'alerts@trustchecker.io',
      recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
      enabled BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMP DEFAULT NOW(),
      updated_by TEXT
    )
  `);
    console.log('Table created');

    // Insert default row
    await prisma.$executeRawUnsafe(`
    INSERT INTO email_settings (id, smtp_host, smtp_port, from_name, from_email, recipients, enabled)
    VALUES ('default', 'smtp.gmail.com', 587, 'TrustChecker Alerts', 'alerts@trustchecker.io', '[]'::jsonb, false)
    ON CONFLICT (id) DO NOTHING
  `);
    console.log('Default row inserted');

    const row = await prisma.$queryRawUnsafe("SELECT * FROM email_settings WHERE id = 'default'");
    console.log('Config:', JSON.stringify(row[0], null, 2));

    await prisma.$disconnect();
    process.exit(0);
}

seed().catch(e => { console.error('FATAL:', e); process.exit(1); });
