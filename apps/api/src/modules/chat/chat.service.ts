import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ChatConversationKind,
  ChatConversation,
  ChatMessage,
  ChatMessageSenderType,
  ChatSector,
  SupportTeam,
} from '@prisma/client';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { PrismaService } from '../../database/prisma.service';
import { ListChatConversationsDto } from './dto/list-chat-conversations.dto';
import { ListChatMessagesDto } from './dto/list-chat-messages.dto';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { SupportTeamDirectoryService } from './support-team-directory.service';
import { CHAT_IDENTITY_PORT } from './ports/chat-identity.port';
import type { ChatIdentityPort } from './ports/chat-identity.port';

type ConversationWithPreview = ChatConversation & {
  primaryTeam: SupportTeam | null;
  messages: ChatMessage[];
  readStates: Array<{
    lastReadAt: Date;
    lastReadMessageId: string | null;
  }>;
};

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly supportTeamDirectory: SupportTeamDirectoryService,
    @Inject(CHAT_IDENTITY_PORT)
    private readonly chatIdentity: ChatIdentityPort,
  ) {}

  async listConversations(
    user: AuthenticatedUser,
    query: ListChatConversationsDto,
  ) {
    await this.ensureDefaultConversations(user.id);

    const limit = query.limit ?? 20;
    const team = query.teamCode
      ? await this.supportTeamDirectory.findTeamByCode(query.teamCode)
      : null;
    const conversations = await this.prisma.chatConversation.findMany({
      where: {
        participants: {
          some: {
            participantType: 'USER',
            userId: user.id,
            leftAt: null,
          },
        },
        primaryTeamId: query.teamCode
          ? team?.id ?? '__missing_team__'
          : undefined,
        sector: query.teamCode ? undefined : query.sector,
      },
      orderBy: [
        { lastMessageAt: 'desc' },
        { updatedAt: 'desc' },
      ],
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        primaryTeam: true,
        readStates: {
          where: { userId: user.id },
          select: {
            lastReadAt: true,
            lastReadMessageId: true,
          },
        },
      },
    });

    const mapped = await Promise.all(
      conversations.map((conversation) =>
        this.toConversationListItem(conversation, user.id),
      ),
    );

    const normalizedSearch = query.q?.trim().toLocaleLowerCase('pt-BR');
    const unreadOnly = query.unread === 'true';

    return {
      items: mapped.filter((conversation) => {
        if (unreadOnly && conversation.unreadCount === 0) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        return [
          conversation.title,
          conversation.sectorLabel,
          conversation.lastMessage?.body ?? '',
        ]
          .join(' ')
          .toLocaleLowerCase('pt-BR')
          .includes(normalizedSearch);
      }),
    };
  }

  async listMessages(
    user: AuthenticatedUser,
    conversationId: string,
    query: ListChatMessagesDto,
  ) {
    await this.assertConversationAccess(user.id, conversationId);

    const limit = query.limit ?? 30;
    const cursorDate = query.cursor ? new Date(query.cursor) : null;
    const messages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
        deletedAt: null,
        createdAt: cursorDate ? { lt: cursorDate } : undefined,
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });

    const hasMore = messages.length > limit;
    const page = messages.slice(0, limit).reverse();
    const nextCursor = hasMore ? page[0]?.createdAt.toISOString() : null;

    return {
      items: page.map((message) => this.toMessageDto(message, user.id)),
      nextCursor,
    };
  }

  async sendMessage(
    user: AuthenticatedUser,
    conversationId: string,
    dto: SendChatMessageDto,
  ) {
    const conversation = await this.assertConversationAccess(
      user.id,
      conversationId,
    );
    const body = dto.body.trim();
    const clientMessageId = dto.clientMessageId?.trim() || undefined;

    if (!body) {
      throw new BadRequestException('Mensagem nao pode ficar vazia.');
    }

    if (clientMessageId) {
      const existingMessage = await this.prisma.chatMessage.findUnique({
        where: {
          conversationId_clientMessageId: {
            conversationId,
            clientMessageId,
          },
        },
      });

      if (existingMessage) {
        return {
          message: this.toMessageDto(existingMessage, user.id),
          conversation: await this.toConversationListItem(
            {
              ...conversation,
              messages: [existingMessage],
              primaryTeam: null,
              readStates: [],
            },
            user.id,
          ),
        };
      }
    }

    const senderName = await this.getUserDisplayName(user.id);
    const message = await this.prisma.$transaction(async (tx) => {
      const createdMessage = await tx.chatMessage.create({
        data: {
          conversationId,
          senderType: ChatMessageSenderType.USER,
          senderUserId: user.id,
          senderName,
          body,
          clientMessageId,
        },
      });

      await tx.chatConversation.update({
        where: { id: conversationId },
        data: {
          lastMessageAt: createdMessage.createdAt,
        },
      });

      await tx.chatReadState.upsert({
        where: {
          conversationId_userId: {
            conversationId,
            userId: user.id,
          },
        },
        create: {
          conversationId,
          userId: user.id,
          lastReadAt: createdMessage.createdAt,
          lastReadMessageId: createdMessage.id,
        },
        update: {
          lastReadAt: createdMessage.createdAt,
          lastReadMessageId: createdMessage.id,
        },
      });

      return createdMessage;
    });

    const refreshedConversation =
      await this.prisma.chatConversation.findUniqueOrThrow({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          readStates: {
            where: { userId: user.id },
            select: {
              lastReadAt: true,
              lastReadMessageId: true,
            },
          },
          primaryTeam: true,
        },
      });

    return {
      message: this.toMessageDto(message, user.id),
      conversation: await this.toConversationListItem(
        refreshedConversation,
        user.id,
      ),
    };
  }

  async markRead(user: AuthenticatedUser, conversationId: string) {
    await this.assertConversationAccess(user.id, conversationId);
    const lastMessage = await this.prisma.chatMessage.findFirst({
      where: {
        conversationId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    await this.prisma.chatReadState.upsert({
      where: {
        conversationId_userId: {
          conversationId,
          userId: user.id,
        },
      },
      create: {
        conversationId,
        userId: user.id,
        lastReadAt: new Date(),
        lastReadMessageId: lastMessage?.id ?? null,
      },
      update: {
        lastReadAt: new Date(),
        lastReadMessageId: lastMessage?.id ?? null,
      },
    });

    return { ok: true };
  }

  async listConversationIdsForUser(userId: string) {
    const conversations = await this.prisma.chatConversation.findMany({
      where: {
        participants: {
          some: {
            participantType: 'USER',
            userId,
            leftAt: null,
          },
        },
      },
      select: { id: true },
    });

    return conversations.map((conversation) => conversation.id);
  }

  async assertConversationAccess(userId: string, conversationId: string) {
    const conversation = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa nao encontrada.');
    }

    const participant = await this.prisma.chatParticipant.findUnique({
      where: {
        conversationId_participantKey: {
          conversationId,
          participantKey: this.userParticipantKey(userId),
        },
      },
      select: {
        id: true,
        leftAt: true,
      },
    });

    if (!participant || participant.leftAt) {
      throw new ForbiddenException('Usuario sem acesso a esta conversa.');
    }

    return conversation;
  }

  private async ensureDefaultConversations(userId: string) {
    const teams = await this.supportTeamDirectory.ensureDefaultTeams();
    await Promise.all(
      teams.map(async (team) => {
        const legacySector = this.legacySectorFromTeamCode(team.code);
        const existingConversation = await this.prisma.chatConversation.findFirst({
          where: {
            employeeUserId: userId,
            sector: legacySector,
            kind: ChatConversationKind.SUPPORT,
            originSupportCases: { none: {} },
          },
          orderBy: { createdAt: 'asc' },
        });
        const conversation = existingConversation
          ? await this.prisma.chatConversation.update({
              where: { id: existingConversation.id },
              data: {
                primaryTeamId: team.id,
                title: team.name,
              },
            })
          : await this.prisma.chatConversation.create({
            data: {
            employeeUserId: userId,
            sector: legacySector,
            primaryTeamId: team.id,
            kind: ChatConversationKind.SUPPORT,
            title: team.name,
            },
          });

        await this.ensureParticipant({
          conversationId: conversation.id,
          participantType: 'USER',
          participantKey: this.userParticipantKey(userId),
          userId,
          role: 'REQUESTER',
        });
        await this.ensureParticipant({
          conversationId: conversation.id,
          participantType: 'TEAM',
          participantKey: this.teamParticipantKey(team.id),
          teamId: team.id,
          sector: legacySector,
          role: 'AGENT',
        });
      }),
    );
  }

  private async toConversationListItem(
    conversation: ConversationWithPreview,
    userId: string,
  ) {
    const lastMessage = conversation.messages[0] ?? null;
    const readState = conversation.readStates[0] ?? null;
    const unreadCount = readState
      ? await this.prisma.chatMessage.count({
          where: {
            conversationId: conversation.id,
            createdAt: { gt: readState.lastReadAt },
            senderUserId: { not: userId },
          },
        })
      : 0;

    return {
      id: conversation.id,
      sector: conversation.sector,
      teamCode: conversation.primaryTeam?.code ?? conversation.sector,
      sectorLabel:
        conversation.primaryTeam?.name ?? conversation.sector ?? 'Atendimento',
      teamName:
        conversation.primaryTeam?.name ?? conversation.sector ?? 'Atendimento',
      title: conversation.title,
      status: conversation.status,
      unreadCount,
      lastMessage: lastMessage ? this.toMessageDto(lastMessage, userId) : null,
      lastMessageAt: conversation.lastMessageAt?.toISOString() ?? null,
      updatedAt: conversation.updatedAt.toISOString(),
    };
  }

  private toMessageDto(message: ChatMessage, userId: string) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderType: message.senderType,
      senderName: message.senderName,
      body: message.body,
      clientMessageId: message.clientMessageId,
      mine: message.senderUserId === userId,
      createdAt: message.createdAt.toISOString(),
      editedAt: message.editedAt?.toISOString() ?? null,
      deletedAt: message.deletedAt?.toISOString() ?? null,
    };
  }

  private async getUserDisplayName(userId: string) {
    const actor = await this.chatIdentity.resolveUser(userId);
    return actor.displayName;
  }

  private ensureParticipant(data: {
    conversationId: string;
    participantType: 'USER' | 'TEAM' | 'SECTOR';
    participantKey: string;
    userId?: string;
    teamId?: string;
    sector?: ChatSector;
    role: 'REQUESTER' | 'AGENT' | 'MEMBER' | 'OBSERVER';
  }) {
    return this.prisma.chatParticipant.upsert({
      where: {
        conversationId_participantKey: {
          conversationId: data.conversationId,
          participantKey: data.participantKey,
        },
      },
      create: data,
      update: {
        leftAt: null,
        role: data.role,
        teamId: data.teamId,
      },
    });
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
}
