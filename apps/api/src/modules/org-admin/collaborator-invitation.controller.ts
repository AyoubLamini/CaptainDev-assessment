import { Controller, Post, Get, Body, Param, UseGuards, Request, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { CollaboratorInvitationService } from './collaborator-invitation.service';
import { OrgAdminGuard } from '../access-control/guards/org-admin.guard';
import { InviteCollaboratorDto } from './dto/invite-collaborator.dto';

@Controller('org-admin/:organizationId/collaborators/invitations')
@UseGuards(OrgAdminGuard)
export class CollaboratorInvitationController {
  constructor(private readonly invitationService: CollaboratorInvitationService) {}

  @Post()
  async inviteCollaborator(
    @Request() req: any,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: InviteCollaboratorDto
  ): Promise<{ success: boolean }> {
    return this.invitationService.inviteCollaborator(req.user.identityId, organizationId, dto);
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
    @Request() req: any,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string
  ): Promise<{ success: boolean }> {
    return this.invitationService.resendInvitation(req.user.identityId, organizationId, invitationId);
  }

  @Post(':invitationId/revoke')
  @HttpCode(HttpStatus.OK)
  async revokeInvitation(
    @Request() req: any,
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string
  ): Promise<{ success: boolean }> {
    return this.invitationService.revokeInvitation(req.user.identityId, organizationId, invitationId);
  }
}
