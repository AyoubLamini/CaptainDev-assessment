import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PlatformOrganizationsController } from './platform-organizations.controller';
import { PlatformOrganizationsService } from './platform-organizations.service';
import { PlatformAdminGuard } from '../access-control/guards/platform-admin.guard';

import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [DatabaseModule, IdentityModule],
  controllers: [PlatformOrganizationsController],
  providers: [PlatformOrganizationsService, PlatformAdminGuard],
  exports: [],
})
export class PlatformAdminModule {}
