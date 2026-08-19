import 'reflect-metadata';
import { validate } from 'class-validator';
import { UpdateCollaboratorGrantsDto, GrantsPayloadDto } from './update-collaborator-grants.dto';

describe('UpdateCollaboratorGrantsDto', () => {
  it('should pass validation for valid grants', async () => {
    const dto = new UpdateCollaboratorGrantsDto();
    dto.grants = new GrantsPayloadDto();
    dto.grants.capabilities = ['SOME_CAPABILITY'];
    dto.grants.scopes = ['scope_id_1'];

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation if grants contains platform capabilities', async () => {
    const dto = new UpdateCollaboratorGrantsDto();
    dto.grants = new GrantsPayloadDto();
    dto.grants.capabilities = ['PLATFORM_ADMIN', 'SOME_CAPABILITY'];
    dto.grants.scopes = ['scope_id_1'];

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].property).toBe('grants');
    
    // Check if the constraint message is present
    const childError = errors[0].children?.[0];
    expect(childError?.constraints?.noPlatformCapabilities).toBeDefined();
  });

  it('should fail validation if scopes or capabilities are missing', async () => {
    const dto = new UpdateCollaboratorGrantsDto();
    // Missing grants completely
    let errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
