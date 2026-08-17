import { Module } from '@nestjs/common';
import { IdentityModule } from './modules/identity/identity.module';
import { PlatformAdminModule } from './modules/platform-admin/platform-admin.module';
import { OrgAdminModule } from './modules/org-admin/org-admin.module';
import { AccessControlModule } from './modules/access-control/access-control.module';
import { EmailModule } from './modules/email/email.module';
import { EvidenceModule } from './modules/evidence/evidence.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    IdentityModule,
    PlatformAdminModule,
    OrgAdminModule,
    AccessControlModule,
    EmailModule,
    EvidenceModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
