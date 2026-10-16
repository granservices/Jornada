import {
  ApplicationEntryKind,
  AuditAction,
  Role,
  UserApplicationAccessStatus,
  UserApplicationRoleStatus,
  UserStatus,
} from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { AuditService } from '../../../common/audit/audit.service';
import type { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import type { PrismaService } from '../../../database/prisma.service';
import { AuthApplicationAdminService } from './auth-application-admin.service';

describe('AuthApplicationAdminService', () => {
  let service: AuthApplicationAdminService;
  let prisma: {
    application: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
    };
    userApplicationAccess: {
      updateMany: jest.Mock;
      upsert: jest.Mock;
    };
    userApplicationRole: {
      updateMany: jest.Mock;
      upsert: jest.Mock;
    };
    auditLog: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let audit: {
    record: jest.Mock;
  };

  const admin: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@granservices.com.br',
    employeeId: null,
    roles: [Role.ADMIN],
    status: UserStatus.ACTIVE,
  };

  beforeEach(() => {
    prisma = {
      application: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      userApplicationAccess: {
        updateMany: jest.fn(),
        upsert: jest.fn(),
      },
      userApplicationRole: {
        updateMany: jest.fn(),
        upsert: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback(prisma),
      ),
    };

    audit = {
      record: jest.fn(),
    };

    service = new AuthApplicationAdminService(
      prisma as unknown as PrismaService,
      audit as unknown as AuditService,
    );
  });

  it('lists managed users with their active applications and roles', async () => {
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'user-1',
        email: 'colaborador@granservices.com.br',
        status: UserStatus.ACTIVE,
        roles: [Role.EMPLOYEE],
        createdAt: new Date('2026-08-29T10:00:00.000Z'),
        updatedAt: new Date('2026-08-29T11:00:00.000Z'),
        person: {
          fullName: 'Colaborador Gran',
          employee: {
            employeeNumber: 'GRN-001',
          },
        },
        applicationAccesses: [
          {
            isDefault: true,
            application: {
              id: 'app-jornada',
              code: 'JORNADA',
              name: 'Jornada',
              description: 'Portal',
              entryPath: '/inbox',
              status: 'ACTIVE',
            },
          },
        ],
        applicationRoles: [
          {
            applicationId: 'app-jornada',
            roleCode: 'MEMBER',
          },
        ],
      },
    ]);

    const response = await service.listUserAccesses(admin, { q: 'gran' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      }),
    );
    expect(response.items).toEqual([
      expect.objectContaining({
        email: 'colaborador@granservices.com.br',
        fullName: 'Colaborador Gran',
        applications: [
          expect.objectContaining({
            code: 'JORNADA',
            roles: ['MEMBER'],
          }),
        ],
      }),
    ]);
  });

  it('creates a redirect application and audits the catalog change', async () => {
    prisma.application.create.mockResolvedValue({
      id: 'app-crew',
      code: 'CREW',
      name: 'Crew',
      description: 'Escalas da equipe.',
      entryKind: 'REDIRECT',
      entryPath: 'https://crew.example.com',
      imageUrl: 'https://cdn.example.com/crew.png',
      sortOrder: 40,
      status: 'ACTIVE',
      createdAt: new Date('2026-09-02T10:00:00.000Z'),
      updatedAt: new Date('2026-09-02T10:00:00.000Z'),
    });

    const response = await service.createApplication(admin, {
      code: 'CREW',
      name: 'Crew',
      description: 'Escalas da equipe.',
      entryKind: ApplicationEntryKind.REDIRECT,
      entryPath: 'https://crew.example.com',
      imageUrl: 'https://cdn.example.com/crew.png',
      sortOrder: 40,
    });

    expect(prisma.application.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: 'CREW',
        entryKind: 'REDIRECT',
        entryPath: 'https://crew.example.com',
      }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.CREATE,
        entityType: 'Application',
        entityId: 'app-crew',
      }),
    );
    expect(response.item).toEqual(
      expect.objectContaining({ code: 'CREW', entryKind: 'REDIRECT' }),
    );
  });

  it('rejects a redirect application that does not use an external URL', async () => {
    await expect(
      service.createApplication(admin, {
        code: 'CREW',
        name: 'Crew',
        entryKind: ApplicationEntryKind.REDIRECT,
        entryPath: '/crew',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.application.create).not.toHaveBeenCalled();
  });

  it('rejects a native application that is not registered in Neo', async () => {
    await expect(
      service.createApplication(admin, {
        code: 'CREW',
        name: 'Crew',
        entryKind: ApplicationEntryKind.NATIVE,
        entryPath: '/crew',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.application.create).not.toHaveBeenCalled();
  });

  it('creates the native Neo application when its registered entry path is used', async () => {
    prisma.application.create.mockResolvedValue({
      id: 'app-neo',
      code: 'NEO',
      name: 'Neo',
      description: 'Portal central',
      entryKind: 'NATIVE',
      entryPath: '/aplicativos',
      imageUrl: null,
      sortOrder: 0,
      status: 'ACTIVE',
      createdAt: new Date('2026-09-02T10:00:00.000Z'),
      updatedAt: new Date('2026-09-02T10:00:00.000Z'),
    });

    await service.createApplication(admin, {
      code: 'NEO',
      name: 'Neo',
      description: 'Portal central',
      entryKind: ApplicationEntryKind.NATIVE,
      entryPath: '/aplicativos',
      sortOrder: 0,
    });

    expect(prisma.application.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: 'NEO',
        entryKind: 'NATIVE',
        entryPath: '/aplicativos',
      }),
    });
  });

  it('updates application details without changing its immutable code', async () => {
    const existing = {
      id: 'app-jornada',
      code: 'JORNADA',
      name: 'Jornada',
      description: 'Portal',
      entryKind: 'NATIVE',
      entryPath: '/inbox',
      imageUrl: null,
      sortOrder: 10,
      status: 'ACTIVE',
      createdAt: new Date('2026-09-02T10:00:00.000Z'),
      updatedAt: new Date('2026-09-02T10:00:00.000Z'),
    };
    prisma.application.findUnique.mockResolvedValue(existing);
    prisma.application.update.mockResolvedValue({
      ...existing,
      name: 'Jornada de embarque',
      updatedAt: new Date('2026-09-02T11:00:00.000Z'),
    });

    await service.updateApplication(admin, 'JORNADA', {
      name: 'Jornada de embarque',
    });

    expect(prisma.application.update).toHaveBeenCalledWith({
      where: { id: 'app-jornada' },
      data: expect.objectContaining({ name: 'Jornada de embarque' }),
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.UPDATE,
        entityType: 'Application',
        metadata: { applicationCode: 'JORNADA' },
      }),
    );
  });

  it('updates application access, switches default app and audits the action', async () => {
    prisma.application.findUnique.mockResolvedValue({
      id: 'app-Tickets',
      code: 'TICKETS',
      name: 'Tickets',
      status: 'ACTIVE',
    });
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'colaborador@granservices.com.br',
        status: UserStatus.ACTIVE,
        roles: [Role.EMPLOYEE],
        person: {
          fullName: 'Colaborador Gran',
          employee: { employeeNumber: 'GRN-001' },
        },
        applicationAccesses: [
          {
            applicationId: 'app-jornada',
            status: UserApplicationAccessStatus.ACTIVE,
            isDefault: true,
            application: {
              id: 'app-jornada',
              code: 'JORNADA',
              name: 'Jornada',
            },
          },
        ],
        applicationRoles: [
          {
            applicationId: 'app-jornada',
            roleCode: 'MEMBER',
            status: UserApplicationRoleStatus.ACTIVE,
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'colaborador@granservices.com.br',
        status: UserStatus.ACTIVE,
        roles: [Role.EMPLOYEE],
        person: {
          fullName: 'Colaborador Gran',
          employee: { employeeNumber: 'GRN-001' },
        },
        applicationAccesses: [
          {
            applicationId: 'app-Tickets',
            isDefault: true,
            application: {
              id: 'app-Tickets',
              code: 'TICKETS',
              name: 'Tickets',
            },
          },
        ],
        applicationRoles: [
          {
            applicationId: 'app-Tickets',
            roleCode: 'AGENT',
          },
        ],
      });

    const response = await service.setUserApplicationAccess(
      admin,
      'user-1',
      'TICKETS',
      {
        enabled: true,
        isDefault: true,
        roles: ['AGENT'],
      },
    );

    expect(prisma.userApplicationAccess.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        applicationId: { not: 'app-Tickets' },
        status: UserApplicationAccessStatus.ACTIVE,
      },
      data: {
        isDefault: false,
      },
    });
    expect(prisma.userApplicationAccess.upsert).toHaveBeenCalledWith({
      where: {
        userId_applicationId: {
          userId: 'user-1',
          applicationId: 'app-Tickets',
        },
      },
      update: {
        status: UserApplicationAccessStatus.ACTIVE,
        isDefault: true,
      },
      create: {
        userId: 'user-1',
        applicationId: 'app-Tickets',
        status: UserApplicationAccessStatus.ACTIVE,
        isDefault: true,
      },
    });
    expect(prisma.userApplicationRole.upsert).toHaveBeenCalledWith({
      where: {
        userId_applicationId_roleCode: {
          userId: 'user-1',
          applicationId: 'app-Tickets',
          roleCode: 'AGENT',
        },
      },
      update: {
        status: UserApplicationRoleStatus.ACTIVE,
      },
      create: {
        userId: 'user-1',
        applicationId: 'app-Tickets',
        roleCode: 'AGENT',
        status: UserApplicationRoleStatus.ACTIVE,
      },
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: admin.id,
        action: AuditAction.UPDATE,
        entityType: 'UserApplicationAccess',
      }),
    );
    expect(response.item).toEqual(
      expect.objectContaining({
        applications: [
          expect.objectContaining({
            code: 'TICKETS',
            isDefault: true,
            roles: ['AGENT'],
          }),
        ],
      }),
    );
  });

  it('grants a catalog application with default contextual roles when it has no custom role catalog', async () => {
    prisma.application.findUnique.mockResolvedValue({
      id: 'app-crew',
      code: 'CREW_OPS',
      name: 'CrewOps',
      status: 'ACTIVE',
    });
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'colaborador@granservices.com.br',
        status: UserStatus.ACTIVE,
        roles: [Role.EMPLOYEE],
        person: {
          fullName: 'Colaborador Gran',
          employee: { employeeNumber: 'GRN-001' },
        },
        applicationAccesses: [],
        applicationRoles: [],
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'colaborador@granservices.com.br',
        status: UserStatus.ACTIVE,
        roles: [Role.EMPLOYEE],
        person: {
          fullName: 'Colaborador Gran',
          employee: { employeeNumber: 'GRN-001' },
        },
        applicationAccesses: [
          {
            applicationId: 'app-crew',
            isDefault: false,
            application: {
              id: 'app-crew',
              code: 'CREW_OPS',
              name: 'CrewOps',
            },
          },
        ],
        applicationRoles: [
          {
            applicationId: 'app-crew',
            roleCode: 'MEMBER',
          },
        ],
      });

    const response = await service.setUserApplicationAccess(
      admin,
      'user-1',
      'CREW_OPS',
      {
        enabled: true,
        isDefault: false,
        roles: ['MEMBER'],
      },
    );

    expect(prisma.userApplicationRole.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          applicationId: 'app-crew',
          roleCode: 'MEMBER',
        }),
      }),
    );
    expect(response.item.applications).toEqual([
      expect.objectContaining({
        code: 'CREW_OPS',
        roles: ['MEMBER'],
      }),
    ]);
  });

  it('revokes application access and all application roles together', async () => {
    prisma.application.findUnique.mockResolvedValue({
      id: 'app-Tickets',
      code: 'TICKETS',
      name: 'Tickets',
      status: 'ACTIVE',
    });
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'colaborador@granservices.com.br',
        status: UserStatus.ACTIVE,
        roles: [Role.EMPLOYEE],
        person: {
          fullName: 'Colaborador Gran',
          employee: { employeeNumber: 'GRN-001' },
        },
        applicationAccesses: [
          {
            applicationId: 'app-Tickets',
            status: UserApplicationAccessStatus.ACTIVE,
            isDefault: false,
            application: {
              id: 'app-Tickets',
              code: 'TICKETS',
              name: 'Tickets',
            },
          },
        ],
        applicationRoles: [
          {
            applicationId: 'app-Tickets',
            roleCode: 'AGENT',
            status: UserApplicationRoleStatus.ACTIVE,
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        email: 'colaborador@granservices.com.br',
        status: UserStatus.ACTIVE,
        roles: [Role.EMPLOYEE],
        person: {
          fullName: 'Colaborador Gran',
          employee: { employeeNumber: 'GRN-001' },
        },
        applicationAccesses: [],
        applicationRoles: [],
      });

    await service.setUserApplicationAccess(admin, 'user-1', 'TICKETS', {
      enabled: false,
      roles: [],
    });

    expect(prisma.userApplicationAccess.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        applicationId: 'app-Tickets',
      },
      data: {
        status: UserApplicationAccessStatus.REVOKED,
        isDefault: false,
      },
    });
    expect(prisma.userApplicationRole.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        applicationId: 'app-Tickets',
      },
      data: {
        status: UserApplicationRoleStatus.REVOKED,
      },
    });
  });

  it('blocks non-admin actors from changing access by application', async () => {
    await expect(
      service.listApplications({
        ...admin,
        roles: [Role.EMPLOYEE],
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects enabled access without application roles', async () => {
    await expect(
      service.setUserApplicationAccess(admin, 'user-1', 'JORNADA', {
        enabled: true,
        roles: [],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a contextual role that is not declared by the selected module', async () => {
    await expect(
      service.setUserApplicationAccess(admin, 'user-1', 'JORNADA', {
        enabled: true,
        roles: ['AGENT'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('fails when the managed user does not exist', async () => {
    prisma.application.findUnique.mockResolvedValue({
      id: 'app-jornada',
      code: 'JORNADA',
      name: 'Jornada',
      status: 'ACTIVE',
    });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.setUserApplicationAccess(admin, 'missing-user', 'JORNADA', {
        enabled: true,
        roles: ['MEMBER'],
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
