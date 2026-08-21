import { IsString, IsNotEmpty } from 'class-validator';

export class ReactivateOrganizationDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsString()
  @IsNotEmpty()
  passwordConfirmation!: string;
}
