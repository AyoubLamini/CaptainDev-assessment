import { IsNotEmpty, IsArray, IsString, ValidateNested, IsDefined, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, IsObject, ArrayUnique } from 'class-validator';
import { Type } from 'class-transformer';

@ValidatorConstraint({ name: 'noPlatformCapabilities', async: false })
export class NoPlatformCapabilitiesConstraint implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    if (!value || !Array.isArray(value)) return true;
    for (const cap of value) {
      if (typeof cap === 'string' && (cap.startsWith('PLATFORM_') || cap === 'MANAGE_ORGANIZATIONS' || cap === 'VIEW_ALL_USERS' || cap === 'SUPER_ADMIN')) {
        return false;
      }
    }
    return true;
  }
  defaultMessage(args: ValidationArguments) {
    return 'Grants must not contain platform-level capabilities';
  }
}

export class GrantsPayloadDto {
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @Validate(NoPlatformCapabilitiesConstraint)
  capabilities: string[];

  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  scopes: string[];
}

export class UpdateCollaboratorGrantsDto {
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => GrantsPayloadDto)
  grants: GrantsPayloadDto;
}
