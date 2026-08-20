import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthAdminBootstrapService } from './services/auth-admin-bootstrap.service';
import { AuthService } from './auth.service';
import { AuthAuditService } from './services/auth-audit.service';
import { AuthTokenService } from './services/auth-token.service';
import { PasswordHasherService } from './services/password-hasher.service';

@Module({
  controllers: [AuthController],
  providers: [
    AuthAdminBootstrapService,
    AuthService,
    AuthAuditService,
    AuthTokenService,
    PasswordHasherService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
