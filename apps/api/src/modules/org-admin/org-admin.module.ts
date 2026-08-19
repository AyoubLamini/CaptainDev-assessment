import { Module } from '@nestjs/common';

import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { BusinessScopeController } from './business-scope.controller';
import { BusinessScopeService } from './business-scope.service';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';
import { CollaboratorInvitationController } from './collaborator-invitation.controller';
import { CollaboratorInvitationService } from './collaborator-invitation.service';
import { CollaboratorController } from './collaborator.controller';
import { CollaboratorService } from './collaborator.service';

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [
    CompanyController,
    BusinessScopeController,
    SearchController,
    CollaboratorInvitationController,
    CollaboratorController,
  ],
  providers: [
    CompanyService,
    BusinessScopeService,
    SearchService,
    CollaboratorInvitationService,
    CollaboratorService,
  ],
  exports: [CompanyService, BusinessScopeService, SearchService],
})
export class OrgAdminModule {}
