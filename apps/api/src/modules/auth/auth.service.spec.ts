import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, UserProfileNotificationChannel, UserStatus } from '@prisma/client';
import type { PrismaService } from '../../database/prisma.service';
import type { HttpRequestContext } from '../../common/http/request-context';
import type { AuditService } from '../../common/audit/audit.service';
import { AuthService } from './auth.service';
import type { AuthApplicationAccessService } from './services/auth-application-access.service';
import type { AuthAuditService } from './services/auth-audit.service';
import type { AuthTokenService } from './services/auth-token.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    authSession: {
      create: jest.Mock;
      update: jest.Mock;
      findUnique: jest.Mock;
      updateMany: jest.Mock;
    };
    passwordResetToken: {
      create: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
    };
    userProfilePreference: {
      upsert: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let passwordHasher: {
    hash: jest.Mock;
    verify: jest.Mock;
  };
  let authTokenService: {
    signAccessToken: jest.Mock;
    generateOpaqueToken: jest.Mock;
  };
  let authAuditService: {
    success: jest.Mock;
    failure: jest.Mock;
    fromUser: jest.Mock;
  };
  let applicationAccess: {
    grantEmployeeDefaultApps: jest.Mock;
    listAccessibleApplications: jest.Mock;
  };
  let auditService: {
    record: jest.Mock;
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      authSession: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      passwordResetToken: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      userProfilePreference: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    };

    passwordHasher = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    authTokenService = {
      signAccessToken: jest.fn(),
      generateOpaqueToken: jest.fn(),
    };

    authAuditService = {
      success: jest.fn(),
      failure: jest.fn(),
      fromUser: jest.fn(
        (user: { id: string; email: string } | null | undefined) =>
          user
            ? {
                userId: user.id,
                email: user.email,
              }
            : {},
      ),
    };
    applicationAccess = {
      grantEmployeeDefaultApps: jest.fn(),
      listAccessibleApplications: jest.fn().mockResolvedValue([
        {
          id: 'app-jornada',
          code: 'JORNADA',
          name: 'Jornada',
          description:
            'Acompanhe a programacao de embarque e os vencimentos de ASO e treinamentos.',
          entryPath: '/inbox',
          isDefault: true,
          roles: ['USER'],
        },
      ]),
    };
    auditService = {
      record: jest.fn(),
    };

    service = new AuthService(
      prisma as unknown as PrismaService,
      passwordHasher,
      authTokenService as unknown as AuthTokenService,
      authAuditService as unknown as AuthAuditService,
      new ConfigService({
        JWT_REFRESH_EXPIRES_IN: '30d',
        PASSWORD_RESET_EXPIRES_IN_MINUTES: 30,
        AUTH_PUBLIC_REGISTRATION_ENABLED: true,
      }),
      applicationAccess as unknown as AuthApplicationAccessService,
      auditService as unknown as AuditService,
    );
  });

  it('registers a new user and returns session tokens', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    passwordHasher.hash
      .mockResolvedValueOnce('password-hash')
      .mockResolvedValueOnce('refresh-hash');
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'colaborador@granservices.com.br',
      personId: 'person-1',
      roles: [Role.EMPLOYEE],
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
      person: {
        fullName: 'Colaborador Gran',
        employee: null,
      },
    });
    prisma.authSession.create.mockResolvedValue({ id: 'session-1' });
    prisma.authSession.update.mockResolvedValue({});
    authTokenService.generateOpaqueToken.mockReturnValue('refresh-secret');
    authTokenService.signAccessToken.mockResolvedValue('access-token');
    const meta: HttpRequestContext = {
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
      requestId: 'req-1',
    };

    const response = await service.register(
      {
        email: 'COLABORADOR@granservices.com.br',
        fullName: 'Colaborador Gran',
        password: 'Senha#123',
      },
      meta,
    );

    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          person: {
            create: {
              fullName: 'Colaborador Gran',
            },
          },
        }),
      }),
    );
    expect(authAuditService.success).toHaveBeenCalled();
    expect(applicationAccess.grantEmployeeDefaultApps).toHaveBeenCalledWith(
      'user-1',
    );
    expect(response.accessToken).toBe('access-token');
    expect(response.refreshToken).toBe('session-1.refresh-secret');
    expect(response.applications).toEqual([
      expect.objectContaining({
        code: 'JORNADA',
        entryPath: '/inbox',
        roles: ['USER'],
      }),
    ]);
  });

  it('blocks registration when email already exists', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.register(
        {
          email: 'colaborador@granservices.com.br',
          fullName: 'Colaborador Gran',
          password: 'Senha#123',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(authAuditService.failure).toHaveBeenCalled();
  });

  it('rejects public registration when administrative invitations are required', async () => {
    const invitationOnlyService = new AuthService(
      prisma as unknown as PrismaService,
      passwordHasher,
      authTokenService as unknown as AuthTokenService,
      authAuditService as unknown as AuthAuditService,
      new ConfigService({ AUTH_PUBLIC_REGISTRATION_ENABLED: false }),
      applicationAccess as unknown as AuthApplicationAccessService,
      auditService as unknown as AuditService,
    );

    await expect(
      invitationOnlyService.register(
        {
          email: 'colaborador@granservices.com.br',
          fullName: 'Colaborador Gran',
          password: 'Senha#123',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects login with invalid password', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'colaborador@granservices.com.br',
      personId: 'person-1',
      passwordHash: 'stored-hash',
      roles: [Role.EMPLOYEE],
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
      person: {
        fullName: 'Colaborador Gran',
        employee: {
          employeeNumber: '000123',
          externalEmployeeId: '000123',
        },
      },
    });
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      service.login(
        {
          identifier: 'colaborador@granservices.com.br',
          password: 'Senha#123',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(authAuditService.failure).toHaveBeenCalled();
  });

  it('logs in with employee id as primary identifier', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'colaborador@granservices.com.br',
      personId: 'person-1',
      passwordHash: 'stored-hash',
      roles: [Role.EMPLOYEE],
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
      person: {
        fullName: 'Colaborador Gran',
        employee: {
          employeeNumber: '000123',
          externalEmployeeId: '000123',
        },
      },
    });
    prisma.user.update.mockResolvedValue({});
    prisma.authSession.create.mockResolvedValue({ id: 'session-1' });
    prisma.authSession.update.mockResolvedValue({});
    passwordHasher.verify.mockResolvedValue(true);
    passwordHasher.hash.mockResolvedValue('refresh-hash');
    authTokenService.generateOpaqueToken.mockReturnValue('refresh-secret');
    authTokenService.signAccessToken.mockResolvedValue('access-token');

    const response = await service.login(
      {
        identifier: ' 000 123 ',
        password: 'Senha#123',
      },
      {},
    );

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        person: {
          is: {
            employee: {
              is: {
                employeeNumber: '000123',
              },
            },
          },
        },
      },
      include: {
        person: {
          include: {
            employee: true,
          },
        },
      },
    });
    expect(authTokenService.signAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: '000123' }),
    );
    expect(response.user.employeeId).toBe('000123');
    expect(response.applications).toEqual([
      expect.objectContaining({
        code: 'JORNADA',
      }),
    ]);
  });

  it('returns the authenticated profile with official data minimized', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'colaborador@granservices.com.br',
      status: UserStatus.ACTIVE,
      roles: [Role.EMPLOYEE],
      emailVerifiedAt: null,
      lastLoginAt: new Date('2026-09-10T10:00:00.000Z'),
      updatedAt: new Date('2026-09-10T09:00:00.000Z'),
      person: {
        fullName: 'Colaborador Gran',
        cpf: '12345678900',
        birthDate: new Date('1990-01-15T00:00:00.000Z'),
        employee: {
          employeeNumber: '000123',
          department: 'Operacoes',
          updatedAt: new Date('2026-09-10T09:30:00.000Z'),
        },
      },
      profilePreference: {
        preferredName: 'Colaborador',
        phoneNumber: '+55 21 99999-0000',
        emergencyContactName: null,
        emergencyContactPhone: null,
        primaryBase: 'Macae',
        notificationChannel: UserProfileNotificationChannel.WHATSAPP,
        updatedAt: new Date('2026-09-10T09:45:00.000Z'),
      },
    });

    const response = await service.getMyProfile({
      id: 'user-1',
      email: 'colaborador@granservices.com.br',
      employeeId: '000123',
      roles: [Role.EMPLOYEE],
      status: UserStatus.ACTIVE,
    });

    expect(response.item.official.documentMasked).toBe('***.456.789-**');
    expect(response.item.official.employeeNumber).toBe('000123');
    expect(response.item.preferences.preferredName).toBe('Colaborador');
    expect(JSON.stringify(response)).not.toContain('12345678900');
  });

  it('updates only self-service profile preferences and records audit', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'colaborador@granservices.com.br',
      status: UserStatus.ACTIVE,
      roles: [Role.EMPLOYEE],
      emailVerifiedAt: null,
      lastLoginAt: null,
      updatedAt: new Date('2026-09-10T09:00:00.000Z'),
      person: {
        fullName: 'Colaborador Gran',
        cpf: null,
        birthDate: null,
        employee: {
          employeeNumber: '000123',
          department: 'Operacoes',
          updatedAt: new Date('2026-09-10T09:30:00.000Z'),
        },
      },
      profilePreference: {
        preferredName: null,
        phoneNumber: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        primaryBase: null,
        notificationChannel: UserProfileNotificationChannel.EMAIL,
        updatedAt: new Date('2026-09-10T09:45:00.000Z'),
      },
    });
    prisma.userProfilePreference.upsert.mockResolvedValue({
      id: 'profile-pref-1',
      userId: 'user-1',
      preferredName: 'Luan',
      phoneNumber: '+55 21 99999-0000',
      emergencyContactName: null,
      emergencyContactPhone: null,
      primaryBase: 'Macae',
      notificationChannel: UserProfileNotificationChannel.PHONE,
      createdAt: new Date('2026-09-10T10:00:00.000Z'),
      updatedAt: new Date('2026-09-10T10:00:00.000Z'),
    });

    const response = await service.updateMyProfile(
      {
        id: 'user-1',
        email: 'colaborador@granservices.com.br',
        employeeId: '000123',
        roles: [Role.EMPLOYEE],
        status: UserStatus.ACTIVE,
      },
      {
        preferredName: ' Luan ',
        phoneNumber: '+55 21 99999-0000',
        primaryBase: ' Macae ',
        notificationChannel: UserProfileNotificationChannel.PHONE,
      },
      { requestId: 'req-1' },
    );

    expect(prisma.userProfilePreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        update: expect.objectContaining({
          preferredName: 'Luan',
          primaryBase: 'Macae',
          notificationChannel: 'PHONE',
        }),
      }),
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: 'user-1',
        entityType: 'UserProfilePreference',
        requestId: 'req-1',
      }),
    );
    expect(response.item.preferences.primaryBase).toBe('Macae');
  });
});
