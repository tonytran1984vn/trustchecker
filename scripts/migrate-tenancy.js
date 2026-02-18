/**
 * Data Migration: Assign existing users to default Organization
 * 
 * Run ONCE after multi-tenancy migration is applied.
 * Creates a "Default Organization" and assigns all orphaned users to it.
 *
 * Usage:
 *   node scripts/migrate-tenancy.js
 *
 * Safe to run multiple times (idempotent).
 */

const { v4: uuidv4 } = require('uuid');

async function migrateTenancy() {
    let db;

    try {
        // Try Prisma (PostgreSQL) first
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();

        console.log('🔄 Starting multi-tenancy data migration...\n');

        // 1. Create default organization if it doesn't exist
        const DEFAULT_ORG_SLUG = 'default';
        let defaultOrg = await prisma.organization.findUnique({
            where: { slug: DEFAULT_ORG_SLUG }
        });

        if (!defaultOrg) {
            defaultOrg = await prisma.organization.create({
                data: {
                    id: uuidv4(),
                    name: 'TrustChecker Default',
                    slug: DEFAULT_ORG_SLUG,
                    plan: 'free',
                    settings: JSON.stringify({
                        description: 'Auto-created during multi-tenancy migration',
                        migrated_at: new Date().toISOString(),
                    }),
                }
            });
            console.log(`✅ Created default organization: "${defaultOrg.name}" (${defaultOrg.id})`);
        } else {
            console.log(`ℹ️  Default organization already exists: "${defaultOrg.name}" (${defaultOrg.id})`);
        }

        // 2. Find orphaned users (no org_id)
        const orphanedUsers = await prisma.user.findMany({
            where: { orgId: null },
            select: { id: true, username: true }
        });

        console.log(`\n📋 Found ${orphanedUsers.length} users without organization`);

        if (orphanedUsers.length > 0) {
            // 3. Assign all orphaned users to default org
            const result = await prisma.user.updateMany({
                where: { orgId: null },
                data: { orgId: defaultOrg.id }
            });

            console.log(`✅ Assigned ${result.count} users to "${defaultOrg.name}"`);

            // Log details
            for (const user of orphanedUsers) {
                console.log(`   → ${user.username} (${user.id})`);
            }
        }

        // 4. Add org_id to related tables (products, etc.)
        // This is done via the RLS SQL migration, but we set the values here
        const tables = [
            { name: 'products', model: 'product' },
            // Add more tables as needed
        ];

        for (const table of tables) {
            try {
                const count = await prisma[table.model].updateMany({
                    where: { orgId: null },
                    data: { orgId: defaultOrg.id }
                });
                if (count.count > 0) {
                    console.log(`✅ Assigned ${count.count} ${table.name} to default org`);
                }
            } catch (e) {
                // Table may not have orgId column yet — that's fine
                console.log(`⏭️  Skipped ${table.name} (orgId column may not exist yet)`);
            }
        }

        // 5. Summary
        const totalUsers = await prisma.user.count();
        const totalOrgs = await prisma.organization.count();
        const usersWithOrg = await prisma.user.count({ where: { orgId: { not: null } } });

        console.log('\n═══════════════════════════════════════════');
        console.log('📊 Migration Summary:');
        console.log(`   Total organizations: ${totalOrgs}`);
        console.log(`   Total users: ${totalUsers}`);
        console.log(`   Users with org: ${usersWithOrg}`);
        console.log(`   Orphaned users: ${totalUsers - usersWithOrg}`);
        console.log('═══════════════════════════════════════════\n');

        if (totalUsers - usersWithOrg === 0) {
            console.log('✅ All users assigned to organizations. Migration complete!');
        } else {
            console.log('⚠️  Some users still orphaned. Run again after fixing issues.');
        }

        await prisma.$disconnect();

    } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            console.log('⚠️  Prisma not available. Trying direct DB connection...');

            // Fallback: direct pg connection
            try {
                const { Client } = require('pg');
                const client = new Client({ connectionString: process.env.DATABASE_URL });
                await client.connect();

                const orgId = uuidv4();

                // Create default org
                await client.query(`
                    INSERT INTO organizations (id, name, slug, plan, settings, created_at, updated_at)
                    VALUES ($1, 'TrustChecker Default', 'default', 'free', '{}', NOW(), NOW())
                    ON CONFLICT (slug) DO NOTHING
                `, [orgId]);

                // Get the actual org id (might already exist)
                const orgResult = await client.query(`SELECT id FROM organizations WHERE slug = 'default'`);
                const actualOrgId = orgResult.rows[0]?.id || orgId;

                // Assign orphaned users
                const updateResult = await client.query(`
                    UPDATE users SET org_id = $1 WHERE org_id IS NULL
                `, [actualOrgId]);

                console.log(`✅ Assigned ${updateResult.rowCount} orphaned users to default org`);

                await client.end();
            } catch (pgErr) {
                console.error('❌ Migration failed:', pgErr.message);
                process.exit(1);
            }
        } else {
            console.error('❌ Migration failed:', err.message);
            process.exit(1);
        }
    }
}

migrateTenancy().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
