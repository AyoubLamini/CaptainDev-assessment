import { Controller, Post, Body, Param, Put, Patch, UseGuards, Get, Req } from '@nestjs/common';
import { CompanyService } from './company.service';
import { OrgAdminGuard } from '../access-control/guards/org-admin.guard';
import { OrgMemberGuard } from '../access-control/guards/org-member.guard';
import { CompanyStatus } from '@prisma/client';
import { Request } from 'express';

@Controller('org-admin/:organizationId/companies')
export class CompanyController {
  constructor(private readonly companyService: CompanyService) {}

  /**
   * GET /companies — any active org member (USER, ADMIN, OWNER) may list companies.
   * Results are filtered by the member's grants.scopes for USER role.
   */
  @Get()
  @UseGuards(OrgMemberGuard)
  async getCompanies(
    @Param('organizationId') organizationId: string,
    @Req() req: Request
  ) {
    const membership = (req as any).membership;
    return this.companyService.getCompanies(organizationId, membership);
  }

  /** POST / — admin only */
  @Post()
  @UseGuards(OrgAdminGuard)
  async createCompany(
    @Param('organizationId') organizationId: string,
    @Body() body: { name: string; id?: string }
  ) {
    return this.companyService.createCompany(organizationId, body.name, body.id);
  }

  /** PUT /:id — admin only */
  @Put(':id')
  @UseGuards(OrgAdminGuard)
  async updateCompany(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() body: { name: string; status?: CompanyStatus }
  ) {
    return this.companyService.updateCompany(organizationId, id, body.name, body.status);
  }

  /** PATCH /:id/deactivate — admin only */
  @Patch(':id/deactivate')
  @UseGuards(OrgAdminGuard)
  async deactivateCompany(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string
  ) {
    return this.companyService.deactivateCompany(organizationId, id);
  }
}
