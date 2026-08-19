import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required.');
  }

  if (password.length < 15) {
    throw new Error('ADMIN_PASSWORD must be at least 15 characters long.');
  }

  const passwordHash = await argon2.hash(password, {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  const identity = await prisma.identity.upsert({
    where: { email },
    update: {
      isPlatformAdmin: true,
    },
    create: {
      email,
      isPlatformAdmin: true,
    },
  });

  await prisma.passwordCredential.upsert({
    where: { identityId: identity.id },
    update: {
      passwordHash,
    },
    create: {
      identityId: identity.id,
      passwordHash,
    },
  });

  console.log(`Platform Administrator account for ${email} has been securely bootstrapped.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
