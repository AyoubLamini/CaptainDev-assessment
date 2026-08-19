import { IsEmail, IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';

export class InviteCollaboratorDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  role!: string;

  @IsOptional()
  @IsObject()
  grants?: Record<string, any>;
}
