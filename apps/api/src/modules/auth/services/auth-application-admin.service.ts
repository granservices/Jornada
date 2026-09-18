import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ApplicationEntryKind,
  ApplicationStatus,
  AuditAction,
  Prisma,
  Role,
  UserApplicationAccessStatus,
  UserApplicationRoleStatus,
  UserStatus,
} from '@prisma/client';
import { AuditService } from '../../../common/audit/audit.service';
import type { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { PrismaService } from '../../../database/prisma.service';
import { ListUserApplicationAccessDto } from '../dto/list-user-application-access.dto';
import { CreateManagedApplicationDto } from '../dto/create-managed-application.dto';
import { UpdateUserApplicationAccessDto } from '../dto/update-user-application-access.dto';
import { UpdateManagedApplicationDto } from '../dto/update-managed-application.dto';
import { areValidApplicationRoles } from '../application-role-catalog';

const NATIVE_APPLICATION_ENTRY_PATHS = {
  JORNADA: '/inbox',
  HELP_HUB: '/atendimentos',
  QUICK_FORMS: '/formularios',
} as const;

@Injectable()
export class AuthApplicationAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listApplications(actor: AuthenticatedUser) {
    this.assertCentralAuthAdmin(actor);

    const applications = await this.prisma.application.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        entryKind: true,
        entryPath: true,
        imageUrl: true,
        status: true,
        sortOrder: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      items: applications.map((application) => ({
        ...application,
        createdAt: application.createdAt.toISOString(),
        updatedAt: application.updatedAt.toISOString(),
      })),
    };
  }

  async createApplication(
    actor: AuthenticatedUser,
    dto: CreateManagedApplicationDto,
  ) {
    this.assertCentralAuthAdmin(actor);

    const data = this.toApplicationData({
      ...dto,
      code: dto.code,
    });

    try {
      const application = await this.prisma.application.create({
        data: {
          code: dto.code.trim(),
          ...data,
        },
      });

      await this.audit.record({
        actorUserId: actor.id,
        action: AuditAction.CREATE,
        entityType: 'Application',
        entityId: application.id,
        entityLabel: application.name,
        after: this.toApplicationSnapshot(application),
        metadata: { applicationCode: application.code },
      });

      return { item: this.toManagedApplication(application) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Ja existe uma aplicacao com este codigo.');
      }

      throw error;
    }
  }

  async updateApplication(
    actor: AuthenticatedUser,
    applicationCode: string,
    dto: UpdateManagedApplicationDto,
  ) {
    this.assertCentralAuthAdmin(actor);

    const existing = await this.prisma.application.findUnique({
      where: { code: applicationCode },
    });

    if (!existing) {
      throw new NotFoundException('Aplicacao nao encontrada.');
    }

    const data = this.toApplicationData({
      ...existing,
      ...dto,
      entryKind: dto.entryKind ?? existing.entryKind,
      entryPath: dto.entryPath ?? existing.entryPath,
      imageUrl: Object.hasOwn(dto, 'imageUrl') ? dto.imageUrl : existing.imageUrl,
      status: dto.status ?? existing.status,
      sortOrder: dto.sortOrder ?? existing.sortOrder,
      name: dto.name ?? existing.name,
      description: dto.description ?? existing.description ?? undefined,
    });

    const application = await this.prisma.application.update({
      where: { id: existing.id },
      data,
    });

    await this.audit.record({
      actorUserId: actor.id,
      action: AuditAction.UPDATE,
      entityType: 'Application',
      entityId: application.id,
      entityLabel: application.name,
      before: this.toApplicationSnapshot(existing),
      after: this.toApplicationSnapshot(application),
      metadata: { applicationCode: application.code },
    });

    return { item: this.toManagedApplication(application) };
  }

  async listUserAccesses(
    actor: AuthenticatedUser,
    query: ListUserApplicationAccessDto,
  ) {
    this.assertCentralAuthAdmin(actor);

    const q = query.q?.trim();
    const limit = query.limit ?? 50;
    const users = await this.prisma.user.findMany({
      where: {
        OR: q
          ? [
              { email: { contains: q, mode: 'insensitive' } },
              { person: { fullName: { contains: q, mode: 'insensitive' } } },
              {
                person: {
                  employee: {
                    is: {
                      employeeNumber: { contains: q, mode: 'insensitive' },
                    },
                  },
                },
              },
            ]
          : undefined,
      },
      orderBy: [
        { person: { fullName: 'asc' } },
        { email: 'asc' },
      ],
      take: limit,
      select: {
        id: true,
        email: true,
        status: true,
        roles: true,
        createdAt: true,
        updatedAt: true,
        person: {
          select: {
            fullName: true,
            employee: {
              select: {
                employeeNumber: true,
              },
            },
          },
        },
        applicationAccesses: {
          where: {
            status: UserApplicationAccessStatus.ACTIVE,
          },
          orderBy: [
            { isDefault: 'desc' },
            { application: { sortOrder: 'asc' } },
            { application: { name: 'asc' } },
          ],
          select: {
            isDefault: true,
            application: {
              select: {
                id: true,
                code: true,
                name: true,
                description: true,
                entryPath: true,
                status: true,
              },
            },
          },
        },
        applicationRoles: {
          where: {
            status: UserApplicationRoleStatus.ACTIVE,
          },
          select: {
            roleCode: true,
            applicationId: true,
          },
        },
      },
    });

    return {
      items: users.map((user) => {
        const roleCodesByApplicationId = new Map<string, string[]>();

        user.applicationRoles.forEach((role) => {
          const current = roleCodesByApplicationId.get(role.applicationId) ?? [];
          current.push(role.roleCode);
          roleCodesByApplicationId.set(role.applicationId, current);
        });

        return {
          id: user.id,
          email: user.email,
          status: user.status,
          globalRoles: user.roles,
          fullName: user.person.fullName,
          employeeId: user.person.employee?.employeeNumber ?? null,
          createdAt: user.createdAt.toISOString(),
          updatedAt: user.updatedAt.toISOString(),
          applications: user.applicationAccesses.map((access) => ({
            id: access.application.id,
            code: access.application.code,
            name: access.application.name,
            description: access.application.description,
            entryPath: access.application.entryPath,
            status: access.application.status,
            isDefault: access.isDefault,
            roles:
              roleCodesByApplicationId.get(access.application.id)?.sort() ?? [],
          })),
        };
      }),
    };
  }

  async setUserApplicationAccess(
    actor: AuthenticatedUser,
    userId: string,
    applicationCode: string,
    dto: UpdateUserApplicationAccessDto,
  ) {
    this.assertCentralAuthAdmin(actor);
    this.assertPayloadConsistency(applicationCode, dto);

    const [user, application] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          status: true,
          roles: true,
          person: {
            select: {
              fullName: true,
              employee: {
                select: {
                  employeeNumber: true,
                },
              },
            },
          },
          applicationAccesses: {
            select: {
              applicationId: true,
              status: true,
              isDefault: true,
              application: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
          },
          applicationRoles: {
            select: {
              applicationId: true,
              roleCode: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.application.findUnique({
        where: { code: applicationCode },
        select: {
          id: true,
          code: true,
          name: true,
          status: true,
        },
      }),
    ]);

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('Usuario nao encontrado ou inativo.');
    }

    if (!application) {
      throw new NotFoundException('Aplicacao nao encontrada.');
    }

    if (application.status !== 'ACTIVE' && dto.enabled) {
      throw new BadRequestException('Nao e possivel conceder acesso a aplicacao inativa.');
    }

    const before = this.toUserAccessSnapshot(user);

    await this.prisma.$transaction(async (tx) => {
      if (!dto.enabled) {
        await tx.userApplicationAccess.updateMany({
          where: {
            userId,
            applicationId: application.id,
          },
          data: {
            status: UserApplicationAccessStatus.REVOKED,
            isDefault: false,
          },
        });

        await tx.userApplicationRole.updateMany({
          where: {
            userId,
            applicationId: application.id,
          },
          data: {
            status: UserApplicationRoleStatus.REVOKED,
          },
        });

        return;
      }

      if (dto.isDefault) {
        await tx.userApplicationAccess.updateMany({
          where: {
            userId,
            applicationId: { not: application.id },
            status: UserApplicationAccessStatus.ACTIVE,
          },
          data: {
            isDefault: false,
          },
        });
      }

      await tx.userApplicationAccess.upsert({
        where: {
          userId_applicationId: {
            userId,
            applicationId: application.id,
          },
        },
        update: {
          status: UserApplicationAccessStatus.ACTIVE,
          isDefault: dto.isDefault ?? false,
        },
        create: {
          userId,
          applicationId: application.id,
          status: UserApplicationAccessStatus.ACTIVE,
          isDefault: dto.isDefault ?? false,
        },
      });

      await tx.userApplicationRole.updateMany({
        where: {
          userId,
          applicationId: application.id,
          roleCode: {
            notIn: dto.roles,
          },
        },
        data: {
          status: UserApplicationRoleStatus.REVOKED,
        },
      });

      await Promise.all(
        dto.roles.map((roleCode) =>
          tx.userApplicationRole.upsert({
            where: {
              userId_applicationId_roleCode: {
                userId,
                applicationId: application.id,
                roleCode,
              },
            },
            update: {
              status: UserApplicationRoleStatus.ACTIVE,
            },
            create: {
              userId,
              applicationId: application.id,
              roleCode,
              status: UserApplicationRoleStatus.ACTIVE,
            },
          }),
        ),
      );
    });

    const updatedUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        status: true,
        roles: true,
        person: {
          select: {
            fullName: true,
            employee: {
              select: {
                employeeNumber: true,
              },
            },
          },
        },
        applicationAccesses: {
          where: {
            status: UserApplicationAccessStatus.ACTIVE,
          },
          orderBy: [
            { isDefault: 'desc' },
            { application: { sortOrder: 'asc' } },
            { application: { name: 'asc' } },
          ],
          select: {
            applicationId: true,
            isDefault: true,
            application: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        applicationRoles: {
          where: {
            status: UserApplicationRoleStatus.ACTIVE,
          },
          select: {
            applicationId: true,
            roleCode: true,
          },
        },
      },
    });

    await this.audit.record({
      actorUserId: actor.id,
      action: dto.enabled ? AuditAction.UPDATE : AuditAction.SOFT_DELETE,
      entityType: 'UserApplicationAccess',
      entityId: `${userId}:${application.code}`,
      entityLabel: `${user.person.fullName} -> ${application.name}`,
      before,
      after: updatedUser ? this.toUserAccessSnapshot(updatedUser) : null,
      metadata: {
        applicationCode: application.code,
        enabled: dto.enabled,
      },
    });

    if (!updatedUser) {
      throw new NotFoundException('Usuario nao encontrado apos atualizacao.');
    }

    return {
      item: this.toManagedUserAccess(updatedUser),
    };
  }

  private assertCentralAuthAdmin(actor: AuthenticatedUser) {
    if (actor.roles.includes(Role.ADMIN)) {
      return;
    }

    throw new ForbiddenException(
      'Somente administradores globais podem gerenciar acesso por aplicacao.',
    );
  }

  private toApplicationData(input: {
    code: string;
    name: string;
    description?: string | null;
    entryKind: ApplicationEntryKind;
    entryPath: string;
    imageUrl?: string | null;
    sortOrder?: number;
    status?: ApplicationStatus;
  }) {
    const entryPath = input.entryPath.trim();
    const imageUrl = this.normalizeImageUrl(input.imageUrl);

    this.assertEntryPath(input.code, input.entryKind, entryPath);

    return {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      entryKind: input.entryKind,
      entryPath,
      imageUrl,
      sortOrder: input.sortOrder ?? 0,
      status: input.status ?? ApplicationStatus.ACTIVE,
    };
  }

  private assertEntryPath(
    code: string,
    entryKind: ApplicationEntryKind,
    entryPath: string,
  ) {
    if (
      entryKind === ApplicationEntryKind.NATIVE &&
      NATIVE_APPLICATION_ENTRY_PATHS[
        code as keyof typeof NATIVE_APPLICATION_ENTRY_PATHS
      ] === entryPath
    ) {
      return;
    }

    if (entryKind === ApplicationEntryKind.REDIRECT && this.isHttpUrl(entryPath)) {
      return;
    }

    throw new BadRequestException(
      entryKind === ApplicationEntryKind.NATIVE
        ? 'Uma aplicacao nativa deve usar um codigo e rota registrados no Neo.'
        : 'Um redirecionamento deve usar uma URL HTTP ou HTTPS valida.',
    );
  }

  private normalizeImageUrl(imageUrl?: string | null) {
    const value = imageUrl?.trim();

    if (!value) {
      return null;
    }

    if ((value.startsWith('/') && !value.startsWith('//')) || this.isHttpUrl(value)) {
      return value;
    }

    throw new BadRequestException(
      'A imagem deve usar uma URL HTTP(S) valida ou um caminho local iniciado por /.',
    );
  }

  private isHttpUrl(value: string) {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private toManagedApplication(application: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    entryKind: ApplicationEntryKind;
    entryPath: string;
    imageUrl: string | null;
    sortOrder: number;
    status: ApplicationStatus;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...application,
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
    };
  }

  private toApplicationSnapshot(application: {
    id: string;
    code: string;
    name: string;
    description: string | null;
    entryKind: ApplicationEntryKind;
    entryPath: string;
    imageUrl: string | null;
    sortOrder: number;
    status: ApplicationStatus;
  }) {
    return {
      id: application.id,
      code: application.code,
      name: application.name,
      description: application.description,
      entryKind: application.entryKind,
      entryPath: application.entryPath,
      imageUrl: application.imageUrl,
      sortOrder: application.sortOrder,
      status: application.status,
    };
  }

  private assertPayloadConsistency(
    applicationCode: string,
    dto: UpdateUserApplicationAccessDto,
  ) {
    if (!dto.enabled && dto.roles.length > 0) {
      throw new BadRequestException(
        'Nao informe papeis quando o acesso estiver desabilitado.',
      );
    }

    if (dto.enabled && dto.roles.length === 0) {
      throw new BadRequestException(
        'Informe ao menos um papel para acesso habilitado.',
      );
    }

    if (dto.enabled && !areValidApplicationRoles(applicationCode, dto.roles)) {
      throw new BadRequestException(
        'Os papeis informados nao pertencem a aplicacao selecionada.',
      );
    }
  }

  private toUserAccessSnapshot(user: {
    id: string;
    email: string;
    roles: Role[];
    person: {
      fullName: string;
      employee?: { employeeNumber: string | null } | null;
    };
    applicationAccesses: Array<{
      applicationId: string;
      status?: UserApplicationAccessStatus;
      isDefault: boolean;
      application: {
        id: string;
        code: string;
        name: string;
      };
    }>;
    applicationRoles: Array<{
      applicationId: string;
      roleCode: string;
      status?: UserApplicationRoleStatus;
    }>;
  }) {
    const rolesByApplicationId = new Map<string, string[]>();

    user.applicationRoles.forEach((role) => {
      const current = rolesByApplicationId.get(role.applicationId) ?? [];
      current.push(role.roleCode);
      rolesByApplicationId.set(role.applicationId, current);
    });

    return {
      userId: user.id,
      email: user.email,
      fullName: user.person.fullName,
      employeeId: user.person.employee?.employeeNumber ?? null,
      globalRoles: user.roles,
      applications: user.applicationAccesses.map((access) => ({
        code: access.application.code,
        name: access.application.name,
        isDefault: access.isDefault,
        status: access.status,
        roles: rolesByApplicationId.get(access.applicationId)?.sort() ?? [],
      })),
    };
  }

  private toManagedUserAccess(user: {
    id: string;
    email: string;
    status: UserStatus;
    roles: Role[];
    person: {
      fullName: string;
      employee: { employeeNumber: string | null } | null;
    };
    applicationAccesses: Array<{
      applicationId: string;
      isDefault: boolean;
      application: {
        id: string;
        code: string;
        name: string;
      };
    }>;
    applicationRoles: Array<{
      applicationId: string;
      roleCode: string;
    }>;
  }) {
    const rolesByApplicationId = new Map<string, string[]>();

    user.applicationRoles.forEach((role) => {
      const current = rolesByApplicationId.get(role.applicationId) ?? [];
      current.push(role.roleCode);
      rolesByApplicationId.set(role.applicationId, current);
    });

    return {
      id: user.id,
      email: user.email,
      status: user.status,
      globalRoles: user.roles,
      fullName: user.person.fullName,
      employeeId: user.person.employee?.employeeNumber ?? null,
      applications: user.applicationAccesses.map((access) => ({
        id: access.application.id,
        code: access.application.code,
        name: access.application.name,
        isDefault: access.isDefault,
        roles: rolesByApplicationId.get(access.applicationId)?.sort() ?? [],
      })),
    };
  }
}
