/**
 * Seed channel_settings table for Slack, SMS, Push notification channels.
 * Email uses its own email_settings table.
 */
const db = require('./db');

async function seed() {
    await new Promise(r => setTimeout(r, 2000));
    const prisma = db.client;

    // Create channel_settings table
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS channel_settings (
      channel VARCHAR(50) PRIMARY KEY,
      enabled BOOLEAN NOT NULL DEFAULT false,
      config JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMP DEFAULT NOW(),
      updated_by VARCHAR(100)
    )
  `);
    console.log('✅ channel_settings table created');

    // Seed Slack
    await prisma.$executeRawUnsafe(`
    INSERT INTO channel_settings (channel, enabled, config) 
    VALUES ('slack', false, '{"webhooks":[]}'::jsonb)
    ON CONFLICT (channel) DO NOTHING
  `);

    // Seed SMS (Twilio placeholder)
    await prisma.$executeRawUnsafe(`
    INSERT INTO channel_settings (channel, enabled, config) 
    VALUES ('sms', false, '{"provider":"twilio","account_sid":"","auth_token":"","from_number":"","recipients":[]}'::jsonb)
    ON CONFLICT (channel) DO NOTHING
  `);

    // Seed Push
    await prisma.$executeRawUnsafe(`
    INSERT INTO channel_settings (channel, enabled, config) 
    VALUES ('push', false, '{"provider":"web_push","vapid_public_key":"","vapid_private_key":"","subscriptions":[]}'::jsonb)
    ON CONFLICT (channel) DO NOTHING
  `);

    const rows = await prisma.$queryRawUnsafe("SELECT channel, enabled FROM channel_settings ORDER BY channel");
    console.log('Channels:', rows);

    await prisma.$disconnect();
    process.exit(0);
}

seed().catch(e => { console.error('FATAL:', e); process.exit(1); });
