import { Controller, Post, Patch, Get, Body, UseGuards, Query, DefaultValuePipe, ParseIntPipe, Req, UsePipes, ValidationPipe, Param } from '@nestjs/common';
import { PlatformOrganizationsService } from './platform-organizations.service';
import { ProvisionOrganizationDto } from './dto/provision-organization.dto';
import { InviteOwnerDto } from './dto/invite-owner.dto';
import { DisableOrganizationDto } from './dto/disable-organization.dto';
import { SuspendOrganizationDto } from './dto/suspend-organization.dto';
import { ReactivateOrganizationDto } from './dto/reactivate-organization.dto';
import { UpdateCommercialStatusDto } from './dto/update-commercial-status.dto';
import { PlatformInterventionDto } from './dto/platform-intervention.dto';
import { PlatformAdminGuard } from '../access-control/guards/platform-admin.guard';
import { Request } from 'express';

@Controller('platform/organizations')
@UseGuards(PlatformAdminGuard)
@UsePipes(new ValidationPipe({ transform: true }))
export class PlatformOrganizationsController {
  constructor(private readonly service: PlatformOrganizationsService) {}

  @Post()
  async provision(@Body() dto: ProvisionOrganizationDto, @Req() req: Request) {
    const actorId = req.identity?.id as string;
    return this.service.provisionOrganization(dto, actorId);
  }

  @Get()
  async getDirectory(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) pageQuery: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limitQuery: number,
  ) {
    const page = Math.max(1, pageQuery);
    const limit = Math.min(100, Math.max(1, limitQuery));
    return this.service.getDirectory(page, limit);
  }

  @Post(':id/owner-invitation')
  async inviteOwner(
    @Param('id') id: string,
    @Body() dto: InviteOwnerDto,
    @Req() req: Request,
  ) {
    const actorId = req.identity?.id as string;
    return this.service.inviteInitialOwner(id, dto, actorId);
  }

  @Post(':id/suspend')
  async suspendOrganization(
    @Param('id') id: string,
    @Body() dto: SuspendOrganizationDto,
    @Req() req: Request,
  ) {
    const actorId = req.identity?.id as string;
    return this.service.suspendOrganization(id, dto, actorId);
  }

  @Post(':id/reactivate')
  async reactivateOrganization(
    @Param('id') id: string,
    @Body() dto: ReactivateOrganizationDto,
    @Req() req: Request,
  ) {
    const actorId = req.identity?.id as string;
    return this.service.reactivateOrganization(id, dto, actorId);
  }

  @Post(':id/disable')
  async disableOrganization(
    @Param('id') id: string,
    @Body() dto: DisableOrganizationDto,
    @Req() req: Request,
  ) {
    const actorId = req.identity?.id as string;
    return this.service.disableOrganization(id, dto, actorId);
  }

  @Patch(':id/commercial-status')
  async updateCommercialStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCommercialStatusDto,
    @Req() req: Request,
  ) {
    const actorId = req.identity?.id as string;
    return this.service.updateCommercialStatus(id, dto, actorId);
  }

  @Post(':id/intervention')
  async performIntervention(
    @Param('id') id: string,
    @Body() dto: PlatformInterventionDto,
    @Req() req: Request,
  ) {
    const actorId = req.identity?.id as string;
    return this.service.performIntervention(id, dto, actorId);
  }
}

