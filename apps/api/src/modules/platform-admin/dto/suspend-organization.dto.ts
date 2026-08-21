import { IsString, IsNotEmpty } from 'class-validator';

export class SuspendOrganizationDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsNotEmpty()
  passwordConfirmation!: string;
}
