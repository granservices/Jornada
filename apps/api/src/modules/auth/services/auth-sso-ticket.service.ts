import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthAuditEventType } from '@prisma/client';
import type { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import type { HttpRequestContext } from '../../../common/http/request-context';
import { PrismaService } from '../../../database/prisma.service';
import { AuthService } from '../auth.service';
import { AuthApplicationAccessService } from './auth-application-access.service';
import { AuthAuditService } from './auth-audit.service';
import { AuthTokenService } from './auth-token.service';

@Injectable()
export class AuthSsoTicketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly authTokenService: AuthTokenService,
    private readonly applicationAccess: AuthApplicationAccessService,
    private readonly authService: AuthService,
    private readonly authAudit: AuthAuditService,
  ) {}

  async issue(user: AuthenticatedUser, applicationCode: string) {
    const application = await this.findAccessibleApplication(
      user.id,
      applicationCode,
    );
    const ticket = this.authTokenService.generateOpaqueToken();
    const expiresInSeconds = this.configService.getOrThrow<number>(
      'AUTH_SSO_TICKET_EXPIRES_IN_SECONDS',
    );

    await this.prisma.authSsoTicket.create({
      data: {
        userId: user.id,
        applicationId: application.id,
        tokenHash: this.authTokenService.hashOpaqueToken(ticket),
        expiresAt: new Date(Date.now() + expiresInSeconds * 1_000),
      },
    });

    await this.authAudit.success(AuthAuditEventType.SSO_TICKET_ISSUED, {
      userId: user.id,
      email: user.email,
      reason: `application=${application.code}`,
    });

    return { ticket, expiresInSeconds };
  }

  async consume(ticket: string, meta: HttpRequestContext) {
    const now = new Date();
    const tokenHash = this.authTokenService.hashOpaqueToken(ticket);
    const storedTicket = await this.prisma.authSsoTicket.findUnique({
      where: { tokenHash },
      include: {
        application: {
          select: { code: true },
        },
      },
    });

    if (
      !storedTicket ||
      storedTicket.consumedAt ||
      storedTicket.expiresAt <= now
    ) {
      throw new UnauthorizedException('Codigo de acesso invalido ou expirado.');
    }

    const claim = await this.prisma.authSsoTicket.updateMany({
      where: {
        id: storedTicket.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { consumedAt: now },
    });

    if (claim.count !== 1) {
      throw new UnauthorizedException('Codigo de acesso invalido ou expirado.');
    }

    await this.findAccessibleApplication(
      storedTicket.userId,
      storedTicket.application.code,
    );

    const session = await this.authService.issueSessionForUserId(
      storedTicket.userId,
      meta,
    );

    await this.authAudit.success(AuthAuditEventType.SSO_TICKET_CONSUMED, {
      userId: storedTicket.userId,
      requestId: meta.requestId,
      ipAddress: meta.ipAddress,
      userAgent: this.stringifyUserAgent(meta.userAgent),
      reason: `application=${storedTicket.application.code}`,
    });

    return session;
  }

  private async findAccessibleApplication(userId: string, applicationCode: string) {
    const application = (await this.applicationAccess.listAccessibleApplications(
      userId,
    )).find((item) => item.code === applicationCode);

    if (!application) {
      throw new ForbiddenException('Usuario sem acesso ao aplicativo solicitado.');
    }

    return application;
  }

  private stringifyUserAgent(userAgent: HttpRequestContext['userAgent']) {
    if (Array.isArray(userAgent)) {
      return userAgent.join(', ');
    }

    return userAgent;
  }
}
