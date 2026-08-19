import { IsString, IsNotEmpty } from 'class-validator';

export class PlatformInterventionDto {
  @IsString()
  @IsNotEmpty()
  targetIdentityId!: string;

  @IsString()
  @IsNotEmpty()
  action!: string;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsNotEmpty()
  passwordConfirmation!: string;
}
