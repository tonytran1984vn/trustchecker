const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seed() {
    const org = await prisma.organization.findFirst({ where: { slug: 'demo-corp' } });
    if (!org) return console.log('No demo-corp found');

    // Create a mock ScoreValidation
    const res = await prisma.$executeRaw`
      INSERT INTO score_validations (id, org_id, entity_type, entity_id, predicted_score, predicted_risk_level, validation_status, created_at)
      VALUES (gen_random_uuid(), ${org.id}, 'supplier', ${org.id}, 94.5, 'low_risk', 'validated', NOW())
    `;

    console.log('Seeded ScoreValidation!');
}

seed().finally(() => prisma.$disconnect());
