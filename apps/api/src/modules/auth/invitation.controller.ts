import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { InvitationService } from './invitation.service';
import { AcceptInvitationDto } from './dto/accept-invitation.dto';

@Controller('auth/invitations')
export class InvitationController {
  constructor(private readonly invitationService: InvitationService) {}

  @Post('accept')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async accept(@Body() dto: AcceptInvitationDto) {
    return this.invitationService.acceptInvitation(dto);
  }

  @Post('collaborator/accept')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async acceptCollaborator(@Body() dto: AcceptInvitationDto) {
    return this.invitationService.acceptCollaboratorInvitation(dto);
  }
}
