import { Role } from '@prisma/client';
import { AuthAdminBootstrapService } from './auth-admin-bootstrap.service';
import { PasswordHasherService } from './password-hasher.service';

describe('AuthAdminBootstrapService', () => {
  let service: AuthAdminBootstrapService;
  let configService: { get: jest.Mock<unknown, [string]> };
  let prisma: {
    user: {
      findUnique: jest.Mock<Promise<unknown>, [unknown]>;
      create: jest.Mock<
        Promise<unknown>,
        [
          {
            data: {
              email: string;
              fullName: string;
              passwordHash: string;
              roles: Role[];
            };
          },
        ]
      >;
      update: jest.Mock<Promise<unknown>, [unknown]>;
    };
  };
  let passwordHasher: { hash: jest.Mock };

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        const map: Partial<Record<string, string | boolean>> = {
          ADMIN_BOOTSTRAP_ENABLED: true,
          ADMIN_BOOTSTRAP_EMAIL: 'admin@granservices.com.br',
          ADMIN_BOOTSTRAP_PASSWORD: 'StrongAdminPassword123',
          ADMIN_BOOTSTRAP_FULL_NAME: 'Administrador Jornada',
        };

        return map[key] ?? null;
      }),
    };
    prisma = {
      user: {
        findUnique: jest.fn<Promise<unknown>, [unknown]>(),
        create: jest.fn<
          Promise<unknown>,
          [
            {
              data: {
                email: string;
                fullName: string;
                passwordHash: string;
                roles: Role[];
              };
            },
          ]
        >(),
        update: jest.fn<Promise<unknown>, [unknown]>(),
      },
    };
    passwordHasher = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
    };

    service = new AuthAdminBootstrapService(
      configService as never,
      prisma as never,
      passwordHasher as PasswordHasherService,
    );
  });

  it('creates the admin user when it does not exist', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await service.onApplicationBootstrap();

    expect(prisma.user.create).toHaveBeenCalled();

    const createArg = prisma.user.create.mock.calls[0]?.[0];

    expect(createArg?.data).toMatchObject({
      email: 'admin@granservices.com.br',
      fullName: 'Administrador Jornada',
      passwordHash: 'hashed-password',
      roles: [Role.ADMIN],
    });
  });

  it('adds ADMIN role when the user exists without it', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'admin@granservices.com.br',
      roles: [Role.EMPLOYEE],
    });

    await service.onApplicationBootstrap();

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        roles: [Role.EMPLOYEE, Role.ADMIN],
      },
    });
  });
});
