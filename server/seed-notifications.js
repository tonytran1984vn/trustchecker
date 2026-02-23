/**
 * Seed notification_preferences table in PostgreSQL
 * Uses db.client (Prisma) directly for DDL since db.run() skips CREATE TABLE
 */
const db = require('./db');
const { v4: uuidv4 } = require('uuid');

async function seed() {
    await new Promise(r => setTimeout(r, 2000)); // wait for DB init

    const prisma = db.client;
    if (!prisma) { console.log('❌ No Prisma client available'); process.exit(1); }

    // Create table using Prisma directly (db.run skips DDL)
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'channel',
      key TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      enabled BOOLEAN NOT NULL DEFAULT false,
      severity TEXT,
      icon TEXT,
      color TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(user_id, category, key)
    )
  `);
    console.log('✅ Table created');

    // Get admin user
    const admins = await prisma.$queryRawUnsafe("SELECT id FROM users WHERE email = 'admin@trustchecker.io' LIMIT 1");
    if (!admins.length) { console.log('❌ No admin'); process.exit(1); }
    const uid = admins[0].id;
    console.log('Admin:', uid);

    // Seed channels
    const channels = [
        { key: 'email_alerts', label: 'Email Alerts', desc: 'Critical fraud & anomaly notifications', icon: '📧', enabled: true },
        { key: 'slack_webhooks', label: 'Slack Webhooks', desc: 'Real-time channel notifications', icon: '💬', enabled: false },
        { key: 'sms_alerts', label: 'SMS Alerts', desc: 'High-priority mobile notifications', icon: '📱', enabled: false },
        { key: 'push_notifications', label: 'Push Notifications', desc: 'Browser & mobile push alerts', icon: '🔔', enabled: true },
    ];

    for (const c of channels) {
        await prisma.$executeRawUnsafe(
            `INSERT INTO notification_preferences (id, user_id, category, key, label, description, icon, enabled)
       VALUES ($1, $2, 'channel', $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, category, key) DO NOTHING`,
            uuidv4(), uid, c.key, c.label, c.desc, c.icon, c.enabled
        );
    }
    console.log('✅ Channels seeded');

    // Seed events
    const events = [
        { key: 'fraud_detected', label: 'Fraud Detected', sev: 'critical', enabled: true },
        { key: 'scan_anomaly', label: 'Scan Anomaly', sev: 'warning', enabled: true },
        { key: 'sla_violation', label: 'SLA Violation', sev: 'warning', enabled: true },
        { key: 'new_tenant', label: 'New Tenant Registered', sev: 'info', enabled: true },
        { key: 'usage_threshold', label: 'Usage Threshold (>80%)', sev: 'warning', enabled: false },
        { key: 'certificate_expiry', label: 'Certificate Expiring', sev: 'critical', enabled: true },
        { key: 'system_health', label: 'System Health Alert', sev: 'critical', enabled: true },
        { key: 'payment_failed', label: 'Payment Failed', sev: 'warning', enabled: false },
    ];

    for (const e of events) {
        await prisma.$executeRawUnsafe(
            `INSERT INTO notification_preferences (id, user_id, category, key, label, description, severity, enabled)
       VALUES ($1, $2, 'event', $3, $4, 'Event subscription', $5, $6)
       ON CONFLICT (user_id, category, key) DO NOTHING`,
            uuidv4(), uid, e.key, e.label, e.sev, e.enabled
        );
    }
    console.log('✅ Events seeded');

    // Verify
    const count = await prisma.$queryRawUnsafe("SELECT COUNT(*)::int as c FROM notification_preferences");
    console.log('Total rows:', count[0].c);

    await prisma.$disconnect();
    process.exit(0);
}

seed().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
