import {
  ChatConversationStatus,
  ChatMessageSenderType,
  ChatSector,
  Role,
  UserStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';
import type { PrismaService } from '../../database/prisma.service';
import { ChatService } from './chat.service';
import type { ChatIdentityPort } from './ports/chat-identity.port';
import type { SupportTeamDirectoryService } from './support-team-directory.service';

describe('ChatService', () => {
  let service: ChatService;
  let supportTeamDirectory: {
    ensureDefaultTeams: jest.Mock;
    findTeamByCode: jest.Mock;
  };
  let chatIdentity: ChatIdentityPort;
  let prisma: {
    chatConversation: {
      create: jest.Mock;
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findUniqueOrThrow: jest.Mock;
      update: jest.Mock;
    };
    chatMessage: {
      count: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
    };
    chatParticipant: {
      upsert: jest.Mock;
      findUnique: jest.Mock;
    };
    chatReadState: {
      upsert: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const user: AuthenticatedUser = {
    id: 'user-1',
    email: 'colaborador@granservices.com.br',
    employeeId: 'GRN-001',
    roles: [Role.EMPLOYEE],
    status: UserStatus.ACTIVE,
  };
  const updatedAt = new Date('2026-08-23T10:00:00.000Z');
  const teamOperations = {
    id: 'team_operations',
    code: 'OPERATIONS',
    name: 'Operacoes',
    legacySector: ChatSector.OPERATIONS,
    status: 'ACTIVE',
    notificationProvider: null,
    notificationRef: null,
    createdAt: updatedAt,
    updatedAt,
  };
  const defaultTeams = [
    teamOperations,
    {
      ...teamOperations,
      id: 'team_medicine',
      code: 'MEDICINE',
      name: 'Medicina',
      legacySector: ChatSector.MEDICINE,
    },
    {
      ...teamOperations,
      id: 'team_training',
      code: 'TRAINING',
      name: 'Treinamento',
      legacySector: ChatSector.TRAINING,
    },
  ];

  beforeEach(() => {
    prisma = {
      chatConversation: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      chatMessage: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      chatParticipant: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      chatReadState: {
        upsert: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback: (tx: unknown) => Promise<unknown>) =>
        callback(prisma),
      ),
    };
    supportTeamDirectory = {
      ensureDefaultTeams: jest.fn().mockResolvedValue(defaultTeams),
      findTeamByCode: jest.fn().mockResolvedValue(teamOperations),
    };
    chatIdentity = {
      resolveUser: jest.fn().mockResolvedValue({
        actorType: 'USER',
        actorId: user.id,
        displayName: 'Colaborador Gran',
      }),
    };

    service = new ChatService(
      prisma as unknown as PrismaService,
      supportTeamDirectory as unknown as SupportTeamDirectoryService,
      chatIdentity,
    );
  });

  it('creates the default support team conversations before listing chat', async () => {
    prisma.chatConversation.findFirst.mockResolvedValue(null);
    prisma.chatConversation.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: `conversation-${data.primaryTeamId}`,
        employeeUserId: user.id,
        sector: data.sector,
        primaryTeamId: data.primaryTeamId,
        title: data.title,
        status: ChatConversationStatus.OPEN,
        lastMessageAt: null,
        createdAt: updatedAt,
        updatedAt,
      }),
    );
    prisma.chatConversation.findMany.mockResolvedValue([
      {
        id: 'conversation-1',
        employeeUserId: user.id,
        sector: ChatSector.OPERATIONS,
        title: 'Operacoes',
        status: ChatConversationStatus.OPEN,
        lastMessageAt: null,
        createdAt: updatedAt,
        updatedAt,
        primaryTeam: teamOperations,
        messages: [],
        readStates: [],
      },
    ]);
    prisma.chatMessage.count.mockResolvedValue(0);

    const response = await service.listConversations(user, {});

    expect(prisma.chatConversation.findFirst).toHaveBeenCalledTimes(3);
    expect(prisma.chatConversation.create).toHaveBeenCalledTimes(3);
    expect(prisma.chatParticipant.upsert).toHaveBeenCalledTimes(6);
    expect(response.items).toHaveLength(1);
    expect(response.items[0]).toMatchObject({
      id: 'conversation-1',
      sector: ChatSector.OPERATIONS,
      teamCode: 'OPERATIONS',
      teamName: 'Operacoes',
      unreadCount: 0,
    });
  });

  it('sends a message and marks it as read for the sender', async () => {
    const createdAt = new Date('2026-08-23T10:05:00.000Z');
    const conversation = {
      id: 'conversation-1',
      employeeUserId: user.id,
      sector: ChatSector.OPERATIONS,
      primaryTeamId: teamOperations.id,
      title: 'Operacoes',
      status: ChatConversationStatus.OPEN,
      lastMessageAt: null,
      createdAt,
      updatedAt: createdAt,
    };
    const message = {
      id: 'message-1',
      conversationId: conversation.id,
      senderType: ChatMessageSenderType.USER,
      senderUserId: user.id,
      senderSector: null,
      senderTeamId: null,
      senderName: 'Colaborador Gran',
      body: 'Bom dia',
      clientMessageId: 'client-1',
      createdAt,
      editedAt: null,
      deletedAt: null,
    };

    prisma.chatConversation.findUnique.mockResolvedValue(conversation);
    prisma.chatParticipant.findUnique.mockResolvedValue({
      id: 'participant-1',
      leftAt: null,
    });
    prisma.chatMessage.findUnique.mockResolvedValue(null);
    prisma.chatMessage.create.mockResolvedValue(message);
    prisma.chatConversation.findUniqueOrThrow.mockResolvedValue({
      ...conversation,
      lastMessageAt: createdAt,
      primaryTeam: teamOperations,
      messages: [message],
      readStates: [{ lastReadAt: createdAt, lastReadMessageId: message.id }],
    });
    prisma.chatMessage.count.mockResolvedValue(0);

    const response = await service.sendMessage(user, conversation.id, {
      body: ' Bom dia ',
      clientMessageId: 'client-1',
    });

    expect(prisma.chatMessage.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        body: 'Bom dia',
        conversationId: conversation.id,
        senderUserId: user.id,
      }),
    });
    expect(prisma.chatReadState.upsert).toHaveBeenCalled();
    expect(response.message).toMatchObject({
      id: message.id,
      body: 'Bom dia',
      mine: true,
    });
  });
});
