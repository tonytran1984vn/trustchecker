/**
 * Create platform_feature_flags table and seed from current org JSONB data
 */
const db = require('./db');

async function seed() {
    await new Promise(r => setTimeout(r, 2000));
    const prisma = db.client;

    // Create dedicated table
    await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS platform_feature_flags (
      key TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      color TEXT,
      enabled BOOLEAN NOT NULL DEFAULT false,
      updated_at TIMESTAMP DEFAULT NOW(),
      updated_by TEXT
    )
  `);
    console.log('Table created');

    // Read current state from first org (most complete)
    const orgs = await prisma.$queryRawUnsafe("SELECT feature_flags FROM organizations ORDER BY created_at LIMIT 1");
    const current = orgs.length ? (typeof orgs[0].feature_flags === 'object' ? orgs[0].feature_flags : JSON.parse(orgs[0].feature_flags || '{}')) : {};

    // Flag definitions (matching frontend)
    const flags = [
        { key: 'ai_anomaly', label: 'AI Anomaly Detection', desc: 'ML-powered fraud pattern detection', icon: '🤖', color: '#8b5cf6' },
        { key: 'digital_twin', label: 'Digital Twin', desc: 'Virtual product simulation engine', icon: '🔮', color: '#06b6d4' },
        { key: 'carbon_tracking', label: 'Carbon Intelligence', desc: 'Product Carbon Passports - Scope 1,2,3 - ESG', icon: '🌱', color: '#10b981' },
        { key: 'nft_certificates', label: 'NFT Certificates', desc: 'Blockchain-based product certificates', icon: '🎫', color: '#f59e0b' },
        { key: 'demand_sensing', label: 'Demand Sensing AI', desc: 'Predictive inventory analytics', icon: '📊', color: '#3b82f6' },
        { key: 'gri_reports', label: 'GRI Sustainability Reports', desc: 'Automated ESG compliance reporting', icon: '📋', color: '#22c55e' },
        { key: 'sso_saml', label: 'SSO / SAML Integration', desc: 'Enterprise single sign-on support', icon: '🔐', color: '#ef4444' },
        { key: 'webhook_events', label: 'Webhook Events', desc: 'Real-time event delivery to external systems', icon: '🔗', color: '#a855f7' },
    ];

    for (const f of flags) {
        const enabled = current[f.key] !== undefined ? current[f.key] : false;
        await prisma.$executeRawUnsafe(
            `INSERT INTO platform_feature_flags (key, label, description, icon, color, enabled)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (key) DO UPDATE SET label = $2, description = $3, icon = $4, color = $5`,
            f.key, f.label, f.desc, f.icon, f.color, enabled
        );
    }

    // Verify
    const rows = await prisma.$queryRawUnsafe("SELECT key, enabled FROM platform_feature_flags ORDER BY key");
    rows.forEach(r => console.log(r.key + '=' + r.enabled));
    console.log('Done:', rows.length, 'flags');

    await prisma.$disconnect();
    process.exit(0);
}

seed().catch(e => { console.error('FATAL:', e); process.exit(1); });
