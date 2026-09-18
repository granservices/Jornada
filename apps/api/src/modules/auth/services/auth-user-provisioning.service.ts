import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  AccessChangeReason,
  type ApplicationRoleCode,
  AuditAction,
  Role,
  UserApplicationAccessStatus,
  UserApplicationRoleStatus,
  UserStatus,
} from '@prisma/client';
import { AuditService } from '../../../common/audit/audit.service';
import type { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { DomainEventOutboxService } from '../../../common/events/domain-event-outbox.service';
import { PrismaService } from '../../../database/prisma.service';
import { areValidApplicationRoles } from '../application-role-catalog';
import { CreateAdministrativeInvitationDto } from '../dto/create-administrative-invitation.dto';
import { AuthTokenService } from './auth-token.service';
import { PasswordHasherService } from './password-hasher.service';

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthUserProvisioningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly eventOutbox: DomainEventOutboxService,
    private readonly authToken: AuthTokenService,
    private readonly passwordHasher: PasswordHasherService,
  ) {}

  async invite(actor: AuthenticatedUser, dto: CreateAdministrativeInvitationDto) {
    this.assertAdmin(actor);

    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    const employeeId = this.normalizeEmployeeId(dto.employeeId);
    const grants = this.normalizeGrants(dto.applications);
    await this.assertIdentityAvailable(email, employeeId);
    const applications = await this.resolveApplications(grants.map((grant) => grant.code));
    const applicationIdByCode = new Map(applications.map((application) => [application.code, application.id]));
    const rawToken = this.authToken.generateOpaqueToken();
    const tokenHash = this.authToken.hashOpaqueToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    const invitation = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash: null,
          status: UserStatus.PENDING,
          roles: [],
          person: {
            create: {
              fullName,
              employee: employeeId
                ? { create: { employeeNumber: employeeId, externalEmployeeId: employeeId } }
                : undefined,
            },
          },
        },
        select: { id: true },
      });

      await Promise.all(
        grants.map((grant) =>
          tx.userApplicationAccess.create({
            data: {
              userId: user.id,
              applicationId: this.applicationIdOrThrow(applicationIdByCode, grant.code),
              status: UserApplicationAccessStatus.ACTIVE,
              isDefault: grant.isDefault,
            },
          }),
        ),
      );

      await Promise.all(
        grants.flatMap((grant) =>
          grant.roles.map((roleCode) =>
            tx.userApplicationRole.create({
              data: {
                userId: user.id,
                applicationId: this.applicationIdOrThrow(applicationIdByCode, grant.code),
                roleCode: roleCode as ApplicationRoleCode,
                status: UserApplicationRoleStatus.ACTIVE,
              },
            }),
          ),
        ),
      );

      const createdInvitation = await tx.administrativeInvitation.create({
        data: {
          userId: user.id,
          createdByUserId: actor.id,
          tokenHash,
          expiresAt,
          reason: dto.reason as AccessChangeReason,
          reasonComment: this.normalizeComment(dto.reasonComment),
        },
      });

      await this.audit.recordWith(tx, {
        actorUserId: actor.id,
        action: AuditAction.CREATE,
        entityType: 'AdministrativeInvitation',
        entityId: createdInvitation.id,
        entityLabel: email,
        after: {
          userId: user.id,
          email,
          status: UserStatus.PENDING,
          applications: grants,
          expiresAt,
        },
        metadata: { reason: dto.reason },
      });
      await this.eventOutbox.recordWith(tx, {
        idempotencyKey: `administrative-invitation:${createdInvitation.id}:created`,
        eventType: 'auth.administrative-invitation.created',
        aggregateType: 'AdministrativeInvitation',
        aggregateId: createdInvitation.id,
        payload: { invitationId: createdInvitation.id, userId: user.id, email },
      });

      return { id: createdInvitation.id, userId: user.id, expiresAt: createdInvitation.expiresAt };
    });

    return {
      item: {
        invitationId: invitation.id,
        userId: invitation.userId,
        email,
        status: UserStatus.PENDING,
        deliveryStatus: 'QUEUED',
        expiresAt: invitation.expiresAt.toISOString(),
      },
    };
  }

  async acceptInvitation(input: { token: string; password: string }) {
    const tokenHash = this.authToken.hashOpaqueToken(input.token);
    const invitation = await this.prisma.administrativeInvitation.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: { id: true, email: true, status: true },
        },
      },
    });

    if (
      !invitation ||
      invitation.consumedAt ||
      invitation.invalidatedAt ||
      invitation.expiresAt <= new Date() ||
      invitation.user.status !== UserStatus.PENDING
    ) {
      throw new BadRequestException('Convite invalido ou expirado.');
    }

    const now = new Date();
    const passwordHash = await this.passwordHasher.hash(input.password);

    await this.prisma.$transaction(async (tx) => {
      const consumed = await tx.administrativeInvitation.updateMany({
        where: {
          id: invitation.id,
          consumedAt: null,
          invalidatedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });

      if (consumed.count !== 1) {
        throw new BadRequestException('Convite invalido ou expirado.');
      }

      await tx.user.update({
        where: { id: invitation.userId },
        data: {
          status: UserStatus.ACTIVE,
          passwordHash,
          emailVerifiedAt: now,
        },
      });
      await tx.authSession.updateMany({
        where: { userId: invitation.userId, revokedAt: null },
        data: { revokedAt: now, revokedReason: 'invitation-accepted' },
      });
      await this.audit.recordWith(tx, {
        action: AuditAction.UPDATE,
        entityType: 'AdministrativeInvitation',
        entityId: invitation.id,
        entityLabel: invitation.user.email,
        before: { status: UserStatus.PENDING },
        after: { status: UserStatus.ACTIVE, userId: invitation.userId },
      });
      await this.eventOutbox.recordWith(tx, {
        idempotencyKey: `administrative-invitation:${invitation.id}:accepted`,
        eventType: 'auth.administrative-invitation.accepted',
        aggregateType: 'AdministrativeInvitation',
        aggregateId: invitation.id,
        payload: { invitationId: invitation.id, userId: invitation.userId },
      });
    });

    return { userId: invitation.userId };
  }

  async changeAccountStatus(
    actor: AuthenticatedUser,
    userId: string,
    input: {
      status: 'ACTIVE' | 'BLOCKED' | 'DISABLED';
      reason: AccessChangeReason;
      reasonComment?: string;
    },
  ) {
    this.assertAdmin(actor);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, status: true, roles: true },
    });

    if (!user) {
      throw new BadRequestException('Usuario nao encontrado.');
    }

    if (user.status === UserStatus.PENDING) {
      throw new BadRequestException('Use o reenvio ou a invalidacao do convite para uma conta pendente.');
    }

    if (
      user.roles.includes(Role.ADMIN) &&
      input.status !== 'ACTIVE' &&
      (await this.prisma.user.count({
        where: { status: UserStatus.ACTIVE, roles: { has: Role.ADMIN } },
      })) <= 1
    ) {
      throw new BadRequestException('Nao e permitido desativar o ultimo administrador global ativo.');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { status: input.status as UserStatus },
      });

      if (input.status === UserStatus.BLOCKED || input.status === UserStatus.DISABLED) {
        await tx.authSession.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: {
            revokedAt: now,
            revokedReason: input.status === UserStatus.BLOCKED ? 'account-blocked' : 'account-disabled',
          },
        });
      }

      await this.audit.recordWith(tx, {
        actorUserId: actor.id,
        action: AuditAction.UPDATE,
        entityType: 'UserAccount',
        entityId: user.id,
        entityLabel: user.email,
        before: { status: user.status },
        after: { status: input.status },
        metadata: {
          reason: input.reason,
          reasonComment: this.normalizeComment(input.reasonComment),
        },
      });
      await this.eventOutbox.recordWith(tx, {
        idempotencyKey: `user-account:${user.id}:status:${input.status}:${now.getTime()}`,
        eventType: 'auth.user-account.status-changed',
        aggregateType: 'UserAccount',
        aggregateId: user.id,
        payload: { userId: user.id, status: input.status },
      });
    });

    return { item: { id: user.id, status: input.status } };
  }

  async revokeSessions(
    actor: AuthenticatedUser,
    userId: string,
    input: { reason: AccessChangeReason; reasonComment?: string },
  ) {
    this.assertAdmin(actor);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new BadRequestException('Usuario nao encontrado.');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.authSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: now, revokedReason: 'administrative-session-revocation' },
      });
      await this.audit.recordWith(tx, {
        actorUserId: actor.id,
        action: AuditAction.UPDATE,
        entityType: 'AuthSession',
        entityId: user.id,
        entityLabel: user.email,
        metadata: {
          reason: input.reason,
          reasonComment: this.normalizeComment(input.reasonComment),
        },
      });
      await this.eventOutbox.recordWith(tx, {
        idempotencyKey: `user-account:${user.id}:sessions-revoked:${now.getTime()}`,
        eventType: 'auth.user-account.sessions-revoked',
        aggregateType: 'UserAccount',
        aggregateId: user.id,
        payload: { userId: user.id },
      });
    });

    return { item: { id: user.id, sessionsRevoked: true } };
  }

  async resendInvitation(
    actor: AuthenticatedUser,
    userId: string,
    input: { reason: AccessChangeReason; reasonComment?: string },
  ) {
    this.assertAdmin(actor);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, status: true },
    });

    if (!user || user.status !== UserStatus.PENDING) {
      throw new BadRequestException('Somente contas pendentes podem receber novo convite.');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + INVITATION_TTL_MS);
    const tokenHash = this.authToken.hashOpaqueToken(this.authToken.generateOpaqueToken());
    const invitation = await this.prisma.$transaction(async (tx) => {
      await tx.administrativeInvitation.updateMany({
        where: {
          userId: user.id,
          consumedAt: null,
          invalidatedAt: null,
          expiresAt: { gt: now },
        },
        data: { invalidatedAt: now },
      });
      const created = await tx.administrativeInvitation.create({
        data: {
          userId: user.id,
          createdByUserId: actor.id,
          tokenHash,
          expiresAt,
          reason: input.reason,
          reasonComment: this.normalizeComment(input.reasonComment),
        },
      });
      await this.audit.recordWith(tx, {
        actorUserId: actor.id,
        action: AuditAction.UPDATE,
        entityType: 'AdministrativeInvitation',
        entityId: created.id,
        entityLabel: user.email,
        metadata: { reason: input.reason, resent: true },
      });
      await this.eventOutbox.recordWith(tx, {
        idempotencyKey: `administrative-invitation:${created.id}:created`,
        eventType: 'auth.administrative-invitation.created',
        aggregateType: 'AdministrativeInvitation',
        aggregateId: created.id,
        payload: { invitationId: created.id, userId: user.id, email: user.email },
      });
      return created;
    });

    return {
      item: {
        invitationId: invitation.id,
        userId: user.id,
        email: user.email,
        status: UserStatus.PENDING,
        deliveryStatus: 'QUEUED',
        expiresAt: invitation.expiresAt.toISOString(),
      },
    };
  }

  private assertAdmin(actor: AuthenticatedUser) {
    if (!actor.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('Somente administradores globais podem convidar usuarios.');
    }
  }

  private async assertIdentityAvailable(email: string, employeeId: string | null) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(employeeId
            ? [{ person: { employee: { is: { employeeNumber: employeeId } } } }]
            : []),
        ],
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException('Ja existe uma conta com este identificador.');
    }
  }

  private async resolveApplications(codes: string[]) {
    const applications = await this.prisma.application.findMany({
      where: { code: { in: codes } },
      select: { id: true, code: true },
    });

    if (applications.length !== codes.length) {
      throw new BadRequestException('Uma ou mais aplicacoes informadas nao existem.');
    }

    return applications;
  }

  private normalizeGrants(grants: CreateAdministrativeInvitationDto['applications']) {
    if (new Set(grants.map((grant) => grant.code.trim())).size !== grants.length) {
      throw new BadRequestException('Cada aplicacao pode ser informada apenas uma vez.');
    }

    const normalized = grants.map((grant) => ({
      code: grant.code.trim(),
      roles: grant.roles.map((role) => role.trim()),
      isDefault: Boolean(grant.isDefault),
    }));

    if (normalized.filter((grant) => grant.isDefault).length > 1) {
      throw new BadRequestException('Informe no maximo uma aplicacao padrao.');
    }

    if (!normalized.every((grant) => areValidApplicationRoles(grant.code, grant.roles))) {
      throw new BadRequestException('Os papeis informados nao pertencem a aplicacao selecionada.');
    }

    return normalized;
  }

  private normalizeEmployeeId(employeeId?: string) {
    const normalized = employeeId?.trim().replace(/\s+/g, '');
    return normalized || null;
  }

  private normalizeComment(comment?: string) {
    const normalized = comment?.trim();
    return normalized || null;
  }

  private applicationIdOrThrow(applicationIdByCode: Map<string, string>, code: string) {
    const applicationId = applicationIdByCode.get(code);
    if (!applicationId) {
      throw new BadRequestException('Aplicacao nao encontrada.');
    }
    return applicationId;
  }
}
