import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, UserStatus } from '@prisma/client';
import type { PrismaService } from '../../database/prisma.service';
import { AuthService } from './auth.service';
import type { AuthTokenService } from './services/auth-token.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
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

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
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

    service = new AuthService(
      prisma as unknown as PrismaService,
      passwordHasher,
      authTokenService as unknown as AuthTokenService,
      new ConfigService({
        JWT_REFRESH_EXPIRES_IN: '30d',
        PASSWORD_RESET_EXPIRES_IN_MINUTES: 30,
      }),
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
      fullName: 'Colaborador Gran',
      roles: [Role.EMPLOYEE],
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
    });
    prisma.authSession.create.mockResolvedValue({ id: 'session-1' });
    prisma.authSession.update.mockResolvedValue({});
    authTokenService.generateOpaqueToken.mockReturnValue('refresh-secret');
    authTokenService.signAccessToken.mockResolvedValue('access-token');

    const response = await service.register(
      {
        email: 'COLABORADOR@granservices.com.br',
        fullName: 'Colaborador Gran',
        password: 'Senha#123',
      },
      {
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
    );

    expect(prisma.user.create).toHaveBeenCalled();
    expect(response.accessToken).toBe('access-token');
    expect(response.refreshToken).toBe('session-1.refresh-secret');
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
  });

  it('rejects login with invalid password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'colaborador@granservices.com.br',
      fullName: 'Colaborador Gran',
      passwordHash: 'stored-hash',
      roles: [Role.EMPLOYEE],
      status: UserStatus.ACTIVE,
      emailVerifiedAt: null,
    });
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      service.login(
        {
          email: 'colaborador@granservices.com.br',
          password: 'Senha#123',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
