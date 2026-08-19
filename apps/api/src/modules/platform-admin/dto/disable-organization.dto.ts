import { IsString, IsNotEmpty } from 'class-validator';

export class DisableOrganizationDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsNotEmpty()
  passwordConfirmation!: string;
}
