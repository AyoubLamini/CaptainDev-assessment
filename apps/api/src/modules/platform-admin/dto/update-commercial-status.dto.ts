import { IsString, IsNotEmpty, IsIn } from 'class-validator';

export class UpdateCommercialStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['DEMO', 'PILOT', 'ACTIVE'])
  commercialStatus!: 'DEMO' | 'PILOT' | 'ACTIVE';

  @IsString()
  @IsNotEmpty()
  reason!: string;
}
