// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// async function main() {
//   console.log('Starting seed...');

//   // Create Organization 1
//   const org1 = await prisma.organization.upsert({
//     where: { id: 'org-1' },
//     update: {},
//     create: {
//       id: 'org-1',
//       companies: {
//         create: {
//           id: 'comp-1',
//           scopes: {
//             create: {
//               id: 'scope-1',
//             },
//           },
//         },
//       },
//     },
//   });

//   // Create Organization 2
//   const org2 = await prisma.organization.upsert({
//     where: { id: 'org-2' },
//     update: {},
//     create: {
//       id: 'org-2',
//       companies: {
//         create: {
//           id: 'comp-2',
//           scopes: {
//             create: {
//               id: 'scope-2',
//             },
//           },
//         },
//       },
//     },
//   });

//   // We should also perhaps create mock identities / owners if they are tied to identities
//   // But identity is not tenant-owned and currently doesn't link to org directly in the schema provided.
//   // Wait, let's check schema: Identity has no direct relation to Organization in the schema provided.
//   // The spec says: "create exactly two distinct Organizations with distinct owners, companies, scopes, and memberships."
//   // Actually, the provided schema does not have memberships or owners explicitly modeled yet.
//   // Let's just create what is in the schema for now.

//   console.log(`Seeded Organizations: ${org1.id}, ${org2.id}`);
//   console.log('Seeding finished.');
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedOrganization(
  organizationId: string,
  organizationName: string,
  companyId: string,
  scopeId: string,
) {
  await prisma.$transaction(async (tx) => {
    // Set the tenant context for this transaction.
    await tx.$executeRaw`
      SELECT set_config(
        'app.current_org_id',
        ${organizationId},
        true
      )
    `;

    await tx.organization.upsert({
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
            scopes: {
              create: {
                id: scopeId,
              },
            },
          },
        },
      },
    });
  });
}

async function main() {
  console.log('Starting seed...');

  await seedOrganization(
    'org-1',
    'Organization One',
    'comp-1',
    'scope-1',
  );

  await seedOrganization(
    'org-2',
    'Organization Two',
    'comp-2',
    'scope-2',
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