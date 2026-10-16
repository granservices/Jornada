import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  ApplicationEntryKind,
  ApplicationStatus,
  UserApplicationAccessStatus,
  UserApplicationRoleStatus,
  Role,
} from '@prisma/client';
import type { ApplicationRoleCode } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';

export type AccessibleApplication = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  entryKind: ApplicationEntryKind;
  entryPath: string;
  imageUrl: string | null;
  isDefault: boolean;
  roles: ApplicationRoleCode[];
};

const APPLICATION_CATALOG = [
  {
    code: 'JORNADA',
    name: 'Jornada',
    description:
      'Acompanhe a programacao de embarque e os vencimentos de ASO e treinamentos.',
    entryKind: ApplicationEntryKind.NATIVE,
    entryPath: '/inbox',
    sortOrder: 10,
  },
  {
    code: 'TICKETS',
    name: 'Tickets',
    description: 'Atendimentos e suporte ao colaborador.',
    entryKind: ApplicationEntryKind.NATIVE,
    entryPath: '/atendimentos',
    sortOrder: 20,
  },
  {
    code: 'QUICK_FORMS',
    name: 'QuickForms',
    description: 'Criacao, versionamento e solicitacoes de formularios.',
    entryKind: ApplicationEntryKind.NATIVE,
    entryPath: '/formularios',
    sortOrder: 30,
  },
] as const;

const LEGACY_SUPPORT_ROLES = new Set<Role>([
  Role.ADMIN,
  Role.SUPPORT,
  Role.TI,
  Role.MEDICINE,
  Role.OPERATIONS,
]);

@Injectable()
export class AuthApplicationAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async ensureCatalogSeeded() {
    await Promise.all(
      APPLICATION_CATALOG.map((application) =>
        this.prisma.application.upsert({
          where: { code: application.code },
          update: {},
          create: {
            code: application.code,
            name: application.name,
            description: application.description,
            entryKind: application.entryKind,
            entryPath: application.entryPath,
            sortOrder: application.sortOrder,
            status: ApplicationStatus.ACTIVE,
          },
        }),
      ),
    );
  }

  async grantEmployeeDefaultApps(userId: string) {
    await this.ensureCatalogSeeded();

    return this.grantApplications(userId, [
      {
        code: 'JORNADA',
        isDefault: true,
        roles: ['MEMBER'],
      },
    ]);
  }

  async grantAdminDefaultApps(userId: string) {
    await this.ensureCatalogSeeded();

    return this.grantApplications(userId, [
      {
        code: 'JORNADA',
        isDefault: true,
        roles: ['MANAGER'],
      },
      {
        code: 'TICKETS',
        isDefault: false,
        roles: ['MANAGER'],
      },
      {
        code: 'QUICK_FORMS',
        isDefault: false,
        roles: ['MANAGER'],
      },
    ]);
  }

  async listAccessibleApplications(userId: string) {
    await this.syncLegacyRoleGrants(userId);
    await this.ensureCatalogSeeded();

    const accesses = await this.prisma.userApplicationAccess.findMany({
      where: {
        userId,
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
                userId,
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

    return accesses.map((access) => ({
      id: access.application.id,
      code: access.application.code,
      name: access.application.name,
      description: access.application.description,
      entryKind: access.application.entryKind,
      entryPath: access.application.entryPath,
      imageUrl: access.application.imageUrl,
      isDefault: access.isDefault,
      roles: access.application.roles.map((role) => role.roleCode),
    }));
  }

  private async grantApplications(
    userId: string,
    grants: Array<{
      code: string;
      isDefault: boolean;
      roles: ApplicationRoleCode[];
    }>,
  ) {
    const applications = await this.prisma.application.findMany({
      where: {
        code: { in: grants.map((grant) => grant.code) },
      },
      select: {
        id: true,
        code: true,
      },
    });

    const applicationIdByCode = new Map(
      applications.map((application) => [application.code, application.id]),
    );

    await Promise.all(
      grants.map((grant) =>
        this.prisma.userApplicationAccess.upsert({
          where: {
            userId_applicationId: {
              userId,
              applicationId: this.applicationIdOrThrow(
                applicationIdByCode,
                grant.code,
              ),
            },
          },
          update: {
            status: UserApplicationAccessStatus.ACTIVE,
            isDefault: grant.isDefault,
          },
          create: {
            userId,
            applicationId: this.applicationIdOrThrow(
              applicationIdByCode,
              grant.code,
            ),
            status: UserApplicationAccessStatus.ACTIVE,
            isDefault: grant.isDefault,
          },
        }),
      ),
    );

    await Promise.all(
      grants.flatMap((grant) =>
        grant.roles.map((roleCode) =>
          this.prisma.userApplicationRole.upsert({
            where: {
              userId_applicationId_roleCode: {
                userId,
                applicationId: this.applicationIdOrThrow(
                  applicationIdByCode,
                  grant.code,
                ),
                roleCode,
              },
            },
            update: {
              status: UserApplicationRoleStatus.ACTIVE,
            },
            create: {
              userId,
              applicationId: this.applicationIdOrThrow(
                applicationIdByCode,
                grant.code,
              ),
              roleCode,
              status: UserApplicationRoleStatus.ACTIVE,
            },
          }),
        ),
      ),
    );
  }

  private async syncLegacyRoleGrants(userId: string) {
    const existingAccessCount = await this.prisma.userApplicationAccess.count({
      where: { userId },
    });

    if (existingAccessCount > 0) {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { roles: true },
    });

    if (!user) {
      return;
    }

    if (user.roles.includes(Role.ADMIN)) {
      await this.grantAdminDefaultApps(userId);
      return;
    }

    if (user.roles.some((role) => LEGACY_SUPPORT_ROLES.has(role))) {
      await this.ensureCatalogSeeded();
      const grants: Array<{
        code: string;
        isDefault: boolean;
        roles: ApplicationRoleCode[];
      }> = [
        {
          code: 'JORNADA',
          isDefault: true,
          roles: ['MEMBER'],
        },
        {
          code: 'TICKETS',
          isDefault: false,
          roles: ['AGENT'],
        },
      ];

      if (user.roles.includes(Role.TI)) {
        grants.push({
          code: 'QUICK_FORMS',
          isDefault: false,
          roles: ['PUBLISHER'],
        });
      }

      await this.grantApplications(userId, grants);
      return;
    }

    await this.grantEmployeeDefaultApps(userId);
  }

  private applicationIdOrThrow(
    applicationIdByCode: Map<string, string>,
    code: string,
  ) {
    const applicationId = applicationIdByCode.get(code);

    if (applicationId) {
      return applicationId;
    }

    throw new InternalServerErrorException(
      `Aplicacao obrigatoria nao encontrada no catalogo: ${code}`,
    );
  }
}
