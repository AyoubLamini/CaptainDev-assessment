import { Controller, Post, Body, Param, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { BusinessScopeService } from './business-scope.service';
import { OrgAdminGuard } from '../access-control/guards/org-admin.guard';
import { BusinessScopeType } from '@prisma/client';

@Controller('org-admin/:organizationId/companies/:companyId/scopes')
@UseGuards(OrgAdminGuard)
export class BusinessScopeController {
  constructor(private readonly businessScopeService: BusinessScopeService) {}

  @Post()
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
}
