import { Controller, Get, Patch, Post, Body, Param, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CollaboratorService } from './collaborator.service';
import { UpdateCollaboratorGrantsDto } from './dto/update-collaborator-grants.dto';
import { OrgAdminGuard } from '../access-control/guards/org-admin.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  identity: { id: string; email: string; createdAt: Date; isPlatformAdmin: boolean; [key: string]: any };
  session?: { createdAt: any; [key: string]: any };
}

import { UpdateCollaboratorStatusDto } from './dto/update-collaborator-status.dto';

@Controller('org-admin/:organizationId/collaborators')
@UseGuards(OrgAdminGuard)
export class CollaboratorController {
  constructor(private readonly collaboratorService: CollaboratorService) {}

  @Get()
  async listCollaborators(@Param('organizationId') organizationId: string) {
    const collaborators = await this.collaboratorService.listCollaborators(organizationId);
    return { data: collaborators };
  }

  @Get(':id')
  async getCollaborator(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string
  ) {
    const collaborator = await this.collaboratorService.getCollaborator(organizationId, id);
    return { data: collaborator };
  }


  @Post(':id/promote')
  @HttpCode(HttpStatus.OK)
  async promoteCollaborator(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: import('./dto/promote-collaborator.dto').PromoteCollaboratorDto,
    @Req() req: AuthenticatedRequest
  ) {
    const adminIdentityId = req.identity.id;
    const sessionCreatedAt = req.session?.createdAt;

    const result = await this.collaboratorService.promoteCollaborator(
      organizationId,
      id,
      adminIdentityId,
      dto.reason,
      sessionCreatedAt
    );

    return { data: result };
  }

  @Patch(':id/grants')
  @HttpCode(HttpStatus.OK)
  async updateGrants(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCollaboratorGrantsDto,
    @Req() req: AuthenticatedRequest
  ) {
    const adminIdentityId = req.identity.id;
    const sessionCreatedAt = req.session?.createdAt;

    const updated = await this.collaboratorService.updateCollaboratorGrants(
      organizationId,
      id,
      adminIdentityId,
      dto,
      sessionCreatedAt
    );

    return { data: updated };
  }

  @Patch(':id/status')
  @HttpCode(HttpStatus.OK)
  async updateStatus(
    @Param('organizationId') organizationId: string,
    @Param('id') id: string,
    @Body() dto: UpdateCollaboratorStatusDto,
    @Req() req: AuthenticatedRequest
  ) {
    const adminIdentityId = req.identity.id;
    const sessionCreatedAt = req.session?.createdAt;

    const updated = await this.collaboratorService.updateCollaboratorStatus(
      organizationId,
      id,
      adminIdentityId,
      dto.status,
      sessionCreatedAt
    );

    return { data: updated };
  }
}
