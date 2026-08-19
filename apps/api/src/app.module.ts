import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { IdentityModule } from './modules/identity/identity.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { OrgAdminModule } from './modules/org-admin/org-admin.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { EmailModule } from './modules/email/email.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthController } from './modules/health/health.controller';
import { CsrfGuard } from './common/guards/csrf.guard';

@Module({
  imports: [
    IdentityModule,
    PlatformAdminModule,
    OrgAdminModule,
    AccessControlModule,
    EmailModule,
    EvidenceModule,
    AuthModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CsrfGuard,
    },
  ],
})
export class AppModule {}
