import { Controller, Post, Body, Param, Put, Patch, UseGuards, Get } from '@nestjs/common';
import { CompanyService } from './company.service';
import { OrgAdminGuard } from '../access-control/guards/org-admin.guard';
import { CompanyStatus } from '@prisma/client';

@Controller('org-admin/:organizationId/companies')
@UseGuards(OrgAdminGuard)
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  @Get()
  async getCompanies(@Param('organizationId') organizationId: string) {
    return this.companyService.getCompanies(organizationId);
  }

  @Post()
  async createCompany(
    @Param('organizationId') organizationId: string,
    @Body() body: { name: string; id?: string }
  ) {
    return this.companyService.createCompany(organizationId, body.name, body.id);
  }

  @Put(':id')
  async updateCompany(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: { name: string; status?: CompanyStatus }
  ) {
    return this.companyService.updateCompany(organizationId, id, body.name, body.status);
  }

  @Patch(':id/deactivate')
  async deactivateCompany(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string
  ) {
    return this.companyService.deactivateCompany(organizationId, id);
  }
}
