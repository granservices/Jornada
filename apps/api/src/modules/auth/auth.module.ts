import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './services/auth-token.service';
import { PasswordHasherService } from './services/password-hasher.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthTokenService, PasswordHasherService],
  exports: [AuthService],
})
export class AuthModule {}
