/**
 * Seed Classification Data into PostgreSQL
 * Creates schemas, labels, data assets, classifications, events, snapshots, rules, and policy bindings.
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
    console.log('🏗️  Seeding Data Classification...');

    // 1. Create Schema
    const schema = await prisma.classificationSchema.create({
        data: {
            orgId: 'org1',
            name: 'TrustChecker Data Governance Standard v1',
            version: 1,
            isActive: true,
        },
    });
    console.log('  ✓ Schema created:', schema.id);

    // 2. Create Labels
    const labels = await Promise.all([
        prisma.classificationLabel.create({
            data: {
                schemaId: schema.id,
                name: 'Restricted',
                code: 'RESTRICTED',
                riskLevel: 5,
                color: '#dc2626',
                description: 'Highly sensitive data requiring executive approval for any access.',
            },
        }),
        prisma.classificationLabel.create({
            data: {
                schemaId: schema.id,
                name: 'Confidential',
                code: 'CONFIDENTIAL',
                riskLevel: 4,
                color: '#d97706',
                description: 'Sensitive business data limited to authorized personnel.',
            },
        }),
        prisma.classificationLabel.create({
            data: {
                schemaId: schema.id,
                name: 'PII / Sensitive',
                code: 'PII',
                riskLevel: 3,
                color: '#2563eb',
                description: 'Personally identifiable information subject to data protection regulations.',
            },
        }),
        prisma.classificationLabel.create({
            data: {
                schemaId: schema.id,
                name: 'Internal',
                code: 'INTERNAL',
                riskLevel: 2,
                color: '#0284c7',
                description: 'Internal use only, not for external distribution.',
            },
        }),
        prisma.classificationLabel.create({
            data: {
                schemaId: schema.id,
                name: 'Public',
                code: 'PUBLIC',
                riskLevel: 1,
                color: '#64748b',
                description: 'Publicly available information with no access restrictions.',
            },
        }),
    ]);
    console.log('  ✓ Labels created:', labels.length);

    // 3. Create Data Assets (realistic mix)
    const assetTypes = ['user', 'transaction', 'document', 'log', 'api_key', 'config'];
    const sources = ['api', 'db', 'import', 'system'];
    const assets = [];

    for (let i = 0; i < 150; i++) {
        const asset = await prisma.dataAsset.create({
            data: {
                orgId: 'org1',
                type: assetTypes[i % assetTypes.length],
                source: sources[i % sources.length],
                externalId: `ext_${String(i).padStart(5, '0')}`,
            },
        });
        assets.push(asset);
    }
    console.log('  ✓ Data assets created:', assets.length);

    // 4. Classify assets (not 100% coverage to show governance gap)
    // Distribution: 8 restricted, 25 confidential, 40 PII, 30 internal, 22 public = 125 classified / 150 total = 83.3%
    const distribution = [
        { label: labels[0], count: 8 }, // RESTRICTED
        { label: labels[1], count: 25 }, // CONFIDENTIAL
        { label: labels[2], count: 40 }, // PII
        { label: labels[3], count: 30 }, // INTERNAL
        { label: labels[4], count: 22 }, // PUBLIC
    ];

    let assetIdx = 0;
    for (const { label, count } of distribution) {
        for (let j = 0; j < count; j++) {
            await prisma.dataClassification.create({
                data: {
                    dataAssetId: assets[assetIdx].id,
                    labelId: label.id,
                    confidence: Math.round((0.85 + Math.random() * 0.15) * 100) / 100,
                    taggedBy: j % 3 === 0 ? 'system' : 'admin1',
                },
            });
            assetIdx++;
        }
    }
    console.log('  ✓ Classifications created:', assetIdx);

    // 5. Create Classification Events
    const actions = ['auto_tagged', 'tagged', 'auto_tagged', 'auto_tagged', 'tagged'];
    for (let i = 0; i < 20; i++) {
        const randAsset = assets[Math.floor(Math.random() * assets.length)];
        const randLabel = labels[Math.floor(Math.random() * labels.length)];
        await prisma.classificationEvent.create({
            data: {
                orgId: 'org1',
                dataAssetId: randAsset.id,
                action: actions[i % actions.length],
                labels: [randLabel.code],
                actor: i % 3 === 0 ? 'system' : 'admin1',
                createdAt: new Date(Date.now() - Math.floor(Math.random() * 86400000)),
            },
        });
    }
    console.log('  ✓ Classification events created: 20');

    // 6. Create Data Asset Snapshots (for drift detection)
    for (let i = 0; i < 12; i++) {
        const randAsset = assets[Math.floor(Math.random() * assets.length)];
        await prisma.dataAssetSnapshot.create({
            data: {
                dataAssetId: randAsset.id,
                payloadHash: require('crypto').randomBytes(32).toString('hex'),
                snapshot: { type: randAsset.type, sample: `snapshot_${i}` },
            },
        });
    }
    console.log('  ✓ Data asset snapshots created: 12');

    // 7. Create Classification Rules
    await prisma.classificationRule.create({
        data: {
            orgId: 'org1',
            name: 'Email PII Detection',
            condition: { field: 'email', regex: '.*@.*' },
            labelId: labels[2].id, // PII
            priority: 10,
            isActive: true,
        },
    });
    await prisma.classificationRule.create({
        data: {
            orgId: 'org1',
            name: 'High-Value Transaction',
            condition: { field: 'amount', gt: 10000 },
            labelId: labels[1].id, // CONFIDENTIAL
            priority: 20,
            isActive: true,
        },
    });
    await prisma.classificationRule.create({
        data: {
            orgId: 'org1',
            name: 'API Key Detection',
            condition: { field: 'type', eq: 'api_key' },
            labelId: labels[0].id, // RESTRICTED
            priority: 5,
            isActive: true,
        },
    });
    console.log('  ✓ Classification rules created: 3');

    // 8. Create Policy Bindings
    await prisma.policyBinding.create({
        data: {
            orgId: 'org1',
            labelId: labels[0].id, // RESTRICTED → deny
            effect: 'deny',
        },
    });
    await prisma.policyBinding.create({
        data: {
            orgId: 'org1',
            labelId: labels[1].id, // CONFIDENTIAL → require_approval
            effect: 'require_approval',
        },
    });
    await prisma.policyBinding.create({
        data: {
            orgId: 'org1',
            labelId: labels[2].id, // PII → require_approval
            effect: 'require_approval',
        },
    });
    await prisma.policyBinding.create({
        data: {
            orgId: 'org1',
            labelId: labels[3].id, // INTERNAL → allow
            effect: 'allow',
        },
    });
    await prisma.policyBinding.create({
        data: {
            orgId: 'org1',
            labelId: labels[4].id, // PUBLIC → allow
            effect: 'allow',
        },
    });
    console.log('  ✓ Policy bindings created: 5');

    console.log('✅ Data Classification seed complete!');
    await prisma.$disconnect();
}

seed().catch(e => {
    console.error('Seed failed:', e);
    process.exit(1);
});
