import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class ProposeTransferDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  successorMemberId: string;
}
