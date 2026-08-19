import { Controller, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { CollaboratorInvitationService } from './collaborator-invitation.service';
import { OrgAdminGuard } from '../access-control/guards/org-admin.guard';
import { InviteCollaboratorDto } from './dto/invite-collaborator.dto';

@Controller('org-admin/:organizationId/collaborators/invitations')
@UseGuards(OrgAdminGuard)
export class CollaboratorInvitationController {
  constructor(private readonly invitationService: CollaboratorInvitationService) {}

  @Post()
  async inviteCollaborator(
    @Request() req,
    @Param('organizationId') organizationId: string,
    @Body() dto: InviteCollaboratorDto
  ) {
    return this.invitationService.inviteCollaborator(req.user.identityId, organizationId, dto);
  }
}
