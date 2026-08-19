import { IsNotEmpty, MaxLength, IsEnum, IsString } from 'class-validator';
import { OrganizationCommercialStatus } from '@prisma/client';
import { Transform } from 'class-transformer';

export class ProvisionOrganizationDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  @Transform(({ value }) => value?.trim())
  name!: string;

  @IsNotEmpty()
  @IsEnum(OrganizationCommercialStatus)
  commercialStatus!: OrganizationCommercialStatus;

  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  reason!: string;
}
