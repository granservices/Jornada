import {
  ApplicationEntryKind,
  ApplicationStatus,
  UserApplicationAccessStatus,
  UserApplicationRoleStatus,
  Role,
} from '@prisma/client';
import type { PrismaService } from '../../../database/prisma.service';
import { AuthApplicationAccessService } from './auth-application-access.service';

describe('AuthApplicationAccessService', () => {
  let service: AuthApplicationAccessService;
  let prisma: {
    application: {
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    userApplicationAccess: {
      count: jest.Mock;
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    userApplicationRole: {
      upsert: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      application: {
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          roles: [Role.EMPLOYEE],
        }),
      },
      userApplicationAccess: {
        count: jest.fn().mockResolvedValue(0),
        upsert: jest.fn(),
        findMany: jest.fn(),
      },
      userApplicationRole: {
        upsert: jest.fn(),
      },
    };

    service = new AuthApplicationAccessService(
      prisma as unknown as PrismaService,
    );
  });

  it('grants default worker access to Jornada', async () => {
    prisma.application.findMany.mockResolvedValue([
      { id: 'app-jornada', code: 'JORNADA' },
    ]);

    await service.grantEmployeeDefaultApps('user-1');

    expect(prisma.application.upsert).toHaveBeenCalledTimes(3);
    expect(prisma.userApplicationAccess.upsert).toHaveBeenCalledWith({
      where: {
        userId_applicationId: {
          userId: 'user-1',
          applicationId: 'app-jornada',
        },
      },
      update: {
        status: UserApplicationAccessStatus.ACTIVE,
        isDefault: true,
      },
      create: {
        userId: 'user-1',
        applicationId: 'app-jornada',
        status: UserApplicationAccessStatus.ACTIVE,
        isDefault: true,
      },
    });
    expect(prisma.userApplicationRole.upsert).toHaveBeenCalledWith({
      where: {
        userId_applicationId_roleCode: {
          userId: 'user-1',
          applicationId: 'app-jornada',
          roleCode: 'MEMBER',
        },
      },
      update: {
        status: UserApplicationRoleStatus.ACTIVE,
      },
      create: {
        userId: 'user-1',
        applicationId: 'app-jornada',
        roleCode: 'MEMBER',
        status: UserApplicationRoleStatus.ACTIVE,
      },
    });
  });

  it('seeds Focall as a native module while preserving its stable application code', async () => {
    await service.ensureCatalogSeeded();

    expect(prisma.application.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: 'HELP_HUB' },
        create: expect.objectContaining({
          code: 'HELP_HUB',
          name: 'Focall',
          entryKind: ApplicationEntryKind.NATIVE,
          entryPath: '/atendimentos',
        }),
      }),
    );
  });

  it('seeds QuickForms as an independent application', async () => {
    await service.ensureCatalogSeeded();

    expect(prisma.application.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: 'QUICK_FORMS' },
        create: expect.objectContaining({
          code: 'QUICK_FORMS',
          name: 'QuickForms',
          entryPath: '/formularios',
        }),
      }),
    );
  });

  it('lists only active accessible applications ordered by default and catalog order', async () => {
    prisma.application.findMany.mockResolvedValue([
      { id: 'app-jornada', code: 'JORNADA' },
    ]);
    prisma.userApplicationAccess.findMany.mockResolvedValue([
      {
        isDefault: true,
        application: {
          id: 'app-jornada',
          code: 'JORNADA',
          name: 'Jornada',
          description:
            'Acompanhe a programacao de embarque e os vencimentos de ASO e treinamentos.',
          entryPath: '/inbox',
          roles: [{ roleCode: 'MEMBER' }],
        },
      },
    ]);

    const response = await service.listAccessibleApplications('user-1');

    expect(prisma.userApplicationAccess.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        status: UserApplicationAccessStatus.ACTIVE,
        application: {
          status: ApplicationStatus.ACTIVE,
        },
      },
      orderBy: [
        { isDefault: 'desc' },
        { application: { sortOrder: 'asc' } },
        { application: { name: 'asc' } },
      ],
      include: {
        application: {
          include: {
            roles: {
              where: {
                userId: 'user-1',
                status: UserApplicationRoleStatus.ACTIVE,
              },
              orderBy: { roleCode: 'asc' },
              select: {
                roleCode: true,
              },
            },
          },
        },
      },
    });
    expect(response).toEqual([
      {
        id: 'app-jornada',
        code: 'JORNADA',
        name: 'Jornada',
        description:
          'Acompanhe a programacao de embarque e os vencimentos de ASO e treinamentos.',
        entryPath: '/inbox',
        isDefault: true,
        roles: ['MEMBER'],
      },
    ]);
  });
});
