import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import {
  AuditAction,
  ApprovalEventType,
  ApprovalRequestStatus,
  ApprovalStepStatus,
  ChatConversationKind,
  ChatConversationStatus,
  ChatMessageSenderType,
  ChatParticipantRole,
  ChatParticipantType,
  ChatSector,
  Prisma,
  Role,
  SupportCaseEventType,
  SupportCaseOpeningPolicy,
  SupportCaseOrigin,
  SupportCasePriority,
  SupportCaseStatus,
  SupportCatalogStatus,
  SupportFormFieldType,
  SupportResponsibilityOwnerType,
  SupportTeam,
  SupportTriageSuggestionSource,
  UserStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { AuditService } from '../../common/audit/audit.service';
import { DomainEventOutboxService } from '../../common/events/domain-event-outbox.service';
import { PrismaService } from '../../database/prisma.service';
import { DrakeSchedulePreviewReferenceService } from '../boarding-schedule/services/drake-schedule-preview-reference.service';
import { AddSupportCaseMessageDto } from './dto/add-support-case-message.dto';
import { CreateSupportCaseDto } from './dto/create-support-case.dto';
import { ListSupportCasesDto } from './dto/list-support-cases.dto';
import { RateSupportCaseDto } from './dto/rate-support-case.dto';
import { ReopenSupportCaseDto } from './dto/reopen-support-case.dto';
import { SuggestSupportTriageDto } from './dto/suggest-support-triage.dto';
import {
  SupportResolutionReason,
  SupportTransferReason,
} from './dto/support-case-change-reason';
import {
  DecideApprovalDto,
  RequestManualApprovalDto,
  UpsertApprovalRuleDto,
} from './dto/support-approval.dto';
import { UpdateSupportCaseDto } from './dto/update-support-case.dto';
import {
  UpsertSupportDepartmentDto,
  UpsertSupportRoutingRuleDto,
  UpsertSupportTeamDto,
  UpsertSupportTeamMemberDto,
  UpsertSupportTopicDto,
  UpsertSupportTopicFormDto,
} from './dto/upsert-support-catalog.dto';
import { SupportCaseCodeFactory } from './factories/support-case-code.factory';
import { SupportTextPolicyService } from './services/support-text-policy.service';
import { SupportSlaPolicyService } from './services/support-sla-policy.service';

const SUPPORT_ROLES = new Set<Role>([
  Role.ADMIN,
  Role.SUPPORT,
  Role.TI,
  Role.MEDICINE,
  Role.OPERATIONS,
]);
const UNRESTRICTED_SUPPORT_ROLES = new Set<Role>([Role.ADMIN, Role.SUPPORT]);
const TEAM_ROLE_CODES: Partial<Record<Role, string>> = {
  [Role.TI]: 'TI',
  [Role.MEDICINE]: 'MEDICINE',
  [Role.OPERATIONS]: 'OPERATIONS',
};
const ACTIVE_SUPPORT_CASE_STATUSES = [
  SupportCaseStatus.NEW,
  SupportCaseStatus.OPEN,
  SupportCaseStatus.WAITING_REQUESTER,
  SupportCaseStatus.WAITING_INTERNAL,
];
const CASE_REOPEN_WINDOW_DAYS = 7;
const LOCAL_TRIAGE_RULES = [
  {
    departmentCode: 'PAYROLL',
    topicCode: 'PAYSLIP',
    keywords: ['contracheque', 'holerite', 'salario', 'pagamento'],
  },
  {
    departmentCode: 'MEDICINE',
    topicCode: 'ASO',
    keywords: ['aso', 'exame ocupacional', 'exame medico'],
  },
  {
    departmentCode: 'MEDICINE',
    topicCode: 'MEDICAL_CERTIFICATE',
    keywords: ['atestado', 'afastamento'],
  },
  {
    departmentCode: 'HR',
    topicCode: 'VACATION',
    keywords: ['ferias', 'férias', 'descanso'],
  },
  {
    departmentCode: 'TI',
    topicCode: 'ACCESS',
    keywords: ['senha', 'acesso', 'login', 'sistema'],
  },
  {
    departmentCode: 'LOGISTICS',
    topicCode: 'BOARDING',
    keywords: ['embarque', 'desembarque', 'passagem', 'deslocamento'],
  },
];

type SupportCaseWithRelations = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: SupportCaseStatus;
  priority: SupportCasePriority;
  requesterUserId: string;
  departmentId: string | null;
  topicId: string | null;
  openingPolicy?: SupportCaseOpeningPolicy;
  businessKeyFieldCode?: string | null;
  topicFormId: string | null;
  businessKey: string | null;
  currentSector: ChatSector | null;
  currentTeamId: string | null;
  assignedUserId: string | null;
  originConversationId: string | null;
  dueAt: Date | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  currentTeam: SupportTeam | null;
  department: {
    id: string;
    code: string;
    name: string;
  } | null;
  topic: {
    id: string;
    code: string;
    name: string;
  } | null;
  topicForm?: {
    id: string;
    version: number;
    title: string;
    fields: Array<{
      id: string;
      code: string;
      label: string;
      fieldType: string;
      required: boolean;
      sensitive: boolean;
      helpText: string | null;
      options: Prisma.JsonValue | null;
      visibleWhen: Prisma.JsonValue | null;
      requiredWhen: Prisma.JsonValue | null;
      sortOrder: number;
    }>;
  } | null;
  fieldValues?: Array<{
    id: string;
    value: Prisma.JsonValue;
    sensitive: boolean;
    field: {
      id: string;
      code: string;
      label: string;
      fieldType: string;
    };
  }>;
  requester: {
    id: string;
    email: string;
    person: { fullName: string };
  };
  assignedUser: {
    id: string;
    email: string;
    person: { fullName: string };
  } | null;
  rating: {
    score: number;
    comment: string | null;
    createdAt: Date;
  } | null;
  events?: Array<{
    id: string;
    eventType: SupportCaseEventType;
    fromValue: string | null;
    toValue: string | null;
    createdAt: Date;
    authorUser: {
      id: string;
      email: string;
      person: { fullName: string };
    } | null;
  }>;
  originConversation?: {
    messages: Array<{
      id: string;
      body: string;
      senderName: string;
      senderUserId: string | null;
      createdAt: Date;
    }>;
  } | null;
};

type NormalizedSupportFieldValue = {
  fieldId: string;
  fieldCode: string;
  value: string;
  sensitive: boolean;
};

type RoutingRuleWithTeam = {
  conditions: Prisma.JsonValue | null;
  team: SupportTeam;
};

type RoutingCondition = {
  fieldCode: string;
  operator?: 'equals' | 'notEquals' | 'in' | 'contains' | 'exists';
  value?: unknown;
  values?: unknown[];
};

