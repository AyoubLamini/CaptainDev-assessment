import { Controller, Post, Patch, Body, Param, UseGuards, Req, BadRequestException, ForbiddenException } from '@nestjs/common';
import { BusinessScopeService } from './business-scope.service';
import { OrgAdminGuard } from '../access-control/guards/org-admin.guard';
import { OrgMemberGuard } from '../access-control/guards/org-member.guard';
import { BusinessScopeType } from '@prisma/client';

@Controller('org-admin/:organizationId/companies/:companyId/scopes')
export class BusinessScopeController {
  constructor(private readonly businessScopeService: BusinessScopeService) {}

  @Post()
  @UseGuards(OrgAdminGuard)
  async createScope(
    @Param('organizationId') organizationId: string,
    @Param('companyId') companyId: string,
    @Body() body: { type: BusinessScopeType; name: string; externalId?: string; location?: string; responsiblePerson?: string; id?: string },
    @Req() req: any
  ) {
    if (!Object.values(BusinessScopeType).includes(body.type)) {
      throw new BadRequestException('type must be a valid enum');
    }
    if (typeof body.name !== 'string' || !body.name.trim()) {
      throw new BadRequestException('name is required');
    }

    const createdById = req.identity.id;
    const payload: Parameters<BusinessScopeService['createScope']>[0] = {
      organizationId,
      companyId,
      type: body.type,
      name: body.name,
      createdById,
    };
    if (typeof body.externalId === 'string') payload.externalId = body.externalId;
    if (typeof body.location === 'string') payload.location = body.location;
    if (typeof body.responsiblePerson === 'string') payload.responsiblePerson = body.responsiblePerson;

    return this.businessScopeService.createScope(payload);
  }

  @Patch(':id')
  @UseGuards(OrgMemberGuard)
  async updateScope(
    @Param('organizationId') organizationId: string,
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: { name: string },
    @Req() req: any
  ) {
    if (typeof body.name !== 'string' || !body.name.trim()) {
      throw new BadRequestException('name is required');
    }

    const membership = req.membership;
    if (membership.role === 'USER') {
      const grants = membership.grants;
      if (!grants?.capabilities?.includes('write')) {
        throw new ForbiddenException('You do not have write permissions');
      }
      if (Array.isArray(grants?.scopes) && !grants.scopes.includes(id)) {
        throw new ForbiddenException('You do not have access to edit this scope');
      }
    }

    return this.businessScopeService.updateScope(organizationId, companyId, id, body.name);
  }
}
