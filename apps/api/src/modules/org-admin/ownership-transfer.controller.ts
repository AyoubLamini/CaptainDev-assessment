import { Controller, Post, Body, Param, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { CollaboratorService } from './collaborator.service';
import { OrgAdminGuard } from '../access-control/guards/org-admin.guard';
import { Request } from 'express';
import { ProposeTransferDto } from './dto/propose-transfer.dto';

interface AuthenticatedRequest extends Request {
  identity: { id: string; email: string; createdAt: Date; isPlatformAdmin: boolean; [key: string]: any };
  session?: { createdAt: any; [key: string]: any };
}

@Controller('org-admin/:organizationId/ownership-transfer')
@UseGuards(OrgAdminGuard)
export class OwnershipTransferController {
  constructor(private readonly collaboratorService: CollaboratorService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async proposeTransfer(
    @Param('organizationId') organizationId: string,
    @Body() dto: ProposeTransferDto,
    @Req() req: AuthenticatedRequest
  ) {
    const adminIdentityId = req.identity.id;
    const sessionCreatedAt = req.session?.createdAt;

    const result = await this.collaboratorService.proposeOwnershipTransfer(
      organizationId,
      adminIdentityId,
      dto.successorMemberId,
      sessionCreatedAt
    );

    return { data: result };
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async acceptTransfer(
    @Param('organizationId') organizationId: string,
    @Req() req: AuthenticatedRequest
  ) {
    const adminIdentityId = req.identity.id;
    const sessionCreatedAt = req.session?.createdAt;

    const result = await this.collaboratorService.acceptOwnershipTransfer(
      organizationId,
      adminIdentityId,
      sessionCreatedAt
    );

    return { data: result };
  }

  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  async cancelTransfer(
    @Param('organizationId') organizationId: string,
    @Req() req: AuthenticatedRequest
  ) {
    const adminIdentityId = req.identity.id;
    const sessionCreatedAt = req.session?.createdAt;

    const result = await this.collaboratorService.cancelOwnershipTransfer(
      organizationId,
      adminIdentityId,
      sessionCreatedAt
    );

    return { data: result };
  }
}