type RoutingConditions = {
  all?: RoutingCondition[];
  any?: RoutingCondition[];
};

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supportCaseCodeFactory: SupportCaseCodeFactory,
    private readonly supportTextPolicy: SupportTextPolicyService,
    private readonly audit: AuditService,
    private readonly eventOutbox: DomainEventOutboxService,
    private readonly slaPolicy: SupportSlaPolicyService,
    private readonly previewReferences: DrakeSchedulePreviewReferenceService,
  ) {}

  async listCases(user: AuthenticatedUser, query: ListSupportCasesDto) {
    const validationRequester = await this.resolveValidationRequester(
      user,
      query.previewReference,
    );
    const requesterUser = validationRequester ?? user;
    const limit = query.limit ?? 20;
    const supportUser = !validationRequester && this.isSupportUser(user);
    const effectiveQueue = supportUser ? this.normalizeSupportQueue(query.queue) : undefined;
    const allowedTeamCodes = this.allowedTeamCodes(user);
    const team = query.teamCode
      ? await this.findActiveTeamOrThrow(query.teamCode)
      : null;
    if (supportUser) {
      this.assertTeamFilterAccess(user, team?.code ?? null);
    }
    const q = query.q?.trim();
    const stateStatuses = this.statusesFromState(query.state);
    const queueFilter = supportUser
      ? this.whereForQueueView(effectiveQueue, user.id)
      : undefined;
    const ownershipFilter = supportUser
      ? this.whereForRestrictedSupportVisibility(user)
      : undefined;
    const supportVisibilityFilters = [queueFilter, ownershipFilter].filter(
      (filter): filter is Prisma.SupportCaseWhereInput => Boolean(filter),
    );

    const cases = await this.prisma.supportCase.findMany({
      where: {
        requesterUserId:
          !supportUser || query.mine === 'true' ? requesterUser.id : undefined,
        status: query.status ?? (stateStatuses ? { in: stateStatuses } : undefined),
        currentTeamId: team?.id,
        currentTeam:
          supportUser && allowedTeamCodes
            ? { code: { in: allowedTeamCodes } }
            : undefined,
        AND:
          supportVisibilityFilters.length > 0
            ? supportVisibilityFilters
            : undefined,
        OR: q
          ? [
              { code: { contains: q, mode: 'insensitive' } },
              { title: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
      include: this.caseListInclude(),
    });

    return {
      items: cases.map((supportCase) => this.toCaseListItem(supportCase)),
    };
  }

  async getCase(
    user: AuthenticatedUser,
    supportCaseId: string,
    previewReference?: string,
  ) {
    const requesterUser = await this.resolveValidationRequester(
      user,
      previewReference,
    ) ?? user;
    const supportCase = await this.findCaseOrThrow(supportCaseId);
    this.assertCaseAccess(requesterUser, supportCase);

    return {
      item: this.toCaseDetail(supportCase, requesterUser.id),
    };
  }

  async createCase(user: AuthenticatedUser, dto: CreateSupportCaseDto) {
    const requesterUser = await this.resolveValidationRequester(
      user,
      dto.previewReference,
    ) ?? user;
    const route = await this.resolveCreateRoute(dto);
    const description = dto.description?.trim()
      ? this.supportTextPolicy.normalizeUserText(dto.description, 'Detalhe')
      : null;
    const fieldValues = this.normalizeFieldValues(
      route.form?.fields ?? [],
      dto.fieldValues ?? [],
    );
    const businessKey = this.resolveBusinessKey(route.topic, fieldValues);
    const title = this.generateCaseTitle(dto.title, route, fieldValues);
    const existingCase = route.department
      ? await this.findReusableRequesterCase(
          requesterUser.id,
          route.department.id,
          route.topic?.id ?? null,
          route.topic?.openingPolicy ?? SupportCaseOpeningPolicy.CONTINUOUS_CONVERSATION,
          businessKey,
        )
      : null;

    if (existingCase) {
      if (description) {
        await this.addMessage(user, existingCase.id, {
          body: description,
          previewReference: dto.previewReference,
        });
      }

      return this.getCase(user, existingCase.id, dto.previewReference);
    }

    const team = route.team ?? await this.findTeamForRoute(
      route.department.id,
      route.topic.id,
      fieldValues,
    );
    const legacySector = this.legacySectorFromTeamCode(team.code);
    const priority = dto.priority ?? route.topic?.defaultPriority ?? SupportCasePriority.NORMAL;
    const dueAt = await this.slaPolicy.calculateDueAt(priority, new Date());

    const created = await this.prisma.$transaction(async (tx) => {
      const conversation = await tx.chatConversation.create({
        data: {
          employeeUserId: requesterUser.id,
          sector: legacySector,
          primaryTeamId: team.id,
          kind: ChatConversationKind.SUPPORT,
          title,
          participants: {
            create: [
              {
                participantType: ChatParticipantType.USER,
                participantKey: this.userParticipantKey(requesterUser.id),
                userId: requesterUser.id,
                role: ChatParticipantRole.REQUESTER,
              },
              {
                participantType: ChatParticipantType.TEAM,
                participantKey: this.teamParticipantKey(team.id),
                teamId: team.id,
                sector: legacySector,
                role: ChatParticipantRole.AGENT,
              },
            ],
          },
        },
      });

      const code = this.supportCaseCodeFactory.create();
      const supportCase = await tx.supportCase.create({
        data: {
          code,
          departmentId: route.department?.id,
          topicId: route.topic?.id,
          topicFormId: route.form?.id,
          title,
          description,
          businessKey,
          priority,
          dueAt,
          origin: SupportCaseOrigin.CHAT,
          status: SupportCaseStatus.NEW,
          requesterUserId: requesterUser.id,
          currentTeamId: team.id,
          currentSector: legacySector,
          originConversationId: conversation.id,
          events: {
            create: {
              eventType: SupportCaseEventType.CREATED,
              authorUserId: requesterUser.id,
              toValue: team.code,
              metadata: {
                ...this.supportTextPolicy.optionalMetadata(),
                ...this.validationPreviewMetadata(user, dto.previewReference),
                teamName: team.name,
                departmentName: route.department?.name,
                topicName: route.topic?.name,
                source: 'employee_app',
                slaDueAt: dueAt.toISOString(),
              },
            },
          },
          fieldValues:
            fieldValues.length > 0
              ? {
                  create: fieldValues.map((fieldValue) => ({
                    fieldId: fieldValue.fieldId,
                    value: fieldValue.value,
                    sensitive: fieldValue.sensitive,
                  })),
                }
              : undefined,
        },
        include: this.caseListInclude(),
      });

      await this.eventOutbox.recordWith(tx, {
        idempotencyKey: `support.case.created:${supportCase.id}`,
        eventType: 'support.case.created',
        aggregateType: 'SupportCase',
        aggregateId: supportCase.id,
        payload: {
          supportCaseId: supportCase.id,
          supportCaseCode: supportCase.code,
          requesterUserId: requesterUser.id,
          validationActorUserId: dto.previewReference ? user.id : null,
          teamCode: team.code,
          departmentId: route.department?.id ?? null,
          topicId: route.topic?.id ?? null,
        },
      });

      if (description) {
        await tx.chatMessage.create({
          data: {
            conversationId: conversation.id,
            senderType: ChatMessageSenderType.USER,
            senderUserId: requesterUser.id,
            senderName: await this.getUserDisplayName(requesterUser.id),
            body: description,
          },
        });

        await tx.chatConversation.update({
          where: { id: conversation.id },
          data: { lastMessageAt: new Date() },
        });
      }

      await this.openResponsibilityPeriodWith(tx, {
        supportCaseId: supportCase.id,
        ownerType: SupportResponsibilityOwnerType.SUPPORT_TEAM,
        ownerTeamId: team.id,
        reason: 'case_created',
      });

      const approvalRule = await this.findApprovalRuleForRouteWith(tx, {
        departmentId: route.department?.id ?? null,
        topicId: route.topic?.id ?? null,
        formId: route.form?.id ?? null,
        fieldValues,
      });

      if (approvalRule) {
        await this.createApprovalRequestWith(tx, {
          supportCaseId: supportCase.id,
          requestedByUserId: requesterUser.id,
          approvalTeamId: approvalRule.approvalTeamId,
          ruleId: approvalRule.id,
          reason: 'Regra automatica de aprovacao.',
          dueMinutes: approvalRule.defaultDueMinutes ?? 60 * 24 * 2,
          source: 'automatic_rule',
        });
      }

      return tx.supportCase.findUniqueOrThrow({
        where: { id: supportCase.id },
        include: this.caseListInclude(),
      });
    });

    return {
      item: this.toCaseDetail(created, requesterUser.id),
    };
  }

  async addMessage(
    user: AuthenticatedUser,
    supportCaseId: string,
    dto: AddSupportCaseMessageDto,
  ) {
    const requesterUser = await this.resolveValidationRequester(
      user,
      dto.previewReference,
    ) ?? user;
    const supportCase = await this.findCaseOrThrow(supportCaseId);
    this.assertCaseAccess(requesterUser, supportCase);
    this.assertCaseAcceptsMessage(supportCase);

    if (!supportCase.originConversationId) {
      throw new BadRequestException('Atendimento nao possui conversa vinculada.');
    }

    const body = this.supportTextPolicy.normalizeUserText(dto.body, 'Mensagem');

    const message = await this.prisma.$transaction(async (tx) => {
      const createdMessage = await tx.chatMessage.create({
        data: {
          conversationId: supportCase.originConversationId as string,
          senderType: ChatMessageSenderType.USER,
          senderUserId: requesterUser.id,
          senderName: await this.getUserDisplayName(requesterUser.id),
          body,
        },
      });

      await tx.chatConversation.update({
        where: { id: supportCase.originConversationId as string },
        data: { lastMessageAt: createdMessage.createdAt },
      });

      await tx.supportCase.update({
        where: { id: supportCaseId },
        data: { updatedAt: createdMessage.createdAt },
      });

      await tx.supportCaseEvent.create({
        data: {
          supportCaseId,
          eventType: SupportCaseEventType.COMMENTED,
          authorUserId: requesterUser.id,
          toValue: createdMessage.id,
          metadata: {
            ...this.supportTextPolicy.optionalMetadata(),
            ...this.validationPreviewMetadata(user, dto.previewReference),
          },
        },
      });

      return createdMessage;
    });

    return {
      message: {
        id: message.id,
        body: message.body,
        senderName: message.senderName,
        createdAt: message.createdAt.toISOString(),
      },
    };
  }

  async updateCase(
    user: AuthenticatedUser,
    supportCaseId: string,
    dto: UpdateSupportCaseDto,
  ) {
    if (!this.isSupportUser(user)) {
      throw new ForbiddenException('Somente atendimento pode atualizar chamados.');
    }

    const supportCase = await this.findCaseOrThrow(supportCaseId);
    this.assertSupportTeamAccess(user, supportCase.currentTeam?.code ?? null);
    const nextTeam = dto.teamCode
      ? await this.findActiveTeamOrThrow(dto.teamCode)
      : null;
    this.assertTeamFilterAccess(user, nextTeam?.code ?? null);
    const changeReason = dto.changeReason?.trim() || null;
    const changeComment = dto.changeComment?.trim() || null;
    const now = new Date();
    const updates: {
      status?: SupportCaseStatus;
      priority?: SupportCasePriority;
      currentTeamId?: string;
      currentSector?: ChatSector;
      assignedUserId?: string | null;
      dueAt?: Date | null;
      resolvedAt?: Date | null;
      closedAt?: Date | null;
    } = {};
    const events: Array<{
      eventType: SupportCaseEventType;
      fromValue?: string | null;
      toValue?: string | null;
      metadata?: Prisma.InputJsonObject;
    }> = [];

    if (dto.status && dto.status !== supportCase.status) {
      this.assertStatusChangeAllowed(dto.status, changeReason);
      updates.status = dto.status;
      events.push({
        eventType: SupportCaseEventType.STATUS_CHANGED,
        fromValue: supportCase.status,
        toValue: dto.status,
        metadata: this.caseChangeMetadata(changeReason, changeComment),
      });

      if (dto.status === SupportCaseStatus.RESOLVED) {
        updates.resolvedAt = now;
      }

      if (dto.status === SupportCaseStatus.CLOSED) {
        updates.closedAt = now;
      }
    }

    if (dto.priority && dto.priority !== supportCase.priority) {
      updates.priority = dto.priority;
    }

    if (nextTeam && nextTeam.id !== supportCase.currentTeamId) {
      this.assertTransferReason(changeReason);
      const nextDueAt = await this.slaPolicy.calculateDueAt(
        updates.priority ?? dto.priority ?? supportCase.priority,
        now,
      );
      updates.currentTeamId = nextTeam.id;
      updates.currentSector = this.legacySectorFromTeamCode(nextTeam.code);
      updates.dueAt = nextDueAt;
      events.push({
        eventType: SupportCaseEventType.TRANSFERRED,
        fromValue: supportCase.currentTeam?.code ?? supportCase.currentSector,
        toValue: nextTeam.code,
        metadata: {
          ...this.caseChangeMetadata(changeReason, changeComment),
          previousDueAt: supportCase.dueAt?.toISOString() ?? null,
          nextDueAt: nextDueAt.toISOString(),
          source: 'team_transfer',
        },
      });

      if (supportCase.assignedUserId) {
        updates.assignedUserId = null;
        events.push({
          eventType: SupportCaseEventType.ASSIGNED,
          fromValue: supportCase.assignedUserId,
          toValue: null,
          metadata: {
            ...this.caseChangeMetadata(changeReason, changeComment),
            source: 'team_transfer',
          },
        });
      }
    }

    if (dto.assignedUserId !== undefined) {
      const assignedUserId = dto.assignedUserId.trim() || null;
      if (assignedUserId) {
        await this.assertAssignableUser(user, assignedUserId);
      }

      updates.assignedUserId = assignedUserId;
      events.push({
        eventType: SupportCaseEventType.ASSIGNED,
        fromValue: supportCase.assignedUserId,
        toValue: updates.assignedUserId,
      });
    }

    if (Object.keys(updates).length === 0) {
      return { item: this.toCaseDetail(supportCase, user.id) };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const item = await tx.supportCase.update({
        where: { id: supportCaseId },
        data: updates,
        include: this.caseDetailInclude(),
      });

      if (events.length > 0) {
        await tx.supportCaseEvent.createMany({
          data: events.map((event) => ({
            supportCaseId,
            authorUserId: user.id,
            eventType: event.eventType,
            fromValue: event.fromValue,
            toValue: event.toValue,
            metadata: event.metadata,
          })),
        });
      }

      if (nextTeam && nextTeam.id !== supportCase.currentTeamId) {
        await this.closeResponsibilityPeriodsWith(tx, supportCaseId, now);
        await this.openResponsibilityPeriodWith(tx, {
          supportCaseId,
          ownerType: SupportResponsibilityOwnerType.SUPPORT_TEAM,
          ownerTeamId: nextTeam.id,
          reason: `team_transfer:${changeReason}`,
        });
      }

      if (updates.status === SupportCaseStatus.CLOSED && supportCase.originConversationId) {
        await tx.chatConversation.update({
          where: { id: supportCase.originConversationId },
          data: { status: ChatConversationStatus.ARCHIVED },
        });
      }

      return item;
    });

    return {
      item: this.toCaseDetail(updated, user.id),
    };
  }

  async reopenCase(
    user: AuthenticatedUser,
    supportCaseId: string,
    dto: ReopenSupportCaseDto,
  ) {
    const supportCase = await this.findCaseOrThrow(supportCaseId);
    this.assertCaseAccess(user, supportCase);

    if (supportCase.requesterUserId !== user.id) {
      throw new ForbiddenException('Somente o solicitante pode reabrir o atendimento.');
    }

    if (supportCase.status !== SupportCaseStatus.RESOLVED || !supportCase.resolvedAt) {
      throw new BadRequestException('Somente atendimentos resolvidos podem ser reabertos.');
    }

    const now = new Date();
    this.assertReopenWindow(supportCase.resolvedAt, now);

    if (!supportCase.originConversationId) {
      throw new BadRequestException('Atendimento sem conversa nao pode ser reaberto pelo solicitante.');
    }

    const body = this.supportTextPolicy.normalizeUserText(dto.message, 'Mensagem');
    const nextDueAt = await this.slaPolicy.calculateDueAt(supportCase.priority, now);
    const requesterName =
      supportCase.requester.person?.fullName ?? supportCase.requester.email;

    const updated = await this.prisma.$transaction(async (tx) => {
      const message = await tx.chatMessage.create({
        data: {
          conversationId: supportCase.originConversationId as string,
          senderType: ChatMessageSenderType.USER,
          senderUserId: user.id,
          senderName: requesterName,
          body,
        },
      });

      const item = await tx.supportCase.update({
        where: { id: supportCaseId },
        data: {
          status: SupportCaseStatus.OPEN,
          assignedUserId: null,
          dueAt: nextDueAt,
          closedAt: null,
          updatedAt: now,
        },
        include: this.caseDetailInclude(),
      });

      await tx.chatConversation.update({
        where: { id: supportCase.originConversationId as string },
        data: {
          status: ChatConversationStatus.OPEN,
          lastMessageAt: now,
        },
      });

      await tx.supportCaseEvent.createMany({
        data: [
          {
            supportCaseId,
            authorUserId: user.id,
            eventType: SupportCaseEventType.STATUS_CHANGED,
            fromValue: SupportCaseStatus.RESOLVED,
            toValue: SupportCaseStatus.OPEN,
            metadata: {
              reason: dto.reason,
              source: 'requester_reopen',
              previousDueAt: supportCase.dueAt?.toISOString() ?? null,
              nextDueAt: nextDueAt.toISOString(),
            },
          },
          {
            supportCaseId,
            authorUserId: user.id,
            eventType: SupportCaseEventType.COMMENTED,
            toValue: message.id,
            metadata: {
              ...this.supportTextPolicy.optionalMetadata(),
              source: 'requester_reopen',
            },
          },
        ],
      });

      await this.closeResponsibilityPeriodsWith(tx, supportCaseId, now);
      await this.openResponsibilityPeriodWith(tx, {
        supportCaseId,
        ownerType: SupportResponsibilityOwnerType.SUPPORT_TEAM,
        ownerTeamId: supportCase.currentTeamId,
        reason: `case_reopened:${dto.reason}`,
      });

      return item;
    });

    return {
      item: this.toCaseDetail(updated, user.id),
    };
  }

  async rateCase(
    user: AuthenticatedUser,
    supportCaseId: string,
    dto: RateSupportCaseDto,
  ) {
    const supportCase = await this.findCaseOrThrow(supportCaseId);
    this.assertCaseAccess(user, supportCase);

    if (supportCase.requesterUserId !== user.id) {
      throw new ForbiddenException('Somente o solicitante pode avaliar.');
    }

    if (
      supportCase.status !== SupportCaseStatus.RESOLVED &&
      supportCase.status !== SupportCaseStatus.CLOSED
    ) {
      throw new BadRequestException(
        'Avaliacao fica disponivel apos a resolucao.',
      );
    }

    const rating = await this.prisma.supportRating.upsert({
      where: { supportCaseId },
      create: {
        supportCaseId,
        reviewerUserId: user.id,
        score: dto.score,
        comment: dto.comment?.trim() || null,
      },
      update: {
        score: dto.score,
        comment: dto.comment?.trim() || null,
      },
    });

    return {
      rating: {
        score: rating.score,
        comment: rating.comment,
        createdAt: rating.createdAt.toISOString(),
      },
    };
  }

  async listTeams() {
    const teams = await this.prisma.supportTeam.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });

    return {
      items: teams.map((team) => ({
        id: team.id,
        code: team.code,
        name: team.name,
      })),
    };
  }

  async listCatalog() {
    const departments = await this.prisma.supportDepartment.findMany({
      where: { status: SupportCatalogStatus.ACTIVE },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        topics: {
          where: { status: SupportCatalogStatus.ACTIVE },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            formBindings: {
              where: { status: SupportCatalogStatus.ACTIVE },
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              include: {
                form: {
                  include: {
                    fields: {
                      orderBy: { sortOrder: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      items: departments.map((department) => ({
        id: department.id,
        code: department.code,
        name: department.name,
        description: department.description,
        topics: department.topics.map((topic) => {
          const form = this.primaryTopicForm(topic.formBindings);

          return {
            id: topic.id,
            code: topic.code,
            name: topic.name,
            description: topic.description,
            defaultPriority: topic.defaultPriority,
            openingPolicy: topic.openingPolicy,
            businessKeyFieldCode: topic.businessKeyFieldCode,
            form: form ? this.toSupportFormSummary(form) : null,
          };
        }),
      })),
    };
  }

  async listCatalogAdmin(user: AuthenticatedUser) {
    this.assertCatalogAdmin(user);

    const [departments, teams, routingRules] = await Promise.all([
      this.prisma.supportDepartment.findMany({
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        include: {
          topics: {
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: {
              formBindings: {
                orderBy: { sortOrder: 'asc' },
                include: {
                  form: {
                    include: {
                      fields: {
                        orderBy: { sortOrder: 'asc' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      this.prisma.supportTeam.findMany({
        orderBy: { name: 'asc' },
        include: {
          department: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          members: {
            orderBy: { createdAt: 'asc' },
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  roles: true,
                  status: true,
                  person: { select: { fullName: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.supportRoutingRule.findMany({
        orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
        include: {
          department: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          topic: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          team: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      }),
    ]);

    return {
      departments: departments.map((department) => ({
        id: department.id,
        code: department.code,
        name: department.name,
        description: department.description,
        status: department.status,
        sortOrder: department.sortOrder,
        topics: department.topics.map((topic) => ({
          id: topic.id,
          code: topic.code,
          name: topic.name,
          description: topic.description,
          status: topic.status,
          defaultPriority: topic.defaultPriority,
          openingPolicy: topic.openingPolicy,
          businessKeyFieldCode: topic.businessKeyFieldCode,
          sortOrder: topic.sortOrder,
          forms: topic.formBindings.map((binding) =>
            this.toSupportFormSummary(binding.form),
          ),
        })),
      })),
      teams: teams.map((team) => ({
        id: team.id,
        code: team.code,
        name: team.name,
        status: team.status,
        department: team.department,
        members: team.members.map((member) => ({
          id: member.id,
          role: member.role,
          status: member.status,
          user: {
            id: member.user.id,
            name: member.user.person.fullName,
            email: member.user.email,
            roles: member.user.roles,
            status: member.user.status,
          },
        })),
      })),
      routingRules: routingRules.map((rule) => ({
        id: rule.id,
        status: rule.status,
        priority: rule.priority,
        conditions: rule.conditions,
        department: rule.department,
        topic: rule.topic,
        team: rule.team,
      })),
    };
  }

  async listAssignableUsers(user: AuthenticatedUser) {
    this.assertCatalogAdmin(user);

    const users = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        roles: { hasSome: Array.from(SUPPORT_ROLES) },
      },
      orderBy: { email: 'asc' },
      take: 100,
      select: {
        id: true,
        email: true,
        roles: true,
        person: { select: { fullName: true } },
      },
    });

    return {
      items: users
        .sort((left, right) =>
          left.person.fullName.localeCompare(right.person.fullName, 'pt-BR'),
        )
        .map((assignableUser) => ({
        id: assignableUser.id,
        name: assignableUser.person.fullName,
        email: assignableUser.email,
        roles: assignableUser.roles,
      })),
    };
  }

  async upsertDepartment(
    user: AuthenticatedUser,
    dto: UpsertSupportDepartmentDto,
  ) {
    this.assertGlobalCatalogAdmin(user);
    const code = this.normalizeCatalogCode(dto.code);
    const existing = await this.prisma.supportDepartment.findUnique({
      where: { code },
      select: { id: true },
    });

    const item = await this.prisma.supportDepartment.upsert({
      where: { code },
      create: {
        code,
        name: dto.name.trim(),
        description: this.optionalText(dto.description),
        status: dto.status ?? SupportCatalogStatus.ACTIVE,
        sortOrder: dto.sortOrder ?? 100,
      },
      update: {
        name: dto.name.trim(),
        description: this.optionalText(dto.description),
        status: dto.status ?? SupportCatalogStatus.ACTIVE,
        sortOrder: dto.sortOrder ?? 100,
      },
    });
    await this.auditCatalogAction(
      user,
      existing ? AuditAction.UPDATE : AuditAction.CREATE,
      'SupportDepartment',
      item,
    );

    return { item };
  }

  async updateDepartment(
    user: AuthenticatedUser,
    departmentId: string,
    dto: UpsertSupportDepartmentDto,
  ) {
    this.assertGlobalCatalogAdmin(user);
    await this.findDepartmentOrThrow(departmentId);

    const item = await this.prisma.supportDepartment.update({
      where: { id: departmentId },
      data: {
        code: this.normalizeCatalogCode(dto.code),
        name: dto.name.trim(),
        description: this.optionalText(dto.description),
        status: dto.status ?? SupportCatalogStatus.ACTIVE,
        sortOrder: dto.sortOrder ?? 100,
      },
    });
    await this.auditCatalogAction(user, AuditAction.UPDATE, 'SupportDepartment', item);

    return { item };
  }

  async deleteDepartment(user: AuthenticatedUser, departmentId: string) {
    this.assertGlobalCatalogAdmin(user);
    await this.findDepartmentOrThrow(departmentId);

    const hasLinks = await this.departmentHasLinks(departmentId);
    if (hasLinks) {
      const item = await this.prisma.supportDepartment.update({
        where: { id: departmentId },
        data: { status: SupportCatalogStatus.INACTIVE },
      });
      await this.auditCatalogAction(user, AuditAction.SOFT_DELETE, 'SupportDepartment', item, {
        deletionMode: 'SOFT',
      });

      return { item, deletionMode: 'SOFT' as const };
    }

    const item = await this.prisma.supportDepartment.delete({
      where: { id: departmentId },
    });
    await this.auditCatalogAction(user, AuditAction.DELETE, 'SupportDepartment', item, {
      deletionMode: 'HARD',
    });

    return { item, deletionMode: 'HARD' as const };
  }

  async upsertTopic(user: AuthenticatedUser, dto: UpsertSupportTopicDto) {
    this.assertCatalogAdmin(user);
    await this.findDepartmentOrThrow(dto.departmentId);
    const code = this.normalizeCatalogCode(dto.code);
    const existing = await this.prisma.supportTopic.findUnique({
      where: {
        departmentId_code: {
          departmentId: dto.departmentId,
          code,
        },
      },
      select: { id: true },
    });

    const item = await this.prisma.supportTopic.upsert({
      where: {
        departmentId_code: {
          departmentId: dto.departmentId,
          code,
        },
      },
      create: {
        departmentId: dto.departmentId,
        code,
        name: dto.name.trim(),
        description: this.optionalText(dto.description),
        status: dto.status ?? SupportCatalogStatus.ACTIVE,
        defaultPriority: dto.defaultPriority ?? SupportCasePriority.NORMAL,
        openingPolicy: dto.openingPolicy ?? SupportCaseOpeningPolicy.CONTINUOUS_CONVERSATION,
        businessKeyFieldCode: this.optionalText(dto.businessKeyFieldCode),
        sortOrder: dto.sortOrder ?? 100,
      },
      update: {
        name: dto.name.trim(),
        description: this.optionalText(dto.description),
        status: dto.status ?? SupportCatalogStatus.ACTIVE,
        defaultPriority: dto.defaultPriority ?? SupportCasePriority.NORMAL,
        openingPolicy: dto.openingPolicy ?? SupportCaseOpeningPolicy.CONTINUOUS_CONVERSATION,
        businessKeyFieldCode: this.optionalText(dto.businessKeyFieldCode),
        sortOrder: dto.sortOrder ?? 100,
      },
    });
    await this.auditCatalogAction(
      user,
      existing ? AuditAction.UPDATE : AuditAction.CREATE,
      'SupportTopic',
      item,
    );

    return { item };
  }

  async updateTopic(
    user: AuthenticatedUser,
    topicId: string,
    dto: UpsertSupportTopicDto,
  ) {
    this.assertCatalogAdmin(user);
    await this.findDepartmentOrThrow(dto.departmentId);
    await this.findTopicOrThrow(topicId);

    const item = await this.prisma.supportTopic.update({
      where: { id: topicId },
      data: {
        departmentId: dto.departmentId,
        code: this.normalizeCatalogCode(dto.code),
        name: dto.name.trim(),
        description: this.optionalText(dto.description),
        status: dto.status ?? SupportCatalogStatus.ACTIVE,
        defaultPriority: dto.defaultPriority ?? SupportCasePriority.NORMAL,
        openingPolicy: dto.openingPolicy ?? SupportCaseOpeningPolicy.CONTINUOUS_CONVERSATION,
        businessKeyFieldCode: this.optionalText(dto.businessKeyFieldCode),
        sortOrder: dto.sortOrder ?? 100,
      },
    });
    await this.auditCatalogAction(user, AuditAction.UPDATE, 'SupportTopic', item);

    return { item };
  }

  async deleteTopic(user: AuthenticatedUser, topicId: string) {
    this.assertCatalogAdmin(user);
    await this.findTopicOrThrow(topicId);

    const hasLinks = await this.topicHasLinks(topicId);
    if (hasLinks) {
      const item = await this.prisma.supportTopic.update({
        where: { id: topicId },
        data: { status: SupportCatalogStatus.INACTIVE },
      });
      await this.auditCatalogAction(user, AuditAction.SOFT_DELETE, 'SupportTopic', item, {
        deletionMode: 'SOFT',
      });

      return { item, deletionMode: 'SOFT' as const };
    }

    const item = await this.prisma.supportTopic.delete({
      where: { id: topicId },
    });
    await this.auditCatalogAction(user, AuditAction.DELETE, 'SupportTopic', item, {
      deletionMode: 'HARD',
    });

    return { item, deletionMode: 'HARD' as const };
  }

  async upsertTeam(user: AuthenticatedUser, dto: UpsertSupportTeamDto) {
    this.assertCatalogAdmin(user);
    await this.assertOptionalDepartmentExists(dto.departmentId);
    const code = this.normalizeCatalogCode(dto.code);
    const existing = await this.prisma.supportTeam.findUnique({
      where: { code },
      select: { id: true },
    });

    const item = await this.prisma.supportTeam.upsert({
      where: { code },
      create: {
        departmentId: this.optionalText(dto.departmentId),
        code,
        name: dto.name.trim(),
        status: dto.status ?? 'ACTIVE',
      },
      update: {
        departmentId: this.optionalText(dto.departmentId),
        name: dto.name.trim(),
        status: dto.status ?? 'ACTIVE',
      },
    });
    await this.auditCatalogAction(
      user,
      existing ? AuditAction.UPDATE : AuditAction.CREATE,
      'SupportTeam',
      item,
    );

    return { item };
  }

  async updateTeam(user: AuthenticatedUser, teamId: string, dto: UpsertSupportTeamDto) {
    this.assertCatalogAdmin(user);
    await this.assertOptionalDepartmentExists(dto.departmentId);
    await this.findTeamByIdOrThrow(teamId);

    const item = await this.prisma.supportTeam.update({
      where: { id: teamId },
      data: {
        departmentId: this.optionalText(dto.departmentId),
        code: this.normalizeCatalogCode(dto.code),
        name: dto.name.trim(),
        status: dto.status ?? 'ACTIVE',
      },
    });
    await this.auditCatalogAction(user, AuditAction.UPDATE, 'SupportTeam', item);

    return { item };
  }

  async deleteTeam(user: AuthenticatedUser, teamId: string) {
    this.assertCatalogAdmin(user);
    await this.findTeamByIdOrThrow(teamId);

    const hasLinks = await this.teamHasLinks(teamId);
    if (hasLinks) {
      const item = await this.prisma.supportTeam.update({
        where: { id: teamId },
        data: { status: 'INACTIVE' },
      });
      await this.auditCatalogAction(user, AuditAction.SOFT_DELETE, 'SupportTeam', item, {
        deletionMode: 'SOFT',
      });

      return { item, deletionMode: 'SOFT' as const };
    }

    const item = await this.prisma.supportTeam.delete({
      where: { id: teamId },
    });
    await this.auditCatalogAction(user, AuditAction.DELETE, 'SupportTeam', item, {
      deletionMode: 'HARD',
    });

    return { item, deletionMode: 'HARD' as const };
  }

  async upsertTeamMember(
    user: AuthenticatedUser,
    dto: UpsertSupportTeamMemberDto,
  ) {
    this.assertCatalogAdmin(user);
    await this.findTeamByIdOrThrow(dto.teamId);
    await this.assertAssignableUser(user, dto.userId);
    const existing = await this.prisma.supportTeamMember.findUnique({
      where: {
        teamId_userId: {
          teamId: dto.teamId,
          userId: dto.userId,
        },
      },
      select: { id: true },
    });

    const item = await this.prisma.supportTeamMember.upsert({
      where: {
        teamId_userId: {
          teamId: dto.teamId,
          userId: dto.userId,
        },
      },
      create: {
        teamId: dto.teamId,
        userId: dto.userId,
        role: dto.role ?? ChatParticipantRole.AGENT,
        status: dto.status ?? SupportCatalogStatus.ACTIVE,
      },
      update: {
        role: dto.role ?? ChatParticipantRole.AGENT,
        status: dto.status ?? SupportCatalogStatus.ACTIVE,
      },
    });
    await this.auditCatalogAction(
      user,
      existing ? AuditAction.UPDATE : AuditAction.CREATE,
      'SupportTeamMember',
      item,
      {
        teamId: item.teamId,
        memberUserId: item.userId,
      },
    );

    return { item };
  }

  async deleteTeamMember(user: AuthenticatedUser, memberId: string) {
    this.assertCatalogAdmin(user);
    const member = await this.findTeamMemberOrThrow(memberId);

    const hasLinks = await this.teamMemberHasLinks(member.userId);
    if (hasLinks) {
      const item = await this.prisma.supportTeamMember.update({
        where: { id: memberId },
        data: { status: SupportCatalogStatus.INACTIVE },
      });
      await this.auditCatalogAction(user, AuditAction.SOFT_DELETE, 'SupportTeamMember', item, {
        deletionMode: 'SOFT',
        teamId: item.teamId,
        memberUserId: item.userId,
      });

      return { item, deletionMode: 'SOFT' as const };
    }

    const item = await this.prisma.supportTeamMember.delete({
      where: { id: memberId },
    });
    await this.auditCatalogAction(user, AuditAction.DELETE, 'SupportTeamMember', item, {
      deletionMode: 'HARD',
      teamId: item.teamId,
      memberUserId: item.userId,
    });

    return { item, deletionMode: 'HARD' as const };
  }

  async upsertRoutingRule(
    user: AuthenticatedUser,
    dto: UpsertSupportRoutingRuleDto,
  ) {
    this.assertCatalogAdmin(user);
    await this.assertRouteReferencesExist(dto);

    const existing = await this.prisma.supportRoutingRule.findFirst({
      where: {
        departmentId: dto.departmentId,
        topicId: this.optionalText(dto.topicId),
        teamId: dto.teamId,
      },
    });

    if (existing) {
      const item = await this.prisma.supportRoutingRule.update({
        where: { id: existing.id },
        data: {
          status: dto.status ?? SupportCatalogStatus.ACTIVE,
          priority: dto.priority ?? 100,
          conditions: this.routingConditionsInput(dto.conditions),
        },
      });
      await this.auditCatalogAction(user, AuditAction.UPDATE, 'SupportRoutingRule', item);

      return { item };
    }

    const item = await this.prisma.supportRoutingRule.create({
      data: {
        departmentId: dto.departmentId,
        topicId: this.optionalText(dto.topicId),
        teamId: dto.teamId,
        status: dto.status ?? SupportCatalogStatus.ACTIVE,
        priority: dto.priority ?? 100,
        conditions: this.routingConditionsInput(dto.conditions),
      },
    });
    await this.auditCatalogAction(user, AuditAction.CREATE, 'SupportRoutingRule', item);

    return { item };
  }

  async updateRoutingRule(
    user: AuthenticatedUser,
    ruleId: string,
    dto: UpsertSupportRoutingRuleDto,
  ) {
    this.assertCatalogAdmin(user);
    await this.assertRouteReferencesExist(dto);

    const item = await this.prisma.supportRoutingRule.update({
      where: { id: ruleId },
      data: {
        departmentId: dto.departmentId,
        topicId: this.optionalText(dto.topicId),
        teamId: dto.teamId,
        status: dto.status ?? SupportCatalogStatus.ACTIVE,
        priority: dto.priority ?? 100,
        conditions: this.routingConditionsInput(dto.conditions),
      },
    });
    await this.auditCatalogAction(user, AuditAction.UPDATE, 'SupportRoutingRule', item);

    return { item };
  }

  async deleteRoutingRule(user: AuthenticatedUser, ruleId: string) {
    this.assertCatalogAdmin(user);
    await this.findRoutingRuleOrThrow(ruleId);

    const item = await this.prisma.supportRoutingRule.delete({
      where: { id: ruleId },
    });
    await this.auditCatalogAction(user, AuditAction.DELETE, 'SupportRoutingRule', item, {
      deletionMode: 'HARD',
    });

    return { item, deletionMode: 'HARD' as const };
  }

  async createTopicForm(
    user: AuthenticatedUser,
    topicId: string,
    dto: UpsertSupportTopicFormDto,
  ) {
    this.assertFormsAdmin(user);
    const topic = await this.findTopicOrThrow(topicId);

    if (dto.fields.length === 0) {
      throw new BadRequestException('Formulario precisa ter ao menos um campo.');
    }

    const nextVersion = await this.nextFormVersion(topicId);
    const activePrimaryBinding = await this.prisma.supportTopicFormBinding.findFirst({
      where: {
        topicId,
        status: SupportCatalogStatus.ACTIVE,
        isPrimary: true,
      },
      select: { id: true },
    });
    const item = await this.prisma.$transaction(async (tx) => {
      const form = await tx.formDefinition.create({
        data: {
          topicId,
          ownerType: 'SUPPORT_DEPARTMENT',
          ownerDepartmentId: topic.departmentId,
          version: nextVersion,
          title: dto.title.trim(),
          description: this.optionalText(dto.description),
          status: dto.status ?? SupportCatalogStatus.ACTIVE,
          fields: {
            create: dto.fields.map((field, index) => ({
              code: this.normalizeFieldCode(field.code),
              label: field.label.trim(),
              fieldType: field.type,
              required: field.required ?? false,
              sensitive: field.sensitive ?? false,
              helpText: this.optionalText(field.helpText),
              options: this.normalizedFieldOptions(field.options),
              visibleWhen: this.conditionsInput(field.visibleWhen),
              requiredWhen: this.conditionsInput(field.requiredWhen),
              sortOrder: field.sortOrder ?? index + 1,
            })),
          },
        },
        include: {
          fields: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      await tx.supportTopicFormBinding.create({
        data: {
          topicId,
          formId: form.id,
          status: form.status,
          isPrimary:
            form.status === SupportCatalogStatus.ACTIVE && !activePrimaryBinding,
          sortOrder: nextVersion,
        },
      });

      return form;
    });
    await this.auditCatalogAction(user, AuditAction.LINK, 'SupportTopicFormBinding', item, {
      topicId,
      formId: item.id,
      version: item.version,
    });

    return { item: this.toSupportFormSummary(item) };
  }

  async listApprovalRules(user: AuthenticatedUser) {
    this.assertCatalogAdmin(user);

    const rules = await this.prisma.approvalRule.findMany({
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      include: {
        department: { select: { id: true, code: true, name: true } },
        topic: { select: { id: true, code: true, name: true } },
        form: { select: { id: true, title: true, version: true } },
        approvalTeam: { select: { id: true, code: true, name: true } },
      },
    });

    return { items: rules.map((rule) => this.toApprovalRuleDto(rule)) };
  }

  async createApprovalRule(user: AuthenticatedUser, dto: UpsertApprovalRuleDto) {
    this.assertCatalogAdmin(user);
    await this.assertApprovalRuleReferences(dto);

    const item = await this.prisma.approvalRule.create({
      data: this.approvalRuleData(dto),
      include: this.approvalRuleInclude(),
    });
    await this.auditCatalogAction(user, AuditAction.CREATE, 'ApprovalRule', item);

    return { item: this.toApprovalRuleDto(item) };
  }

  async updateApprovalRule(
    user: AuthenticatedUser,
    ruleId: string,
    dto: UpsertApprovalRuleDto,
  ) {
    this.assertCatalogAdmin(user);
    await this.findApprovalRuleOrThrow(ruleId);
    await this.assertApprovalRuleReferences(dto);

    const item = await this.prisma.approvalRule.update({
      where: { id: ruleId },
      data: this.approvalRuleData(dto),
      include: this.approvalRuleInclude(),
    });
    await this.auditCatalogAction(user, AuditAction.UPDATE, 'ApprovalRule', item);

    return { item: this.toApprovalRuleDto(item) };
  }

  async listApprovals(user: AuthenticatedUser) {
    const supportUser = this.isSupportUser(user);
    if (!supportUser) {
      throw new ForbiddenException('Somente atendimento pode listar aprovacoes.');
    }

    const allowedTeamCodes = this.allowedTeamCodes(user);
    const approvals = await this.prisma.approvalRequest.findMany({
      where: {
        status: {
          in: [
            ApprovalRequestStatus.PENDING,
            ApprovalRequestStatus.CHANGES_REQUESTED,
          ],
        },
        currentStep: allowedTeamCodes
          ? { approvalTeam: { code: { in: allowedTeamCodes } } }
          : undefined,
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
      take: 50,
      include: this.approvalRequestInclude(),
    });

    return { items: approvals.map((approval) => this.toApprovalRequestDto(approval)) };
  }

  async requestManualApproval(
    user: AuthenticatedUser,
    supportCaseId: string,
    dto: RequestManualApprovalDto,
  ) {
    if (!this.isSupportUser(user)) {
      throw new ForbiddenException('Somente atendimento pode solicitar aprovacao.');
    }

    const supportCase = await this.findCaseOrThrow(supportCaseId);
    this.assertSupportTeamAccess(user, supportCase.currentTeam?.code ?? null);
    const approvalTeam = await this.findTeamByIdOrThrow(dto.approvalTeamId);
    const reason = this.supportTextPolicy.normalizeUserText(dto.reason, 'Motivo');

    const created = await this.prisma.$transaction(async (tx) => {
      return this.createApprovalRequestWith(tx, {
        supportCaseId,
        requestedByUserId: user.id,
        approvalTeamId: approvalTeam.id,
        ruleId: null,
        reason,
        dueMinutes: dto.dueMinutes ?? 60 * 24 * 2,
        source: 'manual',
      });
    });

    return { item: this.toApprovalRequestDto(created) };
  }

  async decideApproval(
    user: AuthenticatedUser,
    approvalRequestId: string,
    dto: DecideApprovalDto,
  ) {
    const approval = await this.findApprovalRequestOrThrow(approvalRequestId);
    const currentStep = approval.currentStep;

    if (!currentStep || approval.status !== ApprovalRequestStatus.PENDING) {
      throw new BadRequestException('Aprovacao nao esta pendente.');
    }

    this.assertSupportTeamAccess(user, currentStep.approvalTeam.code);

    if (
      dto.decision !== ApprovalStepStatus.APPROVED &&
      dto.decision !== ApprovalStepStatus.REJECTED &&
      dto.decision !== ApprovalStepStatus.CHANGES_REQUESTED
    ) {
      throw new BadRequestException('Decisao de aprovacao invalida.');
    }

    const comment = dto.comment?.trim()
      ? this.supportTextPolicy.normalizeUserText(dto.comment, 'Comentario')
      : null;
    const decided = await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.approvalStep.update({
        where: { id: currentStep.id },
        data: {
          status: dto.decision,
          decidedByUserId: user.id,
          decidedAt: now,
          decisionComment: comment,
        },
      });

      const requestStatus = this.approvalRequestStatusForDecision(dto.decision);
      const supportStatus =
        dto.decision === ApprovalStepStatus.CHANGES_REQUESTED
          ? SupportCaseStatus.WAITING_REQUESTER
          : SupportCaseStatus.OPEN;
      const supportEvent =
        dto.decision === ApprovalStepStatus.CHANGES_REQUESTED
          ? SupportCaseEventType.APPROVAL_CHANGES_REQUESTED
          : SupportCaseEventType.APPROVAL_DECIDED;

      await tx.approvalRequest.update({
        where: { id: approval.id },
        data: {
          status: requestStatus,
          decidedAt: now,
        },
      });

      await tx.approvalEvent.create({
        data: {
          approvalRequestId: approval.id,
          approvalStepId: currentStep.id,
          eventType: this.approvalEventTypeForDecision(dto.decision),
          authorUserId: user.id,
          comment,
        },
      });

      await tx.supportCase.update({
        where: { id: approval.supportCase.id },
        data: { status: supportStatus, updatedAt: now },
      });

      await tx.supportCaseEvent.create({
        data: {
          supportCaseId: approval.supportCase.id,
          eventType: supportEvent,
          authorUserId: user.id,
          toValue: dto.decision,
          metadata: comment ? { comment } : undefined,
        },
      });

      if (
        dto.decision === ApprovalStepStatus.CHANGES_REQUESTED &&
        comment &&
        approval.supportCase.originConversationId
      ) {
        const senderName = await this.getUserDisplayName(user.id);
        await tx.chatMessage.create({
          data: {
            conversationId: approval.supportCase.originConversationId,
            senderType: ChatMessageSenderType.USER,
            senderUserId: user.id,
            senderName,
            body: comment,
          },
        });
      }

      await this.closeResponsibilityPeriodsWith(tx, approval.supportCase.id, now);
      await this.openResponsibilityPeriodWith(tx, {
        supportCaseId: approval.supportCase.id,
        ownerType:
          dto.decision === ApprovalStepStatus.CHANGES_REQUESTED
            ? SupportResponsibilityOwnerType.REQUESTER
            : SupportResponsibilityOwnerType.SUPPORT_TEAM,
        ownerTeamId:
          dto.decision === ApprovalStepStatus.CHANGES_REQUESTED
            ? null
            : approval.supportCase.currentTeamId,
        reason: `approval_${dto.decision.toLocaleLowerCase('pt-BR')}`,
      });

      return tx.approvalRequest.findUniqueOrThrow({
        where: { id: approval.id },
        include: this.approvalRequestInclude(),
      });
    });

    return { item: this.toApprovalRequestDto(decided) };
  }

  async suggestTriage(user: AuthenticatedUser, dto: SuggestSupportTriageDto) {
    const normalizedText = this.normalizeTriageText(dto.text);
    const matchedRule = LOCAL_TRIAGE_RULES.find((rule) =>
      rule.keywords.some((keyword) =>
        normalizedText.includes(this.normalizeTriageText(keyword)),
      ),
    );

    if (!matchedRule) {
      return {
        suggestion: null,
      };
    }

    const topic = await this.prisma.supportTopic.findFirst({
      where: {
        code: matchedRule.topicCode,
        status: SupportCatalogStatus.ACTIVE,
        department: {
          code: matchedRule.departmentCode,
          status: SupportCatalogStatus.ACTIVE,
        },
      },
      include: {
        department: true,
      },
    });

    if (!topic) {
      return {
        suggestion: null,
      };
    }

    const team = await this.findTeamForRoute(topic.departmentId, topic.id);
    const suggestion = await this.prisma.supportTriageSuggestion.create({
      data: {
        requesterUserId: user.id,
        source: SupportTriageSuggestionSource.RULE,
        inputHash: this.triageInputHash(dto.text),
        suggestedDepartmentId: topic.departmentId,
        suggestedTopicId: topic.id,
        suggestedTeamId: team.id,
        confidence: 0.82,
        metadata: {
          matchedDepartmentCode: matchedRule.departmentCode,
          matchedTopicCode: matchedRule.topicCode,
        },
      },
    });

    return {
      suggestion: {
        id: suggestion.id,
        source: suggestion.source,
        confidence: suggestion.confidence,
        department: {
          id: topic.department.id,
          code: topic.department.code,
          name: topic.department.name,
        },
        topic: {
          id: topic.id,
          code: topic.code,
          name: topic.name,
        },
        team: {
          id: team.id,
          code: team.code,
          name: team.name,
        },
      },
    };
  }

  private assertCatalogAdmin(user: AuthenticatedUser) {
    if (this.canAccessAllSupportTeams(user)) {
      return;
    }

    throw new ForbiddenException('Usuario sem permissao para configurar atendimento.');
  }

  private auditCatalogAction(
    user: AuthenticatedUser,
    action: AuditAction,
    entityType: string,
    item: { id?: string; code?: string | null; name?: string | null; title?: string | null },
    metadata?: Record<string, unknown>,
  ) {
    return this.audit.record({
      actorUserId: user.id,
      action,
      entityType,
      entityId: item.id ?? null,
      entityLabel: item.name ?? item.title ?? item.code ?? null,
      after: item,
      metadata,
    });
  }

  private assertFormsAdmin(user: AuthenticatedUser) {
    if (user.roles.includes(Role.ADMIN) || user.roles.includes(Role.TI)) {
      return;
    }

    throw new ForbiddenException('Somente administradores de TI podem manter formularios.');
  }

  private assertGlobalCatalogAdmin(user: AuthenticatedUser) {
    if (user.roles.includes(Role.ADMIN)) {
      return;
    }

    throw new ForbiddenException('Somente administradores globais podem manter setores.');
  }

  private async findDepartmentOrThrow(departmentId: string) {
    const department = await this.prisma.supportDepartment.findUnique({
      where: { id: departmentId },
      select: { id: true },
    });

    if (department) {
      return department;
    }

    throw new NotFoundException('Setor de atendimento nao encontrado.');
  }

  private async assertOptionalDepartmentExists(departmentId?: string) {
    if (!departmentId?.trim()) {
      return;
    }

    await this.findDepartmentOrThrow(departmentId);
  }

  private async findTopicOrThrow(topicId: string) {
    const topic = await this.prisma.supportTopic.findUnique({
      where: { id: topicId },
      select: {
        id: true,
        departmentId: true,
      },
    });

    if (topic) {
      return topic;
    }

    throw new NotFoundException('Assunto de atendimento nao encontrado.');
  }

  private async findTeamByIdOrThrow(teamId: string) {
    const team = await this.prisma.supportTeam.findUnique({
      where: { id: teamId },
      select: { id: true },
    });

    if (team) {
      return team;
    }

    throw new NotFoundException('Equipe de atendimento nao encontrada.');
  }

  private async findRoutingRuleOrThrow(ruleId: string) {
    const rule = await this.prisma.supportRoutingRule.findUnique({
      where: { id: ruleId },
      select: { id: true },
    });

    if (rule) {
      return rule;
    }

    throw new NotFoundException('Regra de roteamento nao encontrada.');
  }

  private async findTeamMemberOrThrow(memberId: string) {
    const member = await this.prisma.supportTeamMember.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        userId: true,
        teamId: true,
      },
    });

    if (member) {
      return member;
    }

    throw new NotFoundException('Vinculo de atendente nao encontrado.');
  }

  private async departmentHasLinks(departmentId: string) {
    const [topics, teams, routingRules, supportCases] = await Promise.all([
      this.prisma.supportTopic.count({ where: { departmentId } }),
      this.prisma.supportTeam.count({ where: { departmentId } }),
      this.prisma.supportRoutingRule.count({ where: { departmentId } }),
      this.prisma.supportCase.count({ where: { departmentId } }),
    ]);

    return topics + teams + routingRules + supportCases > 0;
  }

  private async topicHasLinks(topicId: string) {
    const [forms, routingRules, supportCases] = await Promise.all([
      this.prisma.supportTopicFormBinding.count({ where: { topicId } }),
      this.prisma.supportRoutingRule.count({ where: { topicId } }),
      this.prisma.supportCase.count({ where: { topicId } }),
    ]);

    return forms + routingRules + supportCases > 0;
  }

  private async teamHasLinks(teamId: string) {
    const [members, routingRules, supportCases, conversations, participants] =
      await Promise.all([
        this.prisma.supportTeamMember.count({ where: { teamId } }),
        this.prisma.supportRoutingRule.count({ where: { teamId } }),
        this.prisma.supportCase.count({ where: { currentTeamId: teamId } }),
        this.prisma.chatConversation.count({ where: { primaryTeamId: teamId } }),
        this.prisma.chatParticipant.count({ where: { teamId } }),
      ]);

    return members + routingRules + supportCases + conversations + participants > 0;
  }

  private async teamMemberHasLinks(userId: string) {
    const [assignedCases, authoredEvents] = await Promise.all([
      this.prisma.supportCase.count({ where: { assignedUserId: userId } }),
      this.prisma.supportCaseEvent.count({ where: { authorUserId: userId } }),
    ]);

    return assignedCases + authoredEvents > 0;
  }

  private async assertRouteReferencesExist(dto: UpsertSupportRoutingRuleDto) {
    await this.findDepartmentOrThrow(dto.departmentId);
    await this.findTeamByIdOrThrow(dto.teamId);

    if (!dto.topicId?.trim()) {
      return;
    }

    const topic = await this.findTopicOrThrow(dto.topicId);

    if (topic.departmentId === dto.departmentId) {
      return;
    }

    throw new BadRequestException('Assunto nao pertence ao setor informado.');
  }

  private async nextFormVersion(topicId: string) {
    const latest = await this.prisma.formDefinition.findFirst({
      where: { topicId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });

    return (latest?.version ?? 0) + 1;
  }

  private async findCaseOrThrow(supportCaseId: string) {
    const supportCase = await this.prisma.supportCase.findUnique({
      where: { id: supportCaseId },
      include: this.caseDetailInclude(),
    });

    if (!supportCase) {
      throw new NotFoundException('Atendimento nao encontrado.');
    }

    return supportCase;
  }

  private async resolveValidationRequester(
    actor: AuthenticatedUser,
    previewReference?: string,
  ): Promise<AuthenticatedUser | null> {
    if (!previewReference) {
      return null;
    }

    if (!actor.roles.includes(Role.ADMIN)) {
      throw new ForbiddenException('Somente administradores podem validar atendimento de outro colaborador.');
    }

    const worker = this.previewReferences.resolve(actor.id, previewReference);
    const identifiers = [worker.employeeNumber, worker.workerId]
      .map((value) => value?.trim())
      .filter((value): value is string => Boolean(value));

    if (identifiers.length === 0) {
      throw new NotFoundException('Referencia de colaborador sem matricula valida para atendimento.');
    }

    const targetUser = await this.prisma.user.findFirst({
      where: {
        status: UserStatus.ACTIVE,
        person: {
          is: {
            employee: {
              is: {
                OR: [
                  { employeeNumber: { in: identifiers } },
                  { externalEmployeeId: { in: identifiers } },
                ],
              },
            },
          },
        },
      },
      select: {
        id: true,
        email: true,
        roles: true,
        status: true,
        person: {
          select: {
            employee: {
              select: {
                employeeNumber: true,
              },
            },
          },
        },
      },
    });

    if (!targetUser) {
      throw new NotFoundException('Colaborador selecionado ainda nao possui usuario interno ativo vinculado a matricula.');
    }

    return {
      id: targetUser.id,
      email: targetUser.email,
      employeeId: targetUser.person.employee?.employeeNumber ?? null,
      roles: targetUser.roles,
      status: targetUser.status,
    };
  }

  private validationPreviewMetadata(
    actor: AuthenticatedUser,
    previewReference?: string,
  ) {
    return previewReference
      ? {
          validationSource: 'admin_validation_preview',
          validationActorUserId: actor.id,
        }
      : {};
  }

  private approvalRuleInclude() {
    return {
      department: { select: { id: true, code: true, name: true } },
      topic: { select: { id: true, code: true, name: true } },
      form: { select: { id: true, title: true, version: true } },
      approvalTeam: { select: { id: true, code: true, name: true } },
    };
  }

  private approvalRequestInclude() {
    return {
      supportCase: {
        select: {
          id: true,
          code: true,
          title: true,
          status: true,
          currentTeamId: true,
          originConversationId: true,
          requester: {
            select: {
              id: true,
              email: true,
              person: { select: { fullName: true } },
            },
          },
        },
      },
      currentStep: {
        include: {
          approvalTeam: {
            select: { id: true, code: true, name: true },
          },
          decidedBy: {
            select: {
              id: true,
              email: true,
              person: { select: { fullName: true } },
            },
          },
        },
      },
      rule: {
        include: this.approvalRuleInclude(),
      },
      events: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          authorUser: {
            select: {
              id: true,
              email: true,
              person: { select: { fullName: true } },
            },
          },
        },
      },
    };
  }

  private async findApprovalRuleOrThrow(ruleId: string) {
    const rule = await this.prisma.approvalRule.findUnique({
      where: { id: ruleId },
      select: { id: true },
    });

    if (rule) {
      return rule;
    }

    throw new NotFoundException('Regra de aprovacao nao encontrada.');
  }

  private async findApprovalRequestOrThrow(approvalRequestId: string) {
    const approval = await this.prisma.approvalRequest.findUnique({
      where: { id: approvalRequestId },
      include: this.approvalRequestInclude(),
    });

    if (approval) {
      return approval;
    }

    throw new NotFoundException('Aprovacao nao encontrada.');
  }

  private async assertApprovalRuleReferences(dto: UpsertApprovalRuleDto) {
    await this.findTeamByIdOrThrow(dto.approvalTeamId);
    await this.assertOptionalDepartmentExists(dto.departmentId);

    if (dto.topicId?.trim()) {
      const topic = await this.findTopicOrThrow(dto.topicId);
      if (dto.departmentId?.trim() && topic.departmentId !== dto.departmentId) {
        throw new BadRequestException('Assunto nao pertence ao setor informado.');
      }
    }

    if (dto.formId?.trim()) {
      const form = await this.prisma.formDefinition.findUnique({
        where: { id: dto.formId },
        select: { id: true },
      });
      if (!form) {
        throw new NotFoundException('Formulario de aprovacao nao encontrado.');
      }
    }
  }

  private approvalRuleData(dto: UpsertApprovalRuleDto) {
    return {
      departmentId: this.optionalText(dto.departmentId),
      topicId: this.optionalText(dto.topicId),
      formId: this.optionalText(dto.formId),
      approvalTeamId: dto.approvalTeamId,
      status: dto.status ?? SupportCatalogStatus.ACTIVE,
      priority: dto.priority ?? 100,
      conditions: this.routingConditionsInput(dto.conditions),
      defaultDueMinutes: dto.defaultDueMinutes ?? null,
      manualTriggerAllowed: dto.manualTriggerAllowed ?? true,
    };
  }

  private async findApprovalRuleForRouteWith(
    tx: Prisma.TransactionClient,
    params: {
      departmentId: string | null;
      topicId: string | null;
      formId: string | null;
      fieldValues: NormalizedSupportFieldValue[];
    },
  ) {
    const rules = await tx.approvalRule.findMany({
      where: {
        status: SupportCatalogStatus.ACTIVE,
        departmentId: params.departmentId ?? undefined,
        OR: [
          { topicId: params.topicId },
          { topicId: null },
        ],
        formId: params.formId ?? undefined,
        approvalTeam: { status: 'ACTIVE' },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });

    return rules.find((rule) =>
      this.routingConditionsMatch(rule.conditions, params.fieldValues),
    ) ?? null;
  }

  private async createApprovalRequestWith(
    tx: Prisma.TransactionClient,
    params: {
      supportCaseId: string;
      requestedByUserId: string | null;
      approvalTeamId: string;
      ruleId: string | null;
      reason: string;
      dueMinutes: number;
      source: 'automatic_rule' | 'manual';
    },
  ) {
    const now = new Date();
    const dueAt = new Date(now.getTime() + params.dueMinutes * 60_000);
    const approval = await tx.approvalRequest.create({
      data: {
        supportCaseId: params.supportCaseId,
        ruleId: params.ruleId,
        requestedByUserId: params.requestedByUserId,
        reason: params.reason,
        dueAt,
        events: {
          create: {
            eventType: ApprovalEventType.REQUESTED,
            authorUserId: params.requestedByUserId,
            comment: params.reason,
            metadata: { source: params.source },
          },
        },
        steps: {
          create: {
            approvalTeamId: params.approvalTeamId,
            stepOrder: 1,
            dueAt,
          },
        },
      },
      include: {
        steps: {
          orderBy: { stepOrder: 'asc' },
          take: 1,
        },
      },
    });
    const currentStepId = approval.steps[0]?.id;

    if (!currentStepId) {
      throw new BadRequestException('Aprovacao sem etapa criada.');
    }

    await tx.approvalRequest.update({
      where: { id: approval.id },
      data: { currentStepId },
    });
    await tx.supportCase.update({
      where: { id: params.supportCaseId },
      data: { status: SupportCaseStatus.WAITING_APPROVAL, updatedAt: now },
    });
    await tx.supportCaseEvent.create({
      data: {
        supportCaseId: params.supportCaseId,
        eventType: SupportCaseEventType.APPROVAL_REQUESTED,
        authorUserId: params.requestedByUserId,
        toValue: params.approvalTeamId,
        metadata: { reason: params.reason, source: params.source, dueAt: dueAt.toISOString() },
      },
    });
    await this.closeResponsibilityPeriodsWith(tx, params.supportCaseId, now);
    await this.openResponsibilityPeriodWith(tx, {
      supportCaseId: params.supportCaseId,
      ownerType: SupportResponsibilityOwnerType.APPROVAL_TEAM,
      ownerTeamId: params.approvalTeamId,
      approvalRequestId: approval.id,
      reason: 'approval_pending',
    });

    return tx.approvalRequest.findUniqueOrThrow({
      where: { id: approval.id },
      include: this.approvalRequestInclude(),
    });
  }

  private closeResponsibilityPeriodsWith(
    tx: Prisma.TransactionClient,
    supportCaseId: string,
    endedAt: Date,
  ) {
    return tx.supportResponsibilityPeriod.updateMany({
      where: { supportCaseId, endedAt: null },
      data: { endedAt },
    });
  }

  private openResponsibilityPeriodWith(
    tx: Prisma.TransactionClient,
    params: {
      supportCaseId: string;
      ownerType: SupportResponsibilityOwnerType;
      ownerTeamId?: string | null;
      approvalRequestId?: string | null;
      reason: string;
    },
  ) {
    return tx.supportResponsibilityPeriod.create({
      data: {
        supportCaseId: params.supportCaseId,
        ownerType: params.ownerType,
        ownerTeamId: params.ownerTeamId ?? null,
        approvalRequestId: params.approvalRequestId ?? null,
        reason: params.reason,
      },
    });
  }

  private approvalRequestStatusForDecision(decision: ApprovalStepStatus) {
    if (decision === ApprovalStepStatus.APPROVED) {
      return ApprovalRequestStatus.APPROVED;
    }

    if (decision === ApprovalStepStatus.REJECTED) {
      return ApprovalRequestStatus.REJECTED;
    }

    return ApprovalRequestStatus.CHANGES_REQUESTED;
  }

  private approvalEventTypeForDecision(decision: ApprovalStepStatus) {
    if (decision === ApprovalStepStatus.APPROVED) {
      return ApprovalEventType.APPROVED;
    }

    if (decision === ApprovalStepStatus.REJECTED) {
      return ApprovalEventType.REJECTED;
    }

    return ApprovalEventType.CHANGES_REQUESTED;
  }

  private toApprovalRuleDto(rule: {
    id: string;
    status: SupportCatalogStatus;
    priority: number;
    conditions: Prisma.JsonValue | null;
    defaultDueMinutes: number | null;
    manualTriggerAllowed: boolean;
    department: { id: string; code: string; name: string } | null;
    topic: { id: string; code: string; name: string } | null;
    form: { id: string; title: string; version: number } | null;
    approvalTeam: { id: string; code: string; name: string };
  }) {
    return {
      id: rule.id,
      status: rule.status,
      priority: rule.priority,
      conditions: rule.conditions,
      defaultDueMinutes: rule.defaultDueMinutes,
      manualTriggerAllowed: rule.manualTriggerAllowed,
      department: rule.department,
      topic: rule.topic,
      form: rule.form,
      approvalTeam: rule.approvalTeam,
    };
  }

  private toApprovalRequestDto(approval: {
    id: string;
    status: ApprovalRequestStatus;
    reason: string | null;
    dueAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    decidedAt: Date | null;
    supportCase: {
      id: string;
      code: string;
      title: string;
      status: SupportCaseStatus;
      requester: {
        id: string;
        email: string;
        person: { fullName: string };
      };
    };
    currentStep: {
      id: string;
      status: ApprovalStepStatus;
      dueAt: Date | null;
      decisionComment: string | null;
      approvalTeam: { id: string; code: string; name: string };
      decidedBy: {
        id: string;
        email: string;
        person: { fullName: string };
      } | null;
    } | null;
    events?: Array<{
      id: string;
      eventType: ApprovalEventType;
      comment: string | null;
      createdAt: Date;
      authorUser: {
        id: string;
        email: string;
        person: { fullName: string };
      } | null;
    }>;
    rule?: unknown;
  }) {
    return {
      id: approval.id,
      status: approval.status,
      reason: approval.reason,
      dueAt: approval.dueAt?.toISOString() ?? null,
      createdAt: approval.createdAt.toISOString(),
      updatedAt: approval.updatedAt.toISOString(),
      decidedAt: approval.decidedAt?.toISOString() ?? null,
      supportCase: {
        id: approval.supportCase.id,
        code: approval.supportCase.code,
        title: approval.supportCase.title,
        status: approval.supportCase.status,
        requester: {
          id: approval.supportCase.requester.id,
          name: approval.supportCase.requester.person.fullName,
          email: approval.supportCase.requester.email,
        },
      },
      currentStep: approval.currentStep
        ? {
            id: approval.currentStep.id,
            status: approval.currentStep.status,
            dueAt: approval.currentStep.dueAt?.toISOString() ?? null,
            decisionComment: approval.currentStep.decisionComment,
            approvalTeam: approval.currentStep.approvalTeam,
            decidedBy: approval.currentStep.decidedBy
              ? {
                  id: approval.currentStep.decidedBy.id,
                  name: approval.currentStep.decidedBy.person.fullName,
                  email: approval.currentStep.decidedBy.email,
                }
              : null,
          }
        : null,
      events:
        approval.events?.map((event) => ({
          id: event.id,
          type: event.eventType,
          comment: event.comment,
          createdAt: event.createdAt.toISOString(),
          author: event.authorUser
            ? {
                id: event.authorUser.id,
                name: event.authorUser.person.fullName,
                email: event.authorUser.email,
              }
            : null,
        })) ?? [],
    };
  }

  private async findReusableRequesterCase(
    requesterUserId: string,
    departmentId: string,
    topicId: string | null,
    openingPolicy: SupportCaseOpeningPolicy,
    businessKey: string | null,
  ) {
    if (openingPolicy === SupportCaseOpeningPolicy.INDIVIDUAL_REQUEST) {
      return null;
    }

    if (openingPolicy === SupportCaseOpeningPolicy.BUSINESS_KEY && !businessKey) {
      return null;
    }

    return this.prisma.supportCase.findFirst({
      where: {
        requesterUserId,
        departmentId,
        topicId,
        businessKey:
          openingPolicy === SupportCaseOpeningPolicy.BUSINESS_KEY
            ? businessKey
            : undefined,
        status: { in: ACTIVE_SUPPORT_CASE_STATUSES },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      include: this.caseDetailInclude(),
    });
  }

  private resolveBusinessKey(
    topic: { openingPolicy?: SupportCaseOpeningPolicy; businessKeyFieldCode?: string | null } | null,
    fieldValues: NormalizedSupportFieldValue[],
  ) {
    if (topic?.openingPolicy !== SupportCaseOpeningPolicy.BUSINESS_KEY) {
      return null;
    }

    const fieldCode = topic.businessKeyFieldCode?.trim();
    if (!fieldCode) {
      throw new BadRequestException(
        'Assunto configurado com chave de negocio sem campo de referencia.',
      );
    }

    const fieldValue = fieldValues.find((value) => value.fieldCode === fieldCode);
    if (!fieldValue || !fieldValue.value.trim()) {
      throw new BadRequestException(
        'Preencha o campo usado como chave de negocio deste atendimento.',
      );
    }

    if (fieldValue.sensitive) {
      throw new BadRequestException(
        'Campo sensivel nao pode ser usado como chave de negocio do atendimento.',
      );
    }

    return fieldValue.value.trim().slice(0, 160);
  }

  private generateCaseTitle(
    requestedTitle: string | undefined,
    route: {
      department: { name: string } | null;
      topic: { name: string } | null;
    },
    fieldValues: NormalizedSupportFieldValue[],
  ) {
    const trimmed = requestedTitle?.trim();
    if (trimmed) {
      return trimmed;
    }

    const base = route.topic?.name ?? route.department?.name ?? 'Atendimento';
    const publicContext = fieldValues.find(
      (fieldValue) => !fieldValue.sensitive && fieldValue.value.trim().length > 0,
    )?.value.trim();

    if (!publicContext) {
      return base;
    }

    return `${base} - ${publicContext}`.slice(0, 140);
  }

  private async findActiveTeamOrThrow(teamCode: string) {
    const team = await this.prisma.supportTeam.findUnique({
      where: { code: teamCode.trim().toUpperCase() },
    });

    if (!team || team.status !== 'ACTIVE') {
      throw new NotFoundException('Equipe de atendimento nao encontrada.');
    }

    return team;
  }

  private async resolveCreateRoute(dto: CreateSupportCaseDto) {
    if (dto.topicId) {
      const topic = await this.prisma.supportTopic.findUnique({
        where: { id: dto.topicId },
        include: {
          department: true,
          formBindings: {
            where: { status: SupportCatalogStatus.ACTIVE },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            include: {
              form: {
                include: {
                  fields: {
                    orderBy: { sortOrder: 'asc' },
                  },
                },
              },
            },
          },
        },
      });

      if (
        !topic ||
        topic.status !== SupportCatalogStatus.ACTIVE ||
        topic.department.status !== SupportCatalogStatus.ACTIVE
      ) {
        throw new NotFoundException('Assunto de atendimento nao encontrado.');
      }

      if (dto.departmentId && dto.departmentId !== topic.departmentId) {
        throw new BadRequestException('Assunto nao pertence ao setor informado.');
      }

      return {
        department: topic.department,
        topic,
        form: this.primaryTopicForm(topic.formBindings),
        team: null,
      };
    }

    if (dto.departmentId) {
      const department = await this.prisma.supportDepartment.findUnique({
        where: { id: dto.departmentId },
      });

      if (!department || department.status !== SupportCatalogStatus.ACTIVE) {
        throw new NotFoundException('Setor de atendimento nao encontrado.');
      }

      const team = await this.findTeamForRoute(department.id, null);

      return {
        department,
        topic: null,
        form: null,
        team,
      };
    }

    if (dto.teamCode) {
      return {
        department: null,
        topic: null,
        form: null,
        team: await this.findActiveTeamOrThrow(dto.teamCode),
      };
    }

    throw new BadRequestException('Informe setor e assunto do atendimento.');
  }

  private async findTeamForRoute(
    departmentId: string,
    topicId: string | null,
    fieldValues: NormalizedSupportFieldValue[] = [],
  ) {
    if (topicId) {
      const topicRules = await this.findRouteRules(departmentId, topicId);
      const topicTeam = this.firstMatchingRouteTeam(topicRules, fieldValues);

      if (topicTeam) {
        return topicTeam;
      }
    }

    const fallbackRules = await this.findRouteRules(departmentId, null);
    const fallbackTeam = this.firstMatchingRouteTeam(fallbackRules, fieldValues);

    if (fallbackTeam) {
      return fallbackTeam;
    }

    throw new NotFoundException('Regra de roteamento nao encontrada para este atendimento.');
  }

  private findRouteRules(departmentId: string, topicId: string | null) {
    return this.prisma.supportRoutingRule.findMany({
      where: {
        departmentId,
        topicId,
        status: SupportCatalogStatus.ACTIVE,
        team: { status: 'ACTIVE' },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      include: { team: true },
    });
  }

  private normalizeFieldValues(
    fields: Array<{
      id: string;
      code: string;
      label: string;
      required: boolean;
      sensitive: boolean;
      visibleWhen?: Prisma.JsonValue | null;
      requiredWhen?: Prisma.JsonValue | null;
    }>,
    inputValues: Array<{ fieldId: string; value: string }>,
  ): NormalizedSupportFieldValue[] {
    const valuesByFieldId = new Map(
      inputValues.map((fieldValue) => [
        fieldValue.fieldId,
        fieldValue.value.trim(),
      ]),
    );
    const rawFieldValues = fields.map((field) => ({
      fieldId: field.id,
      fieldCode: field.code,
      value: valuesByFieldId.get(field.id) ?? '',
      sensitive: field.sensitive,
    }));

    const normalized = fields.flatMap((field) => {
      const value = valuesByFieldId.get(field.id) ?? '';
      const visible = this.fieldConditionMatches(
        field.visibleWhen ?? null,
        rawFieldValues,
        true,
      );
      const required = field.required || this.fieldConditionMatches(
        field.requiredWhen ?? null,
        rawFieldValues,
        false,
      );

      if (!visible) {
        return [];
      }

      if (!value && !required) {
        return [];
      }

      if (!value && required) {
        throw new BadRequestException(`Campo obrigatorio nao preenchido: ${field.label}.`);
      }

      return [
        {
          fieldId: field.id,
          fieldCode: field.code,
          value,
          sensitive: field.sensitive,
        },
      ];
    });

    const validFieldIds = new Set(fields.map((field) => field.id));
    const invalidField = inputValues.find(
      (fieldValue) => !validFieldIds.has(fieldValue.fieldId),
    );

    if (invalidField) {
      throw new BadRequestException('Campo de formulario invalido.');
    }

    return normalized;
  }

  private fieldConditionMatches(
    rawConditions: Prisma.JsonValue | null,
    fieldValues: NormalizedSupportFieldValue[],
    defaultValue: boolean,
  ) {
    const conditions = this.asRoutingConditions(rawConditions);

    if (!conditions) {
      return defaultValue;
    }

    return this.routingConditionsMatch(rawConditions, fieldValues);
  }

  private firstMatchingRouteTeam(
    rules: RoutingRuleWithTeam[],
    fieldValues: NormalizedSupportFieldValue[],
  ) {
    return rules.find((rule) =>
      this.routingConditionsMatch(rule.conditions, fieldValues),
    )?.team ?? null;
  }

  private primaryTopicForm(
    bindings: Array<{
      isPrimary?: boolean;
      form: {
        id: string;
        version: number;
        title: string;
        description: string | null;
        status?: SupportCatalogStatus;
        fields: Array<{
          id: string;
          code: string;
          label: string;
          fieldType: SupportFormFieldType;
          required: boolean;
          sensitive: boolean;
          helpText: string | null;
          options: Prisma.JsonValue | null;
          visibleWhen: Prisma.JsonValue | null;
          requiredWhen: Prisma.JsonValue | null;
          sortOrder?: number;
        }>;
      };
    }>,
  ) {
    return bindings.find((binding) => binding.isPrimary)?.form ?? bindings[0]?.form ?? null;
  }

  private routingConditionsMatch(
    rawConditions: Prisma.JsonValue | null,
    fieldValues: NormalizedSupportFieldValue[],
  ) {
    const conditions = this.asRoutingConditions(rawConditions);

    if (!conditions) {
      return true;
    }

    const all = conditions.all ?? [];
    const any = conditions.any ?? [];
    const allMatches = all.length === 0 || all.every((condition) =>
      this.routingConditionMatches(condition, fieldValues),
    );
    const anyMatches = any.length === 0 || any.some((condition) =>
      this.routingConditionMatches(condition, fieldValues),
    );

    return allMatches && anyMatches;
  }

  private asRoutingConditions(rawConditions: Prisma.JsonValue | null) {
    if (!rawConditions || typeof rawConditions !== 'object' || Array.isArray(rawConditions)) {
      return null;
    }

    const conditions = rawConditions as RoutingConditions;
    const hasAll = Array.isArray(conditions.all);
    const hasAny = Array.isArray(conditions.any);

    if (!hasAll && !hasAny) {
      return null;
    }

    return {
      all: hasAll ? conditions.all : [],
      any: hasAny ? conditions.any : [],
    };
  }

  private routingConditionMatches(
    condition: RoutingCondition,
    fieldValues: NormalizedSupportFieldValue[],
  ) {
    if (!condition.fieldCode) {
      return false;
    }

    const actual = fieldValues.find(
      (fieldValue) => fieldValue.fieldCode === condition.fieldCode,
    )?.value;
    const operator = condition.operator ?? 'equals';

    if (operator === 'exists') {
      return typeof actual === 'string' && actual.trim().length > 0;
    }

    if (typeof actual !== 'string') {
      return false;
    }

    const actualValue = this.normalizeComparableValue(actual);

    if (operator === 'equals') {
      return actualValue === this.normalizeComparableValue(condition.value);
    }

    if (operator === 'notEquals') {
      return actualValue !== this.normalizeComparableValue(condition.value);
    }

    if (operator === 'contains') {
      return actualValue.includes(this.normalizeComparableValue(condition.value));
    }

    if (operator === 'in') {
      return (condition.values ?? []).some(
        (value) => actualValue === this.normalizeComparableValue(value),
      );
    }

    return false;
  }

  private normalizeComparableValue(value: unknown) {
    return String(value ?? '').trim().toLocaleLowerCase('pt-BR');
  }

  private assertCaseAccess(
    user: AuthenticatedUser,
    supportCase: Pick<
      SupportCaseWithRelations,
      'requesterUserId' | 'assignedUserId' | 'currentTeam'
    >,
  ) {
    if (supportCase.requesterUserId === user.id) {
      return;
    }

    if (!this.isSupportUser(user)) {
      throw new ForbiddenException('Usuario sem acesso a este atendimento.');
    }

    this.assertSupportTeamAccess(user, supportCase.currentTeam?.code ?? null);

    if (this.canAccessAssignedCase(user, supportCase.assignedUserId)) {
      return;
    }

    throw new ForbiddenException('Usuario sem acesso a este atendimento.');
  }

  private isSupportUser(user: AuthenticatedUser) {
    return user.roles.some((role) => SUPPORT_ROLES.has(role));
  }

  private statusesFromState(state?: 'active' | 'waiting' | 'resolved') {
    if (state === 'active') {
      return [SupportCaseStatus.NEW, SupportCaseStatus.OPEN];
    }

    if (state === 'waiting') {
      return [
        SupportCaseStatus.WAITING_REQUESTER,
        SupportCaseStatus.WAITING_INTERNAL,
        SupportCaseStatus.WAITING_APPROVAL,
      ];
    }

    if (state === 'resolved') {
      return [SupportCaseStatus.RESOLVED, SupportCaseStatus.CLOSED];
    }

    return null;
  }

  private whereForQueueView(
    queue:
      | 'para-assumir'
      | 'meus-atendimentos'
      | 'da-equipe'
      | 'sla-critico'
      | 'todos'
      | 'novos-e-meus'
      | 'nao-atribuidos'
      | 'aguardando'
      | 'alta-prioridade'
      | 'resolvidos'
      | undefined,
    currentUserId: string,
  ): Prisma.SupportCaseWhereInput | undefined {
    if (!queue) {
      return undefined;
    }

    const resolvedStatuses = [SupportCaseStatus.RESOLVED, SupportCaseStatus.CLOSED];
    const unresolvedStatusFilter = { notIn: resolvedStatuses };

    if (queue === 'para-assumir' || queue === 'nao-atribuidos') {
      return {
        status: unresolvedStatusFilter,
        assignedUserId: null,
      };
    }

    if (queue === 'meus-atendimentos') {
      return {
        status: unresolvedStatusFilter,
        assignedUserId: currentUserId,
      };
    }

    if (queue === 'da-equipe' || queue === 'novos-e-meus') {
      return {
        status: unresolvedStatusFilter,
      };
    }

    if (queue === 'aguardando') {
      return {
        status: {
          in: [
            SupportCaseStatus.WAITING_REQUESTER,
            SupportCaseStatus.WAITING_INTERNAL,
            SupportCaseStatus.WAITING_APPROVAL,
          ],
        },
      };
    }

    if (queue === 'sla-critico' || queue === 'alta-prioridade') {
      return {
        status: unresolvedStatusFilter,
        OR: [
          { priority: { in: [SupportCasePriority.HIGH, SupportCasePriority.URGENT] } },
          { dueAt: { lte: new Date() } },
        ],
      };
    }

    if (queue === 'resolvidos') {
      return {
        status: { in: resolvedStatuses },
      };
    }

    return undefined;
  }

  private normalizeSupportQueue(queue: ListSupportCasesDto['queue']) {
    if (!queue) {
      return 'para-assumir' as const;
    }

    if (queue === 'nao-atribuidos') {
      return 'para-assumir' as const;
    }

    if (queue === 'novos-e-meus') {
      return 'da-equipe' as const;
    }

    if (queue === 'alta-prioridade') {
      return 'sla-critico' as const;
    }

    if (queue === 'aguardando' || queue === 'resolvidos') {
      return 'todos' as const;
    }

    return queue;
  }

  private whereForRestrictedSupportVisibility(user: AuthenticatedUser) {
    if (this.canAccessAllSupportTeams(user)) {
      return undefined;
    }

    return {
      OR: [{ assignedUserId: user.id }, { assignedUserId: null }],
    } satisfies Prisma.SupportCaseWhereInput;
  }

  private toSupportFormSummary(form: {
    id: string;
    version: number;
    title: string;
    description: string | null;
    status?: SupportCatalogStatus;
    fields: Array<{
      id: string;
      code: string;
      label: string;
      fieldType: SupportFormFieldType;
      required: boolean;
      sensitive: boolean;
      helpText: string | null;
      options: Prisma.JsonValue | null;
      visibleWhen: Prisma.JsonValue | null;
      requiredWhen: Prisma.JsonValue | null;
      sortOrder?: number;
    }>;
  }) {
    return {
      id: form.id,
      version: form.version,
      title: form.title,
      description: form.description,
      status: form.status,
      fields: form.fields.map((field) => ({
        id: field.id,
        code: field.code,
        label: field.label,
        type: field.fieldType,
        required: field.required,
        sensitive: field.sensitive,
        helpText: field.helpText,
        options: field.options,
        visibleWhen: field.visibleWhen,
        requiredWhen: field.requiredWhen,
        sortOrder: field.sortOrder,
      })),
    };
  }

  private caseListInclude() {
    return {
      currentTeam: true,
      department: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      topic: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      requester: {
        select: {
          id: true,
          email: true,
          person: { select: { fullName: true } },
        },
      },
      assignedUser: {
        select: {
          id: true,
          email: true,
          person: { select: { fullName: true } },
        },
      },
      rating: {
        select: {
          score: true,
          comment: true,
          createdAt: true,
        },
      },
    };
  }

  private caseDetailInclude() {
    return {
      ...this.caseListInclude(),
      events: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          authorUser: {
            select: {
              id: true,
              email: true,
              person: { select: { fullName: true } },
            },
          },
        },
      },
      originConversation: {
        select: {
          messages: {
            where: { deletedAt: null },
            orderBy: { createdAt: 'desc' as const },
            take: 20,
            select: {
              id: true,
              body: true,
              senderName: true,
              senderUserId: true,
              createdAt: true,
            },
          },
        },
      },
      topicForm: {
        select: {
          id: true,
          version: true,
          title: true,
          fields: {
            orderBy: { sortOrder: 'asc' as const },
            select: {
              id: true,
              code: true,
              label: true,
              fieldType: true,
              required: true,
              sensitive: true,
              helpText: true,
              options: true,
              visibleWhen: true,
              requiredWhen: true,
              sortOrder: true,
            },
          },
        },
      },
      fieldValues: {
        select: {
          id: true,
          value: true,
          sensitive: true,
          field: {
            select: {
              id: true,
              code: true,
              label: true,
              fieldType: true,
            },
          },
        },
      },
    };
  }

  private toCaseListItem(supportCase: SupportCaseWithRelations) {
    return {
      id: supportCase.id,
      code: supportCase.code,
      department: supportCase.department
        ? {
            id: supportCase.department.id,
            code: supportCase.department.code,
            name: supportCase.department.name,
          }
        : null,
      topic: supportCase.topic
        ? {
            id: supportCase.topic.id,
            code: supportCase.topic.code,
            name: supportCase.topic.name,
          }
        : null,
      title: supportCase.title,
      description: supportCase.description,
      status: supportCase.status,
      priority: supportCase.priority,
      teamCode: supportCase.currentTeam?.code ?? supportCase.currentSector,
      teamName:
        supportCase.currentTeam?.name ??
        supportCase.currentSector ??
        'Atendimento',
      requester: {
        id: supportCase.requester.id,
        name: supportCase.requester.person.fullName,
        email: supportCase.requester.email,
      },
      assignedUser: supportCase.assignedUser
        ? {
            id: supportCase.assignedUser.id,
            name: supportCase.assignedUser.person.fullName,
            email: supportCase.assignedUser.email,
          }
        : null,
      rating: supportCase.rating
        ? {
            score: supportCase.rating.score,
            comment: supportCase.rating.comment,
            createdAt: supportCase.rating.createdAt.toISOString(),
          }
        : null,
      originConversationId: supportCase.originConversationId,
      dueAt: supportCase.dueAt?.toISOString() ?? null,
      resolvedAt: supportCase.resolvedAt?.toISOString() ?? null,
      closedAt: supportCase.closedAt?.toISOString() ?? null,
      createdAt: supportCase.createdAt.toISOString(),
      updatedAt: supportCase.updatedAt.toISOString(),
    };
  }

  private toCaseDetail(supportCase: SupportCaseWithRelations, viewerUserId: string) {
    return {
      ...this.toCaseListItem(supportCase),
      events:
        supportCase.events?.map((event) => ({
          id: event.id,
          type: event.eventType,
          fromValue: event.fromValue,
          toValue: event.toValue,
          author: event.authorUser
            ? {
                id: event.authorUser.id,
                name: event.authorUser.person.fullName,
                email: event.authorUser.email,
              }
            : null,
          createdAt: event.createdAt.toISOString(),
        })) ?? [],
      messages:
        supportCase.originConversation?.messages
          .slice()
          .reverse()
          .map((message) => ({
            id: message.id,
            body: message.body,
            senderName: message.senderName,
            mine: message.senderUserId === viewerUserId,
            createdAt: message.createdAt.toISOString(),
          })) ?? [],
      form: supportCase.topicForm
        ? {
            id: supportCase.topicForm.id,
            version: supportCase.topicForm.version,
            title: supportCase.topicForm.title,
            fields: supportCase.topicForm.fields.map((field) => ({
              id: field.id,
              code: field.code,
              label: field.label,
              type: field.fieldType,
              required: field.required,
              sensitive: field.sensitive,
              helpText: field.helpText,
              options: field.options,
              visibleWhen: field.visibleWhen,
              requiredWhen: field.requiredWhen,
            })),
          }
        : null,
      fieldValues:
        supportCase.fieldValues?.map((fieldValue) => ({
          id: fieldValue.id,
          fieldId: fieldValue.field.id,
          fieldCode: fieldValue.field.code,
          label: fieldValue.field.label,
          type: fieldValue.field.fieldType,
          value: fieldValue.sensitive ? null : fieldValue.value,
          sensitive: fieldValue.sensitive,
        })) ?? [],
    };
  }

  private assertCaseAcceptsMessage(
    supportCase: Pick<SupportCaseWithRelations, 'status'>,
  ) {
    if (supportCase.status !== SupportCaseStatus.CLOSED) {
      return;
    }

    throw new BadRequestException('Atendimento fechado nao recebe mensagens.');
  }

  private assertStatusChangeAllowed(
    status: SupportCaseStatus,
    changeReason: string | null,
  ) {
    if (status !== SupportCaseStatus.RESOLVED && status !== SupportCaseStatus.CLOSED) {
      return;
    }

    this.assertResolutionReason(changeReason);
  }

  private assertTransferReason(reason: string | null) {
    if (
      reason &&
      Object.values(SupportTransferReason).includes(reason as SupportTransferReason)
    ) {
      return;
    }

    throw new BadRequestException('Informe um motivo de transferencia valido.');
  }

  private assertResolutionReason(reason: string | null) {
    if (
      reason &&
      Object.values(SupportResolutionReason).includes(reason as SupportResolutionReason)
    ) {
      return;
    }

    throw new BadRequestException('Informe um motivo valido para resolver ou fechar o atendimento.');
  }

  private assertReopenWindow(resolvedAt: Date, now: Date) {
    const reopenDeadline = new Date(
      resolvedAt.getTime() + CASE_REOPEN_WINDOW_DAYS * 86_400_000,
    );

    if (now <= reopenDeadline) {
      return;
    }

    throw new BadRequestException('A janela de reabertura deste atendimento expirou.');
  }

  private caseChangeMetadata(reason: string | null, comment?: string | null) {
    if (!reason && !comment) {
      return undefined;
    }

    return {
      reason: reason ?? undefined,
      comment: comment ?? undefined,
    };
  }

  private assertChangeReason(reason: string | null, message: string) {
    if (reason && reason.length >= 4) {
      return;
    }

    throw new BadRequestException(message);
  }

  private async assertAssignableUser(
    currentUser: AuthenticatedUser,
    assignedUserId: string,
  ) {
    if (
      assignedUserId !== currentUser.id &&
      !currentUser.roles.some((role) => UNRESTRICTED_SUPPORT_ROLES.has(role))
    ) {
      throw new ForbiddenException('Usuario sem permissao para atribuir terceiros.');
    }

    const assignee = await this.prisma.user.findUnique({
      where: { id: assignedUserId },
      select: {
        status: true,
        roles: true,
      },
    });

    if (!assignee || assignee.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('Atendente nao encontrado.');
    }

    if (!assignee.roles.some((role) => SUPPORT_ROLES.has(role))) {
      throw new BadRequestException('Usuario informado nao e atendente.');
    }
  }

  private assertTeamFilterAccess(user: AuthenticatedUser, teamCode: string | null) {
    if (!teamCode || this.canAccessAllSupportTeams(user)) {
      return;
    }

    if (this.allowedTeamCodes(user)?.includes(teamCode)) {
      return;
    }

    throw new ForbiddenException('Usuario sem acesso a esta equipe de atendimento.');
  }

  private assertSupportTeamAccess(user: AuthenticatedUser, teamCode: string | null) {
    if (this.canAccessAllSupportTeams(user)) {
      return;
    }

    if (teamCode && this.allowedTeamCodes(user)?.includes(teamCode)) {
      return;
    }

    throw new ForbiddenException('Usuario sem acesso a esta fila de atendimento.');
  }

  private canAccessAllSupportTeams(user: AuthenticatedUser) {
    return user.roles.some((role) => UNRESTRICTED_SUPPORT_ROLES.has(role));
  }

  private canAccessAssignedCase(
    user: AuthenticatedUser,
    assignedUserId: string | null,
  ) {
    if (!assignedUserId) {
      return true;
    }

    if (assignedUserId === user.id) {
      return true;
    }

    return this.canAccessAllSupportTeams(user);
  }

  private allowedTeamCodes(user: AuthenticatedUser) {
    if (this.canAccessAllSupportTeams(user)) {
      return null;
    }

    const codes = user.roles
      .map((role) => TEAM_ROLE_CODES[role])
      .filter((code): code is string => Boolean(code));

    return codes.length > 0 ? codes : null;
  }

  private async getUserDisplayName(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        person: {
          select: { fullName: true },
        },
      },
    });

    return user?.person.fullName ?? user?.email ?? 'Usuario Jornada';
  }

  private userParticipantKey(userId: string) {
    return `user:${userId}`;
  }

  private teamParticipantKey(teamId: string) {
    return `team:${teamId}`;
  }

  private legacySectorFromTeamCode(code: string) {
    if (Object.values(ChatSector).includes(code as ChatSector)) {
      return code as ChatSector;
    }

    return ChatSector.SUPPORT;
  }

  private normalizeTriageText(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }

  private triageInputHash(value: string) {
    return createHash('sha256')
      .update(this.normalizeTriageText(value))
      .digest('hex');
  }

  private normalizeCatalogCode(value: string) {
    return value.trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
  }

  private normalizeFieldCode(value: string) {
    return value
      .trim()
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .replace(/^([0-9])/, '_$1');
  }

  private optionalText(value?: string) {
    const trimmed = value?.trim();

    return trimmed ? trimmed : null;
  }

  private normalizedFieldOptions(options?: string[]) {
    const normalized = (options ?? [])
      .map((option) => option.trim())
      .filter((option) => option.length > 0);

    return normalized.length > 0 ? normalized : undefined;
  }

  private routingConditionsInput(conditions?: Record<string, unknown>) {
    return conditions === undefined
      ? Prisma.JsonNull
      : conditions as Prisma.InputJsonValue;
  }

  private conditionsInput(conditions?: Record<string, unknown>) {
    return conditions === undefined
      ? Prisma.JsonNull
      : conditions as Prisma.InputJsonValue;
  }
}
