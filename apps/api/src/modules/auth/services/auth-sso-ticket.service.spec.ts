import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../../../database/prisma.service';
import type { AuthService } from '../auth.service';
import type { AuthTokenService } from './auth-token.service';
import type { AuthApplicationAccessService } from './auth-application-access.service';
import type { AuthAuditService } from './auth-audit.service';
import { AuthSsoTicketService } from './auth-sso-ticket.service';

describe('AuthSsoTicketService', () => {
  const actor = {
    id: 'user-1',
    email: 'colaborador@granservices.com.br',
    employeeId: 'GRN-001',
    roles: ['EMPLOYEE'] as never[],
    status: 'ACTIVE' as never,
  };
  let service: AuthSsoTicketService;
  let prisma: {
    authSsoTicket: {
      create: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let applicationAccess: {
    listAccessibleApplications: jest.Mock;
  };
  let authService: {
    issueSessionForUserId: jest.Mock;
  };
  let authAudit: {
    success: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      authSsoTicket: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    applicationAccess = {
      listAccessibleApplications: jest.fn().mockResolvedValue([
        {
          id: 'app-tickets',
          code: 'TICKETS',
          name: 'Tickets',
          description: 'Workspace operacional',
          entryPath: '/atendimentos',
          isDefault: false,
          roles: ['AGENT'],
        },
      ]),
    };
    authService = {
      issueSessionForUserId: jest.fn().mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      }),
    };
    authAudit = {
      success: jest.fn(),
    };

    service = new AuthSsoTicketService(
      prisma as unknown as PrismaService,
      {
        getOrThrow: jest.fn().mockReturnValue(60),
      } as unknown as ConfigService,
      {
        generateOpaqueToken: jest.fn().mockReturnValue('opaque-ticket'),
        hashOpaqueToken: jest.fn().mockReturnValue('opaque-ticket-hash'),
      } as unknown as AuthTokenService,
      applicationAccess as unknown as AuthApplicationAccessService,
      authService as unknown as AuthService,
      authAudit as unknown as AuthAuditService,
    );
  });

  it('issues a short-lived ticket only for an application the user can access', async () => {
    await expect(service.issue(actor, 'TICKETS')).resolves.toEqual({
      ticket: 'opaque-ticket',
      expiresInSeconds: 60,
    });

    expect(prisma.authSsoTicket.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        applicationId: 'app-tickets',
        tokenHash: 'opaque-ticket-hash',
      }),
    });
    expect(authAudit.success).toHaveBeenCalledWith(
      'SSO_TICKET_ISSUED',
      expect.objectContaining({
        userId: 'user-1',
        email: 'colaborador@granservices.com.br',
        reason: 'application=TICKETS',
      }),
    );
  });

  it('rejects a ticket request for an inaccessible application', async () => {
    await expect(service.issue(actor, 'QUICK_FORMS')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('consumes a ticket only once before issuing a destination session', async () => {
    prisma.authSsoTicket.findUnique.mockResolvedValue({
      id: 'ticket-1',
      userId: 'user-1',
      application: { code: 'TICKETS' },
      consumedAt: null,
      expiresAt: new Date(Date.now() + 30_000),
    });
    prisma.authSsoTicket.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.consume('opaque-ticket', {})).resolves.toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
    expect(prisma.authSsoTicket.updateMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: 'ticket-1',
        consumedAt: null,
      }),
      data: expect.objectContaining({ consumedAt: expect.any(Date) }),
    });
    expect(authService.issueSessionForUserId).toHaveBeenCalledWith('user-1', {});
    expect(authAudit.success).toHaveBeenCalledWith(
      'SSO_TICKET_CONSUMED',
      expect.objectContaining({
        userId: 'user-1',
        reason: 'application=TICKETS',
      }),
    );
  });

  it('does not issue another session when the atomic claim fails', async () => {
    prisma.authSsoTicket.findUnique.mockResolvedValue({
      id: 'ticket-1',
      userId: 'user-1',
      application: { code: 'TICKETS' },
      consumedAt: null,
      expiresAt: new Date(Date.now() + 30_000),
    });
    prisma.authSsoTicket.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.consume('opaque-ticket', {})).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(authService.issueSessionForUserId).not.toHaveBeenCalled();
  });
});
