import { Module } from '@nestjs/common';

import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { BusinessScopeController } from './business-scope.controller';
import { BusinessScopeService } from './business-scope.service';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CompanyController, BusinessScopeController, SearchController],
  providers: [CompanyService, BusinessScopeService, SearchService],
  exports: [CompanyService, BusinessScopeService, SearchService],
})
export class OrgAdminModule {}
