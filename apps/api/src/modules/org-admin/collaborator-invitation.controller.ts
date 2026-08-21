import { Controller, Post, Get, Body, Param, UseGuards, Req, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { CollaboratorInvitationService } from './collaborator-invitation.service';
import { OrgAdminGuard } from '../access-control/guards/org-admin.guard';
import { InviteCollaboratorDto } from './dto/invite-collaborator.dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  identity: { id: string; email: string; createdAt: Date; isPlatformAdmin: boolean; [key: string]: any };
  session?: { createdAt: any; [key: string]: any };
}

@Controller('org-admin/:organizationId/collaborators/invitations')
@UseGuards(OrgAdminGuard)
export class CollaboratorInvitationController {
  constructor(private readonly invitationService: CollaboratorInvitationService) {}

  @Post()
  async inviteCollaborator(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: InviteCollaboratorDto
  ): Promise<{ success: boolean }> {
    return this.invitationService.inviteCollaborator(req.identity.id, organizationId, dto);
  }

  @Get()
  async listInvitations(
    @Param('organizationId', ParseUUIDPipe) organizationId: string
  ): Promise<any[]> {
    return this.invitationService.listInvitations(organizationId);
  }

  @Post(':invitationId/resend')
  @HttpCode(HttpStatus.OK)
  async resendInvitation(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string
  ): Promise<{ success: boolean }> {
    return this.invitationService.resendInvitation(req.identity.id, organizationId, invitationId);
  }

  @Post(':invitationId/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeInvitation(
    @Req() req: AuthenticatedRequest,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string
  ): Promise<{ success: boolean }> {
    return this.invitationService.revokeInvitation(req.identity.id, organizationId, invitationId);
  }
}
