import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function seedOrganization(
  organizationId: string,
  organizationName: string,
  companyId: string,
  scopeId: string,
  createdById: string,
  ownerEmail: string,
) {
  // Create owner identity and credentials outside of tenant transaction (as identity is not tenant-isolated)
  const passwordHash = await argon2.hash('Password123!', {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const ownerIdentity = await prisma.identity.upsert({
    where: { email: ownerEmail },
    update: {},
    create: {
      email: ownerEmail,
      passwordCredential: {
        create: {
          passwordHash,
        }
      }
    },
  });

  await prisma.$transaction(async (tx) => {
    // Set the tenant context for this transaction.
    await tx.$executeRaw`
      SELECT set_config(
        'app.current_org_id',
        ${organizationId},
        true
      )
    `;

    const org = await tx.organization.upsert({
      where: { id: organizationId },
      update: {},
      create: {
        id: organizationId,
        name: organizationName,
        accessStatus: 'ACTIVE',
        commercialStatus: 'ACTIVE',

        companies: {
          create: {
            id: companyId,
            name: `${organizationName} Company`,
            scopes: {
              create: {
                id: scopeId,
                name: `${organizationName} Scope`,
                type: 'RESTAURANT',
                createdById: createdById,
              },
            },
          },
        },
      },
    });

    // Create the organization member (owner)
    await tx.organizationMember.upsert({
      where: {
        organizationId_identityId: {
          organizationId: org.id,
          identityId: ownerIdentity.id,
        }
      },
      update: {},
      create: {
        organizationId: org.id,
        identityId: ownerIdentity.id,
        role: 'OWNER',
        status: 'ACTIVE',
      }
    });
  });
}

async function main() {
  console.log('Starting seed...');

  const systemIdentityId = 'seed-system-identity';
  await prisma.identity.upsert({
    where: { id: systemIdentityId },
    update: {},
    create: {
      id: systemIdentityId,
      email: 'system@seed.test',
      isPlatformAdmin: true,
    },
  });

  await seedOrganization(
    'org-1',
    'Organization One',
    'comp-1',
    'scope-1',
    systemIdentityId,
    'owner1@org1.test'
  );

  await seedOrganization(
    'org-2',
    'Organization Two',
    'comp-2',
    'scope-2',
    systemIdentityId,
    'owner2@org2.test'
  );

  console.log('Seeded Organizations: org-1, org-2');
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });