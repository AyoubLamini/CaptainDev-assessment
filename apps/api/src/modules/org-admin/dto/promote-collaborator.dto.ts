import { IsString, IsNotEmpty } from 'class-validator';

export class PromoteCollaboratorDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
