import { Module } from '@nestjs/common';
import { AuditModule } from '../../common/audit/audit.module';
import { JwtAccessTokenService } from '../../common/auth/jwt-access-token.service';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { DomainEventsModule } from '../../common/events/domain-events.module';
import { AuthController } from './auth.controller';
import { AuthAdminBootstrapService } from './services/auth-admin-bootstrap.service';
import { AuthApplicationAdminService } from './services/auth-application-admin.service';
import { AuthApplicationAccessService } from './services/auth-application-access.service';
import { AuthService } from './auth.service';
import { AuthAuditService } from './services/auth-audit.service';
import { AuthTokenService } from './services/auth-token.service';
import { AuthSsoTicketService } from './services/auth-sso-ticket.service';
import { PasswordHasherService } from './services/password-hasher.service';
import { AuthUserProvisioningService } from './services/auth-user-provisioning.service';

@Module({
  imports: [AuditModule, DomainEventsModule],
  controllers: [AuthController],
  providers: [
    AuthAdminBootstrapService,
    AuthApplicationAdminService,
    AuthApplicationAccessService,
    AuthService,
    AuthAuditService,
    AuthTokenService,
    AuthSsoTicketService,
    AuthUserProvisioningService,
    JwtAccessTokenService,
    JwtAuthGuard,
    PasswordHasherService,
  ],
  exports: [AuthService, JwtAccessTokenService, JwtAuthGuard],
})
export class AuthModule {}
