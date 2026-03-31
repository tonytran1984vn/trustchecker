/**
 * Migration Script: Boolean Feature Flags -> Structured Entitlement JSON
 * 
 * Safely converts flat boolean toggles into structured objects.
 * "qr": true => "qr": { "enabled": true }
 * 
 * Safe to run multiple times (idempotent).
 * Run via: node server/scripts/migrate-entitlements.js
 */

require('dotenv').config();
const db = require('../db');

async function migrate() {
    await db._readyPromise;
    console.log('🔄 Starting Zero-Downtime Migration: Booleans to Structured Entitlements');

    try {
        const orgs = await db.all('SELECT id, feature_flags FROM organizations WHERE feature_flags IS NOT NULL');
        let updatedCount = 0;

        for (const org of orgs) {
            let flags;
            try {
                flags = typeof org.feature_flags === 'string' ? JSON.parse(org.feature_flags) : org.feature_flags;
            } catch (e) {
                console.warn(`⚠️ Skipping org ${org.id} due to invalid JSON`);
                continue;
            }

            if (!flags || typeof flags !== 'object') continue;

            let needsUpdate = false;
            const newFlags = {};

            for (const [key, value] of Object.entries(flags)) {
                if (typeof value === 'boolean') {
                    newFlags[key] = { enabled: value };
                    needsUpdate = true;
                } else if (typeof value === 'object' && value !== null) {
                    newFlags[key] = value; // Already structured
                } else {
                    newFlags[key] = { enabled: !!value }; // Fallback
                    needsUpdate = true;
                }
            }

            if (needsUpdate) {
                await db.run(
                    'UPDATE organizations SET feature_flags = $1 WHERE id = $2',
                    [JSON.stringify(newFlags), org.id]
                );
                updatedCount++;
            }
        }

        console.log(`✅ Migration completed successfully. Changed ${updatedCount} organizations.`);
    } catch (e) {
        console.error('❌ Migration failed:', e.message);
    }

    process.exit(0);
}

migrate();
