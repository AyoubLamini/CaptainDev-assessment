import { Module } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { DatabaseModule } from '../database/database.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [DatabaseModule, EmailModule],
  controllers: [AuthController],
  providers: [IdentityService, AuthService],
  exports: [IdentityService, AuthService],
})
export class IdentityModule {}
