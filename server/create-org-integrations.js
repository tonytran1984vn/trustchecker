const db = require('./db');

async function setup() {
    await new Promise(r => setTimeout(r, 1000));
    const prisma = db.client;
    if (!prisma) {
        console.log('❌ No Prisma client');
        process.exit(1);
    }

    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS org_integrations (
                id TEXT PRIMARY KEY,
                org_id TEXT NOT NULL,
                category TEXT NOT NULL,
                setting_key TEXT NOT NULL,
                setting_value TEXT,
                is_secret BOOLEAN DEFAULT false,
                updated_by TEXT,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(org_id, category, setting_key)
            )
        `);
        console.log('✅ org_integrations table created successfully.');
    } catch (e) {
        console.error('Failed to create table:', e);
    }

    await prisma.$disconnect();
    process.exit(0);
}

setup();
