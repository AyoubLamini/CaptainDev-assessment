import { IsEnum } from 'class-validator';
import { OrganizationMemberStatus } from '@prisma/client';

export class UpdateCollaboratorStatusDto {
  @IsEnum(OrganizationMemberStatus)
  status!: OrganizationMemberStatus;
}
