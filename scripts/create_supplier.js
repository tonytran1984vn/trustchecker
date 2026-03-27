const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'supplier@give.com';
  const password = '123qaz12';
  const role = 'supplier_contributor';

  console.log(`Ensuring account for ${email} with role ${role}...`);

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Find or create user
  let user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    console.log('User exists. Updating password and role...');
    user = await prisma.user.update({
      where: { email },
      data: {
        passwordHash,
        role,
        userType: 'org',
        company: 'Vietnambeans (Supplier Demo)'
      }
    });
  } else {
    console.log('Creating new user...');
    user = await prisma.user.create({
      data: {
        email,
        username: 'give_supplier',
        passwordHash,
        role,
        userType: 'org',
        company: 'Vietnambeans (Supplier Demo)'
      }
    });
  }

  // Ensure they belong to the default demo org if exists
  const org = await prisma.organization.findFirst({ where: { name: { contains: 'Supplier' } } }) || 
              await prisma.organization.findFirst({ where: { slug: 'tonyisking' } });

  if (org) {
    await prisma.membership.upsert({
      where: {
        userId_orgId: {
          userId: user.id,
          orgId: org.id
        }
      },
      update: {
        roleContext: 'member'
      },
      create: {
        userId: user.id,
        orgId: org.id,
        roleContext: 'member'
      }
    });

    // Also update their primary orgId
    await prisma.user.update({
      where: { id: user.id },
      data: { orgId: org.id }
    });
    console.log(`Linked to organization: ${org.name}`);
  }

  console.log('✅ Done! You can now log in.');
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
  console.log(`Role: ${user.role}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
