import {
  ChatSector,
  Role,
  SupportCaseEventType,
  SupportCaseOpeningPolicy,
  SupportCasePriority,
  SupportCaseStatus,
  SupportCatalogStatus,
  SupportFormFieldType,
  SupportResponsibilityOwnerType,
  UserStatus,
} from '@prisma/client';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import type { PrismaService } from '../../database/prisma.service';
import type { SupportCaseCodeFactory } from './factories/support-case-code.factory';
import type { SupportTextPolicyService } from './services/support-text-policy.service';
import {
  SupportReopenReason,
  SupportResolutionReason,
  SupportTransferReason,
} from './dto/support-case-change-reason';
import { SupportService } from './support.service';

describe('SupportService', () => {
  let service: SupportService;
  let supportCaseCodeFactory: {
    create: jest.Mock;
  };
  let supportTextPolicy: {
    normalizeUserText: jest.Mock;
    optionalMetadata: jest.Mock;
  };
  let eventOutbox: {
    recordWith: jest.Mock;
  };
  let slaPolicy: { calculateDueAt: jest.Mock };
  let previewReferences: { resolve: jest.Mock };
  let prisma: {
    supportTeam: {
      count: jest.Mock;
      delete: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    supportDepartment: {
      delete: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    supportTopic: {
      count: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      upsert: jest.Mock;
      update: jest.Mock;
    };
    supportRoutingRule: {
      count: jest.Mock;
      delete: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    formDefinition: {
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    supportTopicFormBinding: {
      count: jest.Mock;
      create: jest.Mock;
      findFirst: jest.Mock;
    };
    supportTeamMember: {
      count: jest.Mock;
      delete: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      upsert: jest.Mock;
    };
    supportCase: {
      count: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    supportCaseEvent: {
      create: jest.Mock;
      createMany: jest.Mock;
    };
    supportRating: {
      upsert: jest.Mock;
    };
    approvalRule: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    approvalRequest: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    approvalStep: {
      update: jest.Mock;
    };
    approvalEvent: {
      create: jest.Mock;
    };
    supportResponsibilityPeriod: {
      create: jest.Mock;
      updateMany: jest.Mock;
    };
    chatConversation: {
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    chatParticipant: {
      count: jest.Mock;
    };
    chatMessage: {
      create: jest.Mock;
    };
    user: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    auditLog: {
      create: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const employee: AuthenticatedUser = {
    id: 'user-1',
    email: 'colaborador@granservices.com.br',
    employeeId: 'GRN-001',
    roles: [Role.EMPLOYEE],
    status: UserStatus.ACTIVE,
  };
  const supportUser: AuthenticatedUser = {
    ...employee,
    id: 'support-1',
    email: 'suporte@granservices.com.br',
    roles: [Role.SUPPORT],
  };
  const team = {
    id: 'team_operations',
    code: 'OPERATIONS',
    name: 'Operacoes',
    status: 'ACTIVE',
    notificationProvider: null,
    notificationRef: null,
    createdAt: new Date('2026-08-23T10:00:00.000Z'),
    updatedAt: new Date('2026-08-23T10:00:00.000Z'),
  };
  const baseCase = {
    id: 'case-1',
    code: 'ATD-000001',
    title: 'Regularizar documento',
    description: 'Preciso atualizar meu ASO.',
    status: SupportCaseStatus.NEW,
    priority: SupportCasePriority.NORMAL,
    origin: 'CHAT',
    requesterUserId: employee.id,
    currentSector: ChatSector.OPERATIONS,
    currentTeamId: team.id,
    assignedUserId: null,
    originConversationId: 'conversation-1',
    originMessageId: null,
    dueAt: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date('2026-08-23T10:02:00.000Z'),
    updatedAt: new Date('2026-08-23T10:02:00.000Z'),
    currentTeam: team,
    requester: {
      id: employee.id,
      email: employee.email,
      person: { fullName: 'Colaborador Gran' },
    },
    assignedUser: null,
    rating: null,
    events: [],
  };

  beforeEach(() => {
    prisma = {
      supportTeam: {
        count: jest.fn(),
        delete: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      supportDepartment: {
        delete: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      supportTopic: {
        count: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
      supportRoutingRule: {
        count: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      formDefinition: {
        count: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      supportTopicFormBinding: {
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      supportTeamMember: {
        count: jest.fn(),
        delete: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        upsert: jest.fn(),
      },
      supportCase: {
        count: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      supportCaseEvent: {
        create: jest.fn(),
        createMany: jest.fn(),
      },
      supportRating: {
        upsert: jest.fn(),
      },
      approvalRule: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      approvalRequest: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      approvalStep: {
        update: jest.fn(),
      },
      approvalEvent: {
        create: jest.fn(),
      },
      supportResponsibilityPeriod: {
        create: jest.fn().mockResolvedValue({ id: 'responsibility-1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      chatConversation: {
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      chatParticipant: {
        count: jest.fn(),
      },
      chatMessage: {
        create: jest.fn(),
      },
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback(prisma),
      ),
    };

    supportCaseCodeFactory = {
      create: jest.fn().mockReturnValue('ATD-260823-ABCDEF12'),
    };
    prisma.supportCase.findUniqueOrThrow.mockResolvedValue(baseCase);
    supportTextPolicy = {
      normalizeUserText: jest.fn((value: string) => value.trim()),
      optionalMetadata: jest.fn().mockReturnValue({
        privacy: {
          classification: 'POTENTIALLY_SENSITIVE',
          retentionClass: 'SUPPORT_CASE_CONTENT',
        },
      }),
    };
    eventOutbox = {
      recordWith: jest.fn().mockResolvedValue({ id: 'event-1' }),
    };
    slaPolicy = {
      calculateDueAt: jest.fn().mockResolvedValue(new Date('2026-08-25T10:00:00.000Z')),
    };
    previewReferences = {
      resolve: jest.fn().mockReturnValue({
        workerId: 'worker-1',
        employeeNumber: 'GRN-002',
        operationalUnitId: 'unit-1',
        operationalUnitName: 'Unidade',
      }),
    };

    service = new SupportService(
      prisma as unknown as PrismaService,
      supportCaseCodeFactory as unknown as SupportCaseCodeFactory,
      supportTextPolicy as unknown as SupportTextPolicyService,
      {
        record: jest.fn((payload) => prisma.auditLog.create({ data: payload })),
      } as never,
      eventOutbox as never,
      slaPolicy as never,
      previewReferences as never,
    );
  });

  it('creates a support case with a linked conversation and team participant', async () => {
    prisma.supportTeam.findUnique.mockResolvedValue(team);
    prisma.chatConversation.create.mockResolvedValue({ id: 'conversation-1' });
    prisma.user.findUnique.mockResolvedValue({
      email: employee.email,
      person: { fullName: 'Colaborador Gran' },
    });
    prisma.chatMessage.create.mockResolvedValue({
      id: 'message-1',
      createdAt: new Date('2026-08-23T10:03:00.000Z'),
    });
    prisma.supportCase.create.mockResolvedValue(baseCase);

    const response = await service.createCase(employee, {
      teamCode: 'OPERATIONS',
      title: ' Regularizar documento ',
      description: ' Preciso atualizar meu ASO. ',
    });

    expect(supportCaseCodeFactory.create).toHaveBeenCalledTimes(1);
    expect(prisma.chatConversation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        employeeUserId: employee.id,
        primaryTeamId: team.id,
        title: 'Regularizar documento',
      }),
    });
    expect(prisma.supportCase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: 'ATD-260823-ABCDEF12',
        requesterUserId: employee.id,
        currentTeamId: team.id,
        originConversationId: 'conversation-1',
        dueAt: new Date('2026-08-25T10:00:00.000Z'),
      }),
      include: expect.any(Object),
    });
    expect(eventOutbox.recordWith).toHaveBeenCalledWith(
      prisma,
      expect.objectContaining({
        eventType: 'support.case.created',
        aggregateType: 'SupportCase',
        aggregateId: 'case-1',
        idempotencyKey: 'support.case.created:case-1',
        payload: expect.objectContaining({
          supportCaseId: 'case-1',
          requesterUserId: employee.id,
          teamCode: team.code,
        }),
      }),
    );
    expect(response.item).toMatchObject({
      code: 'ATD-000001',
      teamCode: 'OPERATIONS',
      requester: { name: 'Colaborador Gran' },
    });
  });

  it('adds a requester message to an active case for the same department and topic', async () => {
    const department = {
      id: 'dept_finance',
      code: 'FINANCE',
      name: 'Financeiro',
      description: null,
      status: 'ACTIVE',
      sortOrder: 10,
      createdAt: new Date('2026-08-23T10:00:00.000Z'),
      updatedAt: new Date('2026-08-23T10:00:00.000Z'),
    };
    const topic = {
      id: 'topic_finance_reimbursement',
      departmentId: department.id,
      code: 'REIMBURSEMENT',
      name: 'Reembolso',
      description: null,
      status: 'ACTIVE',
      defaultPriority: SupportCasePriority.NORMAL,
      sortOrder: 10,
      createdAt: new Date('2026-08-23T10:00:00.000Z'),
      updatedAt: new Date('2026-08-23T10:00:00.000Z'),
      department,
      formBindings: [],
    };
    const activeCase = {
      ...baseCase,
      id: 'case-reimbursement-active',
      departmentId: department.id,
      topicId: topic.id,
      department,
      topic,
      status: SupportCaseStatus.OPEN,
      originConversationId: 'conversation-reimbursement',
      originConversation: { messages: [] },
      topicForm: null,
      fieldValues: [],
    };
    const createdMessage = {
      id: 'message-reimbursement',
      body: 'Incluindo novo comprovante.',
      senderName: 'Colaborador Gran',
      senderUserId: employee.id,
      createdAt: new Date('2026-08-23T10:04:00.000Z'),
    };
    prisma.supportTopic.findUnique.mockResolvedValue(topic);
    prisma.supportCase.findFirst.mockResolvedValue(activeCase);
    prisma.supportCase.findUnique.mockResolvedValue(activeCase);
    prisma.user.findUnique.mockResolvedValue({
      email: employee.email,
      person: { fullName: 'Colaborador Gran' },
    });
    prisma.chatMessage.create.mockResolvedValue(createdMessage);
    prisma.supportCase.update.mockResolvedValue({
      ...activeCase,
      updatedAt: createdMessage.createdAt,
    });
    prisma.chatConversation.update.mockResolvedValue({ id: 'conversation-reimbursement' });
    prisma.supportCaseEvent.create.mockResolvedValue({ id: 'event-commented' });

    const response = await service.createCase(employee, {
      departmentId: department.id,
      topicId: topic.id,
      description: ' Incluindo novo comprovante. ',
    });

    expect(prisma.supportCase.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          requesterUserId: employee.id,
          departmentId: department.id,
          topicId: topic.id,
          status: {
            in: [
              SupportCaseStatus.NEW,
              SupportCaseStatus.OPEN,
              SupportCaseStatus.WAITING_REQUESTER,
              SupportCaseStatus.WAITING_INTERNAL,
            ],
          },
        }),
      }),
    );
    expect(prisma.supportRoutingRule.findMany).not.toHaveBeenCalled();
    expect(slaPolicy.calculateDueAt).not.toHaveBeenCalled();
    expect(prisma.chatConversation.create).not.toHaveBeenCalled();
    expect(prisma.supportCase.create).not.toHaveBeenCalled();
    expect(prisma.chatMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        conversationId: 'conversation-reimbursement',
        body: 'Incluindo novo comprovante.',
      }),
    });
    expect(response.item.id).toBe('case-reimbursement-active');
  });

  it('creates a separate case when the topic opening policy is individual request', async () => {
    const department = {
      id: 'dept_finance',
      code: 'FINANCE',
      name: 'Financeiro',
      description: null,
      status: 'ACTIVE',
      sortOrder: 10,
      createdAt: new Date('2026-08-23T10:00:00.000Z'),
      updatedAt: new Date('2026-08-23T10:00:00.000Z'),
    };
    const topic = {
      id: 'topic_finance_reimbursement',
      departmentId: department.id,
      code: 'REIMBURSEMENT',
      name: 'Reembolso',
      description: null,
      status: 'ACTIVE',
      defaultPriority: SupportCasePriority.NORMAL,
      openingPolicy: SupportCaseOpeningPolicy.INDIVIDUAL_REQUEST,
      businessKeyFieldCode: null,
      sortOrder: 10,
      createdAt: new Date('2026-08-23T10:00:00.000Z'),
      updatedAt: new Date('2026-08-23T10:00:00.000Z'),
      department,
      formBindings: [],
    };
    prisma.supportTopic.findUnique.mockResolvedValue(topic);
    prisma.supportRoutingRule.findMany.mockResolvedValue([{ team, conditions: null }]);
    prisma.chatConversation.create.mockResolvedValue({ id: 'conversation-reimbursement-new' });
    prisma.user.findUnique.mockResolvedValue({
      email: employee.email,
      person: { fullName: 'Colaborador Gran' },
    });
    prisma.chatMessage.create.mockResolvedValue({
      id: 'message-reimbursement-new',
      createdAt: new Date('2026-08-23T10:03:00.000Z'),
    });
    prisma.supportCase.create.mockResolvedValue({
      ...baseCase,
      id: 'case-reimbursement-new',
      department,
      topic,
      originConversationId: 'conversation-reimbursement-new',
    });
    prisma.supportCase.findUniqueOrThrow.mockResolvedValue({
      ...baseCase,
      id: 'case-reimbursement-new',
      department,
      topic,
      originConversationId: 'conversation-reimbursement-new',
    });

    const response = await service.createCase(employee, {
      departmentId: department.id,
      topicId: topic.id,
      description: 'Solicito outro reembolso.',
    });

    expect(prisma.supportCase.findFirst).not.toHaveBeenCalled();
    expect(prisma.chatConversation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: 'Reembolso',
      }),
    });
    expect(prisma.supportCase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        departmentId: department.id,
        topicId: topic.id,
        businessKey: null,
      }),
      include: expect.any(Object),
    });
    expect(response.item.id).toBe('case-reimbursement-new');
  });

  it('creates a support case from department topic routing and form values', async () => {
    const department = {
      id: 'dept_medicine',
      code: 'MEDICINE',
      name: 'Medicina',
      description: null,
      status: 'ACTIVE',
      sortOrder: 20,
      createdAt: new Date('2026-08-23T10:00:00.000Z'),
      updatedAt: new Date('2026-08-23T10:00:00.000Z'),
    };
    const topic = {
      id: 'topic_medicine_aso',
      departmentId: department.id,
      code: 'ASO',
      name: 'ASO',
      description: null,
      status: 'ACTIVE',
      defaultPriority: SupportCasePriority.HIGH,
      sortOrder: 10,
      createdAt: new Date('2026-08-23T10:00:00.000Z'),
      updatedAt: new Date('2026-08-23T10:00:00.000Z'),
      department,
      formBindings: [
        {
          form: {
            id: 'form_medicine_aso_v1',
            fields: [
              {
                id: 'field_aso_type',
                code: 'asoType',
                label: 'Tipo de ASO',
                required: true,
                sensitive: false,
              },
            ],
          },
        },
      ],
    };
    prisma.supportTopic.findUnique.mockResolvedValue(topic);
    prisma.supportRoutingRule.findMany.mockResolvedValue([{ team, conditions: null }]);
    prisma.chatConversation.create.mockResolvedValue({ id: 'conversation-1' });
    prisma.user.findUnique.mockResolvedValue({
      email: employee.email,
      person: { fullName: 'Colaborador Gran' },
    });
    prisma.chatMessage.create.mockResolvedValue({
      id: 'message-1',
      createdAt: new Date('2026-08-23T10:03:00.000Z'),
    });
    prisma.supportCase.create.mockResolvedValue({
      ...baseCase,
      department,
      topic,
    });

    await service.createCase(employee, {
      departmentId: department.id,
      topicId: topic.id,
      description: ' Preciso atualizar meu ASO. ',
      fieldValues: [{ fieldId: 'field_aso_type', value: 'Periodico' }],
    });

    expect(prisma.supportRoutingRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          departmentId: department.id,
          topicId: topic.id,
        }),
      }),
    );
    expect(prisma.supportCase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        departmentId: department.id,
        topicId: topic.id,
        topicFormId: 'form_medicine_aso_v1',
        title: 'ASO - Periodico',
        priority: SupportCasePriority.HIGH,
        currentTeamId: team.id,
        fieldValues: {
          create: [
            {
              fieldId: 'field_aso_type',
              value: 'Periodico',
              sensitive: false,
            },
          ],
        },
      }),
      include: expect.any(Object),
    });
  });

  it('opens an approval request when an approval rule matches the submitted form values', async () => {
    const department = {
      id: 'dept_finance',
      code: 'FINANCE',
      name: 'Financeiro',
      description: null,
      status: 'ACTIVE',
      sortOrder: 10,
      createdAt: new Date('2026-08-23T10:00:00.000Z'),
      updatedAt: new Date('2026-08-23T10:00:00.000Z'),
    };
    const approvalTeam = {
      ...team,
      id: 'team_approval',
      code: 'APPROVALS',
      name: 'Aprovadores',
    };
    const topic = {
      id: 'topic_finance_reimbursement',
      departmentId: department.id,
      code: 'REIMBURSEMENT',
      name: 'Reembolso',
      description: null,
      status: 'ACTIVE',
      defaultPriority: SupportCasePriority.NORMAL,
      openingPolicy: SupportCaseOpeningPolicy.INDIVIDUAL_REQUEST,
      businessKeyFieldCode: null,
      sortOrder: 10,
      createdAt: new Date('2026-08-23T10:00:00.000Z'),
      updatedAt: new Date('2026-08-23T10:00:00.000Z'),
      department,
      formBindings: [
        {
          form: {
            id: 'form_reimbursement_v1',
            fields: [
              {
                id: 'field_amount',
                code: 'amount',
                label: 'Valor',
                required: true,
                sensitive: false,
              },
            ],
          },
        },
      ],
    };
    prisma.supportTopic.findUnique.mockResolvedValue(topic);
    prisma.supportRoutingRule.findMany.mockResolvedValue([{ team, conditions: null }]);
    prisma.approvalRule.findMany.mockResolvedValue([
      {
        id: 'approval_rule_1',
        approvalTeamId: approvalTeam.id,
        defaultDueMinutes: 1440,
        conditions: {
          all: [{ fieldCode: 'amount', operator: 'exists' }],
        },
        createdAt: new Date('2026-08-23T10:00:00.000Z'),
      },
    ]);
    prisma.approvalRequest.create.mockResolvedValue({
      id: 'approval_request_1',
      steps: [{ id: 'approval_step_1' }],
    });
    prisma.approvalRequest.findUniqueOrThrow.mockResolvedValue({
      id: 'approval_request_1',
      status: 'PENDING',
      reason: 'Regra automatica de aprovacao.',
      dueAt: new Date('2026-08-24T10:00:00.000Z'),
      createdAt: new Date('2026-08-23T10:00:00.000Z'),
      updatedAt: new Date('2026-08-23T10:00:00.000Z'),
      decidedAt: null,
      supportCase: {
        id: 'case-approval',
        code: 'ATD-260823-ABCDEF12',
        title: 'Reembolso - 120',
        status: SupportCaseStatus.WAITING_APPROVAL,
        requester: {
          id: employee.id,
          email: employee.email,
          person: { fullName: 'Colaborador Gran' },
        },
      },
      currentStep: {
        id: 'approval_step_1',
        status: 'PENDING',
        dueAt: new Date('2026-08-24T10:00:00.000Z'),
        decisionComment: null,
        approvalTeam,
        decidedBy: null,
      },
      events: [],
    });
    prisma.chatConversation.create.mockResolvedValue({ id: 'conversation-approval' });
    prisma.user.findUnique.mockResolvedValue({
      email: employee.email,
      person: { fullName: 'Colaborador Gran' },
    });
    prisma.supportCase.create.mockResolvedValue({
      ...baseCase,
      id: 'case-approval',
      department,
      topic,
      topicFormId: 'form_reimbursement_v1',
      title: 'Reembolso - 120',
    });
    prisma.supportCase.findUniqueOrThrow.mockResolvedValue({
      ...baseCase,
      id: 'case-approval',
      status: SupportCaseStatus.WAITING_APPROVAL,
      department,
      topic,
      title: 'Reembolso - 120',
    });

    await service.createCase(employee, {
      departmentId: department.id,
      topicId: topic.id,
      fieldValues: [{ fieldId: 'field_amount', value: '120' }],
    });

    expect(prisma.approvalRequest.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        supportCaseId: 'case-approval',
        ruleId: 'approval_rule_1',
        requestedByUserId: employee.id,
      }),
      include: expect.any(Object),
    });
    expect(prisma.supportCase.update).toHaveBeenCalledWith({
      where: { id: 'case-approval' },
      data: expect.objectContaining({
        status: SupportCaseStatus.WAITING_APPROVAL,
      }),
    });
    expect(prisma.supportResponsibilityPeriod.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        supportCaseId: 'case-approval',
        ownerType: 'APPROVAL_TEAM',
        ownerTeamId: approvalTeam.id,
      }),
    });
  });

  it('requires a conditional field when its backend condition matches', async () => {
    const department = {
      id: 'dept_training',
      code: 'TRAINING',
      name: 'Treinamentos',
      description: null,
      status: 'ACTIVE',
      sortOrder: 30,
      createdAt: new Date('2026-08-23T10:00:00.000Z'),
      updatedAt: new Date('2026-08-23T10:00:00.000Z'),
    };
    const topic = {
      id: 'topic_training_certificate',
      departmentId: department.id,
      code: 'CERTIFICATE',
      name: 'Certificado',
      description: null,
      status: 'ACTIVE',
      defaultPriority: SupportCasePriority.NORMAL,
      sortOrder: 10,
      createdAt: new Date('2026-08-23T10:00:00.000Z'),
      updatedAt: new Date('2026-08-23T10:00:00.000Z'),
      department,
      formBindings: [
        {
          form: {
            id: 'form_training_certificate_v1',
            fields: [
              {
                id: 'field_has_certificate',
                code: 'hasCertificate',
                label: 'Possui certificado',
                required: true,
                sensitive: false,
                visibleWhen: null,
                requiredWhen: null,
              },
              {
                id: 'field_certificate_number',
                code: 'certificateNumber',
                label: 'Numero do certificado',
                required: false,
                sensitive: false,
                visibleWhen: {
                  all: [
                    {
                      fieldCode: 'hasCertificate',
                      operator: 'equals',
                      value: 'true',
                    },
                  ],
                },
                requiredWhen: {
                  all: [
                    {
                      fieldCode: 'hasCertificate',
                      operator: 'equals',
                      value: 'true',
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    };
    prisma.supportTopic.findUnique.mockResolvedValue(topic);

    await expect(
      service.createCase(employee, {
        departmentId: department.id,
        topicId: topic.id,
        fieldValues: [{ fieldId: 'field_has_certificate', value: 'true' }],
      }),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.supportRoutingRule.findMany).not.toHaveBeenCalled();
    expect(prisma.supportCase.create).not.toHaveBeenCalled();
  });

  it('routes support case by form answer before using the default rule', async () => {
    const department = {
      id: 'dept_medicine',
      code: 'MEDICINE',
      name: 'Medicina',
      description: null,
      status: 'ACTIVE',
      sortOrder: 20,
      createdAt: new Date('2026-08-23T10:00:00.000Z'),
      updatedAt: new Date('2026-08-23T10:00:00.000Z'),
    };
    const asoTeam = {
      ...team,
      id: 'team_aso',
      code: 'MEDICINE_ASO',
      name: 'Equipe ASO',
    };
    const certificateTeam = {
      ...team,
      id: 'team_certificate',
      code: 'MEDICINE_CERTIFICATE',
      name: 'Equipe Atestados',
    };
    const fallbackTeam = {
      ...team,
      id: 'team_medicine',
      code: 'MEDICINE',
      name: 'Equipe Medicina',
    };
    const topic = {
      id: 'topic_medicine_aso',
      departmentId: department.id,
      code: 'ASO',
      name: 'ASO',
      description: null,
      status: 'ACTIVE',
      defaultPriority: SupportCasePriority.NORMAL,
      sortOrder: 10,
      createdAt: new Date('2026-08-23T10:00:00.000Z'),
      updatedAt: new Date('2026-08-23T10:00:00.000Z'),
      department,
      formBindings: [
        {
          form: {
            id: 'form_medicine_aso_v1',
            fields: [
              {
                id: 'field_request_type',
                code: 'requestType',
                label: 'Tipo de solicitacao',
                required: true,
                sensitive: false,
              },
            ],
          },
        },
      ],
    };
    prisma.supportTopic.findUnique.mockResolvedValue(topic);
    prisma.supportRoutingRule.findMany.mockResolvedValueOnce([
      {
        team: certificateTeam,
        conditions: {
          all: [
            {
              fieldCode: 'requestType',
              operator: 'equals',
              value: 'Atestado',
            },
          ],
        },
      },
      {
        team: asoTeam,
        conditions: {
          all: [
            {
              fieldCode: 'requestType',
              operator: 'equals',
              value: 'ASO',
            },
          ],
        },
      },
      { team: fallbackTeam, conditions: null },
    ]);
    prisma.chatConversation.create.mockResolvedValue({ id: 'conversation-1' });
    prisma.user.findUnique.mockResolvedValue({
      email: employee.email,
      person: { fullName: 'Colaborador Gran' },
    });
    prisma.chatMessage.create.mockResolvedValue({
      id: 'message-1',
      createdAt: new Date('2026-08-23T10:03:00.000Z'),
    });
    prisma.supportCase.create.mockResolvedValue({
      ...baseCase,
      currentTeamId: asoTeam.id,
      currentTeam: asoTeam,
      department,
      topic,
    });

    await service.createCase(employee, {
      departmentId: department.id,
      topicId: topic.id,
      fieldValues: [{ fieldId: 'field_request_type', value: 'aso' }],
    });

    expect(prisma.supportCase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        currentTeamId: asoTeam.id,
        fieldValues: {
          create: [
            {
              fieldId: 'field_request_type',
              value: 'aso',
              sensitive: false,
            },
          ],
        },
      }),
      include: expect.any(Object),
    });
  });

  it('uses the primary topic form binding instead of the first active binding', async () => {
    const department = {
      id: 'dept_finance',
      code: 'FINANCE',
      name: 'Financeiro',
      description: null,
      status: 'ACTIVE',
      sortOrder: 10,
      createdAt: new Date('2026-08-23T10:00:00.000Z'),
      updatedAt: new Date('2026-08-23T10:00:00.000Z'),
    };
    const topic = {
      id: 'topic_finance_reimbursement',
      departmentId: department.id,
      code: 'REIMBURSEMENT',
      name: 'Reembolso',
      description: null,
      status: 'ACTIVE',
      defaultPriority: SupportCasePriority.NORMAL,
      sortOrder: 10,
      createdAt: new Date('2026-08-23T10:00:00.000Z'),
      updatedAt: new Date('2026-08-23T10:00:00.000Z'),
      department,
      formBindings: [
        {
          isPrimary: false,
          form: {
            id: 'form_finance_reimbursement_v1',
            fields: [],
          },
        },
        {
          isPrimary: true,
          form: {
            id: 'form_finance_reimbursement_v2',
            fields: [],
          },
        },
      ],
    };

    prisma.supportTopic.findUnique.mockResolvedValue(topic);
    prisma.supportRoutingRule.findMany.mockResolvedValue([{ team, conditions: null }]);
    prisma.chatConversation.create.mockResolvedValue({ id: 'conversation-1' });
    prisma.user.findUnique.mockResolvedValue({
      email: employee.email,
      person: { fullName: 'Colaborador Gran' },
    });
    prisma.chatMessage.create.mockResolvedValue({
      id: 'message-1',
      createdAt: new Date('2026-08-23T10:03:00.000Z'),
    });
    prisma.supportCase.create.mockResolvedValue({
      ...baseCase,
      department,
      topic,
      topicFormId: 'form_finance_reimbursement_v2',
    });

    await service.createCase(employee, {
      departmentId: department.id,
      topicId: topic.id,
      description: 'Solicito reembolso.',
    });

    expect(prisma.supportCase.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        topicFormId: 'form_finance_reimbursement_v2',
      }),
      include: expect.any(Object),
    });
  });

  it('limits employee listing to their own support cases', async () => {
    prisma.supportCase.findMany.mockResolvedValue([baseCase]);

    await service.listCases(employee, {});

    expect(prisma.supportCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          requesterUserId: employee.id,
        }),
      }),
    );
  });

  it('allows an admin validation preview to list cases for the selected worker user', async () => {
    const adminUser: AuthenticatedUser = {
      ...supportUser,
      id: 'admin-1',
      roles: [Role.ADMIN],
    };
    prisma.user.findFirst.mockResolvedValue({
      id: 'worker-user-2',
      email: 'worker2@granservices.com.br',
      roles: [Role.EMPLOYEE],
      status: UserStatus.ACTIVE,
      person: {
        employee: {
          employeeNumber: 'GRN-002',
        },
      },
    });
    prisma.supportCase.findMany.mockResolvedValue([
      {
        ...baseCase,
        requesterUserId: 'worker-user-2',
        requester: {
          id: 'worker-user-2',
          email: 'worker2@granservices.com.br',
          person: { fullName: 'Colaborador Validado' },
        },
      },
    ]);

    await service.listCases(adminUser, {
      previewReference: 'preview-reference',
    });

    expect(previewReferences.resolve).toHaveBeenCalledWith(adminUser.id, 'preview-reference');
    expect(prisma.supportCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          requesterUserId: 'worker-user-2',
        }),
      }),
    );
  });

  it('filters support queues on the backend for unassigned active cases', async () => {
    prisma.supportCase.findMany.mockResolvedValue([baseCase]);

    await service.listCases(supportUser, {
      queue: 'nao-atribuidos',
    });

    expect(prisma.supportCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              assignedUserId: null,
              status: {
                notIn: [SupportCaseStatus.RESOLVED, SupportCaseStatus.CLOSED],
              },
            },
          ],
        }),
      }),
    );
  });

  it('filters support queues on the backend for the current assignee', async () => {
    prisma.supportCase.findMany.mockResolvedValue([baseCase]);

    await service.listCases(supportUser, {
      queue: 'meus-atendimentos',
    });

    expect(prisma.supportCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              assignedUserId: supportUser.id,
              status: {
                notIn: [SupportCaseStatus.RESOLVED, SupportCaseStatus.CLOSED],
              },
            },
          ],
        }),
      }),
    );
  });

  it('defaults support listing to the team backlog when no queue filter is provided', async () => {
    prisma.supportCase.findMany.mockResolvedValue([baseCase]);

    await service.listCases(supportUser, {});

    expect(prisma.supportCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              assignedUserId: null,
              status: {
                notIn: [SupportCaseStatus.RESOLVED, SupportCaseStatus.CLOSED],
              },
            },
          ],
        }),
      }),
    );
  });

  it('allows support roles to update assignment and status', async () => {
    prisma.supportCase.findUnique.mockResolvedValue(baseCase);
    prisma.user.findUnique.mockResolvedValue({
      status: UserStatus.ACTIVE,
      roles: [Role.SUPPORT],
    });
    prisma.supportCase.update.mockResolvedValue({
      ...baseCase,
      status: SupportCaseStatus.RESOLVED,
      assignedUserId: supportUser.id,
      assignedUser: {
        id: supportUser.id,
        email: supportUser.email,
        person: { fullName: 'Atendente Gran' },
      },
    });

    const response = await service.updateCase(supportUser, baseCase.id, {
      status: SupportCaseStatus.RESOLVED,
      assignedUserId: supportUser.id,
      changeReason: SupportResolutionReason.RESOLVED,
      changeComment: 'Demanda resolvida pelo setor.',
    });

    expect(prisma.supportCase.update).toHaveBeenCalledWith({
      where: { id: baseCase.id },
      data: expect.objectContaining({
        status: SupportCaseStatus.RESOLVED,
        assignedUserId: supportUser.id,
      }),
      include: expect.any(Object),
    });
    expect(prisma.supportCaseEvent.createMany).toHaveBeenCalled();
    expect(response.item).toMatchObject({
      status: SupportCaseStatus.RESOLVED,
      assignedUser: { name: 'Atendente Gran' },
    });
  });

  it('clears the assignee automatically when transferring the case to another team', async () => {
    const nextTeam = {
      ...team,
      id: 'team_finance',
      code: 'FINANCE',
      name: 'Financeiro',
    };
    prisma.supportCase.findUnique.mockResolvedValue({
      ...baseCase,
      assignedUserId: supportUser.id,
      assignedUser: {
        id: supportUser.id,
        email: supportUser.email,
        person: { fullName: 'Atendente Gran' },
      },
    });
    prisma.supportTeam.findUnique.mockResolvedValue(nextTeam);
    prisma.supportCase.update.mockResolvedValue({
      ...baseCase,
      currentTeamId: nextTeam.id,
      currentTeam: nextTeam,
      assignedUserId: null,
      assignedUser: null,
    });

    await service.updateCase(supportUser, baseCase.id, {
      teamCode: 'FINANCE',
      changeReason: SupportTransferReason.WRONG_TEAM,
      changeComment: 'Encaminhando para a equipe correta.',
    });

    expect(prisma.supportCase.update).toHaveBeenCalledWith({
      where: { id: baseCase.id },
      data: expect.objectContaining({
        currentTeamId: nextTeam.id,
        assignedUserId: null,
        dueAt: new Date('2026-08-25T10:00:00.000Z'),
      }),
      include: expect.any(Object),
    });
    expect(slaPolicy.calculateDueAt).toHaveBeenCalledWith(
      baseCase.priority,
      expect.any(Date),
    );
    expect(prisma.supportResponsibilityPeriod.updateMany).toHaveBeenCalledWith({
      where: { supportCaseId: baseCase.id, endedAt: null },
      data: { endedAt: expect.any(Date) },
    });
    expect(prisma.supportResponsibilityPeriod.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        supportCaseId: baseCase.id,
        ownerType: SupportResponsibilityOwnerType.SUPPORT_TEAM,
        ownerTeamId: nextTeam.id,
        reason: `team_transfer:${SupportTransferReason.WRONG_TEAM}`,
      }),
    });
    expect(prisma.supportCaseEvent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          supportCaseId: baseCase.id,
          eventType: SupportCaseEventType.TRANSFERRED,
          toValue: 'FINANCE',
          metadata: expect.objectContaining({
            reason: SupportTransferReason.WRONG_TEAM,
            comment: 'Encaminhando para a equipe correta.',
            previousDueAt: null,
            nextDueAt: '2026-08-25T10:00:00.000Z',
          }),
        }),
        expect.objectContaining({
          supportCaseId: baseCase.id,
          eventType: SupportCaseEventType.ASSIGNED,
          fromValue: supportUser.id,
          toValue: null,
        }),
      ]),
    });
  });

  it('requires a reason before resolving a support case', async () => {
    prisma.supportCase.findUnique.mockResolvedValue(baseCase);

    await expect(
      service.updateCase(supportUser, baseCase.id, {
        status: SupportCaseStatus.RESOLVED,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reopens a resolved case explicitly within seven days and returns it to the team backlog', async () => {
    prisma.supportCase.findUnique.mockResolvedValue({
      ...baseCase,
      status: SupportCaseStatus.RESOLVED,
      resolvedAt: new Date(Date.now() - 2 * 86_400_000),
      dueAt: new Date('2026-08-24T10:00:00.000Z'),
    });
    prisma.chatMessage.create.mockResolvedValue({
      id: 'message-reopen',
      body: 'Ainda preciso de ajuda.',
      senderName: 'Colaborador Gran',
      createdAt: new Date('2026-08-24T10:00:00.000Z'),
    });
    prisma.supportCase.update.mockResolvedValue({
      ...baseCase,
      status: SupportCaseStatus.OPEN,
      assignedUserId: null,
      dueAt: new Date('2026-08-25T10:00:00.000Z'),
    });

    await service.reopenCase(employee, baseCase.id, {
      reason: SupportReopenReason.REQUESTER_NOT_RESOLVED,
      message: 'Ainda preciso de ajuda.',
    });

    expect(prisma.supportCase.update).toHaveBeenCalledWith({
      where: { id: baseCase.id },
      data: expect.objectContaining({
        status: SupportCaseStatus.OPEN,
        assignedUserId: null,
        dueAt: new Date('2026-08-25T10:00:00.000Z'),
        closedAt: null,
      }),
      include: expect.any(Object),
    });
    expect(prisma.supportCaseEvent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          eventType: SupportCaseEventType.STATUS_CHANGED,
          fromValue: SupportCaseStatus.RESOLVED,
          toValue: SupportCaseStatus.OPEN,
          metadata: expect.objectContaining({
            reason: SupportReopenReason.REQUESTER_NOT_RESOLVED,
            source: 'requester_reopen',
          }),
        }),
        expect.objectContaining({
          eventType: SupportCaseEventType.COMMENTED,
          toValue: 'message-reopen',
        }),
      ]),
    });
    expect(prisma.supportResponsibilityPeriod.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        supportCaseId: baseCase.id,
        ownerType: SupportResponsibilityOwnerType.SUPPORT_TEAM,
        ownerTeamId: baseCase.currentTeamId,
        reason: `case_reopened:${SupportReopenReason.REQUESTER_NOT_RESOLVED}`,
      }),
    });
  });

  it('blocks a sector support role from updating another team queue', async () => {
    const medicineUser: AuthenticatedUser = {
      ...supportUser,
      id: 'medicine-1',
      roles: [Role.MEDICINE],
    };
    prisma.supportCase.findUnique.mockResolvedValue(baseCase);

    await expect(
      service.updateCase(medicineUser, baseCase.id, {
        status: SupportCaseStatus.OPEN,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('blocks a restricted team agent from opening a case assigned to another attendant', async () => {
    const operationsUser: AuthenticatedUser = {
      ...supportUser,
      id: 'operations-1',
      roles: [Role.OPERATIONS],
    };

    prisma.supportCase.findUnique.mockResolvedValue({
      ...baseCase,
      assignedUserId: 'operations-2',
      assignedUser: {
        id: 'operations-2',
        email: 'outra.pessoa@granservices.com.br',
        person: { fullName: 'Outra Pessoa' },
      },
    });

    await expect(
      service.getCase(operationsUser, baseCase.id),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('keeps restricted team agents focused on backlog livre ou atendimentos proprios', async () => {
    const operationsUser: AuthenticatedUser = {
      ...supportUser,
      id: 'operations-1',
      roles: [Role.OPERATIONS],
    };

    prisma.supportCase.findMany.mockResolvedValue([baseCase]);

    await service.listCases(operationsUser, {});

    expect(prisma.supportCase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          currentTeam: { code: { in: ['OPERATIONS'] } },
          AND: [
            {
              assignedUserId: null,
              status: {
                notIn: [SupportCaseStatus.RESOLVED, SupportCaseStatus.CLOSED],
              },
            },
            {
              OR: [
                { assignedUserId: 'operations-1' },
                { assignedUserId: null },
              ],
            },
          ],
        }),
      }),
    );
  });

  it('blocks rating before the support case is resolved', async () => {
    prisma.supportCase.findUnique.mockResolvedValue(baseCase);

    await expect(
      service.rateCase(employee, baseCase.id, { score: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('stores one rating per resolved support case', async () => {
    prisma.supportCase.findUnique.mockResolvedValue({
      ...baseCase,
      status: SupportCaseStatus.RESOLVED,
      resolvedAt: new Date('2026-08-23T11:00:00.000Z'),
    });
    prisma.supportRating.upsert.mockResolvedValue({
      score: 5,
      comment: 'Atendimento claro.',
      createdAt: new Date('2026-08-23T11:05:00.000Z'),
    });

    const response = await service.rateCase(employee, baseCase.id, {
      score: 5,
      comment: ' Atendimento claro. ',
    });

    expect(prisma.supportRating.upsert).toHaveBeenCalledWith({
      where: { supportCaseId: baseCase.id },
      create: expect.objectContaining({
        supportCaseId: baseCase.id,
        reviewerUserId: employee.id,
        score: 5,
        comment: 'Atendimento claro.',
      }),
      update: expect.objectContaining({
        score: 5,
        comment: 'Atendimento claro.',
      }),
    });
    expect(response.rating).toMatchObject({
      score: 5,
      comment: 'Atendimento claro.',
    });
  });

  it('blocks employees from maintaining the support catalog', async () => {
    await expect(service.listCatalogAdmin(employee)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('allows admins to list the full support catalog', async () => {
    const adminUser = {
      ...supportUser,
      roles: [Role.ADMIN],
    };
    prisma.supportDepartment.findMany.mockResolvedValue([
      {
        id: 'dept_hr',
        code: 'HR',
        name: 'RH',
        description: null,
        status: SupportCatalogStatus.ACTIVE,
        sortOrder: 10,
        topics: [
          {
            id: 'topic_vacation',
            code: 'VACATION',
            name: 'Ferias',
            description: null,
            status: SupportCatalogStatus.ACTIVE,
            defaultPriority: SupportCasePriority.NORMAL,
            sortOrder: 10,
            formBindings: [
              {
                form: {
                  id: 'form_vacation_v1',
                  version: 1,
                  title: 'Solicitacao de ferias',
                  description: null,
                  status: SupportCatalogStatus.ACTIVE,
                  fields: [
                    {
                      id: 'field_start_date',
                      code: 'startDate',
                      label: 'Data inicial',
                      fieldType: SupportFormFieldType.DATE,
                      required: true,
                      sensitive: false,
                      helpText: null,
                      options: null,
                      visibleWhen: null,
                      requiredWhen: null,
                      sortOrder: 1,
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ]);
    prisma.supportTeam.findMany.mockResolvedValue([
      {
        id: 'team_hr',
        code: 'HR',
        name: 'Equipe RH',
        status: SupportCatalogStatus.ACTIVE,
        department: {
          id: 'dept_hr',
          code: 'HR',
          name: 'RH',
        },
        members: [],
      },
    ]);
    prisma.supportRoutingRule.findMany.mockResolvedValue([
      {
        id: 'rule_hr_vacation',
        status: SupportCatalogStatus.ACTIVE,
        priority: 100,
        conditions: null,
        department: {
          id: 'dept_hr',
          code: 'HR',
          name: 'RH',
        },
        topic: {
          id: 'topic_vacation',
          code: 'VACATION',
          name: 'Ferias',
        },
        team: {
          id: 'team_hr',
          code: 'HR',
          name: 'Equipe RH',
        },
      },
    ]);

    const response = await service.listCatalogAdmin(adminUser);

    expect(response.departments).toHaveLength(1);
    expect(response.departments[0]).toMatchObject({
      id: 'dept_hr',
      name: 'RH',
      topics: [
        {
          id: 'topic_vacation',
          forms: [
            {
              id: 'form_vacation_v1',
              fields: [
                {
                  id: 'field_start_date',
                  type: SupportFormFieldType.DATE,
                },
              ],
            },
          ],
        },
      ],
    });
    expect(response.teams).toHaveLength(1);
    expect(response.routingRules).toHaveLength(1);
  });

  it('allows only global admins to maintain support departments', async () => {
    await expect(
      service.upsertDepartment(supportUser, {
        code: 'FINANCEIRO',
        name: 'Financeiro',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('soft deletes a department when it has related records', async () => {
    const adminUser = {
      ...supportUser,
      roles: [Role.ADMIN],
    };
    prisma.supportDepartment.findUnique.mockResolvedValue({ id: 'dept_hr' });
    prisma.supportTopic.count.mockResolvedValue(1);
    prisma.supportTeam.count.mockResolvedValue(0);
    prisma.supportRoutingRule.count.mockResolvedValue(0);
    prisma.supportCase.count.mockResolvedValue(0);
    prisma.supportDepartment.update.mockResolvedValue({
      id: 'dept_hr',
      status: SupportCatalogStatus.INACTIVE,
    });

    const response = await service.deleteDepartment(adminUser, 'dept_hr');

    expect(prisma.supportDepartment.update).toHaveBeenCalledWith({
      where: { id: 'dept_hr' },
      data: { status: SupportCatalogStatus.INACTIVE },
    });
    expect(prisma.supportDepartment.delete).not.toHaveBeenCalled();
    expect(response.deletionMode).toBe('SOFT');
  });

  it('hard deletes a routing rule after validating access and existence', async () => {
    prisma.supportRoutingRule.findUnique.mockResolvedValue({ id: 'rule-1' });
    prisma.supportRoutingRule.delete.mockResolvedValue({ id: 'rule-1' });

    const response = await service.deleteRoutingRule(supportUser, 'rule-1');

    expect(prisma.supportRoutingRule.delete).toHaveBeenCalledWith({
      where: { id: 'rule-1' },
    });
    expect(response.deletionMode).toBe('HARD');
  });

  it('soft deletes a team when removing it would break linked records', async () => {
    prisma.supportTeam.findUnique.mockResolvedValue({ id: 'team_hr' });
    prisma.supportTeamMember.count.mockResolvedValue(1);
    prisma.supportRoutingRule.count.mockResolvedValue(0);
    prisma.supportCase.count.mockResolvedValue(0);
    prisma.chatConversation.count.mockResolvedValue(0);
    prisma.chatParticipant.count.mockResolvedValue(0);
    prisma.supportTeam.update.mockResolvedValue({
      id: 'team_hr',
      status: 'INACTIVE',
    });

    const response = await service.deleteTeam(supportUser, 'team_hr');

    expect(prisma.supportTeam.update).toHaveBeenCalledWith({
      where: { id: 'team_hr' },
      data: { status: 'INACTIVE' },
    });
    expect(prisma.supportTeam.delete).not.toHaveBeenCalled();
    expect(response.deletionMode).toBe('SOFT');
  });

  it('creates a new versioned support topic form for global form admins', async () => {
    const formAdmin = {
      ...supportUser,
      roles: [Role.ADMIN],
    };
    prisma.supportTopic.findUnique.mockResolvedValue({
      id: 'topic_hr_vacation',
      departmentId: 'dept_hr',
    });
    prisma.formDefinition.findFirst.mockResolvedValue({ version: 2 });
    prisma.formDefinition.create.mockResolvedValue({
      id: 'form_hr_vacation_v3',
      version: 3,
      title: 'Solicitacao de ferias',
      description: 'Planejamento de descanso',
      status: SupportCatalogStatus.ACTIVE,
      fields: [],
    });
    prisma.supportTopicFormBinding.create.mockResolvedValue({
      id: 'binding_form_hr_vacation_v3',
    });

    await service.createTopicForm(formAdmin, 'topic_hr_vacation', {
      title: ' Solicitacao de ferias ',
      description: ' Planejamento de descanso ',
      fields: [
        {
          code: 'start date',
          label: 'Data inicial',
          type: SupportFormFieldType.DATE,
          required: true,
        },
        {
          code: 'observations',
          label: 'Observacoes',
          type: SupportFormFieldType.TEXTAREA,
          sensitive: true,
        },
      ],
    });

    expect(prisma.formDefinition.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        topicId: 'topic_hr_vacation',
        ownerType: 'SUPPORT_DEPARTMENT',
        ownerDepartmentId: 'dept_hr',
        version: 3,
        title: 'Solicitacao de ferias',
        description: 'Planejamento de descanso',
        status: SupportCatalogStatus.ACTIVE,
        fields: {
          create: [
            expect.objectContaining({
              code: 'start_date',
              label: 'Data inicial',
              fieldType: 'DATE',
              required: true,
              sensitive: false,
              sortOrder: 1,
            }),
            expect.objectContaining({
              code: 'observations',
              label: 'Observacoes',
              fieldType: 'TEXTAREA',
              required: false,
              sensitive: true,
              sortOrder: 2,
            }),
          ],
        },
      }),
      include: {
        fields: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    expect(prisma.supportTopicFormBinding.create).toHaveBeenCalledWith({
      data: {
        topicId: 'topic_hr_vacation',
        formId: 'form_hr_vacation_v3',
        status: SupportCatalogStatus.ACTIVE,
        isPrimary: true,
        sortOrder: 3,
      },
    });
  });

  it('validates that routing rule topics belong to the selected department', async () => {
    prisma.supportDepartment.findUnique.mockResolvedValue({ id: 'dept_hr' });
    prisma.supportTeam.findUnique.mockResolvedValue({ id: 'team_hr' });
    prisma.supportTopic.findUnique.mockResolvedValue({
      id: 'topic_medicine_aso',
      departmentId: 'dept_medicine',
    });

    await expect(
      service.upsertRoutingRule(supportUser, {
        departmentId: 'dept_hr',
        topicId: 'topic_medicine_aso',
        teamId: 'team_hr',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
