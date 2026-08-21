import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Executes a transaction in the context of a specific tenant.
   * This forces RLS policies to evaluate against the provided organizationId.
   */
  async executeAsTenant<T>(
    organizationId: string,
    callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // Set the local transaction variable for RLS securely
      await tx.$executeRaw`SELECT set_config('app.current_org_id', ${organizationId}, true)`;
      
      // Execute the callback with the transaction client
      return callback(tx as any);
    });
  }

  /**
   * Executes a transaction in the context of a platform admin.
   * This bypasses tenant isolation strictly for global metadata reads.
   */
  async executeAsPlatformAdmin<T>(
    callback: (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // Set the local transaction variable for RLS securely
      await tx.$executeRaw`SELECT set_config('app.is_platform_admin', 'true', true)`;
      
      // Execute the callback with the transaction client
      return callback(tx as any);
    });
  }
}
