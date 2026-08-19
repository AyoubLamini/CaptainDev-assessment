import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class IdentityService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmailWithPassword(email: string) {
    return this.prisma.identity.findUnique({
      where: { email },
      include: { passwordCredential: true },
    });
  }

  async verifyPassword(identityId: string, passwordAttempt: string): Promise<boolean> {
    const user = await this.prisma.identity.findUnique({
      where: { id: identityId },
      include: { passwordCredential: true },
    });

    if (!user || !user.passwordCredential) {
      return false;
    }

    try {
      const argon2 = await import('argon2');
      return await argon2.verify(user.passwordCredential.passwordHash, passwordAttempt);
    } catch {
      return false;
    }
  }
}
